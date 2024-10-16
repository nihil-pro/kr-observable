class ObservableTransactions {
    static #task: any
    static #subscribers: Set<Subscriber> = new Set()
    static #read: Map<Function, Map<ObservableAdministration, Set<string | symbol>>> = new Map()
    static #current: any = null
    static report(administration: ObservableAdministration, property: string | symbol) {
        if (!this.#current) { return; }
        const track = this.#read.get(this.#current)
        if (track) {
            if (!track.has(administration)) { track.set(administration, new Set()); }
            track.get(administration)?.add(property)
        }
    }
    static notify(subscriber: Subscriber) {
        this.#subscribers.add(subscriber)
        clearTimeout(this.#task)
        this.#task = setTimeout(() => {
            this.#subscribers.forEach(cb => cb())
            this.#subscribers.clear()
        })
    }
    public static transaction = (work: Function) => {
        this.#read.set(work, new Map())
        this.#current = work
        work()
        const read = this.#read.get(work)
        this.#read.delete(work)
        this.#current = null
        return { read, hash: this.#hash(read)}
    }
    static #hash(read?: Map<ObservableAdministration, Set<string | symbol>>) {
        let hash = ''
        read?.forEach(set => hash = [...set.values()].join('-'))
        return hash
    }
}
if (!('__ObservableTransactions__' in self)) {
    Reflect.set(self, '__ObservableTransactions__', ObservableTransactions) // need only one instance
}
class ObservableAdministration {
    #timeout: any
    #subscribers: Map<Subscriber, Set<string | symbol>> = new Map()
    #listeners: Set<Listener> = new Set()
    #changes: Set<string | symbol> = new Set()
    subscribe = (subscriber: Subscriber, keys: Set<string | symbol>) => this.#subscribers.set(subscriber, keys)
    unsubscribe = (subscriber: Subscriber) => this.#subscribers.delete(subscriber)
    listen = (listener: Listener) => this.#listeners.add(listener)
    unlisten = (listener: Listener) => this.#listeners.delete(listener)
    report = (property: string | symbol, value: any) => {
        if (this.#subscribers.size === 0 && this.#listeners.size === 0) { return }
        this.#changes.add(property)
        this.#listeners.forEach(cb => cb(property, value))
        this.#notify()
    }
    #notify() {
        clearTimeout(this.#timeout)
        this.#timeout = setTimeout(() => {
            const notified: Set<Subscriber> = new Set()
            this.#changes.forEach(change => {
                this.#subscribers.forEach((keys, cb) => {
                    if (keys.has(change) && !notified.has(cb)) {
                        ObservableTransactions.notify(cb)
                        notified.add(cb)
                    }
                })
                this.#changes.delete(change)
            })
        })
    }
}

function maybeMakeObservable(property: string | symbol, value: any, adm: ObservableAdministration) {
    if (!value || typeof value !== 'object' || value instanceof Observable) { return value; }
    if ([Map, Array, Set, Date].some(Constructor => value instanceof Constructor)) {
        return new Proxy(value, structureProxyHandler(property, adm))
    }
    if (Object.prototype === Object.getPrototypeOf(value)) {
        return new Proxy(value, observableProxyHandler(new ObservableAdministration()))
    }
    return value
}

function observableProxyHandler(adm: ObservableAdministration) {
    return {
        get(target: any, property: string | symbol, receiver: any) {
            if (Reflect.has(adm, property)) { return Reflect.get(adm, property); }
            const value = Reflect.get(target, property, receiver); // target[property]
            if (/^\s*class\s+/.test(value?.toString())) { return value }
            if (typeof value === 'function') {
                return function (...args: any[]) { return value.apply(receiver, args); }
            } else {
                if (typeof property !== 'symbol') {
                    ObservableTransactions.report(adm, property)
                }
            }
            return value
        },
        set(target: any, property: string, newValue: any, receiver: any) {
            if (Reflect.get(target, property, receiver) === newValue) { return true }
            const value = maybeMakeObservable(property, newValue, adm)
            Reflect.set(target, property, value, receiver);
            adm.report(property, value)
            return true
        },
        defineProperty(target: any, property: string, attributes: PropertyDescriptor) {
            const value = maybeMakeObservable(property, attributes?.value, adm)
            return Reflect.set(target, property, value);
        }
    }
}

// Dirty but effective
const Mutations: Array<string | symbol> = ['add', 'set', 'copyWithin', 'fill', 'pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift']
function structureProxyHandler(property: string | symbol, adm: ObservableAdministration) {
    return {
        get(target: any, key: string | symbol, receiver: any) {
            const value = target[key];
            if (typeof value === 'function') {
                return function (...args: any[]) {
                    // toDo need branch for maps
                    // @ts-ignore
                    const result = value.apply(this === receiver ? target : this, args);
                    if (target instanceof Date && String(key).includes('set') || Mutations.includes(key)) {
                        adm.report(property, args);
                    }
                    return result
                }
            }
            return value
        },
        set(target: any, key: string, newValue: any) {
            if (target[key] !== newValue) {
                target[key] = newValue;
                adm.report(property, newValue);
            }
            return true
        }
    }
}

export class Observable {
    constructor() {
        const adm = new ObservableAdministration()
        Reflect.set(adm, Symbol.for('whoami'), Reflect.getPrototypeOf(this)?.constructor.name)
        return new Proxy(this, observableProxyHandler(adm))
    }
}
type Subscriber = () => void | Promise<void>
type Listener = (property: string | symbol, value: any) => void | Promise<void>
declare global {
    interface Window {
        __ObservableTransactions__: {
            transaction(work: Function): { read: Map<Observable, Set<string | symbol>>, hash: string }
        }
    }
}
export declare interface Observable extends ObservableAdministration {}
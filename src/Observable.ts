class ObservableTransactions {
    static #debounce: any
    static #subscribers: Set<Subscriber> = new Set()
    static #read: Map<ObservableAdministration, Set<string | symbol>> = new Map()
    static report(administration: ObservableAdministration, property: string | symbol) {
        if (!ObservableTransactions.#read.has(administration)) {
            ObservableTransactions.#read.set(administration, new Set())
        }
        ObservableTransactions.#read.get(administration)?.add(property)
    }
    static notifySubscriber(subscriber: Subscriber) {
        ObservableTransactions.#subscribers.add(subscriber)
        clearTimeout(ObservableTransactions.#debounce)
        ObservableTransactions.#debounce = setTimeout(() => {
            ObservableTransactions.#subscribers.forEach(cb => cb())
            ObservableTransactions.#subscribers.clear()
        })
    }
    public static transaction = (work: Function): Map<Observable, Set<string | symbol>> => {
        ObservableTransactions.#read.clear()
        work()
        return new Map(ObservableTransactions.#read)
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
        this.#changes.add(property)
        this.#listeners.forEach(cb => cb(property, value))
        this.#notify()
    }
    #notify() {
        clearTimeout(this.#timeout)
        this.#timeout = setTimeout(() => {
            this.#subscribers.forEach((keys, cb) => {
                if ([...keys.values()].some(key => this.#changes.has(key))) {
                    ObservableTransactions.notifySubscriber(cb)
                }

            })
        })
    }
}

function maybeMakeObservable(property: string | symbol, value: any, adm: ObservableAdministration) {
    if (!value || value instanceof Observable || typeof value !== 'object') { return value; }
    if (Reflect.getPrototypeOf(value)?.constructor.name in self) { return value }
    if ([Map, Array, Set, Date].some(Constructor => value instanceof Constructor)) {
        return new Proxy(value, structureProxyHandler(property, adm))
    }
    if (Object.prototype === Object.getPrototypeOf(value)) {
        return new Proxy(value, observableProxyHandler(new ObservableAdministration()))
    }
    return new Proxy(value, structureProxyHandler(property, adm)) // a custom class
}

function observableProxyHandler(adm: ObservableAdministration) {
    return {
        get(target: any, property: string | symbol, receiver: any) {
            if (Reflect.has(adm, property)) { return Reflect.get(target, property); }
            const value = Reflect.get(target, property, receiver);
            if (typeof value === 'function') {
                return function (...args: any[]) { return value.apply(target, args); }
            } else {
                ObservableTransactions.report(adm, property)
            }
            return value
        },
        set(target: any, property: string, newValue: any, receiver: any) {
            // if (Reflect.get(target, property, receiver) === value) { return true }
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
            transaction(work: Function): Map<Observable, Set<string | symbol>>
        }
    }
}
export declare interface Observable extends ObservableAdministration {}
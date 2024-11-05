import { getGlobal } from "./global.this";

class SubscribersNotifier {
    static #task: any
    static #subscribers: Set<Subscriber> = new Set()
    static #changes: Map<Subscriber, Set<string | symbol>> = new Map()
    static notify(subscriber: Subscriber, properties?: Set<string | symbol>) {
        this.#subscribers.add(subscriber)
        let changes = this.#changes.get(subscriber)
        if (!changes) {
            changes = new Set();
            this.#changes.set(subscriber, changes);
        }
        properties.forEach(property => changes.add(property))
        clearTimeout(this.#task)
        this.#task = setTimeout(() => {
            this.#subscribers.forEach(cb => {
                cb(changes)
                this.#changes.delete(subscriber)
            })
            this.#subscribers.clear()
        })
    }
}


class WorkStats {
    count = 0
    read: Map<ObservableAdministration, Set<string | symbol>> = new Map()
}

interface TransactionResult {
    stats: WorkStats,
    dispose: () => void | Promise<void>,
    exception: undefined | Error
    result: any
}

export class ObservableTransactions {
    static #current: Function = null
    static #track: Map<Function, WorkStats> = new Map()

    static report(administration: ObservableAdministration, property: string | symbol) {
        if (!this.#current || typeof property === 'symbol') { return; }
        const stats = this.#track.get(this.#current)
        if (stats) {
            let read = stats.read.get(administration)
            if (!read) {
                read = new Set();
                stats.read.set(administration, read);
            }
            read.add(property)
        }
    }

    public static transaction = (work: Function, cb: Subscriber) => {
        let stats = this.#track.get(work)
        if (!stats) {
            stats = new WorkStats();
            this.#track.set(work, stats);
        }
        let result: any
        let exception!: Error
        try {
            stats.read.forEach((_, o) => o.unsubscribe(cb))
            stats.read.clear()
            this.#current = work
            result = work()
            stats = this.#track.get(work)
            stats.count++
            stats.read.forEach((k,o) => o.subscribe(cb, k))
        } catch (e) {
            exception = e as Error
        }
        this.#current = null
        return {
            stats,
            result,
            exception,
            dispose: () => {
                stats?.read.forEach((_, o) => o.unsubscribe(cb))
                stats?.read.clear()
                this.#track.delete(work)
            }
        }
    }
}

export const TransactionExecutor = Symbol.for('ObservableTransactions')

const _self = getGlobal()

if (!(TransactionExecutor in _self)) {
    Reflect.set(_self, TransactionExecutor, ObservableTransactions);
}
const GlobalObservableTransactions = _self[TransactionExecutor]

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
                        SubscribersNotifier.notify(cb, this.#changes)
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
                GlobalObservableTransactions.report(adm, property)
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
const MapRead: Array<string | symbol> = ['get', 'has', 'set', 'delete']
const MapSet: Array<string | symbol> = ['set', 'delete']
function structureProxyHandler(property: string | symbol, adm: ObservableAdministration) {
    return {
        get(target: any, key: string | symbol, receiver: any) {
            const value = target[key];
            if (typeof value === 'function') {
                return function (...args: any[]) {
                    // @ts-ignore
                    const result = value.apply(this === receiver ? target : this, args);
                    if (target instanceof Map) {
                        if (MapRead.includes(key)) {
                            const composed = `${property.toString()}.${args[0]}`
                           if (MapSet.includes(key)) {
                               adm.report(composed, args[1])
                               adm.report(property, target.size)
                           } else {
                               GlobalObservableTransactions.report(adm, composed)
                           }
                        }
                        if (key === 'clear') { adm.report(property, target); }
                        return result
                    }

                    if (target instanceof Date && String(key).includes('set') || Mutations.includes(key)) {
                        adm.report(property, args);
                    } else {
                        GlobalObservableTransactions.report(adm, property)
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
type Subscriber = (changes?: Set<string | symbol>) => void | Promise<void>
type Listener = (property: string | symbol, value: any) => void | Promise<void>
declare global {
    interface Window {
        [TransactionExecutor]: {
            transaction(work: Function, cb: Subscriber): TransactionResult
            notify(subscriber: Subscriber, changes?: Set<string | symbol>): void
            report(administration: ObservableAdministration, property: string | symbol): void
        }
    }
}
export declare interface Observable extends ObservableAdministration {}
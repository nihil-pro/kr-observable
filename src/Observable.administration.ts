import { SubscribersNotifier } from './Subscribers.notifier.js';
import { Listener, Subscriber } from './types.js';

export class ObservableAdministration {
  state = 0
  ignore = Object.create(null);
  subscribers: Map<Subscriber, Set<string | symbol>> = new Map;
  listeners: Set<Listener> | undefined;
  changes: Set<string | symbol> = new Set();
  reportable = false
  notified: Set<Subscriber> = new Set;
  subscribe = (subscriber: Subscriber, keys: Set<string | symbol>) => {
    if (this.subscribers.size < this.subscribers.set(subscriber, keys).size) {
      this.reportable = true
    }
  };
  listen = (listener: Listener) => {
    if (!this.listeners) {
      this.listeners = new Set<Listener>()
      this.reportable = true
    }
    this.listeners.add(listener)
  };
  unsubscribe = (subscriber: Subscriber) => {
    this.subscribers.delete(subscriber)
    if (this.subscribers.size === 0) {
      if (this.listeners?.size === 0) {
        this.reportable = false
      }
    }
  };
  unlisten = (listener: Listener) => {
    this.listeners.delete(listener)
    if (this.listeners.size === 0) {
      this.listeners = undefined
      if (this.subscribers?.size === 0) {
        this.reportable = false
      }
    }
  };
  batch = () => {
    // toDo
    // testing new strategy
    if (this.state === 1) {
      this.state = 0
      this.notify()
    }
  }
  report = (property: string | symbol, value: any) => {
    if (!this.reportable) { return }
    this.listeners?.forEach(cb => cb(property, value));
    this.changes.add(property)
  };
  skipped = false
  notify() {
    if (this.changes.size === 0) { return; }
    const changes = new Set(this.changes)
    this.changes.clear()
    this.subscribers.forEach((keys, cb) => {
      let isSubscribed = false
      for (const k of keys) {
        if (changes.has(k)) {
          isSubscribed = true;
          break
        }
      }
      if (isSubscribed && !this.notified.has(cb)) {
        const s = this.changes.size
        SubscribersNotifier.notify(cb, new Set(changes));
        if (this.changes.size === s) {
          this.notified.add(cb)
        } else {
          this.skipped = true
          this.notify()
        }
      }
    })
    queueMicrotask(() => {
      if (!this.skipped) {
        this.notified.clear()
        this.changes.clear()
        this.skipped = false
      }
    })
  }
}

const trap = Object.create(null)
trap.report = 1
trap.subscribe = 1
trap.unsubscribe = 1
trap.listen = 1
trap.unlisten = 1
Object.freeze(trap)
export const AdmTrap = trap
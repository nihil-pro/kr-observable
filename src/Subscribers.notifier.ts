import { Subscriber } from "./types.js";
import { getGlobal } from './global.this.js';

class SubscribersNotifierImpl {
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

// This is for Webpack Module Federation V1
// we should only use one instance of SubscribersNotifierImpl
const Notifier = Symbol.for('SubscribersNotifier');
const _self = getGlobal();

if (!(Notifier in _self)) {
  Reflect.set(_self, Notifier, SubscribersNotifierImpl);
}

declare global {
  interface Window {
    [Notifier]: { notify(subscriber: Subscriber, properties?: Set<string | symbol>): void };
  }
}

export const SubscribersNotifier = _self[Notifier];
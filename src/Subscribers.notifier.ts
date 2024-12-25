import { Subscriber } from './types.js';
import { getGlobal } from './global.this.js';

class SubscribersNotifierImpl {
  static #subscribers: Set<Subscriber> = new Set();
  static #changes: Map<Subscriber, Set<string | symbol>> = new Map();
  static #notified: Set<Subscriber> = new Set();

  static async notify(subscriber: Subscriber, properties?: Set<string | symbol>) {
    let changes = this.#changes.get(subscriber);
    if (!changes) {
      changes = new Set();
      this.#changes.set(subscriber, changes);
    }
    properties.forEach((property) => changes.add(property));
    if (this.#subscribers.size < this.#subscribers.add(subscriber).size) {
      this.#do(changes);
    }
  }

  static #do(changes?: Set<string | symbol>) {
    this.#subscribers.forEach((subscriber) => {
      if (!this.#notified.has(subscriber)) {
        this.#notified.add(subscriber);
        subscriber(changes);
      }
    });
    this.#notified.clear();
    this.#subscribers.clear();
    this.#changes.clear();
    // queueMicrotask(() => {})
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

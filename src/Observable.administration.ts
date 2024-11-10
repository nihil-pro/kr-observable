import { SubscribersNotifier } from './Subscribers.notifier.js';
import { Listener, Subscriber } from './types.js';

export class ObservableAdministration {
  #timeout: any;
  #subscribers: Map<Subscriber, Set<string | symbol>> = new Map();
  #listeners: Set<Listener> = new Set();
  #changes: Set<string | symbol> = new Set();
  #reportable = false
  get reportable() { return this.#reportable }
  subscribe = (subscriber: Subscriber, keys: Set<string | symbol>) => {
    if (this.#subscribers.size < this.#subscribers.set(subscriber, keys).size) {
      this.#reportable = true
    }
  };
  unsubscribe = (subscriber: Subscriber) => {
    this.#subscribers.delete(subscriber)
    if (this.#listeners.size === 0 && this.#subscribers.size === 0) { this.#reportable = false}
  };
  listen = (listener: Listener) => {
    if (this.#listeners.size < this.#listeners.add(listener).size) {
      this.#reportable = true
    }
  };
  unlisten = (listener: Listener) => {
    this.#listeners.delete(listener)
    if (this.#listeners.size === 0 && this.#subscribers.size === 0) { this.#reportable = false}
  };
  report = (property: string | symbol, value: any) => {
    if (!this.#reportable) { return }
    this.#listeners.forEach(cb => cb(property, value));
    if (this.#changes.size < this.#changes.add(property).size) {
      this.#notify();
    }
  };

  #notify() {
    clearTimeout(this.#timeout);
    this.#timeout = setTimeout(() => {
      const notified: Set<Subscriber> = new Set();
      this.#changes.forEach(change => {
        this.#subscribers.forEach((keys, cb) => {
          if (keys.has(change) && !notified.has(cb)) {
            SubscribersNotifier.notify(cb, this.#changes);
            notified.add(cb);
          }
        });
        this.#changes.delete(change);
      });
    });
  }
}
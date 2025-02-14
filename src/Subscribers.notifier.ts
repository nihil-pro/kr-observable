import { Subscriber } from './types.js';
import { lib } from './global.this.js';

export class SubscribersNotifier {
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
        lib.runningEffect = true;
        subscriber(changes);
        lib.runningEffect = false;
      }
    });
    this.#notified.clear();
    this.#subscribers.clear();
    this.#changes.clear();
    // queueMicrotask(() => {})
  }
}

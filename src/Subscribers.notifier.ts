import { Subscriber } from './types.js';

export class SubscribersNotifier {
  static #notified: Set<Subscriber> = new Set();
  static notify(subscriber: Subscriber, properties?: Set<string | symbol>) {
    if (!this.#notified.has(subscriber)) {
      this.#notified.add(subscriber);
      subscriber(properties);
      queueMicrotask(() => this.#notified.delete(subscriber));
    }
  }
  static clear() {
    this.#notified.clear();
  }
}

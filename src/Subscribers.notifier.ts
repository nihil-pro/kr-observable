import { Subscriber } from './types.js';
import { lib } from './global.this.js';

export class SubscribersNotifier {
  static #notified: Set<Subscriber> = new Set();
  static notify(subscriber: Subscriber, properties?: Set<string | symbol>) {
    if (!this.#notified.has(subscriber)) {
      this.#notified.add(subscriber);
      lib.runningEffect = true;
      subscriber(properties);
      lib.runningEffect = false;
      queueMicrotask(() => this.#notified.delete(subscriber));
    }
  }
  static clear() {
    this.#notified.clear();
  }
}

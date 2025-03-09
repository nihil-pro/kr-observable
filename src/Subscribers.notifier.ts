import { Subscriber } from './types.js';
import { lib } from './global.this.js';

export class SubscribersNotifier {
  static #notified: Set<Subscriber> = new Set();
  static async notify(subscriber: Subscriber, properties?: Set<string | symbol>) {
    if (!this.#notified.has(subscriber)) {
      this.#notified.add(subscriber);
      // allows to ignore changes made in a reaction
      lib.runningEffect = true;
      subscriber(properties);
      lib.runningEffect = false;
      // this.#notified.delete(subscriber);
      queueMicrotask(() => this.#notified.delete(subscriber));
    }
  }
}

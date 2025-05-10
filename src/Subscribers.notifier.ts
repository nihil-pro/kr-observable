import { ObservedRunnable, Property } from './types.js';

export class SubscribersNotifier {
  static #notified: Set<ObservedRunnable> = new Set();
  static #queued = false;
  static notify(subject: ObservedRunnable, properties?: Set<Property>) {
    if (this.#notified.size < this.#notified.add(subject).size) {
      subject.subscriber(properties);
      if (!this.#queued) {
        this.#queued = true;
        queueMicrotask(() => {
          this.#notified = new Set<ObservedRunnable>();
          this.#queued = false;
        });
      }
      return true;
    }
    return false;
  }

  static clear() {
    this.#notified.clear();
  }
}

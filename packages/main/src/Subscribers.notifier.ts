import { ObservedRunnable, Property } from './types.js';
import { lib } from './global.this.js';

export class SubscribersNotifier {
  static #notified: Set<ObservedRunnable> = new Set();
  static #queued = false;

  static notify(subject: ObservedRunnable, properties?: Set<Property>) {
    if (lib.executor.current === subject) return;
    if (this.#notified.size < this.#notified.add(subject).size) {
      subject.subscriber(properties);
      if (!this.#queued) {
        this.#queued = true;
        queueMicrotask(() => {
          this.#notified.clear();
          this.#queued = false;
        });
      }
    }
  }

  static clear() {
    this.#notified.clear();
  }
}

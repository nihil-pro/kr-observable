import { ObservedRunnable, Property } from './types.js';

export class SubscribersNotifier {
  // allows to invoke a subscriber once per tick
  static #notified: Set<ObservedRunnable> = new Set();

  // means that cleaning is planned
  static #queued = false;

  static notify(subject: ObservedRunnable, properties?: Set<Property>) {
    // if subscriber wasn't invoke on this tick
    if (this.#notified.size < this.#notified.add(subject).size) {

      // invoke it
      subject.subscriber(properties);

      // and planning flush
      if (!this.#queued) {
        this.#queued = true;
        queueMicrotask(SubscribersNotifier.#flush);
      }
    }
  }

  static #flush() {
    SubscribersNotifier.#notified.clear();
    SubscribersNotifier.#queued = false;
  }

  // used by transaction API
  // allows to invoke a subscriber more than once per tick
  static clear() {
    this.#notified.clear();
  }
}

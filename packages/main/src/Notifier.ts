import { Runnable, Property } from './types.js';

export class Notifier {
  // allows to invoke a subscriber once per tick
  static #notified: Set<Runnable> = new Set();

  // means that cleaning is planned
  static #queued = false;

  static notify(runnable: Runnable, properties?: Set<Property>) {
    // if subscriber wasn't invoke on this tick
    if (this.#notified.size < this.#notified.add(runnable).size) {

      // invoke it
      runnable.subscriber(properties);

      // and planning flush
      if (!this.#queued) {
        this.#queued = true;
        queueMicrotask(Notifier.#flush);
      }
    }
  }

  static #flush() {
    Notifier.#notified.clear();
    Notifier.#queued = false;
  }

  // used by transaction API
  // allows to invoke a subscriber more than once per tick
  static clear() {
    this.#notified.clear();
  }
}

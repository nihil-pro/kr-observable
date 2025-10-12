import { Runnable, Property } from './types.js';

export class Notifier {
  // allows to invoke a subscriber once per tick
  static #notified: WeakSet<Runnable> = new WeakSet;

  // means that flushing is planned
  static #queued = false;

  /** Invokes runnable subscriber once per tick */
  static notify(runnable: Runnable, changes?: Set<Property>) {
    if (this.#notified.has(runnable)) return;
    this.#notified.add(runnable);
    runnable.subscriber(changes);
    // and planning flush
    if (!this.#queued) {
      this.#queued = true;
      queueMicrotask(Notifier.#flush);
    }
  }

  static #flush() {
    Notifier.#notified = new WeakSet;
    Notifier.#queued = false;
  }

  /** Clears reactions invoked during this tick, and allow to invoke them again. */
  static clear() {
    this.#notified = new WeakSet;
  }
}

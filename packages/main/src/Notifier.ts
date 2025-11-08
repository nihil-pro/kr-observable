import { Runnable, Property } from './types.js';

export class Notifier {
  /** Flag to ensure microtask is queued only once per tick */
  static queued = false;

  /**
   * Runnable runId is 1 by default, that's why we start from 2.
   * Used to track which runnables have been notified in the current tick.
   */
  static runId = 2;

  /**
   * Invokes runnable subscriber once per tick
   * @param {Runnable} runnable - The runnable to notify
   * @param {Set<Property>} [changes] - Set of changed properties that triggered the notification
   */
  static notify(runnable: Runnable, changes?: Set<Property>) {
    // Mark runnable as notified for the current tick
    runnable.runId = this.runId;

    // Execute the subscriber callback
    runnable.subscriber(changes);

    // Once invoked, this subscriber will be ignored until next tick in normal flow,
    // or until transaction API is used, which is rare case.
    // Currently, transaction API is used in tests only.
    if (this.queued) return;

    this.queued = true;
    queueMicrotask(this.flush);
  }

  /**
   * Reset Notifier id and allow to invoke subscribers again
   * Called via queueMicrotask at the end of each tick,
   * or from transaction API
   * @see transaction
   */
  static flush() {
    Notifier.queued = false;

    // Generates pseudo-unique id by cycling between 0 and 99,999.
    // At 60fps, reaching 100k microtasks would take ~27 minutes
    // making collisions practically impossible in real-world usage
    Notifier.runId = (Notifier.runId + 1) % 100_000;
  }
}
import { Subscriber, ObservedRunnable } from './types.js';

type Subject = Subscriber | ObservedRunnable;

export class SubscribersNotifier {
  static #notified: Set<Subject> = new Set();
  static notify(subject: Subject, properties?: Set<string | symbol>) {
    if (!this.#notified.has(subject)) {
      this.#notified.add(subject);
      if (typeof subject === 'function') {
        subject(properties);
      } else {
        subject.subscriber(properties);
      }
      queueMicrotask(() => this.#notified.delete(subject));
    }
  }

  static clear() {
    this.#notified.clear();
  }
}

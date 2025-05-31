import { Listener, ObservedRunnable, Property } from './types.js';
import { lib } from './global.this.js';

/** Observable companion object */
export class ObservableAdm {
  ignore: Set<Property>;
  shallow: Set<Property>;
  owner: string;

  /** Because `batch` is mostly queued, this flag help to execute batch before the queued task will be executed,
   *  or to ignore queued microtask at all */
  state = 0;

  deps: Map<Property, Set<ObservedRunnable>> = new Map();

  /** Set of listeners. */
  listeners: Set<Listener> = new Set();

  /** When proxy `set` is called, the name of the accessed property is stored here.
   * They will be used during notifying subscribers.
   * */
  changes: Set<Property> = new Set();

  constructor(owner: string, ignore: Set<Property>, shallow: Set<Property>) {
    this.owner = owner;
    this.ignore = ignore;
    this.shallow = shallow;
  }

  /** Is called from `proxyHandler`  and `ObservableMap`, `ObservableSet`, `ObservableArray` and `ObservableComputed`.
   * In setters is used to queue itself: `queueMicrotask(adm.batch)`. <br />
   * In getters is used to notify listeners immediately (don't waiting until queued microtask will be executed).
   * @see ObservableMap
   * @see ObservableSet
   * @see ObservableArray
   * @see ObservableComputed
   * @see proxyHandler
   * */
  batch() {
    if (this.state === 1) this.#notify();
  }

  /** Is called from `proxyHandler.set`  and `ObservableMap`, `ObservableSet`, `ObservableArray` and `ObservableComputed`.
   * Signifies about changes.
   * @see ObservableMap
   * @see ObservableSet
   * @see ObservableArray
   * @see ObservableComputed
   * @see proxyHandler
   * */
  report(property: Property, value: any) {
    if (this.listeners.size > 0) {
      this.listeners.forEach((cb) => cb(property, value));
    }
    this.changes.add(property);
  }

  /** Notify subscribers about changes */
  #notify() {
    this.state = 0;
    if (this.changes.size === 0) return;
    const changes = new Set(this.changes);
    this.deps.forEach((list, key) => {
      if (this.changes.delete(key)) {
        list.forEach((subscriber) => lib.notifier.notify(subscriber, changes));
      }
    });
  }
}

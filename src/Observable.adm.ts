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

  /** Stores subscribers as key => value map, where key is subscriber callback,
   * and value is a set of properties that the subscriber wants to track.
   * */
  subscribers: Map<ObservedRunnable, Set<Property>> = new Map();

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
  batch(sync?: boolean) {
    if (this.state === 1) {
      this.state = 0;
      this.#notify(sync);
    }
  }

  /** Is called from `proxyHandler.set`  and `ObservableMap`, `ObservableSet`, `ObservableArray` and `ObservableComputed`.
   * Signifies about changes.
   * @see ObservableMap
   * @see ObservableSet
   * @see ObservableArray
   * @see ObservableComputed
   * @see proxyHandler
   * */
  report(property: Property, value: any = undefined, ignoreListeners = false) {
    if (this.listeners.size > 0) {
      if (!ignoreListeners) {
        this.listeners.forEach((cb) => cb(property, value));
      }
    }
    this.changes.add(property);
  }

  /** Notify subscribers about changes */
  #notify(sync?: boolean) {
    if (this.changes.size > 0) {
      this.subscribers.forEach((keys: Set<Property>, cb: ObservedRunnable) => {
        for (const k of keys) {
          if (this.changes.has(k)) {
            lib.notifier.notify(cb, this.changes);
            break;
          }
        }
      });
      if (sync) {
        this.changes.clear();
      } else {
        queueMicrotask(() => this.changes.clear());
      }
    }
  }
}

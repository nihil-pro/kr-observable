import { Listener, Subscriber } from './types.js';
import { lib } from './global.this.js';

/** Observable companion object
 * We don't want to add any extra features to the user custom class.
 * Thanks to the proxy, we keep the subscribe/unsubscribe methods in this companion object.
 * This means that when the Observable class is printed to the console,
 * the user will see a clean class with only the methods and properties it has defined.
 *
 * Don't use ECMA private properties (#), because they are a little bit slower than public.
 * Considering than such instances would be created many times
 * */
export class ObservableAdministration {
  /** Need to bind methods in prototype */
  methods = Object.create(null);

  /** Because `batch` is mostly queued, this flag help to execute batch before the queued task will be executed,
   *  or to ignore queued microtask at all */
  state = 0;

  /** Copy of Observable static `ignore` property. Fasted way to check ignored properties through the proxy */
  ignore = Object.create(null);

  /** Stores subscribers as key => value map, where key is subscriber callback,
   * and value is a set of properties that the subscriber wants to track.
   * */
  private subscribers: Map<Subscriber, Set<string | symbol>> = new Map();

  /** Set of listeners. Is `undefined` by default, because `listen` is used rarely.
   * This way we save memory and get a better performance when creating a large number of Observable instances.
   * */
  private listeners: Set<Listener> | undefined;

  /** When proxy `set` is called, the name of the accessed property is stored here.
   * They will be used during notifying subscribers.
   * */
  changes: Set<string | symbol> = new Set();

  /** Stores already notified subscribers during one notification "transaction". <br />
   * The `notified` will be cleared in a microtask, and this allows us to notify subscribers once.
   * This means that if the `notify` method is called again before the microtask has been executed,
   * we'll not invoke the subscriber because they are already in the `notified` set.
   * */
  private notified: Set<Subscriber> = new Set();

  // /** The `notify` works recursively, and each time creates a new microtask which should clear state.
  //  * This flag is needed to ignore work inside microtask until recursion is done. */
  // private skipped = false;

  /** Is called from `proxyHandler`  and `ObservableMap`, `ObservableSet`, `ObservableArray` and `ObservableComputed`.
   * In setters is used to queue itself: `queueMicrotask(adm.batch)`. <br />
   * In getters is used to notify listeners immediately (don't waiting until queued microtask will be executed).
   * @see ObservableMap
   * @see ObservableSet
   * @see ObservableArray
   * @see ObservableComputed
   * @see proxyHandler
   * */
  batch = (sync = false) => {
    if (this.state === 1) {
      this.state = 0;
      this.notify(sync);
    }
  };

  /** Is called from `proxyHandler.set`  and `ObservableMap`, `ObservableSet`, `ObservableArray` and `ObservableComputed`.
   * Signifies about changes.
   * @see ObservableMap
   * @see ObservableSet
   * @see ObservableArray
   * @see ObservableComputed
   * @see proxyHandler
   * */
  report = (property: string | symbol, value: any = undefined, ignoreListeners = false) => {
    if (!ignoreListeners) {
      this.listeners?.forEach((cb) => cb(property, value));
    }
    this.changes.add(property);
  };

  /** Notify subscribers about changes */
  private notify(sync = false) {
    if (this.changes.size === 0) {
      return;
    }

    this.subscribers.forEach((keys, cb) => {
      let isSubscribed = false;
      for (const k of keys) {
        if (this.changes.has(k)) {
          isSubscribed = true;
          break;
        }
      }
      if (isSubscribed && !this.notified.has(cb)) {
        lib.notifier.notify(cb, this.changes);
        this.notified.add(cb);
      }
    });

    if (sync) {
      this.flush();
    } else {
      queueMicrotask(this.flush);
    }
  }

  flush = () => {
    this.notified.clear();
    this.changes.clear();
  };

  // Public api.
  // These methods are accessed through the proxyHandler. See AdmTrap below.

  subscribe = (subscriber: Subscriber, keys: Set<string | symbol>) => {
    this.subscribers.set(subscriber, keys);
  };

  listen = (listener: Listener) => {
    if (!this.listeners) {
      this.listeners = new Set<Listener>();
    }
    this.listeners.add(listener);
  };

  unsubscribe = (subscriber: Subscriber) => {
    this.subscribers.delete(subscriber);
  };

  unlisten = (listener: Listener) => {
    this.listeners.delete(listener);
  };

  transaction = (work: () => void) => {
    this.state = 0;
    lib.action = true;
    work();
    this.state = 1;
    lib.action = false;
    this.batch(true);
    lib.notifier.clear();
  };
}

/** Provide fast access to ObservableAdministration through proxy `get`.
 * We can't use something like if (key in observableAdministration) because all classes share the same object prototype.
 * @see observableProxyHandler
 * */
const trap = Object.create(null);
trap.subscribe = 1;
trap.unsubscribe = 1;
trap.listen = 1;
trap.unlisten = 1;
trap.transaction = 1;
export const AdmTrap = Object.freeze(trap);

/** Some methods of Array returns shallow copy of this, which is ObservableArray in our case,
 * they call the ObservableArray constructor but without arguments.
 * This is a fast copy of ObservableAdministration
 * */
export const ObservableAdministrationPlug = {
  report: () => void 0,
  batch: () => void 0,
  state: 0,
  action: 0,
} as unknown as ObservableAdministration;

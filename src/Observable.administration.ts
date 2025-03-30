import { Listener, Subscriber, ObservedRunnable } from './types.js';
import { lib } from './global.this.js';

type WeakSubscriber = WeakRef<ObservedRunnable> | Subscriber;

const temp = new Set<Set<string | symbol>>();

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
  /** Because `batch` is mostly queued, this flag help to execute batch before the queued task will be executed,
   *  or to ignore queued microtask at all */
  $_state = 0;

  ignore: Set<string | symbol>;
  shallow: Set<string | symbol>;
  owner: string;

  constructor(owner: string, ignore: Set<string | symbol>, shallow: Set<string | symbol>) {
    this.owner = owner;
    this.ignore = ignore;
    this.shallow = shallow;
  }

  /** Stores subscribers as key => value map, where key is subscriber callback,
   * and value is a set of properties that the subscriber wants to track.
   * */
  private $_subscribers: Map<WeakSubscriber, Set<string | symbol>> = new Map();

  /** Set of listeners. Is `undefined` by default, because `listen` is used rarely.
   * This way we save memory and get a better performance when creating a large number of Observable instances.
   * */
  private $_listeners: Set<Listener> | undefined;

  /** When proxy `set` is called, the name of the accessed property is stored here.
   * They will be used during notifying subscribers.
   * */
  $_changes: Set<string | symbol> = new Set();

  /** Is called from `proxyHandler`  and `ObservableMap`, `ObservableSet`, `ObservableArray` and `ObservableComputed`.
   * In setters is used to queue itself: `queueMicrotask(adm.batch)`. <br />
   * In getters is used to notify listeners immediately (don't waiting until queued microtask will be executed).
   * @see ObservableMap
   * @see ObservableSet
   * @see ObservableArray
   * @see ObservableComputed
   * @see proxyHandler
   * */
  $_batch = (sync = false) => {
    if (this.$_state === 1) {
      this.$_state = 0;
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
  report(property: string | symbol, value: any = undefined, ignoreListeners = false) {
    if (!ignoreListeners) {
      this.$_listeners?.forEach((cb) => cb(property, value));
    }
    this.$_changes.add(property);
  }

  /** Notify subscribers about changes */
  private notify(sync: boolean) {
    if (this.$_changes.size === 0) {
      return;
    }

    this.$_subscribers.forEach((keys, cb) => {
      for (const k of keys) {
        if (this.$_changes.has(k)) {
          if (typeof cb === 'function') {
            lib.notifier.notify(cb, this.$_changes);
          } else {
            const $cb = cb.deref();
            if ($cb) {
              lib.notifier.notify($cb, this.$_changes);
            } else {
              this.$_subscribers.delete(cb);
            }
          }
          break;
        }
      }
    });

    if (sync) {
      this.$_changes.clear();
      temp.delete(this.$_changes);
      return;
    }
    if (temp.size === 0) {
      queueMicrotask(() => this.$_changes.clear());
    } else {
      temp.add(this.$_changes);
    }
  }

  // Public api.
  // These methods are accessed through the proxyHandler. See AdmTrap below.
  subscribe = (subscriber: WeakSubscriber, keys: Set<string | symbol>) => {
    this.$_subscribers.set(subscriber, keys);
  };

  listen = (listener: Listener) => {
    if (!this.$_listeners) {
      this.$_listeners = new Set<Listener>();
    }
    this.$_listeners.add(listener);
  };

  unsubscribe = (subscriber: Subscriber) => {
    this.$_subscribers.delete(subscriber);
  };

  unlisten = (listener: Listener) => {
    this.$_listeners.delete(listener);
  };

  transaction = (work: () => void) => {
    this.$_state = 0;
    lib.action = true;
    work();
    this.$_state = 1;
    lib.action = false;
    this.$_batch(true);
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
trap.$_batch = 1;
trap.$_state = 1;
trap.$_subscribers = 1;
trap.$_listeners = 1;
Object.freeze(trap);
export const AdmTrap = trap;

/** Some methods of Array returns shallow copy of this, which is ObservableArray in our case,
 * they call the ObservableArray constructor but without arguments.
 * This is a fast copy of ObservableAdministration
 * */
export const ObservableAdministrationPlug = {
  report: () => void 0,
  $_batch: () => void 0,
  $_state: 0,
} as unknown as ObservableAdministration;

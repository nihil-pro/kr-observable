import { ObservableAdm } from './Observable.adm.js';
import { lib } from './global.this.js';
import { ObservedRunnable, Property } from './types.js';

/** Custom property descriptor which memoize getters return value */
export class ObservableComputed implements ObservedRunnable, PropertyDescriptor {
  /** Ref to original target proxy.
   * Can't use target because properties access won't be tracked, and access to private properties won't work. */
  #proxy: object;

  disposed = false;
  debug = false;

  /** Original descriptor */
  #descriptor: PropertyDescriptor;

  #adm: ObservableAdm;
  enumerable = false;
  configurable = true;

  #property: Property;

  /** Stores getter value */
  #value: any;

  /** Signify that getter result was changed */
  #changed = false;

  /** Indicates that getter wasn't accessed yet  */
  #first = true;

  #isGetter = false;

  set: undefined | any = undefined;
  #setterValue: any | undefined = undefined;

  constructor(
    property: Property,
    descriptor: PropertyDescriptor,
    adm: ObservableAdm,
    proxy: object
  ) {
    this.#property = property;
    this.#descriptor = descriptor;
    this.#adm = adm;
    this.#proxy = proxy;
    if (descriptor.set) {
      this.set = (value: any) => {
        this.#descriptor.set?.call(this.#proxy, value);
        const prevValue = this.#setterValue;
        this.#setterValue = value;
        if (!this.#equal(prevValue, this.#setterValue)) this.#report(value);
      };
      this.#isGetter = true;
    }
  }

  /** Subscriber <br/>
   * Will be invoked when one of read observable changes
   * */
  subscriber() {
    this.#changed = true;
    if (this.#adm.deps.get(this.#property)?.size === 0) return;
    this.#compute();
  }

  run() {
    return this.#descriptor.get?.call(this.#proxy);
  }

  #compute() {
    // means that microtask was queued, but getter was accessed before microtask start execution
    if (!this.#changed) return;
    const prevValue = this.#value;
    this.#reader();
    this.#changed = false;
    if (!this.#equal(prevValue, this.#value)) this.#report(this.#value);
  }

  #report(value: any) {
    this.#adm.report(this.#property, value);
    this.#adm.state = 1;
    this.#adm.batch();
  }

  #equal(prev: any, current: any) {
    if (current == null) return prev == null;
    return current.$equal(prev);
  }

  #deps = 0;

  /** Read getter value in a transaction and subscribes to observables */
  #reader() {
    const { result, deps } = lib.executor.execute(this);
    let value = result
    if (Array.isArray(result)) value = Array.from(result);
    if (result != null && result instanceof Set) value = new Set(result);
    if (result != null && result instanceof Map) value = new Map(result);
    this.#value = value;
    this.#deps = deps.size;
  }

  /** A trap for original descriptor getter */
  get = () => {
    // enable sync batching
    this.#adm.batch();

    // Initial value is undefined. Without this, we will report changed on first access
    if (this.#first) {
      this.#reader();
      this.#first = false;
      return this.#value;
    }

    // if property was changed, we should compare current value to previous, and report if they are not equal.
    if (this.#changed) {
      // eslint-disable-next-line no-unused-expressions
      this.#isGetter ? this.#reader() : this.#compute();
      return this.#value;
    }
    if (this.#deps === 0) return this.run();

    // cases when dependency was changed, but notifier did not notify computed yet
    if (this.#adm.current?.has(this)) {
      this.#reader();
      this.#adm.report(this.#property, this.#value);
      return this.#value;
    }
    return this.#value;
  };
}

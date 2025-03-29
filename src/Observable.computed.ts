import { ObservableAdministration } from './Observable.administration.js';
import { lib } from './global.this.js';
import { ObservedRunnable } from './types.js';

/** Custom property descriptor which memoize getters return value */
export class ObservableComputed implements ObservedRunnable, PropertyDescriptor {
  /** Ref to original target proxy.
   * Can't use target because properties access won't be tracked, and access to private properties won't work. */
  #proxy: object;

  /** Original descriptor */
  #descriptor: PropertyDescriptor;

  #adm: ObservableAdministration;
  enumerable = false;
  configurable = true;

  #property: string | symbol;

  /** Stores getter value */
  #value: any;

  /** Signify that getter result was changed */
  #changed = false;

  /** Indicates that getter wasn't accessed yet  */
  #first = true;

  autosub = false;
  ref: WeakRef<ObservableComputed>;

  constructor(
    property: string | symbol,
    descriptor: PropertyDescriptor,
    adm: ObservableAdministration,
    proxy: object
  ) {
    this.#property = property;
    this.#descriptor = descriptor;
    this.#adm = adm;
    this.#proxy = proxy;
    this.ref = new WeakRef<ObservableComputed>(this);
  }

  /** Subscriber <br/>
   * Will be invoked when one of read observable changes
   * */
  subscriber() {
    // if property will be accessed earlier than below microtask will be executed,
    // we'll call original getter to get current result
    this.#changed = true;
    if (!lib.action) {
      this.#compute();
    } else {
      queueMicrotask(() => this.#compute());
    }
  }

  run() {
    return this.#descriptor.get?.call(this.#proxy);
  }

  #compute() {
    // means that microtask was queued, but getter was accessed before microtask start execution
    if (!this.#changed) {
      return;
    }
    const prevValue = this.#value;
    this.#reader();
    this.#changed = false;
    if (!this.#equal(prevValue)) {
      this.#adm.report(this.#property, this.#value);
      this.#adm.$_state = 1;
      this.#adm.$_batch();
    }
  }

  #equal(prev: any) {
    if (this.#value == null) {
      return prev == null;
    }
    return this.#value.equal(prev);
  }

  /** Read getter value in a transaction and subscribes to observables */
  #reader() {
    const { result, read } = lib.executor.execute(this);
    this.#value = result;
    read.forEach((keys, adm) => adm.subscribe(this.ref, keys));
  }

  /** A trap for original descriptor getter */
  get = () => {
    // enable sync batching
    this.#adm.$_batch(true);

    // Initial value is undefined. Without this, we will report changed on first access
    if (this.#first) {
      this.#reader();
      this.#first = false;
    }

    // if property was changed, we should compare current value to previous, and report if they are not equal.
    if (this.#changed) {
      this.#compute();
    }
    return this.#value;
  };
}

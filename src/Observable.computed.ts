import { ObservableAdm } from './Observable.adm.js';
import { lib } from './global.this.js';
import { ObservedRunnable, Property } from './types.js';

/** Custom property descriptor which memoize getters return value */
export class ObservableComputed implements ObservedRunnable, PropertyDescriptor {
  /** Ref to original target proxy.
   * Can't use target because properties access won't be tracked, and access to private properties won't work. */
  #proxy: object;

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

  autosub = false;
  set: undefined | any = undefined;

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
    // @ts-ignore
    this.name = property;
    if (descriptor.set) {
      this.set = (value: any) => {
        const prevValue = this.#value;
        this.#value = value;
        if (!this.#equal(prevValue)) {
          this.#changed = true;
          this.#adm.report(this.#property, this.#value);
          this.#adm.state = 1;
          this.#adm.batch(true);
        }
      };
      this.#isGetter = true;
    }
  }

  /** Subscriber <br/>
   * Will be invoked when one of read observable changes
   * */
  subscriber() {
    // console.log(this.#property, 'subscriber');
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
    // if (lib.action) return this.#descriptor.get?.call(this.#proxy);
    // lib.action = true;
    // const res = this.#descriptor.get?.call(this.#proxy);
    // lib.action = false;
    // return res;
  }

  #compute() {
    // means that microtask was queued, but getter was accessed before microtask start execution
    if (!this.#changed) return;
    const prevValue = this.#value;
    this.#reader();
    this.#changed = false;
    if (!this.#equal(prevValue)) {
      this.#adm.report(this.#property, this.#value);
      this.#adm.state = 1;
      this.#adm.batch(true);
      // console.log('call batch', this.#property);
    }
  }

  #equal(prev: any) {
    if (this.#value == null) return prev == null;
    return this.#value.equal(prev);
  }

  /** Read getter value in a transaction and subscribes to observables */
  #reader() {
    // console.log('read', this.#property);
    const { result, read } = lib.executor.execute(this);
    if (read.size === 0) this.#isGetter = true;
    this.#value = result;
    read.forEach((keys, adm) => adm.subscribers.set(this, keys));
  }

  /** A trap for original descriptor getter */
  get = () => {
    // console.log('get', this.#property);
    // enable sync batching
    this.#adm.batch(true);

    if (this.#isGetter) {
      if (this.#first) {
        this.#first = false;
        return this.run();
      }
      if (this.#changed) {
        this.#changed = false;
        this.run();
        return this.#value;
      }
      return this.#value;
    }

    // Initial value is undefined. Without this, we will report changed on first access
    if (this.#first) {
      this.#reader();
      this.#first = false;
    }

    // if property was changed, we should compare current value to previous, and report if they are not equal.
    if (this.#changed) this.#compute();
    return this.#value;
  };
}

import { Admin } from './Admin.js';
import { Runnable, Property, StatefulHandler } from './types.js';
import { comparator } from './utils/comparator.js';
import { lib } from './global.js';

/** Custom property descriptor which memoize getter return value */
export class Computed implements Runnable, PropertyDescriptor {
  /** Ref to original target proxy.
   * Can't use target because properties access won't be tracked, and access to private properties won't work. */
  #proxy: object;

  debug = false;
  active = false;

  deps?: Set<Set<Runnable>>;

  /** Original descriptor */
  #descriptor: PropertyDescriptor;

  #adm: Admin;
  enumerable = false;
  configurable = true;

  #property: Property;

  /** Stores getter value */
  #value: any;

  /** Signify that getter result was changed */
  #changed = false;

  /** Indicates that getter wasn't accessed yet  */
  #first = true;

  // #isGetter = false;

  computed = true;

  set: undefined | any = undefined;
  #setterValue: any | undefined = undefined;

  name: Property
  constructor(
    property: Property,
    descriptor: PropertyDescriptor,
    handler: StatefulHandler
  ) {
    this.name = property
    this.#property = property;
    this.#descriptor = descriptor;
    this.#adm = handler.adm;
    this.#proxy = handler.receiver;
    if (descriptor.set) {
      this.set = (value: any) => {
        this.#descriptor.set?.call(this.#proxy, value);
        const prevValue = this.#setterValue;
        this.#setterValue = value;
        if (!comparator(prevValue, this.#setterValue)) this.#report(value);
      };
      // this.#isGetter = true;
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
    // if (!this.#changed) return;
    const prevValue = this.#value;
    this.#reader();
    this.#changed = false;
    if (!comparator(prevValue, this.#value)) this.#report(this.#value);
  }

  #report(value: any) {
    this.#adm.report(this.#property, value);
    if (!lib.action) this.#adm.batch();
  }

  /** Read getter value in a transaction and subscribes to observables */
  #reader() {
    // Don't remember why we should do this...
    // let value = result
    // if (Array.isArray(result)) value = Array.from(result);
    // if (result != null && result instanceof Set) value = new Set(result);
    // if (result != null && result instanceof Map) value = new Map(result);
    this.#value = lib.executor.execute(this);
  }


  /** A trap for original descriptor getter */
  get = () => {
    // console.log(args)
    if (!lib.action) this.#adm.batch();
    if (this.#first) {
      this.#reader();
      this.#first = false;
      return this.#value;
    }
    if (this.deps?.size === 0) return this.run();

    if (this.#changed) {
      // console.log('this.#changed === true', this.#isGetter, this.#property)
      // this.#isGetter ? this.#reader() : this.#compute();
      // this.#changed = false;
      this.#compute();
      return this.#value;
    }

    if (this.#adm.current?.has(this)) {
      this.#reader();
      this.#adm.report(this.#property, this.#value);
      return this.#value;
    }

    return this.#value;
  };
}
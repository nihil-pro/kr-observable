import { ObservableAdministration } from './Observable.administration.js';
import { lib } from './global.this.js';

/** Custom property descriptor.
 * Memoize getters return value */
export class ObservableComputed {
  #property: string | symbol;
  #descriptor: PropertyDescriptor;
  #adm: ObservableAdministration;
  enumerable = false;
  configurable = true;

  /** Ref to original target proxy.
   * Can't use target because properties access won't be tracked,
   * and access to private properties won't work. */
  #proxy: object;

  /** Stores getter value */
  #value: any;

  /** Signify that getter result was changed */
  #changed = true;

  /** Indicates that getter wasn't read  */
  #first = true;

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
  }

  #equal = (prev: any) => {
    if (this.#value == null) {
      return prev == null;
    }
    return this.#value.equal(prev);
  };

  /** Subscriber <br/>
   * Will be invoked when one of read observable changes
   * */
  #update = () => {
    // if property will be accessed earlier than below microtask will be executed,
    // we'll call original getter to get current result
    this.#changed = true;
    // without this, nested computed won't work stable
    queueMicrotask(this.#compute);
  };

  #compute = () => {
    // means that microtask was queued, but getter was accessed before microtask start execution
    if (this.#changed === false) {
      return;
    }
    const prevValue = this.#value;
    this.#reader();
    this.#changed = false;
    if (!this.#equal(prevValue)) {
      this.#adm.report(this.#property, this.#value);
      this.#adm.state = 1;
      this.#adm.batch();
    }
  };

  /** Read getter value in a transaction and subscribes to observables */
  #reader = () => {
    const { read, result } = lib.transactions.transaction(
      () => this.#descriptor.get?.call(this.#proxy),
      () => void 0,
      false
    );
    read.forEach((keys, adm) => adm.subscribe(this.#update, keys));
    this.#value = result;
  };

  /** A trap for original descriptor getter */
  get = () => {
    // enable sync batching
    this.#adm.batch();

    // if property was changed, we should compare current value to previous
    // and report if they aren't equal.
    if (this.#changed) {
      // no need to report if this is the first access
      // todo (maybe can be safety removed, need more tests)
      if (this.#first) {
        this.#first = false;
        this.#reader();
        return this.#value;
      }

      this.#compute();
      return this.#value;
    }
    if (lib.changedInEffect.has(this.#adm)) {
      this.#changed = false;
      this.#reader();
      lib.changedInEffect.delete(this.#adm);
    }
    return this.#value;
  };
}

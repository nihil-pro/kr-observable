import { ObservableAdministration } from './Observable.administration.js';
import { lib } from './global.this.js';

/** Custom property descriptor.
 * Memoize getters return value */
export class ObservableComputed {
  #property: string | symbol;
  #descriptor: PropertyDescriptor;
  #adm: ObservableAdministration;
  enumerable: boolean | undefined;
  configurable: boolean | undefined;

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
    this.configurable = descriptor.configurable;
    this.enumerable = descriptor.enumerable;
  }

  /** Subscriber <br/>
   * Will be invoked when one of read observable changes
   * */
  #update = () => {
    // if property will be accessed earlier than below microtask will be executed,
    // we'll call original getter to get current result
    this.#changed = true;

    // without this, nested computed won't work stable
    queueMicrotask(() => {
      if (this.#changed === false) {
        // means that microtask was queued, but getter was accessed before microtask start execution
        return;
      }
      const prevValue = this.#value;
      this.#reader();
      this.#changed = false;
      let shouldReport: boolean;
      if (prevValue == null) {
        shouldReport = this.#value != null;
      } else {
        shouldReport = !prevValue.equal(this.#value);
      }
      if (shouldReport) {
        this.#adm.report(this.#property, this.#value);
        this.#adm.state = 1;
        this.#adm.batch();
      }
    });
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
      const prevValue = this.#value;
      this.#reader();
      this.#changed = false;
      // no need to report if this is the first access
      if (this.#first) {
        this.#first = false;
        return this.#value;
      }
      let shouldReport: boolean;
      if (prevValue == null) {
        shouldReport = this.#value != null;
      } else {
        shouldReport = !prevValue.equal(this.#value);
      }
      if (shouldReport) {
        this.#adm.report(this.#property, this.#value);
        this.#adm.state = 1;
        this.#adm.batch(true);
      }
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

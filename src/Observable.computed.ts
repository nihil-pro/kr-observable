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

  /** Is used to subscribe once */
  #uncalled = true;

  /** Stores getter value */
  #value: any;

  /** Signify that getter result was changed */
  #changed = false;

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

  /** Subscriber */
  #update = () => {
    // if property will be accessed earlier than below microtask will be executed,
    // we'll call original getter to get current result
    this.#changed = true;

    // without this, nested computed won't work stable
    queueMicrotask(() => {
      const prevValue = this.#value;
      // toDo
      // need tests, and maybe this should be called inside transaction,
      // for cases when computed includes conditional expressions where different properties are accessed
      this.#value = this.#descriptor.get?.call(this.#proxy);
      // if property will be accessed before we'll call batch below,
      // we'll return memoized value
      this.#changed = false;
      if (prevValue !== this.#value) {
        this.#adm.report(this.#property, this.#value);
        this.#adm.state = 1;
        this.#adm.batch();
      }
    });
  };

  get = () => {
    // first call
    if (this.#uncalled) {
      const { read } = lib.transactions.transaction(
        () => {
          // get and store result
          this.#value = this.#descriptor.get?.call(this.#proxy);
        },
        () => void 0
      );
      this.#uncalled = false;
      // subscribe to changes of read observables
      read?.forEach((keys, adm) => adm.subscribe(this.#update, keys));
    }
    // is accessed before microtask in subscriber is executed
    if (this.#changed) {
      this.#value = this.#descriptor.get?.call(this.#proxy);
      this.#changed = false;
    }
    return this.#value;
  };
}

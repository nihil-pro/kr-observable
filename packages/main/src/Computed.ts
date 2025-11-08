import { Admin } from './Admin.js';
import { Runnable, Property, StatefulHandler, Setter } from './types.js';
import { Utils } from './Utils.js';
import { Global } from './global.js';

/**
 * Computed property memoizes its result and reacts to dependency changes.
 *
 * Implements both PropertyDescriptor (to replace original accessor descriptor) and
 * Runnable (as it's a reactive computation that depends on other properties).
 * @see Runnable
 * @see PropertyDescriptor
 */
export class Computed implements Runnable, PropertyDescriptor {
  // PropertyDescriptor interface + get method below
  enumerable: boolean | undefined;
  configurable: boolean | undefined;
  set?: Setter;

  // Runnable interface + subscribe and run methods below
  runId = 1;
  debug = false;
  active = false;
  deps?: Set<Set<Runnable>>;

  /** Reference to Computed owner Admin */
  #adm: Admin;

  /** The property name this computed represents */
  #property: Property;

  /** Original descriptor only to keep original get/set */
  #descriptor: PropertyDescriptor;

  /** Stores computed value */
  #value: any;

  /** Value set via setter (if setter is defined) */
  #setterValue: any | undefined;

  /**
   * Signifies that getter result was changed.
   * Used when subscriber is invoked, but this computed has no subscribers.
   * In this case we avoid computations, and only recompute on demand.
   */
  changed = false;

  /** A flag for Admin (faster than instanceof checks in hot-path) */
  computed = true;

  name: any

  constructor(
    property: Property,
    descriptor: PropertyDescriptor,
    handler: StatefulHandler
  ) {
    // Keep original enumerability and configurability
    this.enumerable = descriptor.enumerable;
    this.configurable = descriptor.configurable;

    this.#property = property;
    this.#descriptor = descriptor;
    this.#adm = handler.adm;

    // If this is a getter/setter pair, define our setter to handle mutations
    if (descriptor.set) {
      this.set = (value: any) => {
        // Since this is a converted descriptor from factory,
        // it is already bound to proxy, so direct call is safe
        this.#descriptor.set(value);
        const prevValue = this.#setterValue;
        this.#setterValue = value;
        this.#report(prevValue, value);
      };
    }
  }

  /**
   * Will be invoked when one of the computed dependencies changes
   * @see Runnable
   */
  subscriber() {
    this.changed = true;

    // Early return if no one is listening to this computed property
    // Note that we can't save a reference to this list,
    // because it can be deleted in future
    if (this.#adm.deps.get(this.#property)?.size === 0) {
      return;
    }

    // Recompute if there are subscribers
    this.compute();
  }

  /**
   * Executes the original getter and collects dependencies
   * @see Runnable
   * @see Executor
   */
  run() {
    return this.#descriptor.get();
  }

  /** Recompute value */
  compute() {
    const prev = this.#value;
    this.#reader();
    this.#report(prev, this.#value);
  }

  /**
   * Compare previous and new value, and report changes if different
   * @param prevValue - Previous value for comparison
   * @param newValue - New value to report if changed
   */
  #report(prevValue: any, newValue: any) {
    if (!Utils.isDeepEqual(prevValue, newValue)) {
      this.#adm.report(this.#property, newValue);
    }

    if (Global.action) return;

    // Required, because:
    // 1) If this is called from subscriber, we are looping through adm changes right now,
    //    but changes added after starting loop are invisible for current iterator,
    //    we have to start processing changes again.
    // 2) If this is called because this.#adm.current?.has(this) === true,
    //    then same as described above – we have to start processing changes again.
    // Otherwise, we will lose this reported change.
    this.#adm.batch();
  }

  /** Execute getter with dependency tracking */
  #reader() {
    // TODO: Investigate why this is needed
    // Don't remember why I added this...
    // let value = result
    // if (Array.isArray(result)) value = Array.from(result);
    // if (result != null && result instanceof Set) value = new Set(result);
    // if (result != null && result instanceof Map) value = new Map(result);

    this.#value = Global.executor.execute(this);
  }

  /**
   * The computed getter - returns memoized value or recomputes if dirty
   *
   * Overwrites descriptor original getter
   * @see PropertyDescriptor
   */
  get = () => {
    if (!Global.action) {
      // This is for uncontrolled flow!
      // Example:
      // This computed depends on property "b" of some observable.
      // That property was changed from an uncontrolled flow (outside an action).
      // A batch call was enqueued via queueMicrotask, but somewhere below in code,
      // we read this computed property before microtask was executed.
      // In this case we don't know yet that we are dirty and should recompute,
      // but since adm.changes has property "b", calling batch here will notify us,
      // we will recompute, report change and call batch again.
      this.#adm.batch();
    }

    // First access - initialize dependencies and compute value
    if (!this.deps) {
      this.#reader();
      return this.#value;
    }

    // If there are no dependencies, just run the getter directly
    if (this.deps?.size === 0) {
      return this.run();
    }

    // We are dirty, but when we were notified,
    // we had no subscribers and skipped computation.
    // Since we are interested now - recompute!
    if (this.changed) {
      this.changed = false;
      this.#reader();
    }

    // We are not changed, but we are in the current list of adm.
    // That means that we are in subscribers list of some property,
    // but somewhere at the end.
    // Another subscriber of that property depends on us, and it read us during its execution,
    // so we have to recompute early, otherwise that subscriber will receive our old #value
    if (this.#adm.current?.has(this)) {
      this.compute();
    }

    return this.#value;
  };
}
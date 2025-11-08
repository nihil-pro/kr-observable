import { Admin } from './Admin.js';
import { Runnable, Property } from './types.js';

export class Executor {
  /** `LiFo` stack. Allows to track nested runnable execution. */
  static #stack: Runnable[] = [];

  /** Subscribes Runnable to property changes.
   *
   * When an Observable property is accessed through a ProxyHandle trap,
   * it should invoke this method.
   *
   * The third, `set` param, should be true, only if property is accessed from Proxy `set` trap.
   *
   * @see ProxyHandler */
  static report(adm: Admin, property: Property, set = false) {
    if (!this.#stack.length) return;
    const runnable = this.#stack[this.#stack.length - 1];

    if (set) {
      // Simple trick which allows to avoid infinite reaction loop
      // If property was read during runnable execution, we will subscribe to its changes,
      // but if it was then changed, we just unsubscribe.
      // Example:
      // const obs = makeObservable({ a: true, b: false })
      // autorun( () => obs.a = obs.b )
      // In code above, autorun will subscribe only to property "b".
      adm.unsubscribe(property, runnable);
    } else {
      adm.subscribe(property, runnable);
    }
  }

  /** Execute a runnable and store read Observables */
  static execute(runnable: Runnable, ...rest: any[]) {
    // Mark as active. This allows to ignore effect execution during it's execution
    runnable.active = true;

    // TODO
    // We should keep properties read during executions and their owner name
    // if (runnable.debug) runnable.read = new Set;

    // First execution.
    if (!runnable.deps) {
      runnable.deps = new Set;
    } else {
      // Another bottleneck, but is really necessary.
      // 1) We can't mark runnable as stalled or something like that,
      //    because a runnable can depends on different observables
      //    and different properties in those observables.
      // 2) We can't mark the property itself as stalled, due to unexpected behaviour,
      //    at least in current implementation.
      // The only way it works predictable, is to totally remove runnable from all list of subscribers,
      // where it is presented, before re-execution.
      // That way we are sure, that reaction is invoked only when necessary.
      // See also Admin.subscribe and Karlovskiy.test.ts
      this.dispose(runnable);
    }
    this.#stack.push(runnable);

    // Currently, the only reason to use ...rest is observable HOC for preact/react.
    // This allows to pass props/ref to the component.
    // It makes other reactions a little-bit slower, but is negligible.
    const result = runnable.run(...rest);
    this.#stack.pop();
    runnable.active = false;
    return result;
  }

  /** Unsubscribe from all subscriptions */
  static dispose(runnable: Runnable) {
    // runnable will be used as `this` argument for unsubscribe callback
    runnable.deps.forEach(this.unsubscribe, runnable);
  }

  /** Remove this runnable from a dependency list
   * Used as callback for forEach with runnable bound as `this`
   * */
  static unsubscribe(list: Set<Runnable>) {
    list.delete(this as unknown as Runnable)
  }
}
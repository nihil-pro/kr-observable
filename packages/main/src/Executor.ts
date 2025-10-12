import { Admin } from './Admin.js';
import { Runnable, Property } from './types.js';

export class Executor {
  /** `LiFo` stack. Allows to track nested runnable execution. */
  static #stack: Runnable[] = [];

  /** All read methods of ProxyHandler should invoke it to report read.
   * The third "set" argument when is true, means that property was changed in an effect.
   * This allows to unsubscribe that property from reaction and avoid infinite loops.
   * @see ProxyHandler */
  static report(adm: Admin, property: Property, set = false) {
    if (!this.#stack.length) return;
    const runnable = this.#stack[this.#stack.length - 1];
    const deps = adm.subscribe(property, runnable);
    if (!deps) return;
    if (set) {
      deps?.delete(runnable);
      runnable.read?.delete(adm);
      return;
    }
    // save a reference to the property subscribers,
    // that will allow runnable to remove itself from that list
    if (!runnable.deps.has(deps)) runnable.deps.add(deps);
    // for debug reasons
    runnable.read?.add(adm);
  }

  /** Execute a runnable and store read Observables */
  static execute(runnable: Runnable, ...rest: any[]) {
    // Mark as active. This allows to ignore effect execution during it's execution
    runnable.active = true;
    if (runnable.debug) runnable.read = new Set;
    if (!runnable.deps) {
      runnable.deps = new Set;
    } else {
      // Clear deps before execution. This allows to run only on what actually reaction depends on
      this.dispose(runnable);
    }
    this.#stack.push(runnable);
    const result = runnable.run(...rest);
    this.#stack.pop();
    runnable.active = false;
    return result;
  }

  static dispose(runnable: Runnable) {
    runnable.deps.forEach(this.unsubscribe, runnable);
  }

  static unsubscribe(list: Set<Runnable>) {
    list.delete(this as unknown as Runnable)
  }
}

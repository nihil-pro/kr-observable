import { Admin } from './Admin.js';
import { Runnable, Property } from './types.js';

export class Executor {
  /** `LiFo` stack. Allows to track nested runnable execution. */
  static #stack: Runnable[] = [];

  /** The `get` method of ObservableProxyHandler invoque this every time a property is read
   * @see ObservableProxyHandler */
  static report(adm: Admin, property: Property, set = false) {
    if (adm.untrack) return;
    if (!this.#stack.length) return;
    if (adm.ignore.has(property)) return;
    const runnable = this.#stack[this.#stack.length - 1];
    let deps = adm.deps.get(property);
    if (set) {
      deps?.delete(runnable);
      runnable.read?.delete(adm);
      return;
    }
    if (!deps) {
      deps = new Set();
      adm.deps.set(property, deps);
    }
    deps.add(runnable);
    runnable.deps.add(deps);
    runnable.read?.add(adm);
  }

  /** Execute a runnable and store read Observables */
  static execute(runnable: Runnable) {
    runnable.active = true;
    if (runnable.debug && !runnable.read) {
      runnable.read = new Set;
    }
    if (!runnable.deps) {
      runnable.deps = new Set;
    } else {
      runnable.deps.forEach((list) => list.delete(runnable));
    }
    this.#stack.push(runnable);
    const result = runnable.run();
    this.#stack.pop();
    runnable.active = false;
    return result;
  }
}

import { ObservableAdm } from './Observable.adm.js';
import { ObservedRunnable, Property } from './types.js';

/** Stores Runnable execution result
 * @see ObservedRunnable */
class ExecutionResult {
  read?: Set<ObservableAdm>;

  deps: Set<Set<ObservedRunnable>> = new Set();

  /** Execution result */
  result: any;
}

export class ObservableExecutor {
  /** `LiFo` stack. Allows to track nested runnable execution. */
  static #stack: Array<{ runnable: ObservedRunnable; result: ExecutionResult }> = [];

  /** Stores relation between a runnable and Observables read by it execution */
  static #registry: Map<ObservedRunnable, ExecutionResult> = new Map();

  /** The `get` method of ObservableProxyHandler invoque this every time a property is read
   * @see ObservableProxyHandler */
  static report(adm: ObservableAdm, property: Property, set = false) {
    if (adm.untrack) return;
    if (!this.#stack.length) return;
    if (adm.ignore.has(property)) return;
    const stackEntry = this.#stack[this.#stack.length - 1];
    const { runnable, result } = stackEntry;

    let deps = adm.deps.get(property);
    if (set) {
      deps?.delete(runnable);
      result.read?.delete(adm);
      return;
    }

    if (!deps) {
      deps = new Set();
      adm.deps.set(property, deps);
    }
    deps.add(runnable);
    result.read?.add(adm);
    result.deps.add(deps);
  }

  /** Execute a runnable and store read Observables */
  static execute(runnable: ObservedRunnable): ExecutionResult {
    runnable.active = true;
    let result = this.#registry.get(runnable);
    if (!result) {
      result = new ExecutionResult();
      if (runnable.debug) result.read = new Set();
      this.#registry.set(runnable, result);
    } else {
      result.deps.forEach((list) => list.delete(runnable));
    }
    this.#stack.push({ runnable, result });
    result.result = runnable.run();
    this.#stack.pop();
    runnable.active = false;
    return result;
  }

  /** Unsubscribes from Observables read during passed runnable execution */
  static dispose(runnable: ObservedRunnable) {
    this.#registry.delete(runnable);
  }

  static get(runnable: ObservedRunnable) {
    return this.#registry.get(runnable);
  }
}

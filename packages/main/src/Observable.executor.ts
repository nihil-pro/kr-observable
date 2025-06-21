import { ObservableAdm } from './Observable.adm.js';
import { ObservedRunnable, Property } from './types.js';

/** Stores ObservedRunnable execution result
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
    if (!this.#stack.length) return;
    if (adm.ignore.has(property)) return;
    const stackEntry = this.#stack[this.#stack.length - 1];
    const { runnable, result } = stackEntry;
    if (set) {
      const deps = adm.deps.get(property);
      deps?.delete(runnable);
      result.read?.delete(adm);
      return;
    }
    let deps = adm.deps.get(property);
    if (!deps) {
      deps = new Set();
      adm.deps.set(property, deps);
      result.read?.add(adm);
    }
    deps.add(runnable);
    result.deps.add(deps);
  }

  static current: ObservedRunnable | undefined;

  /** Execute a runnable and store read Observables */
  static execute(runnable: ObservedRunnable): ExecutionResult {
    this.current = runnable;
    let result = this.#registry.get(runnable);
    if (!result) {
      result = new ExecutionResult();
      if (runnable.debug) result.read = new Set();
      this.#registry.set(runnable, result);
    } else {
      result.deps.forEach((list) => list.delete(runnable));
    }
    this.#stack.push({ runnable, result });
    if (runnable.isAsync) {
      return this.asyncExecutor(runnable, result) as unknown as ExecutionResult;
    }
    return this.syncExecutor(runnable, result);
  }

  static syncExecutor(runnable: ObservedRunnable, result: ExecutionResult) {
    result.result = runnable.run();
    this.#stack.pop();
    this.current = undefined;
    return result;
  }

  static async asyncExecutor(runnable: ObservedRunnable, result: ExecutionResult) {
    result.result = await runnable.run();
    this.#stack.pop();
    this.current = undefined;
    return result;
  }

  /** Unsubscribes from Observables read during passed runnable execution */
  static dispose(runnable: ObservedRunnable) {
    this.#registry.delete(runnable);
    runnable.disposed = true;
  }
}

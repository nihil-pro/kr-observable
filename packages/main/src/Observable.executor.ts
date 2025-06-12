import { ObservableAdm } from './Observable.adm.js';
import { ObservedRunnable, Property } from './types.js';

/** Stores ObservedRunnable execution result
 * @see ObservedRunnable */
class ExecutionResult {
  read: Set<ObservableAdm> = new Set();

  /** If the execution fails, it will contain thrown error */
  error: undefined | Error;

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

    // Cache the last stack entry once (0.3ms → 0.1ms)
    const stackEntry = this.#stack[this.#stack.length - 1];
    const { runnable, result } = stackEntry;

    runnable.invalid = false;

    if (set) {
      const deps = adm.deps.get(property); // Single lookup
      deps?.delete(runnable);
      result.read.delete(adm);
      return;
    }

    let deps = adm.deps.get(property);
    if (!deps) {
      deps = new Set();
      adm.deps.set(property, deps);
    }

    if (!deps.has(runnable)) {
      deps.add(runnable);
      result.read.add(adm);
    }
  }

  static current: ObservedRunnable | undefined;

  /** Execute a runnable and store read Observables */
  static execute(runnable: ObservedRunnable): ExecutionResult {
    this.current = runnable;
    let result = this.#registry.get(runnable);
    if (!result) {
      result = new ExecutionResult();
      this.#registry.set(runnable, result);
    } else {
      this.unsubscribe(result.read, runnable);
      // runnable.invalid = true;
    }
    this.#stack.push({ runnable, result });
    if (runnable.isAsync) {
      return this.asyncExecutor(runnable, result) as unknown as ExecutionResult;
    }
    return this.syncExecutor(runnable, result);
  }

  static syncExecutor(runnable: ObservedRunnable, result: ExecutionResult) {
    try {
      result.result = runnable.run();
    } catch (e) {
      result.error = e as Error;
    }
    this.#stack.pop();
    this.current = undefined;
    return result;
  }

  static async asyncExecutor(runnable: ObservedRunnable, result: ExecutionResult) {
    try {
      result.result = await runnable.run();
    } catch (e) {
      result.error = e as Error;
    }
    this.#stack.pop();
    this.current = undefined;
    return result;
  }

  /** Unsubscribes from Observables read during passed runnable execution */
  static dispose(runnable: ObservedRunnable) {
    // const res = this.#registry.get(runnable);
    // if (res) {
    //   this.unsubscribe(res.read, runnable);
    //   this.#registry.delete(runnable);
    // }
    runnable.invalid = true;
    this.#registry.delete(runnable);
  }

  static unsubscribe(adms: Set<ObservableAdm>, runnable: ObservedRunnable) {
    adms.forEach((adm) => {
      adm.deps.forEach((list) => list.delete(runnable));
    });
  }
}

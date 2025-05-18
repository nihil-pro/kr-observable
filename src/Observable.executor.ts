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
  static report(adm: ObservableAdm, property: Property) {
    if (this.#stack.length === 0) return;
    let deps = adm.deps.get(property);
    if (!deps) {
      deps = new Set<ObservedRunnable>();
      adm.deps.set(property, deps);
    }
    const { runnable, result } = this.#stack[this.#stack.length - 1];
    deps.add(runnable);
    result.read.add(adm);
  }
  static current: ObservedRunnable | undefined;

  /** Execute a runnable and store read Observables */
  static execute(runnable: ObservedRunnable) {
    this.current = runnable;
    let result = this.#registry.get(runnable);
    if (!result) {
      result = new ExecutionResult();
      this.#registry.set(runnable, result);
    } else {
      this.unsubscribe(result.read, runnable);
    }
    this.#stack.push({ runnable, result });
    try {
      result.result = runnable.run();
    } catch (e) {
      result.error = e as Error;
    }
    this.#stack.pop();
    this.current = undefined;
    return result;
  }

  /** Unsubscribes from Observables read during passed runnable execution */
  static dispose(runnable: ObservedRunnable) {
    const res = this.#registry.get(runnable);
    if (res) {
      this.unsubscribe(res.read, runnable);
      this.#registry.delete(runnable);
    }
  }

  static unsubscribe(adms: Set<ObservableAdm>, runnable: ObservedRunnable) {
    adms.forEach((adm) => {
      adm.deps.forEach((list) => list.delete(runnable));
    });
  }
}

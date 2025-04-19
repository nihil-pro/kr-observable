import { ObservableAdm } from './Observable.adm.js';
import { ObservedRunnable, Property } from './types.js';

/** Stores ObservedRunnable execution result
 * @see ObservedRunnable */
class ExecutionResult {
  read: Map<ObservableAdm, Set<Property>> = new Map();

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
    const { runnable, result } = this.#stack[this.#stack.length - 1];
    let keys = result.read.get(adm);
    if (!keys) {
      keys = new Set(); // we'll use to subscribe
      result.read.set(adm, keys);
      if (runnable.autosub) {
        adm.subscribers.set(runnable, keys);
      }
    }
    keys.add(property);
  }

  /** Execute a runnable and store read Observables */
  static execute(runnable: ObservedRunnable) {
    let result = this.#registry.get(runnable);
    if (!result) {
      result = new ExecutionResult();
      this.#registry.set(runnable, result);
    }
    this.#stack.push({ runnable, result });
    try {
      result.result = runnable.run();
    } catch (e) {
      result.error = e as Error;
    }
    this.#stack.pop();
    return result;
  }

  /** Unsubscribes from Observables read during passed runnable execution */
  static dispose(runnable: ObservedRunnable) {
    const res = this.#registry.get(runnable);
    if (res) {
      res.read.forEach((_, adm) => adm.subscribers.delete(runnable));
      this.#registry.delete(runnable);
    }
  }
}

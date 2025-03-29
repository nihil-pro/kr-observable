import { ObservableAdministration } from './Observable.administration.js';
import { ObservedRunnable } from './types.js';

/** Stores ObservedRunnable execution result
 * @see ObservedRunnable */
class ExecutionResult {
  read: Map<ObservableAdministration, Set<string | symbol>> = new Map();

  /** If the execution fails, it will contain thrown error */
  exception: undefined | Error;

  /** Execution result */
  result: any;
}

export class ObservableExecutor {
  /** `LiFo` stack. Allows to track nested runnable execution. */
  static #stack: Array<{ runnable: ObservedRunnable; result: ExecutionResult }> = [];

  /** Stores relation between a runnable and Observables read by it execution */
  static #registry: WeakMap<ObservedRunnable, ExecutionResult> = new WeakMap();

  /** The `get` method of ObservableProxyHandler invoque this every time a property is read
   * @see ObservableProxyHandler */
  static report(adm: ObservableAdministration, key: string | symbol) {
    if (this.#stack.length === 0) return;
    const { runnable, result } = this.#stack[this.#stack.length - 1];
    let keys = result.read.get(adm);
    if (!keys) {
      keys = new Set(); // we'll use to subscribe
      result.read.set(adm, keys);
      if (runnable.autosub) {
        adm.subscribe(new WeakRef(runnable), keys);
      }
    }
    keys.add(key);
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
      result.exception = e as Error;
    }
    this.#stack.pop();
    return result;
  }

  /** Unsubscribes from Observables read during passed runnable execution */
  static dispose(runnable: ObservedRunnable) {
    this.#registry.delete(runnable);
  }
}

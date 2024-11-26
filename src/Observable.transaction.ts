import { ObservableAdministration } from './Observable.administration.js';
import { getGlobal } from './global.this.js';
import { Subscriber } from './types.js';

class WorkStats {
  count = 0;
  read: Map<ObservableAdministration, Set<string | symbol>> = new Map();
}

interface TransactionResult {
  stats: WorkStats,
  dispose: () => void,
  exception: undefined | Error
  result: any
}

class ObservableTransactionsImpl {
  static #track: Map<Function, WorkStats> = new Map();
  static #stack: Function[] = []

  static report(administration: ObservableAdministration, property: string | symbol) {
    const current = this.#stack.at(-1)
    if (!current || typeof property === 'symbol') { return; }
    const stats = this.#track.get(current);
    if (stats) {
      let read = stats.read.get(administration);
      if (!read) {
        read = new Set();
        stats.read.set(administration, read);
      }
      read.add(property);
    }
  }

  public static transaction = (work: Function, cb: Subscriber) => {
    let stats = this.#track.get(work);
    if (!stats) {
      stats = new WorkStats();
      this.#track.set(work, stats);
    }
    let result: any;
    let exception!: Error;
    try {
      this.#stack.push(work)
      result = work();
      this.#stack.pop()
      stats.count++;
      stats.read.forEach((k, o) => o.subscribe(cb, k));
    } catch (e) {
      exception = e as Error;
    }
    return {
      stats,
      result,
      exception,
      dispose: () => {
        stats?.read.forEach((_, o) => o.unsubscribe(cb));
        stats?.read.clear();
        this.#track.delete(work);
      }
    };
  };
}

// This is for Webpack Module Federation V1
// we should only use one instance of ObservableTransactionsImpl
const TransactionExecutor = Symbol.for('ObservableTransactions');
const _self = getGlobal();

if (!(TransactionExecutor in _self)) {
  Reflect.set(_self, TransactionExecutor, ObservableTransactionsImpl);
}

declare global {
  interface Window {
    [TransactionExecutor]: {
      transaction(work: Function, cb: Subscriber): TransactionResult
      notify(subscriber: Subscriber, changes?: Set<string | symbol>): void
      report(administration: ObservableAdministration, property: string | symbol): void
    };
  }
}

export const ObservableTransactions = _self[TransactionExecutor];
export function autorun(fn: () => void ) {
  const { dispose } = ObservableTransactions.transaction(fn, fn)
  return dispose
}
import { ObservableAdministration } from './Observable.administration.js';
import { getGlobal } from './global.this.js';
import { Subscriber } from './types.js';

interface WorkStats {
  count: number;
  read: Map<ObservableAdministration, Set<string | symbol>>;
  current: Map<ObservableAdministration, Set<string | symbol>>;
  dispose: () => void | undefined,
  exception: undefined | Error
  result: any
}

function workStats() {
  return {
    count: 0,
    read: new Map<ObservableAdministration, Set<string | symbol>>,
    current: new Map<ObservableAdministration, Set<string | symbol>>,
    exception: undefined,
    result: undefined,
    dispose: undefined
  }
}

export interface TransactionResult {
  stats: WorkStats,
  dispose: () => void,
  exception: undefined | Error
  result: any
}

class ObservableTransactionsImpl {
  static #track: Map<Function, WorkStats> = new Map();
  static #stack: Function[] = []
  static #current: Function | undefined
  static report(administration: ObservableAdministration, property: string | symbol) {
    // const current = this.#stack.at(-1)
    const stats = this.#track.get(this.#current);
    if (stats) {
      let read = stats.current.get(administration);
      if (!read) {
        read = new Set();
        stats.current.set(administration, read);
      }
      read.add(property);
    }
  }

  public static transaction = (work: Function, cb: Subscriber, syncSubscribe = true) => {
    let stats = this.#track.get(work);
    if (!stats) {
      stats = workStats()
      this.#track.set(work, stats);
    }
    let result: any;

    try {
      this.#stack.push(work)
      result = work();
      this.#stack.pop()
      stats.count++;
      stats.result = result

      Promise.resolve(stats)
        .then($stats => {
          if (this.#current === work || !this.#track.has(work)) { return; }
          // if (this.#stack.at(-1) === work || !this.#track.has(work)) { return; }
          for (const adm of $stats.read.keys()) {
            if (!$stats.current.has(adm)) {
              adm.unsubscribe(cb)
              $stats.read.delete(adm)
            }
          }
          for (const [adm, keys] of $stats.current) {
            const existed = $stats.read.get(adm)
            if (!existed) {
              $stats.read.set(adm, keys)
              adm.subscribe(cb, keys)
            } else {
              keys.forEach(key => existed.add(key))
            }
          }
          $stats.current.clear()
        })

    if (!stats.dispose) {
      stats.dispose = () => {
        // if (this.#stack.at(-1) === work) { return; }
        if (this.#current === work) { return; }
        // stats.read.forEach((_,o) => o.unsubscribe(cb))
        // stats.read.clear()
        this.#track.delete(work)
      }
    }

    } catch (e) {
      stats.exception = e as Error;
    }
    return stats
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
      transaction(work: Function, cb: Subscriber, subscribeSync?: boolean): TransactionResult
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
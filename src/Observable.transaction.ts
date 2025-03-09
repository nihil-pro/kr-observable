import { ObservableAdministration } from './Observable.administration.js';
import { Subscriber } from './types.js';

export interface WorkStats {
  count: number;
  read: Map<ObservableAdministration, Set<string | symbol>>;
  dispose: () => void | undefined;
  exception: undefined | Error;
  result: any;
}

function workStats() {
  return {
    count: 0,
    read: new Map<ObservableAdministration, Set<string | symbol>>(),
    exception: undefined,
    result: undefined,
    dispose: undefined,
  };
}

export class ObservableTransactions {
  static #track: Map<Function, WorkStats> = new Map();
  static #stack: Function[] = [];
  static report(administration: ObservableAdministration, property: string | symbol) {
    const current = this.#stack.at(-1);
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
  static transaction = (work: Function, cb: Subscriber, autosub = true) => {
    let stats = this.#track.get(work);
    if (!stats) {
      stats = workStats();
      this.#track.set(work, stats);
    }
    let result: any;
    try {
      this.#stack.push(work);
      result = work();
      this.#stack.pop();
      stats.count++;
      stats.result = result;
      if (autosub) {
        stats.read.forEach((keys, adm) => adm.subscribe(cb, keys));
      }

      if (!stats.dispose) {
        stats.dispose = () => this.#track.delete(work);
      }
    } catch (e) {
      stats.exception = e as Error;
    }
    return stats;
  };
  static get = (work: Function) => this.#track.get(work);
  static dispose = (work: Function) => this.#track.delete(work);
}

import { ObservableAdministration } from './Observable.administration.js';

export class ObservableSet<T> extends Set<T> {
  #key: string | symbol;
  #adm: ObservableAdministration;
  constructor(key: string | symbol, adm: ObservableAdministration, iterable?: Iterable<T> | null) {
    super(iterable);
    this.#key = key;
    this.#adm = adm;
  }

  [Symbol.iterator]() {
    this.#adm.batch(true);
    return super[Symbol.iterator]();
  }

  add(value: T) {
    try {
      return super.add(value);
    } finally {
      this.#adm.report(this.#key, this);
      this.#adm.batch();
    }
  }

  delete(value: T) {
    try {
      return super.delete(value);
    } finally {
      this.#adm.report(this.#key, this);
      this.#adm.batch();
    }
  }

  clear() {
    try {
      return super.clear();
    } finally {
      this.#adm.report(this.#key, this);
      this.#adm.batch();
    }
  }
}

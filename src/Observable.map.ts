import { ObservableAdministration } from './Observable.administration.js';
import { lib } from './global.this.js';

export class ObservableMap<K, V> extends Map<K, V> {
  #key: string | symbol;
  #adm: ObservableAdministration;

  constructor(
    key: string | symbol,
    adm: ObservableAdministration,
    iterable?: Iterable<readonly [K, V]> | null
  ) {
    super(iterable);
    this.#key = key;
    this.#adm = adm;
  }

  [Symbol.iterator]() {
    this.#adm.batch(true);
    return super[Symbol.iterator]();
  }

  has(key: K): boolean {
    try {
      return super.has(key);
    } finally {
      // is needed to subscribe on a key in map
      lib.transactions.report(this.#adm, `${this.#key.toString()}.${key}`);
    }
  }

  get(key: K): V | undefined {
    try {
      this.#adm.batch(true);
      return super.get(key);
    } finally {
      // is needed to subscribe on a key in map
      lib.transactions.report(this.#adm, `${this.#key.toString()}.${key}`);
    }
  }

  set(key: K, value: V) {
    this.#adm.state = 0;
    try {
      return super.set(key, value);
    } finally {
      this.#adm.state = 1;
      this.#adm.report(`${this.#key.toString()}.${key.toString()}`, this, true);
      this.#adm.report(this.#key, this);
      queueMicrotask(this.#adm.batch);
    }
  }

  delete(key: K) {
    this.#adm.state = 0;
    try {
      return super.delete(key);
    } finally {
      this.#adm.state = 1;
      this.#adm.report(`${this.#key.toString()}.${key.toString()}`, this, true);
      this.#adm.report(this.#key, this);
      queueMicrotask(this.#adm.batch);
    }
  }

  clear() {
    this.#adm.state = 0;
    try {
      return super.clear();
    } finally {
      this.#adm.state = 1;
      this.#adm.report(this.#key, this);
      queueMicrotask(this.#adm.batch);
    }
  }
}

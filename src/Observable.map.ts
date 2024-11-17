import { ObservableAdministration } from './Observable.administration';

export class ObservableMap<K,V> extends Map<K,V> {
  #key: string | symbol
  #adm: ObservableAdministration
  constructor(key: string | symbol, adm: ObservableAdministration, iterable?: Iterable<readonly [K,V]> | null) {
    super(iterable);
    this.#key = key
    this.#adm = adm
  }

  set(key: K, value: V) {
    try {
      return super.set(key, value)
    } finally {
      this.#adm.report(`${this.#key.toString()}.${key.toString()}`, value)
      this.#adm.report(this.#key, value)
    }
  }

  delete(key: K) {
    try {
      return super.delete(key)
    } finally {
      this.#adm.report(`${this.#key.toString()}.${key.toString()}`, undefined)
      this.#adm.report(this.#key, undefined)
    }
  }

  clear() {
    try {
      return super.clear()
    } finally {
      this.#adm.report(this.#key, undefined)
    }
  }
}
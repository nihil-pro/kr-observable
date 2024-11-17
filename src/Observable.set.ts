import { ObservableAdministration } from './Observable.administration';

export class ObservableSet<T> extends Set<T> {
  #key: string | symbol
  #adm: ObservableAdministration
  constructor(key: string | symbol, adm: ObservableAdministration, iterable?: Iterable<T> | null) {
    super(iterable);
    this.#key = key
    this.#adm = adm
  }

  add(value: T) {
    try {
      return super.add(value)
    } finally {
      this.#adm.report(this.#key, value)
    }
  }

  delete(value: T) {
    try {
      return super.delete(value)
    } finally {
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
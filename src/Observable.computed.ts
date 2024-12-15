import { ObservableAdministration } from './Observable.administration.js';
import { ObservableTransactions } from './Observable.transaction.js';

export class ObservableComputed {
  #property: string | symbol
  #descriptor: PropertyDescriptor
  #adm: ObservableAdministration
  #proxy: object
  enumerable: boolean | undefined
  configurable: boolean | undefined
  #uncalled = true
  #value: any
  constructor(
    property: string | symbol,
    descriptor: PropertyDescriptor,
    adm: ObservableAdministration,
    proxy: object
  ) {
    this.#property = property
    this.#descriptor = descriptor
    this.#adm = adm
    this.#proxy = proxy
    this.configurable = descriptor.configurable
    this.enumerable = descriptor.enumerable
  }

  get = () => {
    this.#adm.batch()
    if (this.#uncalled) {
      const result = ObservableTransactions.transaction(
        () => this.#descriptor.get?.call(this.#proxy),
        () => {
          const prev = this.#value
          this.#value = this.#descriptor.get?.call(this.#proxy)
          if (prev !== this.#value) {
            this.#adm.report(this.#property, this.#value)
            this.#adm.state = 1
            this.#adm.batch()
          }
        }
      )
      this.#value = result.result
      this.#uncalled = false
      return this.#value
    }
    return this.#value
  }
}
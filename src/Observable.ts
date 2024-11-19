import { ObservableAdministration } from './Observable.administration.js';
import { ObservableTransactions } from './Observable.transaction.js';
import { ObservableMap } from './Observable.map.js';
import { ObservableSet } from './Observable.set.js';

// faster than check instanceof
const isObservable = Symbol('Observable')

Reflect.set(Array.prototype, 'set', function (i:number, value: unknown) {
  this[i] = value
})

class ObservableArray<T> extends Array<T> {
  #key: string | symbol
  #adm: ObservableAdministration

  constructor(key: string | symbol, adm: ObservableAdministration, ...items: T[]) {
    super(...items);
    this.#adm = adm || { report: () => {} } as unknown as ObservableAdministration
    this.#key = key || ''
  }

  push(...items: any[]): number {
    const observables = items.map(i => maybeMakeObservable(this.#key, i, this.#adm))
    try {
      return super.push(...observables)
    } finally {
      this.#adm.report(this.#key, items)
    }
  }

  unshift(...items: any[]): number {
    const observables = items.map(i => maybeMakeObservable(this.#key, i, this.#adm))
    try {
      return super.unshift(...observables)
    } finally {
      this.#adm.report(this.#key, items)
    }
  }

  splice(start: number, deleteCount?: number, ...items: T[]): T[] {
    const observables = items.map(i => maybeMakeObservable(this.#key, i, this.#adm))
    try {
      return super.splice(start, deleteCount, ...observables)
    } finally {
      this.#adm.report(this.#key, items)
    }
  }

  copyWithin(target: number, start: number, end?: number): this {
    try {
      return super.copyWithin(target, start, end)
    } finally {
      this.#adm.report(this.#key, this)
    }
  }

  pop() {
    try {
      return super.pop()
    } finally {
      this.#adm.report(this.#key, this)
    }
  }

  reverse() {
    try {
      return super.reverse()
    } finally {
      this.#adm.report(this.#key, this)
    }
  }

  shift() {
    try {
      return super.shift()
    } finally {
      this.#adm.report(this.#key, this)
    }
  }

  sort(compareFn?: (a: T, b: T) => number) {
    try {
      return super.sort(compareFn)
    } finally {
      this.#adm.report(this.#key, this)
    }
  }

  set(i: number, v: T) {
    try {
      super[i] = v
    } finally {
      this.#adm.report(this.#key, this)
    }
  }
}

/** Only plain object are allowed
 * @example makeObservable({ foo: 'bar' }) */
export function makeObservable<T extends object>(value: T): T & Observable {
  try {
    if (Object.prototype === Object.getPrototypeOf(value)) {
      // turn on deep observable for plain objects
      const plainAdm = new ObservableAdministration()
      Reflect.set(plainAdm, Symbol.for('whoami'), value)
      const proxiedValue = new Proxy({ [isObservable]: true }, observableProxyHandler(plainAdm))
      Object.entries(value).forEach(([key, value]) => {
        Reflect.defineProperty(proxiedValue, key, { value })
      })
      return proxiedValue
    }
    return undefined
  } catch (e) {
    throw new TypeError('Invalid argument. Only plain objects')
  }
}

function maybeMakeObservable(property: string | symbol, value: any, adm: ObservableAdministration) {
  if (!value) { return value; }
  if (typeof value !== 'object') { return value }
  if (value[isObservable]) { return value }

  if (value instanceof Map) {
    return new ObservableMap(property, adm, value)
  }

  if (value instanceof Set) {
    return new ObservableSet(property, adm, value)
  }

  if (Array.isArray(value)) {
    const observables = value.map(el => maybeMakeObservable(property, el, adm))
    return new ObservableArray(property, adm, ...observables)
  }

  if (value instanceof Date) {
    return new Proxy(value, structureProxyHandler(property, adm));
  }
  if (Object.prototype === Object.getPrototypeOf(value)) {
    return makeObservable(value)
  }
  return value;
}

const AdmKeys = Object.create(null, {})
Object.assign(AdmKeys, {
  report: 1,
  subscribe: 1,
  unsubscribe: 1,
  listen: 1,
  unlisten: 1
})

function observableProxyHandler(adm: ObservableAdministration) {
  return {
    get(target: any, property: string | symbol, receiver: any) {
      if (AdmKeys[property]) { return adm[property]; }
      const value = Reflect.get(target, property, receiver);

      // for serializer
      if (typeof property === 'symbol') {
        return value;
      }

      if (typeof value === 'function') {
        return function (...args: any[]) {
          return value.apply(receiver, args);
        };
      } else {
        ObservableTransactions.report(adm, property);
      }
      return value;
    },
    set(target: any, property: string, newValue: any, receiver: any) {
      if (target[property] === newValue) { return true; }
      const value = maybeMakeObservable(property, newValue, adm);
      target[property] = value
      adm.report(property, value);
      return true;
    },
    defineProperty(target: any, property: string, { value }: PropertyDescriptor) {
      if (!value) {
        target[property] = value
        return true;
      }
      target[property] = maybeMakeObservable(property, value, adm)
      return true
    }
  };
}

function structureProxyHandler(property: string | symbol, adm: ObservableAdministration) {
  return {
    get(target: any, key: string | symbol, receiver: any) {
      const value = target[key];
      if (key === 'toString') { return value }
      if (typeof value === 'function' && String(key).includes('set')) {
        return function (...args: any[]) {
          // @ts-ignore
          const result = value.apply(this === receiver ? target : this, args);
          adm.report(property, args)
          return result
        };
      } else {
        ObservableTransactions.report(adm, property)
      }
      return value;
    },
    set(target: any, key: string, newValue: any) {
      if (target[key] !== newValue) {
        target[key] = newValue;
        adm.report(property, newValue);
      }
      return true;
    }
  };
}

export class Observable {
  [isObservable] = true
  constructor() {
    const adm = new ObservableAdministration();
    Reflect.set(adm, Symbol.for('whoami'), this)
    return new Proxy(this, observableProxyHandler(adm))
  }
}

declare global {
  interface Array<T> {
    set(i: number, v: T): void
  }
}


export declare interface Observable extends ObservableAdministration {}

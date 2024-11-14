import { ObservableAdministration } from './Observable.administration.js';
import { ObservableTransactions } from './Observable.transaction.js';

// faster than check instanceof
const isObservable = Symbol('Observable')

class ObservableArray extends Array {
  #key: string | symbol
  #adm: ObservableAdministration

  constructor(key: string | symbol, adm: ObservableAdministration, ...items: any[]) {
    super(...items);
    this.#adm = adm
    this.#key = key
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

  splice<T>(start: number, deleteCount?: number, ...items: any[]): T[] {
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

  sort<T>(compareFn?: (a: T, b: T) => number) {
    try {
      return super.sort(compareFn)
    } finally {
      this.#adm.report(this.#key, this)
    }
  }
}

class ObservableMap<K, V> extends Map<K, V> {
  #key: string | symbol
  #adm: ObservableAdministration

  constructor(key: string | symbol, adm: ObservableAdministration, entries?: readonly (readonly [K, V])[] | null) {
    super(entries);
    this.#key = key
    this.#adm = adm
  }

  set(key: K, value: V): this {
    try {
      return super.set(key, value)
    } finally {
      this.#adm.report(`${this.#key.toString()}.${key.toString()}`, true)
      this.#adm.report(this.#key, value)
    }
  }

  delete(key: K): boolean {
    try {
      return super.delete(key)
    } finally {
      this.#adm.report(`${this.#key.toString()}.${key.toString()}`, true)
      this.#adm.report(this.#key, true)
    }
  }

  clear() {
    try {
      return super.clear()
    } finally {
      this.#adm.report(this.#key, true)
    }
  }
}

/** Only plain object are allowed
 * @example makeObservable({ foo: 'bar' }) */
export function makeObservable<T extends object>(value: T): T & Observable {
  if (!value || typeof value !== 'object' || value[isObservable]) {
    throw new TypeError('Only plain objects')
  }
  if (Object.prototype === Object.getPrototypeOf(value)) {
    // turn on deep observable for plain objects
    const plainAdm = new ObservableAdministration()
    Reflect.set(plainAdm, Symbol.for('whoami'), value)
    const proxiedValue = new Proxy({ [isObservable]: true }, observableProxyHandler(plainAdm))
    Object.entries(value).forEach(([key, value]) => Reflect.defineProperty(proxiedValue, key, { value }))
    return proxiedValue
  }
}

type Structure = 'Map' | 'Date'| 'Set'

function maybeMakeObservable(property: string | symbol, value: any, adm: ObservableAdministration) {
  if (
    !value ||
    typeof value !== 'object' ||
    value[isObservable]
    // value instanceof ObservableArray
  ) { return value; }

  if ([ Map, Array, Set, Date ].some(Constructor => value instanceof Constructor)) {
    const type = Reflect.getPrototypeOf(value).constructor.name as Structure
    if (Array.isArray(value)) {
      // console.log(value instanceof ObservableArray, value)
      const observables = value.map(el => maybeMakeObservable(property, el, adm))
      return new ObservableArray(property, adm, ...observables)
      // return new Proxy(value, arrayProxyHandler(property, adm));
    }
    if (value instanceof Map) {
      // @ts-ignore
      return new ObservableMap(property, adm, value, adm[Symbol.for('whoami')])
    }
    return new Proxy(value, structureProxyHandler(property, adm, type));
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
  let t
  return {
    get(target: any, property: string | symbol, receiver: any) {
      if (AdmKeys[property]) {
        return adm[property] //Reflect.get(adm, property, receiver);
      }
      const value = target[property] //Reflect.get(target, property, receiver);

      if (Array.isArray(value)) {
        const prev = value.length
        try {
          return value
        } finally {
          // clearTimeout(t)
          // t = setTimeout(() => {
          //   let shouldReport = false
          //   value.forEach((el, i) => {
          //     if (el && typeof el === 'object') {
          //       shouldReport = true
          //       value[i] = maybeMakeObservable(property, el, adm)
          //     }
          //     if (shouldReport || prev !== value.length) {
          //       adm.report(property, true)
          //     }
          //   })
          // })
        }
      }// target[property]

      if (/^\s*class\s+/.test(value?.toString())) {
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
      if (Reflect.get(target, property, receiver) === newValue) {
        return true;
      }
      const value = maybeMakeObservable(property, newValue, adm);
      Reflect.set(target, property, value, receiver);
      adm.report(property, value);
      return true;
    },
    defineProperty(target: any, property: string, attributes: PropertyDescriptor) {
      if (!attributes?.value) {
        return Reflect.set(target, property, attributes.value);
      }
      let value = maybeMakeObservable(property, attributes?.value, adm);
      if (attributes?.value instanceof Array) {
        value = maybeMakeObservable(property, value.map((el: any) => maybeMakeObservable(property, el, adm)), adm)
      }
      return Reflect.set(target, property, value);
    }
  };
}

// faster than array.includes(key)
const MapRead: Record<string | symbol, number> = Object.create(null, {})
Object.assign(MapRead, { get: 1, has: 1 })

const MapMutation: Record<string | symbol, number> = Object.create(null, {})
Object.assign(MapMutation, { set: 1, delete: 1, clear: 1 })

const SetMutation: Record<string | symbol, number> = Object.create(null, {})
Object.assign(SetMutation, { add: 1, delete: 1, clear: 1 })

const ArrayInsert: Record<string | symbol, number> = Object.create(null, {})
Object.assign(ArrayInsert, { unshift: 1, splice: 1, push: 1 })

const ArrayMutation: Record<string | symbol, number> = Object.create(null, {})
Object.assign(ArrayMutation, { copyWithin: 1, pop: 1, reverse: 1, shift: 1, sort: 1 })


function structureProxyHandler(property: string | symbol, adm: ObservableAdministration, type: Structure) {
  return {
    get(target: any, key: string | symbol, receiver: any) {
      const value = target[key];
      if (key === 'toString') { return value }
      if (typeof value === 'function') {
        return function (...args: any[]) {
          // @ts-ignore
          const result = value.apply(this === receiver ? target : this, args);
          if (type === 'Map') {
            const composed = `${property.toString()}.${args[0]}`;
            if (MapRead[key]) {
              ObservableTransactions.report(adm, composed);
            } else if (MapMutation[key]) {
              adm.report(composed, args[1]);
              adm.report(property, target.size);
            } else {
              ObservableTransactions.report(adm, property);
            }
          }

          if (type === 'Date') {
            if (String(key).includes('set')) {
              adm.report(property, args)
            } else {
              ObservableTransactions.report(adm, property);
            }
          }

          if (type === 'Set') {
            if (SetMutation[key]) {
              adm.report(property, args)
            } else {
              ObservableTransactions.report(adm, property);
            }
          }
          return result;
        };
      }
      return value;
    },
    set(target: any, key: string, newValue: any) {
      let value = maybeMakeObservable(property, newValue, adm)
      if (target[key] !== value) {
        target[key] = value;
        adm.report(property, newValue);
      }
      return true;
    }
  };
}

function arrayProxyHandler(property: string | symbol, adm: ObservableAdministration) {
  return {
    set(target: any, key: string, newValue: any) {
      target[key] = maybeMakeObservable(property, newValue, adm);
      adm.report(property, newValue);
      return true;
    }
  };
}


export class Observable {
  [isObservable] = true
  constructor() {
    const adm = new ObservableAdministration();
    Reflect.set(adm, Symbol.for('whoami'), this);
    return new Proxy(this, observableProxyHandler(adm));
  }
}

export declare interface Observable extends ObservableAdministration {}
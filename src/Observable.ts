import { ObservableAdministration } from './Observable.administration.js';
import { ObservableTransactions } from './Observable.transaction.js';

// faster than check instanceof
const isObservable = Symbol('Observable')

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

type Structure = 'Map' | 'Date' | 'Array' | 'Set'

function maybeMakeObservable(property: string | symbol, value: any, adm: ObservableAdministration) {
  if (!value || typeof value !== 'object' || value[isObservable]) { return value; }

  if ([ Map, Array, Set, Date ].some(Constructor => value instanceof Constructor)) {
    const type = Reflect.getPrototypeOf(value).constructor.name as Structure
    return new Proxy(value, structureProxyHandler(property, adm, type));
  }
  if (Object.prototype === Object.getPrototypeOf(value)) {
    return makeObservable(value)
  }
  return value;
}

function observableProxyHandler(adm: ObservableAdministration) {
  return {
    get(target: any, property: string | symbol, receiver: any) {
      if (Reflect.has(adm, property)) {
        return Reflect.get(adm, property);
      }
      const value = Reflect.get(target, property, receiver); // target[property]
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
          if (type === 'Array') {
            if (ArrayInsert[key]) {
              if (key === 'splice' && args[2]) {
                args[2] = args[2].map((el: any) => maybeMakeObservable(property, el, adm))
              }
              // @ts-ignore
              const result = value.apply(this === receiver ? target : this, args)
              if (adm.reportable) {
                adm.report(property, args)
              }
              return result
            }

            // @ts-ignore
            const arrayResult = value.apply(this === receiver ? target : this, args);
            if (ArrayMutation[key] && adm.reportable) {
              adm.report(property, args)
            } else {
              ObservableTransactions.report(adm, property);
            }
            return arrayResult
          }

          // @ts-ignore
          const result = value.apply(this === receiver ? target : this, args);
          if (type === 'Map') {
            const composed = `${property.toString()}.${args[0]}`;
            if (MapRead[key]) {
              ObservableTransactions.report(adm, composed);
            } else if (MapMutation[key] && adm.reportable) {
              adm.report(composed, args[1]);
              adm.report(property, target.size);
            } else {
              ObservableTransactions.report(adm, property);
            }
          }

          if (type === 'Date') {
            if (String(key).includes('set') && adm.reportable) {
              adm.report(property, args)
            } else {
              ObservableTransactions.report(adm, property);
            }
          }

          if (type === 'Set') {
            if (SetMutation[key] && adm.reportable) {
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


export class Observable {
  [isObservable] = true
  constructor() {
    const adm = new ObservableAdministration();
    Reflect.set(adm, Symbol.for('whoami'), this);
    return new Proxy(this, observableProxyHandler(adm));
  }
}

export declare interface Observable extends ObservableAdministration {}
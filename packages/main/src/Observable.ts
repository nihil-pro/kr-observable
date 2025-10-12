import { Admin } from './Admin.js';
import { Computed } from './Computed.js';
import { ProxyHandler } from './Proxy.handler.js';
import { ActionHandler } from './Action.handler.js';
import { ObservableSet } from './Observable.set.js';
import { ObservableMap } from './Observable.map.js';
import { ObservableArray } from './Observable.array.js';
import { Property, StatefulHandler } from './types.js';
import { lib, emptySet, $adm } from './global.js';


class Factory {
  static types = {
    READONLY: 0,
    ACCESSOR: 1,
    WRITABLE: 2,
  }

  static #factory(prop: Property, value: any, adm: Admin) {
    // primitive
    if (!value || typeof value !== 'object') return value;

    // already observable
    if (value[$adm]) return value;

    // literal ({}) or object without prototype (Object.create(null))
    const ctor = value.constructor;
    if (!ctor || ctor === Object) return makeObservable(value);

    // Shallow copy of ObservableArray, ObservableMap or ObservableSet
    if (value['meta']?.key === '') return value;

    const key = prop.toString();
    const meta = { adm, key, factory: this.#factory };
    if (value instanceof Array) {
      // shallow observation
      if (!adm.shallow.has(prop)) {
        for (let i = 0; i < value.length; i++) {
          value[i] = this.#factory(prop, value[i], adm);
        }
      }
      Object.setPrototypeOf(value, ObservableArray.prototype);
      lib.meta.set(value, meta);
      return value;
    }
    if (value instanceof Map) {
      Object.setPrototypeOf(value, ObservableMap.prototype);
      lib.meta.set(value, meta);
      return value;
    }
    if (value instanceof Set) {
      Object.setPrototypeOf(value, ObservableSet.prototype);
      lib.meta.set(value, meta);
      return value;
    }
    return value;
  }

  static #type(descriptor: PropertyDescriptor) {
    if ('value' in descriptor) {
      if (descriptor.writable) return this.types.WRITABLE;
      return this.types.READONLY;
    }
    return this.types.ACCESSOR;
  }

  static value<T>(property: Property, value: T, handler: StatefulHandler): T {
    if (handler.adm.ignore.has(property)) return value;
    if (typeof value === 'function') {
      return new Proxy(value, new ActionHandler(handler.receiver)) as T;
    }
    return this.#factory(property, value, handler.adm);
  }

  static descriptor(property: Property, descriptor: PropertyDescriptor, handler: StatefulHandler) {
    // Side effect, but that's acceptable
    const type = handler.types[property] = this.#type(descriptor);

    if (handler.adm.ignore.has(property)) {
      // accessor is ignored by user, but since we return a Proxy,
      // without this, accessing a private (#) property within this accessor will throw.
      // That's why we bind proxy to accessor
      if (descriptor.get) descriptor.get = descriptor.get.bind(handler.receiver);
      if (descriptor.set) descriptor.set = descriptor.set.bind(handler.receiver);
    } else {
      if (type === this.types.ACCESSOR) {
        if (descriptor.get) {
          // If this is a getter/setter pair, the set will be handled by computed
          descriptor = new Computed(property, descriptor, handler);
        } else {
          // If is a setter without getter, we should bind it to proxy
          if (descriptor.set) descriptor.set = descriptor.set.bind(handler.receiver);
        }
      }
      if (type === this.types.WRITABLE) {
        if (typeof descriptor.value === 'function') {
          descriptor.value = new Proxy(descriptor.value, new ActionHandler(handler.receiver));
        } else {
          descriptor.value = this.#factory(property, descriptor.value, handler.adm);
        }
      }
    }
    return descriptor;
  }
}

/**
 * @example
 * class Foo extends Observable {
 *
 * }
 * @interface Observable
 * */
export class Observable {
  declare static ignore: Set<Property>;
  declare static shallow: Set<Property>;
  constructor() {
    const ctor = new.target;
    const adm = new Admin(ctor.name, ctor.ignore || emptySet, ctor.shallow || emptySet);
    const handler = new ProxyHandler(adm, Factory);
    const proxy = new Proxy(this, handler);
    handler.receiver = proxy;

    const chain: any[] = []
    let current = ctor.prototype;
    while (current !== Observable.prototype) {
      chain.push(current)
      current = Object.getPrototypeOf(current);
    }

    // will loop over prototype chain,
    // and shouldn't redefine inherited and overwritten by current target – methods and getters/setters
    const skip = new Set<Property>(['constructor']);

    for (const proto of chain) {
      for (const key of Reflect.ownKeys(proto)) {
        if (skip.has(key)) continue;
        skip.add(key);
        const desc = Reflect.getOwnPropertyDescriptor(proto, key);
        Object.defineProperty(this, key, Factory.descriptor(key, desc, handler));
      }
    }
    return proxy;
  }
}

const error = new TypeError('Invalid argument. Only plain objects are allowed');

/** Only plain object are allowed
 * @example makeObservable({ foo: 'bar' }) */
export function makeObservable<T extends object>(
  value: T,
  ignore = emptySet,
  shallow = emptySet
): T {
  if (!value || typeof value !== 'object') throw error;
  const type = value?.constructor;
  if (type && type !== Object) throw error;
  if (value[$adm]) return value;
  const adm = new Admin('', ignore, shallow);
  const handler = new ProxyHandler(adm, Factory);
  const proxy = new Proxy<T>(value, handler);
  handler.receiver = proxy;

  // eslint-disable-next-line guard-for-in
  for (const key in value) {
    const descriptor = Factory.descriptor(key, Object.getOwnPropertyDescriptor(value, key), handler);
    if (descriptor.writable) {
      value[key] = descriptor.value;
    } else {
      Object.defineProperty(value, key, descriptor);
    }
  }
  return proxy;
}
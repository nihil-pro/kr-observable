import { Admin } from './Admin.js';
import { Property } from './types.js';
import { Computed } from './Computed.js';
import { ProxyHandler } from './Proxy.handler.js';
import { ObservableSet } from './Observable.set.js';
import { ObservableMap } from './Observable.map.js';
import { ObservableArray } from './Observable.array.js';
import { lib, $adm, emptySet } from './global.js';

function factory(prop: Property, value: any, adm: Admin) {
  if (!value || typeof value !== 'object') return value;
  if (value[$adm] || adm.ignore.has(prop) || value['meta']) return value;
  const ctor = value.constructor;
  if (!ctor || ctor === Object) return makeObservable(value);
  const key = prop.toString();
  const meta = { adm, key, factory };
  if (Array.isArray(value)) {
    if (!adm.shallow.has(prop)) {
      for (let i = 0; i < value.length; i++) {
        value[i] = factory(prop, value[i], adm);
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
  const handler = new ProxyHandler(adm, factory);
  const proxy = new Proxy<T>(value, handler);
  handler.receiver = proxy;
  // eslint-disable-next-line guard-for-in
  for (const key in value) {
    if (adm.ignore.has(key)) continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    handler.descriptors[key] = ProxyHandler.propertyType(descriptor);
    if (!descriptor.configurable) continue;
    if (descriptor.writable) {
      value[key] = factory(key, descriptor.value, adm);
    } else {
      Object.defineProperty(value, key, new Computed(key, descriptor, adm, proxy));
    }
  }
  return proxy;
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
    const proto = Reflect.getPrototypeOf(this);
    const ctor = proto.constructor as typeof Observable;
    const adm = new Admin(ctor.name, ctor.ignore || emptySet, ctor.shallow || emptySet);
    const handler = new ProxyHandler(adm, factory);
    const proxy = new Proxy(this, handler);
    handler.receiver = proxy;
    for (const key of Reflect.ownKeys(proto)) {
      if (adm.ignore.has(key)) continue;
      const desc = Reflect.getOwnPropertyDescriptor(proto, key);
      handler.descriptors[key] = ProxyHandler.propertyType(desc);
      if (desc.writable || !desc.configurable) continue;
      Object.defineProperty(this, key, new Computed(key, desc, adm, proxy));
    }
    return proxy;
  }
}
import { Property } from './types.js';
import { ObservableSet } from './Observable.set.js';
import { ObservableMap } from './Observable.map.js';
import { ActionHandler } from './Action.handler.js';
import { ObservableAdm } from './Observable.adm.js';
import { ObservableArray } from './Observable.array.js';
import { ObservableComputed } from './Observable.computed.js';
import { lib, executor, $adm, emptySet } from './global.this.js';

const getDescriptor = Reflect.getOwnPropertyDescriptor;
const define = Reflect.defineProperty;
const getProto = Reflect.getPrototypeOf;
const setProto = Reflect.setPrototypeOf;

ObservableArray.prototype.prepare = function<T>(items: T[]) {
  if (!this.meta.adm.shallow.has(this.meta.key)) {
    for (let i = 0; i < items.length; i++) {
      items[i] = maybeMakeObservable(this.meta.key, items[i], this.meta.adm);
    }
  }
  return items;
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
  const adm = new ObservableAdm('', ignore, shallow);
  const handler = new ObservableProxyHandler(adm);
  const proxy = new Proxy(value, handler);
  handler.receiver = proxy;
  // eslint-disable-next-line guard-for-in
  for (const key in value) {
    if (adm.ignore.has(key)) continue;
    const descriptor = getDescriptor(value, key);
    if (!descriptor.configurable) continue;
    if (descriptor.writable) {
      value[key] = maybeMakeObservable(key, descriptor.value, adm);
    } else {
      define(value, key, new ObservableComputed(key, descriptor, adm, proxy));
    }
  }
  return proxy;
}

function maybeMakeObservable(prop: Property, value: any, adm: ObservableAdm) {
  if (!value || typeof value !== 'object') return value;
  if (value[$adm] || adm.ignore.has(prop) || value['meta']) return value;
  const ctor = value.constructor;
  if (!ctor || ctor === Object) return makeObservable(value);
  const key = prop.toString();
  if (Array.isArray(value)) {
    if (!adm.shallow.has(prop)) {
      for (let i = 0; i < value.length; i++) {
        value[i] = maybeMakeObservable(prop, value[i], adm);
      }
    }
    setProto(value, ObservableArray.prototype);
    lib.meta.set(value, { adm, key });
    return value;
  }
  if (value instanceof Map) {
    setProto(value, ObservableMap.prototype);
    lib.meta.set(value, { adm, key });
    return value;
  }
  if (value instanceof Set) {
    setProto(value, ObservableSet.prototype);
    lib.meta.set(value, { adm, key });
    return value;
  }
  return value;
}

const NO_ACTION = new Set<Property>(Object.getOwnPropertyNames(Object.prototype));

class ObservableProxyHandler {
  adm: ObservableAdm;
  fns: Record<Property, Function> = Object.create(null);
  receiver: Object;

  constructor(adm: ObservableAdm) {
    this.adm = adm;
  }

  batch(property: Property) {
    lib.executor.report(this.adm, property);
    // this should be in adm.batch, but there are some issues with async handlers
    if (lib.action) return;
    if (this.adm.changes.has(property)) {
      this.adm.batch(true);
    }
  }

  get(target: any, key: Property, ctx: any) {
    if (key === $adm) return this.adm;
    const val = Reflect.get(target, key, ctx);
    if (typeof val === 'function') {
      // Return the original value for non-proxied methods
      if (NO_ACTION.has(key)) return val;

      // Create, cache, and return new proxy
      return this.fns[key] || (this.fns[key] = new Proxy(val, new ActionHandler(ctx)));
    }
    this.batch(key);
    return val;
  }
  set(target: any, property: string, newValue: any) {
    const desc = getDescriptor(target, property);
    if (desc?.set) return Reflect.set(target, property, newValue, this.receiver);
    if (desc?.get || (desc && !desc?.writable)) return false;
    let res = true;
    if (!desc || desc?.value !== newValue) {
      const value = maybeMakeObservable(property, newValue, this.adm);
      res = Reflect.set(target, property, value);
      delete this.fns[property];
      this.report(property, newValue);
    }
    return res;
  }
  defineProperty(target: any, property: string, desc: PropertyDescriptor) {
    delete this.fns[property];
    let $desc = desc;
    if (desc.writable) $desc.value = maybeMakeObservable(property, desc.value, this.adm);
    else if (desc.configurable) {
      $desc = new ObservableComputed(property, desc, this.adm, this.receiver);
    }
    return define(target, property, $desc);
  }
  deleteProperty(target: any, property: string | symbol): boolean {
    if (!(property in target)) return false;
    delete this.fns[property];
    const res = Reflect.deleteProperty(target, property);
    this.report(property, undefined);
    return res;
  }
  setPrototypeOf(target: any, proto: any) {
    const protoAdm = proto[$adm];
    if (protoAdm) Object.assign(protoAdm, this.adm);
    return setProto(target, proto);
  }
  has(target: any, property: string | symbol) {
    this.batch(property);
    return property in target;
  }
  getOwnPropertyDescriptor(target: any, property: string | symbol) {
    this.batch(property);
    return getDescriptor(target, property);
  }
  report(property: Property, value: any) {
    executor.report(this.adm, property, true);
    this.adm.report(property, value);
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
    const proto = getProto(this);
    const ctor = proto.constructor as typeof Observable;
    const adm = new ObservableAdm(ctor.name, ctor.ignore || emptySet, ctor.shallow || emptySet);
    const handler = new ObservableProxyHandler(adm);
    const proxy = new Proxy(this, handler);
    handler.receiver = proxy;
    for (const key of Reflect.ownKeys(proto)) {
      if (adm.ignore.has(key)) continue;
      const desc = getDescriptor(proto, key);
      if (desc.writable || !desc.configurable) continue;
      define(this, key, new ObservableComputed(key, desc, adm, proxy));
    }
    return proxy;
  }
}
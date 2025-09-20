import { ObservableComputed } from './Observable.computed.js';
import { ActionHandler } from './Action.handler.js';
import { ObservableAdm } from './Observable.adm.js';
import { Property, StructureMeta } from './types.js';
import { lib } from './global.this.js';
import { $adm, emptySet } from './shared.js';

const queueBatch = (adm: ObservableAdm) => {
  if (lib.action) {
    lib.queue.add(adm);
  } else {
    queueMicrotask(() => adm.batch());
  }
};

const error = new TypeError('Invalid argument. Only plain objects are allowed');

/** Only plain object are allowed
 * @example makeObservable({ foo: 'bar' }) */
export function makeObservable<T extends object>(
  value: T,
  ignore: Set<Property> = emptySet,
  shallow: Set<Property> = emptySet
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
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor.configurable) continue;
    if (descriptor.writable) {
      value[key] = maybeMakeObservable(key, descriptor.value, adm);
    } else {
      Object.defineProperty(value, key, new ObservableComputed(key, descriptor, adm, proxy));
    }
  }
  return proxy;
}

function maybeMakeObservable(key: Property, value: any, adm: ObservableAdm) {
  if (!value || typeof value !== 'object') return value;
  if (value[$adm] || adm.ignore.has(key) || value['meta']) return value;
  const ctor = value.constructor;
  if (!ctor || ctor === Object) return makeObservable(value);

  if (Array.isArray(value)) {
    if (!adm.shallow.has(key)) {
      for (let i = 0; i < value.length; i++) {
        value[i] = maybeMakeObservable(key, value[i], adm);
      }
    }
    Reflect.setPrototypeOf(value, ObservableArray.prototype);
    lib.meta.set(value, { adm, key });
    return value;
  }
  if (value instanceof Map) {
    Reflect.setPrototypeOf(value, ObservableMap.prototype);
    lib.meta.set(value, { adm, key });
    return value;
  }
  if (value instanceof Set) {
    Reflect.setPrototypeOf(value, ObservableSet.prototype);
    lib.meta.set(value, { adm, key });
    return value;
  }
  return value;
}

const NON_PROXIED_METHODS = new Set<Property>(Object.getOwnPropertyNames(Object.prototype));

const { executor } = lib;

class ObservableProxyHandler {
  adm: ObservableAdm;
  fns: Record<Property, Function> = {};
  receiver: Object;

  constructor(adm: ObservableAdm) {
    this.adm = adm;
  }

  batch(property: Property) {
    lib.executor.report(this.adm, property);
    if (lib.action || this.adm.state === 0) return;
    if (this.adm.changes.has(property)) this.adm.batch();
  }
  get(target: any, key: Property, ctx: any) {
    if (key === $adm) return this.adm;
    const val = Reflect.get(target, key, ctx);
    if (typeof val === 'function') {
      // Return the original value for non-proxied methods
      if (NON_PROXIED_METHODS.has(key)) return val;

      // Create, cache, and return new proxy
      return this.fns[key] || (this.fns[key] = new Proxy(val, new ActionHandler(ctx, this.adm)));
    }
    this.batch(key);
    return val;
  }
  set(target: any, property: string, newValue: any) {
    const { adm } = this;
    const desc = Reflect.getOwnPropertyDescriptor(target, property);
    if (desc?.set) return Reflect.set(target, property, newValue, this.receiver);
    if (desc?.get || (desc && !desc.writable)) return false;
    let res = true;
    if (!desc || desc?.value !== newValue) {
      adm.state = 0;
      delete this.fns[property];
      const value = maybeMakeObservable(property, newValue, adm);
      res = Reflect.set(target, property, value);
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
    return Reflect.defineProperty(target, property, $desc);
  }
  deleteProperty(target: any, property: string | symbol): boolean {
    if (!(property in target)) return false;
    delete this.fns[property];
    this.adm.state = 0;
    const res = Reflect.deleteProperty(target, property);
    this.report(property, undefined);
    return res;
  }
  setPrototypeOf(target: any, proto: any) {
    const protoAdm = proto[$adm];
    if (protoAdm) Object.assign(protoAdm, this.adm);
    return Reflect.setPrototypeOf(target, proto);
  }
  has(target: any, property: string | symbol) {
    this.batch(property);
    return property in target;
  }
  getOwnPropertyDescriptor(target: any, property: string | symbol) {
    this.batch(property);
    return Reflect.getOwnPropertyDescriptor(target, property);
  }
  report(property: Property, value: any) {
    this.adm.report(property, value);
    this.adm.state = 1;
    executor.report(this.adm, property, true);
    queueBatch(this.adm);
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
    const proto = Reflect.getPrototypeOf(this);
    const ctor = proto.constructor as typeof Observable;
    const adm = new ObservableAdm(ctor.name, ctor.ignore || emptySet, ctor.shallow || emptySet);
    const handler = new ObservableProxyHandler(adm);
    const proxy = new Proxy(this, handler);
    handler.receiver = proxy;
    for (const key of Reflect.ownKeys(proto)) {
      if (adm.ignore.has(key)) continue;
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc.writable || !desc.configurable) continue;
      Object.defineProperty(this, key, new ObservableComputed(key, desc, adm, proxy));
    }
    return proxy;
  }
}

const metaPlug: StructureMeta = { key: '', adm: new ObservableAdm('', emptySet, emptySet) };

class ObservableArray<T> extends Array<T> {
  get meta() {
    return lib.meta.get(this) || metaPlug;
  }

  report() {
    const meta = this.meta;
    meta.adm.report(meta.key, this);
    meta.adm.state = 1;
    queueBatch(meta.adm);
  }

  prepare(items: T[]) {
    const meta = this.meta;
    if (!meta.adm.shallow.has(meta.key)) {
      for (let i = 0; i < items.length; i++) {
        items[i] = maybeMakeObservable(meta.key, items[i], meta.adm);
      }
    }
    return items;
  }

  [Symbol.iterator]() {
    this.meta.adm.batch();
    return super[Symbol.iterator]();
  }

  push(...items: any[]): number {
    this.meta.adm.state = 0;
    try {
      return super.push(...this.prepare(items));
    } finally {
      this.report();
    }
  }

  unshift(...items: any[]): number {
    this.meta.adm.state = 0;
    try {
      return super.unshift(...this.prepare(items));
    } finally {
      this.report();
    }
  }

  splice(start: number, deleteCount?: number, ...items: T[]): T[] {
    this.meta.adm.state = 0;
    try {
      return super.splice(start, deleteCount, ...this.prepare(items));
    } finally {
      this.report();
    }
  }

  copyWithin(target: number, start: number, end?: number): this {
    this.meta.adm.state = 0;
    try {
      return super.copyWithin(target, start, end);
    } finally {
      this.report();
    }
  }

  pop() {
    this.meta.adm.state = 0;
    try {
      return super.pop();
    } finally {
      this.report();
    }
  }

  reverse() {
    this.meta.adm.state = 0;
    try {
      return super.reverse();
    } finally {
      this.report();
    }
  }

  shift() {
    this.meta.adm.state = 0;
    try {
      return super.shift();
    } finally {
      this.report();
    }
  }

  sort(compareFn?: (a: T, b: T) => number) {
    this.meta.adm.state = 0;
    try {
      return super.sort(compareFn);
    } finally {
      this.report();
    }
  }

  set(i: number, v: T) {
    this.meta.adm.state = 0;
    try {
      this[i] = v;
    } finally {
      this.report();
    }
  }
}

class ObservableMap<K, V> extends Map<K, V> {
  get meta() {
    return lib.meta.get(this) || metaPlug;
  }

  get size() {
    const meta = this.meta;
    if (!lib.action) {
      if (meta.adm.changes.has(meta.key)) meta.adm.batch();
    }
    return super.size;
  }

  report(key?: K, value?: V) {
    const meta = this.meta;
    meta.adm.report(meta.key, this);
    if (key) meta.adm.report(`${meta.key.toString()}.${key.toString()}`, value);
    queueBatch(meta.adm);
    meta.adm.state = 1;
  }

  [Symbol.iterator]() {
    this.meta.adm.batch();
    return super[Symbol.iterator]();
  }

  has(key: K): boolean {
    const meta = this.meta;
    try {
      return super.has(key);
    } finally {
      // is needed to subscribe on a key in map
      lib.executor.report(meta.adm, `${meta.key.toString()}.${key.toString()}`);
    }
  }

  get(key: K): V | undefined {
    const meta = this.meta;
    try {
      meta.adm.batch();
      return super.get(key);
    } finally {
      // is needed to subscribe on a key in map
      lib.executor.report(meta.adm, `${meta.key.toString()}.${key.toString()}`);
    }
  }

  set(key: K, value: V) {
    this.meta.adm.state = 0;
    try {
      return super.set(key, value);
    } finally {
      this.report(key, value);
    }
  }

  delete(key: K) {
    this.meta.adm.state = 0;
    try {
      return super.delete(key);
    } finally {
      this.report(key);
    }
  }

  clear() {
    const meta = this.meta;
    const adm = meta.adm
    adm.state = 0;
    for (const key of this.keys()) adm.report(`${meta.key.toString()}.${key.toString()}`, undefined);
    try {
      return super.clear();
    } finally {
      this.report();
    }
  }
}

class ObservableSet<T> extends Set<T> {
  get meta() {
    return lib.meta.get(this) || metaPlug;
  }

  report() {
    const meta = this.meta;
    meta.adm.report(meta.key, this);
    queueBatch(meta.adm);
    meta.adm.state = 1;
  }

  has(key: T): boolean {
    const meta = this.meta;
    try {
      return super.has(key);
    } finally {
      lib.executor.report(meta.adm, meta.key);
    }
  }

  [Symbol.iterator]() {
    this.meta.adm.batch();
    return super[Symbol.iterator]();
  }

  add(value: T) {
    this.meta.adm.state = 0;
    try {
      return super.add(value);
    } finally {
      this.report();
    }
  }

  delete(value: T) {
    this.meta.adm.state = 0;
    try {
      return super.delete(value);
    } finally {
      this.report();
    }
  }

  clear() {
    this.meta.adm.state = 0;
    try {
      return super.clear();
    } finally {
      this.report();
    }
  }
}

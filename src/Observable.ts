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

/** Only plain object are allowed
 * @example makeObservable({ foo: 'bar' }) */
export function makeObservable<T extends object>(
  value: T,
  ignore: Set<Property> = emptySet,
  shallow: Set<Property> = emptySet
): T {
  if (value == null || Object.prototype !== Object.getPrototypeOf(value)) {
    throw new TypeError('Invalid argument. Only plain objects are allowed');
  }
  const adm = new ObservableAdm('', ignore, shallow);
  const proxy = new Proxy(value, new ObservableProxyHandler(adm));
  // eslint-disable-next-line guard-for-in
  for (const key in value) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor.get) {
      if (!adm.ignore.has(key)) {
        Object.defineProperty(value, key, new ObservableComputed(key, descriptor, adm, proxy));
      }
    } else {
      value[key] = maybeMakeObservable(key, value[key], adm);
    }
  }
  return proxy;
}

function maybeMakeObservable(key: Property, value: any, adm: ObservableAdm) {
  if (value == null || typeof value !== 'object') return value;
  if (value[$adm] || adm.ignore.has(key)) return value;

  if (Object.prototype === Object.getPrototypeOf(value)) return makeObservable(value);
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

class ObservableProxyHandler {
  adm: ObservableAdm;
  methods: Record<Property, Function> = Object.create(null);

  constructor(adm: ObservableAdm) {
    this.adm = adm;
  }

  get(target: any, property: Property, receiver: any) {
    if (property === $adm) return this.adm;
    const value = Reflect.get(target, property, receiver);
    const type = typeof value;
    if (type === 'function') {
      let method = this.methods[property];
      if (!method) {
        method = new Proxy(value, new ActionHandler(receiver, this.adm));
        this.methods[property] = method;
      }
      return method;
    }
    if (!lib.action) {
      if (this.adm.changes.has(property)) this.adm.batch(true);
    }

    if (!this.adm.ignore.has(property)) lib.executor.report(this.adm, property);

    return value;
  }
  set(target: any, property: string, newValue: any) {
    // need benchmarks, this can be slow...
    const descriptor = Reflect.getOwnPropertyDescriptor(target, property);
    if (!descriptor || (descriptor.writable && !descriptor.set)) {
      if (target[property] === newValue) {
        target[property] = newValue;
      } else {
        if (this.methods[property]) this.methods[property] = undefined;
        this.adm.state = 0;
        const value = maybeMakeObservable(property, newValue, this.adm);
        Reflect.set(target, property, value);
        this.adm.report(property, value);
        this.adm.state = 1;
        queueBatch(this.adm);
      }
      return true;
    }

    if (descriptor.set) {
      Reflect.set(target, property, newValue);
      return true;
    }

    return false;
  }
  defineProperty(target: any, property: string, descriptor: PropertyDescriptor) {
    if (this.methods[property]) {
      this.methods[property] = undefined;
    }
    target[property] = maybeMakeObservable(property, descriptor.value, this.adm);
    return true;
  }
  deleteProperty(target: any, property: string | symbol): boolean {
    if (!(property in target)) return false;
    if (this.methods[property]) this.methods[property] = undefined;
    this.adm.state = 0;
    delete target[property];
    this.adm.report(property, undefined);
    this.adm.state = 1;
    queueBatch(this.adm);
    return true;
  }
  has(target: any, property: string | symbol) {
    if (!lib.action) {
      if (this.adm.changes.has(property)) this.adm.batch(true);
    }
    if (!this.adm.ignore.has(property)) lib.executor.report(this.adm, property);
    return property in target;
  }
  getOwnPropertyDescriptor(target: any, property: string | symbol) {
    if (!lib.action) {
      if (this.adm.changes.has(property)) this.adm.batch(true);
    }
    if (!this.adm.ignore.has(property)) lib.executor.report(this.adm, property);
    return Reflect.getOwnPropertyDescriptor(target, property);
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
    const proxy = new Proxy(this, new ObservableProxyHandler(adm));
    for (const key of Reflect.ownKeys(proto)) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, key);
      if (descriptor?.get) {
        if (!adm.ignore.has(key)) {
          // defining on this, not in prototype!
          Object.defineProperty(this, key, new ObservableComputed(key, descriptor, adm, proxy));
        }
      }
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
    queueBatch(meta.adm);
    meta.adm.state = 1;
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
    this.meta.adm.batch(true);
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
      if (meta.adm.changes.has(meta.key)) meta.adm.batch(true);
    }
    return super.size;
  }

  report() {
    const meta = this.meta;
    meta.adm.report(meta.key, this);
    queueBatch(meta.adm);
    meta.adm.state = 1;
  }

  [Symbol.iterator]() {
    this.meta.adm.batch(true);
    return super[Symbol.iterator]();
  }

  has(key: K): boolean {
    const meta = this.meta;
    try {
      return super.has(key);
    } finally {
      // is needed to subscribe on a key in map
      lib.executor.report(meta.adm, `${meta.key.toString()}.${key}`);
    }
  }

  get(key: K): V | undefined {
    const meta = this.meta;
    try {
      meta.adm.batch(true);
      return super.get(key);
    } finally {
      // is needed to subscribe on a key in map
      lib.executor.report(meta.adm, `${meta.key.toString()}.${key}`);
    }
  }

  set(key: K, value: V) {
    this.meta.adm.state = 0;
    try {
      return super.set(key, value);
    } finally {
      this.report();
    }
  }

  delete(key: K) {
    this.meta.adm.state = 0;
    try {
      return super.delete(key);
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
    this.meta.adm.batch(true);
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

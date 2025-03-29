import { ObservableAdministration, AdmTrap } from './Observable.administration.js';
import { ObservableMap } from './Observable.map.js';
import { ObservableSet } from './Observable.set.js';
import { ObservableComputed } from './Observable.computed.js';
import { lib } from './global.this.js';

type Observer = Pick<
  ObservableAdministration,
  'subscribe' | 'unsubscribe' | 'listen' | 'unlisten' | 'transaction'
>;
const isObservable = Symbol.for('Observable');

function set(i: number, value: unknown) {
  this[i] = value;
}

Reflect.defineProperty(Array.prototype, 'set', {
  enumerable: false,
  value: set,
});

const temp = new Set<ObservableAdministration>();

const queueBatch = (adm: ObservableAdministration) => {
  if (lib.action) {
    temp.add(adm);
  } else {
    queueMicrotask(adm.$_batch);
  }
};

interface ArrayMeta {
  key: string | symbol;
  adm: ObservableAdministration;
}
const emptySet: Set<string | symbol> = new Set();
const metaPlug = { key: '', adm: new ObservableAdministration('', emptySet, emptySet) };
const arraysRegistry = new WeakMap<Array<any>, ArrayMeta>();

export class ObservableArray<T> extends Array<T> {
  get meta() {
    return arraysRegistry.get(this) || (metaPlug as ArrayMeta);
  }

  report() {
    const meta = this.meta;
    meta.adm.report(meta.key, this);
    queueBatch(meta.adm);
    meta.adm.$_state = 1;
  }

  prepare(items: T[]) {
    const meta = this.meta;
    if (!meta.adm.shallow.has(meta.key)) {
      for (let i = 0; i < items.length; i++) {
        items[i] = maybeMakeObservable(meta.key, items[i], meta.adm);
      }
    }
    return items;
    // if (this.meta.adm.shallow[this.meta.key]) return items;
    // return items.map((i) => maybeMakeObservable(this.meta.key, i, this.meta.adm));
  }

  [Symbol.iterator]() {
    this.meta.adm.$_batch(true);
    return super[Symbol.iterator]();
  }

  push(...items: any[]): number {
    this.meta.adm.$_state = 0;
    try {
      return super.push(...this.prepare(items));
    } finally {
      this.report();
    }
  }

  unshift(...items: any[]): number {
    this.meta.adm.$_state = 0;
    try {
      return super.unshift(...this.prepare(items));
    } finally {
      this.report();
    }
  }

  splice(start: number, deleteCount?: number, ...items: T[]): T[] {
    this.meta.adm.$_state = 0;
    try {
      return super.splice(start, deleteCount, ...this.prepare(items));
    } finally {
      this.report();
    }
  }

  copyWithin(target: number, start: number, end?: number): this {
    this.meta.adm.$_state = 0;
    try {
      return super.copyWithin(target, start, end);
    } finally {
      this.report();
    }
  }

  pop() {
    this.meta.adm.$_state = 0;
    try {
      return super.pop();
    } finally {
      this.report();
    }
  }

  reverse() {
    this.meta.adm.$_state = 0;
    try {
      return super.reverse();
    } finally {
      this.report();
    }
  }

  shift() {
    this.meta.adm.$_state = 0;
    try {
      return super.shift();
    } finally {
      this.report();
    }
  }

  sort(compareFn?: (a: T, b: T) => number) {
    this.meta.adm.$_state = 0;
    try {
      return super.sort(compareFn);
    } finally {
      this.report();
    }
  }

  set(i: number, v: T) {
    this.meta.adm.$_state = 0;
    try {
      this[i] = v;
    } finally {
      this.report();
    }
  }
}

/** Only plain object are allowed
 * @example makeObservable({ foo: 'bar' }) */
export function makeObservable<T extends object>(
  value: T,
  ignore: Set<string | symbol> = new Set(),
  shallow: Set<string | symbol> = new Set()
): T & Observer {
  if (value == null || Object.prototype !== Object.getPrototypeOf(value)) {
    throw new TypeError('Invalid argument. Only plain objects are allowed');
  }
  // turn on deep observable for plain objects
  const adm = new ObservableAdministration('', ignore, shallow);
  const proxy = new Proxy(value, new ObservableProxyHandler(adm));
  // eslint-disable-next-line guard-for-in
  for (const key in value) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor?.get) {
      if (!adm.ignore.has(key)) {
        Object.defineProperty(value, key, new ObservableComputed(key, descriptor, adm, proxy));
      }
    } else if (!adm.ignore.has(key)) {
      value[key] = maybeMakeObservable(key, value[key], adm);
    }
  }
  value[isObservable] = true;
  return proxy;
}

function maybeMakeObservable(key: string | symbol, value: any, adm: ObservableAdministration) {
  if (value == null || value[isObservable] || typeof value !== 'object') {
    return value;
  }
  if (Object.prototype === Object.getPrototypeOf(value)) {
    return makeObservable(value);
  }
  if (Array.isArray(value)) {
    if (!adm.shallow.has(key)) {
      for (let i = 0; i < value.length; i++) {
        value[i] = maybeMakeObservable(key, value[i], adm);
      }
    }
    Reflect.setPrototypeOf(value, ObservableArray.prototype);
    arraysRegistry.set(value, { adm, key });
    return value;
  }
  if (value instanceof Map) {
    return new ObservableMap(key, adm, value);
  }
  if (value instanceof Set) {
    return new ObservableSet(key, adm, value);
  }
  return value;
}

class ObservableProxyHandler {
  adm: ObservableAdministration;

  constructor(adm: ObservableAdministration) {
    this.adm = adm;
  }

  get(target: any, property: string | symbol, receiver: any) {
    if (AdmTrap[property]) return this.adm[property];
    const value = Reflect.get(target, property, receiver);
    const type = typeof value;
    if (type === 'function') {
      // eslint-disable-next-line no-inner-declarations
      function action() {
        // eslint-disable-next-line prefer-rest-params
        if (lib.action) return value.apply(receiver, arguments);
        lib.action = true;
        // eslint-disable-next-line prefer-rest-params
        const result = value.apply(receiver, arguments);
        lib.action = false;
        temp.forEach(($adm) => $adm.$_batch(true));
        temp.clear();
        return result;
      }
      return action;
    }
    if (!lib.action) {
      if (type !== 'object' && this.adm.$_changes.size > 0) {
        this.adm.$_batch(true);
      }
    }

    if (!this.adm.ignore.has(property)) {
      lib.executor.report(this.adm, property);
    }

    return value;
  }
  set(target: any, property: string, newValue: any) {
    if (target[property] === newValue || this.adm.ignore.has(property)) {
      target[property] = newValue;
    } else {
      this.adm.$_state = 0;
      const value = maybeMakeObservable(property, newValue, this.adm);
      target[property] = value;
      this.adm.report(property, value);
      this.adm.$_state = 1;
      queueBatch(this.adm);
    }
    return true;
  }
  defineProperty(target: any, property: string, descriptor: PropertyDescriptor) {
    target[property] = maybeMakeObservable(property, descriptor.value, this.adm);
    return true;
  }
}

/**
 * @example
 * class Foo extends Observable {}
 * @interface Observable
 * @property {string[]} ignore Static. Optional. Properties in `ignore` won't be made observable or computed.
 * */
export class Observable {
  [isObservable] = true;
  static ignore: Set<string | symbol> = new Set();
  static shallow: Set<string | symbol> = new Set();
  constructor() {
    const proto = Reflect.getPrototypeOf(this);
    const ctor = proto.constructor as typeof Observable;
    if (!Object.hasOwn(ctor, 'shallow')) ctor.shallow = emptySet;
    if (!Object.hasOwn(ctor, 'ignore')) ctor.ignore = emptySet;
    const { shallow, ignore, name } = ctor;
    const adm = new ObservableAdministration(name, ignore, shallow);
    const proxy = new Proxy(this, new ObservableProxyHandler(adm));
    for (const key of Reflect.ownKeys(proto)) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, key);
      if (descriptor?.get && !adm.ignore.has(key)) {
        // defining on this, not in prototype!
        if (!adm.ignore.has(key)) {
          Object.defineProperty(this, key, new ObservableComputed(key, descriptor, adm, proxy));
        }
      }
    }
    return proxy;
  }
}

declare global {
  interface Array<T> {
    set(i: number, v: T): void;
  }
}

export declare interface Observable extends Observer {}

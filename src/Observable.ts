import {
  ObservableAdministration,
  ObservableAdministrationPlug,
  AdmTrap,
} from './Observable.administration.js';
import { ObservableMap } from './Observable.map.js';
import { ObservableSet } from './Observable.set.js';
import { ObservableComputed } from './Observable.computed.js';
import { lib } from './global.this.js';

type Observer = Pick<ObservableAdministration, 'subscribe' | 'unsubscribe' | 'listen' | 'unlisten'>;
const isObservable = Symbol('Observable');
export const whoami = Symbol.for('whoami');

Reflect.set(Array.prototype, 'set', function patchArraySet(i: number, value: unknown) {
  this[i] = value;
});

export class ObservableArray<T> extends Array<T> {
  #key: string | symbol;
  #adm: ObservableAdministration;
  #primitive: boolean;

  constructor(
    key: string | symbol,
    adm: ObservableAdministration,
    primitive: boolean,
    ...items: T[]
  ) {
    super(...items);
    this.#adm = adm || ObservableAdministrationPlug;
    this.#key = key || '';
    this.#primitive = primitive || true;
  }

  [Symbol.iterator]() {
    this.#adm.batch(true);
    return super[Symbol.iterator]();
  }

  push(...items: any[]): number {
    this.#adm.state = 0;
    let data = items;
    if (!this.#primitive) {
      data = items.map((i) => maybeMakeObservable(this.#key, i, this.#adm));
    }
    try {
      return super.push(...data);
    } finally {
      this.#adm.state = 1;
      this.#adm.report(this.#key, this);
      queueMicrotask(this.#adm.batch);
    }
  }

  unshift(...items: any[]): number {
    this.#adm.state = 0;
    let data = items;
    if (!this.#primitive) {
      data = items.map((i) => maybeMakeObservable(this.#key, i, this.#adm));
    }
    try {
      return super.unshift(...data);
    } finally {
      this.#adm.state = 1;
      this.#adm.report(this.#key, this);
      queueMicrotask(this.#adm.batch);
    }
  }

  splice(start: number, deleteCount?: number, ...items: T[]): T[] {
    this.#adm.state = 0;
    let data = items;
    if (!this.#primitive) {
      data = items.map((i) => maybeMakeObservable(this.#key, i, this.#adm));
    }
    try {
      return super.splice(start, deleteCount, ...data);
    } finally {
      this.#adm.state = 1;
      this.#adm.report(this.#key, this);
      queueMicrotask(this.#adm.batch);
    }
  }

  copyWithin(target: number, start: number, end?: number): this {
    this.#adm.state = 0;
    try {
      return super.copyWithin(target, start, end);
    } finally {
      this.#adm.state = 1;
      this.#adm.report(this.#key, this);
      queueMicrotask(this.#adm.batch);
    }
  }

  pop() {
    this.#adm.state = 0;
    try {
      return super.pop();
    } finally {
      this.#adm.state = 1;
      this.#adm.report(this.#key, this);
      queueMicrotask(this.#adm.batch);
    }
  }

  reverse() {
    this.#adm.state = 0;
    try {
      return super.reverse();
    } finally {
      this.#adm.state = 1;
      this.#adm.report(this.#key, this);
      queueMicrotask(this.#adm.batch);
    }
  }

  shift() {
    this.#adm.state = 0;
    try {
      return super.shift();
    } finally {
      this.#adm.state = 1;
      this.#adm.report(this.#key, this);
      queueMicrotask(this.#adm.batch);
    }
  }

  sort(compareFn?: (a: T, b: T) => number) {
    this.#adm.state = 0;
    try {
      return super.sort(compareFn);
    } finally {
      this.#adm.state = 1;
      this.#adm.report(this.#key, this);
      queueMicrotask(this.#adm.batch);
    }
  }

  set(i: number, v: T) {
    this.#adm.state = 0;
    try {
      super[i] = v;
    } finally {
      this.#adm.state = 1;
      this.#adm.report(this.#key, this);
      queueMicrotask(this.#adm.batch);
    }
  }
}

/** Only plain object are allowed
 * @example makeObservable({ foo: 'bar' }) */
export function makeObservable<T extends object>(value: T, ignore: string[] = []): T & Observer {
  try {
    if (Object.prototype === Object.getPrototypeOf(value)) {
      // turn on deep observable for plain objects
      const adm = new ObservableAdministration();
      ignore.forEach((key) => {
        adm.ignore[key] = 1;
      });
      Reflect.set(adm, Symbol.for('whoami'), value.constructor.name);
      Object.entries(value).forEach(
        ([key, $value]) => (value[key] = maybeMakeObservable(key, $value, adm))
      );
      value[isObservable] = true;
      return new Proxy(value, observableProxyHandler(adm));
    }
    return undefined;
  } catch (e) {
    throw new TypeError('Invalid argument. Only plain objects', e);
  }
}

function maybeMakeObservable(property: string | symbol, value: any, adm: ObservableAdministration) {
  if (!value) {
    return value;
  }
  if (typeof value !== 'object') {
    return value;
  }
  if (value[isObservable]) {
    return value;
  }
  if (value instanceof Map) {
    return new ObservableMap(property, adm, value);
  }
  if (value instanceof Set) {
    return new ObservableSet(property, adm, value);
  }
  if (Array.isArray(value)) {
    const type = value[0];
    if (!type || type[isObservable] || Object.prototype !== Object.getPrototypeOf(type)) {
      return new ObservableArray(property, adm, true, ...value);
    }
    const observables = value.map((el) => maybeMakeObservable(property, el, adm));
    return new ObservableArray(property, adm, false, ...observables);
  }

  if (Object.prototype === Object.getPrototypeOf(value)) {
    return makeObservable(value);
  }
  return value;
}

function observableProxyHandler(adm: ObservableAdministration) {
  const methods = new Map();
  return {
    // sync: false,
    get(target: any, property: string | symbol, receiver: any) {
      if (AdmTrap[property]) {
        return adm[property];
      }
      const value = Reflect.get(target, property, receiver);
      // && adm.action === 0
      if (typeof value !== 'object') {
        adm.batch(true);
      }

      if (typeof property === 'symbol') {
        return value;
      }
      if (adm.methods[property]) {
        let method = methods.get(property);
        if (!method) {
          method = value.bind(receiver);
          // new Proxy(, {
          //   apply(fn: any, thisArg: any, argArray: any[]): any {
          //     adm.action = 1;
          //     const result = fn.apply(thisArg, argArray);
          //     adm.action = 0;
          //     adm.state = 1;
          //     adm.batch(true);
          //     return result;
          //   },
          // });
          methods.set(property, method);
        }
        return method;
      }
      if (!adm.ignore[property]) {
        lib.transactions.report(adm, property);
      }
      return value;
    },
    set(target: any, property: string, newValue: any) {
      if (target[property] === newValue) {
        return true;
      }
      if (adm.ignore[property]) {
        target[property] = newValue;
        return true;
      }

      adm.state = 0;
      const value = maybeMakeObservable(property, newValue, adm);
      target[property] = value;
      adm.report(property, value);
      adm.state = 1;
      queueMicrotask(adm.batch);
      // if (adm.action === 0) {
      //
      // }
      return true;
    },
    defineProperty(target: any, property: string, descriptor: PropertyDescriptor) {
      target[property] = maybeMakeObservable(property, descriptor.value, adm);
      return true;
    },
  };
}

/**
 * @example
 * class Foo extends Observable {}
 * @interface Observable
 * @property {string[]} ignore Static. Optional. Properties in `ignore` won't be made observable or computed.
 * */
export class Observable {
  static ignore: Array<string | symbol> = [];
  [isObservable] = true;
  constructor() {
    const adm = new ObservableAdministration();
    const proto = Reflect.getPrototypeOf(this);
    adm[whoami] = proto.constructor.name;
    const ignored = Reflect.get(proto.constructor, 'ignore') || [];
    ignored.forEach((key: string | symbol) => (adm.ignore[key] = 1));
    adm.ignore[isObservable] = 1;
    const proxy = new Proxy(this, observableProxyHandler(adm));
    const properties = Reflect.ownKeys(proto);
    for (const property of properties) {
      if (property === 'constructor') {
        continue;
      }
      const descriptor = Reflect.getOwnPropertyDescriptor(proto, property);
      if (descriptor?.get) {
        Object.defineProperty(
          // defining on this, not in prototype!
          this,
          property,
          new ObservableComputed(property, descriptor, adm, proxy)
        );
      }
      if (typeof descriptor.value === 'function') {
        adm.methods[property] = 1;
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

import {
  ObservableAdministration,
  ObservableAdministrationPlug,
  AdmTrap,
} from './Observable.administration.js';
import { ObservableMap } from './Observable.map.js';
import { ObservableSet } from './Observable.set.js';
import { ObservableComputed } from './Observable.computed.js';
import { lib } from './global.this.js';

type Observer = Pick<
  ObservableAdministration,
  'subscribe' | 'unsubscribe' | 'listen' | 'unlisten' | 'transaction'
>;
const isObservable = Symbol.for('Observable');
export const whoami = Symbol.for('whoami');

function set(i: number, value: unknown) {
  this[i] = value;
}

Reflect.defineProperty(Array.prototype, 'set', {
  enumerable: false,
  value: set,
});

interface ArrayMeta {
  key: string | symbol;
  adm: ObservableAdministration;
}
const metaPlug = { key: '', adm: ObservableAdministrationPlug };
const arraysRegistry = new WeakMap<ObservableArray<any>, ArrayMeta>();

export class ObservableArray<T> extends Array<T> {
  get meta() {
    return arraysRegistry.get(this) || (metaPlug as ArrayMeta);
  }

  #report() {
    this.meta.adm.report(this.meta.key, this);
    queueMicrotask(this.meta.adm.batch);
    this.meta.adm.state = 1;
  }

  #prepare(items: T[]) {
    return items.map((i) => maybeMakeObservable(this.meta.key, i, this.meta.adm));
  }

  [Symbol.iterator]() {
    this.meta.adm.batch(true);
    return super[Symbol.iterator]();
  }

  push(...items: any[]): number {
    this.meta.adm.state = 0;
    try {
      return super.push(...this.#prepare(items));
    } finally {
      this.#report();
    }
  }

  unshift(...items: any[]): number {
    this.meta.adm.state = 0;
    try {
      return super.unshift(...this.#prepare(items));
    } finally {
      this.#report();
    }
  }

  splice(start: number, deleteCount?: number, ...items: T[]): T[] {
    this.meta.adm.state = 0;
    try {
      return super.splice(start, deleteCount, ...this.#prepare(items));
    } finally {
      this.#report();
    }
  }

  copyWithin(target: number, start: number, end?: number): this {
    this.meta.adm.state = 0;
    try {
      return super.copyWithin(target, start, end);
    } finally {
      this.#report();
    }
  }

  pop() {
    this.meta.adm.state = 0;
    try {
      return super.pop();
    } finally {
      this.#report();
    }
  }

  reverse() {
    this.meta.adm.state = 0;
    try {
      return super.reverse();
    } finally {
      this.#report();
    }
  }

  shift() {
    this.meta.adm.state = 0;
    try {
      return super.shift();
    } finally {
      this.#report();
    }
  }

  sort(compareFn?: (a: T, b: T) => number) {
    this.meta.adm.state = 0;
    try {
      return super.sort(compareFn);
    } finally {
      this.#report();
    }
  }

  set(i: number, v: T) {
    this.meta.adm.state = 0;
    try {
      super[i] = v;
    } finally {
      this.#report();
    }
  }
}

/** Only plain object are allowed
 * @example makeObservable({ foo: 'bar' }) */
export function makeObservable<T extends object>(value: T, ignore: string[] = []): T & Observer {
  if (value == null || Object.prototype !== Object.getPrototypeOf(value)) {
    throw new TypeError('Invalid argument. Only plain objects are allowed');
  }
  // turn on deep observable for plain objects
  const adm = new ObservableAdministration();
  ignore.forEach((key) => {
    adm.ignore[key] = 1;
  });
  Reflect.set(adm, Symbol.for('whoami'), value.constructor.name);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const computeds: Record<string, PropertyDescriptor> = {};
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (typeof descriptor.get === 'function') {
      computeds[key] = descriptor;
    } else {
      value[key] = maybeMakeObservable(key, descriptor?.value, adm);
    }
  }
  value[isObservable] = true;
  const proxy = new Proxy(value, observableProxyHandler(adm));
  for (const [key, descriptor] of Object.entries(computeds)) {
    Object.defineProperty(value, key, new ObservableComputed(key, descriptor, adm, proxy));
  }
  return proxy;
}

function maybeMakeObservable(key: string | symbol, value: any, adm: ObservableAdministration) {
  if (value == null || typeof value !== 'object' || value[isObservable]) {
    return value;
  }
  if (value instanceof Map) {
    return new ObservableMap(key, adm, value);
  }
  if (value instanceof Set) {
    return new ObservableSet(key, adm, value);
  }
  if (Array.isArray(value)) {
    const elements = value.map((el) => maybeMakeObservable(key, el, adm));
    const array = new ObservableArray(...elements);
    arraysRegistry.set(array, { adm, key });
    return array;
  }
  if (Object.prototype === Object.getPrototypeOf(value)) {
    return makeObservable(value);
  }
  return value;
}

function observableProxyHandler(adm: ObservableAdministration) {
  const methods = new Map();
  return {
    get(target: any, property: string | symbol, receiver: any) {
      if (AdmTrap[property]) {
        return adm[property];
      }
      const value = Reflect.get(target, property, receiver);
      if (typeof value !== 'object' && adm.changes.has(property) && !lib.action) {
        adm.batch(true);
      }

      if (adm.methods[property]) {
        let method = methods.get(property);
        if (!method) {
          method = new Proxy(value.bind(receiver), {
            apply(fn: any, thisArg: any, argArray: any[]): any {
              if (lib.action) {
                return fn.apply(thisArg, argArray);
              }
              adm.state = 0;
              lib.action = true;
              const result = fn.apply(thisArg, argArray);
              adm.state = 1;
              lib.action = false;
              adm.batch(true);
              return result;
            },
          });
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
      if (target[property] === newValue || adm.ignore[property]) {
        target[property] = newValue;
      } else {
        adm.state = 0;
        const value = maybeMakeObservable(property, newValue, adm);
        target[property] = value;
        adm.report(property, value);
        adm.state = 1;
        queueMicrotask(adm.batch);
      }
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
      if (property === 'constructor' || ignored.includes(property)) {
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

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

const temp = new Set<ObservableAdministration>();

export class ObservableArray<T> extends Array<T> {
  get meta() {
    return arraysRegistry.get(this) || (metaPlug as ArrayMeta);
  }

  #report() {
    const meta = this.meta;
    meta.adm.report(meta.key, this);
    meta.adm.$_state = 1;
    if (lib.action) {
      temp.add(meta.adm);
    } else {
      queueMicrotask(meta.adm.$_batch);
    }
    // queueMicrotask(this.meta.adm.$_batch);
  }

  #prepare(items: T[]) {
    if (this.meta.adm.shallow[this.meta.key]) return items;
    return items.map((i) => maybeMakeObservable(this.meta.key, i, this.meta.adm));
  }

  [Symbol.iterator]() {
    this.meta.adm.$_batch(true);
    return super[Symbol.iterator]();
  }

  push(...items: any[]): number {
    this.meta.adm.$_state = 0;
    try {
      return super.push(...this.#prepare(items));
    } finally {
      this.#report();
    }
  }

  unshift(...items: any[]): number {
    this.meta.adm.$_state = 0;
    try {
      return super.unshift(...this.#prepare(items));
    } finally {
      this.#report();
    }
  }

  splice(start: number, deleteCount?: number, ...items: T[]): T[] {
    this.meta.adm.$_state = 0;
    try {
      return super.splice(start, deleteCount, ...this.#prepare(items));
    } finally {
      this.#report();
    }
  }

  copyWithin(target: number, start: number, end?: number): this {
    this.meta.adm.$_state = 0;
    try {
      return super.copyWithin(target, start, end);
    } finally {
      this.#report();
    }
  }

  pop() {
    this.meta.adm.$_state = 0;
    try {
      return super.pop();
    } finally {
      this.#report();
    }
  }

  reverse() {
    this.meta.adm.$_state = 0;
    try {
      return super.reverse();
    } finally {
      this.#report();
    }
  }

  shift() {
    this.meta.adm.$_state = 0;
    try {
      return super.shift();
    } finally {
      this.#report();
    }
  }

  sort(compareFn?: (a: T, b: T) => number) {
    this.meta.adm.$_state = 0;
    try {
      return super.sort(compareFn);
    } finally {
      this.#report();
    }
  }

  set(i: number, v: T) {
    this.meta.adm.$_state = 0;
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
  const adm = new ObservableAdministration('', ignore, []);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const proxy = new Proxy(value, observableProxyHandler(adm));
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (descriptor.get && !adm.ignore.includes(key)) {
      Object.defineProperty(value, key, new ObservableComputed(key, descriptor, adm, proxy));
    } else {
      value[key] = maybeMakeObservable(key, descriptor?.value, adm);
    }
  }
  value[isObservable] = true;
  return proxy;
}

function maybeMakeObservable(key: string | symbol, value: any, adm: ObservableAdministration) {
  if (
    value == null ||
    typeof value !== 'object' ||
    value[isObservable] ||
    adm.ignore.includes(key)
  ) {
    return value;
  }
  if (Object.prototype === Object.getPrototypeOf(value)) {
    return makeObservable(value);
  }
  if (Array.isArray(value)) {
    let elements = value;
    if (!adm.shallow.includes(key)) {
      elements = value.map((el) => maybeMakeObservable(key, el, adm));
    }
    const array = new ObservableArray(...elements);
    arraysRegistry.set(array, { adm, key });
    return array;
  }
  if (value instanceof Map) {
    return new ObservableMap(key, adm, value);
  }
  if (value instanceof Set) {
    return new ObservableSet(key, adm, value);
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
      if (typeof value !== 'object' && adm.$_changes.has(property) && !lib.action) {
        adm.$_batch(true);
      }
      if (typeof value === 'function') {
        let method = methods.get(property);
        if (!method) {
          method = new Proxy(value, {
            apply(fn: any, _: any, argArray: any[]): any {
              if (lib.action) {
                return fn.apply(receiver, argArray);
              }
              adm.$_state = 0;
              lib.action = true;
              const result = fn.apply(receiver, argArray);
              adm.$_state = 1;
              lib.action = false;
              temp.forEach((a) => a.$_batch(true));
              adm.$_batch(true);
              temp.clear();
              return result;
            },
          });
          methods.set(property, method);
        }
        return method;
      }
      if (!adm.ignore.includes(property)) {
        lib.transactions.report(adm, property);
      }
      return value;
    },
    set(target: any, property: string, newValue: any) {
      if (target[property] === newValue) {
        target[property] = newValue;
      } else {
        adm.$_state = 0;
        const value = maybeMakeObservable(property, newValue, adm);
        target[property] = value;
        adm.report(property, value);
        adm.$_state = 1;
        if (lib.action) {
          temp.add(adm);
        } else {
          queueMicrotask(adm.$_batch);
        }
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
  static shallow: Array<string | symbol> = [];
  [isObservable] = true;
  constructor() {
    const proto = Reflect.getPrototypeOf(this);
    const adm = new ObservableAdministration(
      proto.constructor.name,
      Reflect.get(proto.constructor, 'ignore'),
      Reflect.get(proto.constructor, 'shallow')
    );

    const proxy = new Proxy(this, observableProxyHandler(adm));
    const descriptors = Object.getOwnPropertyDescriptors(proto);
    for (const property in descriptors) {
      if (descriptors[property]?.get && !adm.ignore.includes(property)) {
        Object.defineProperty(
          // defining on this, not in prototype!
          this,
          property,
          new ObservableComputed(property, descriptors[property], adm, proxy)
        );
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

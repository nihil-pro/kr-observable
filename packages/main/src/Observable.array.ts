import { Admin } from './Admin.js';
import { Global } from './global.js';
import { Utils } from './Utils.js';

export class ObservableArray<T> extends Array<T> {
  get meta() {
    return Global.meta.get(this) || Admin.meta;
  }

  report<U>(result: U) {
    this.meta.adm.report(this.meta.key, this);
    return result;
  }

  prepare(items: T[]) {
    const factory = this.meta.factory;
    if (!factory) return items;
    const adm = this.meta.adm;
    const key = this.meta.key;
    const handler = this.meta.handler
    if (key === '') return items;
    for (let i = 0; i < items.length; i++) {
      if (!Utils.isPrimitive(items[i])) {
        items[i] = factory(key, items[i], handler);
      }
    }
    return items;
  }

  push(...items: any[]): number {
    return this.report(super.push(...this.prepare(items)));
  }

  unshift(...items: any[]): number {
    return this.report(super.unshift(...this.prepare(items)));
  }

  splice(start: number, deleteCount?: number, ...items: T[]): T[] {
    return this.report(super.splice(start, deleteCount, ...this.prepare(items)));
  }

  copyWithin(target: number, start: number, end?: number): this {
    return this.report(super.copyWithin(target, start, end));
  }

  pop() {
    return this.report(super.pop());
  }

  reverse() {
    return this.report(super.reverse());
  }

  shift() {
    return this.report(super.shift());
  }

  sort(compareFn?: (a: T, b: T) => number) {
    return this.report(super.sort(compareFn));
  }

  set(i: number, v: T) {
    return this.report(this[i] = v);
  }
}

if (!Reflect.has(Array.prototype, 'set')) {
  Array.prototype.set = function(i: number, value: unknown) {
    this[i] = value;
  }
}
import { Admin } from './Admin.js';
import { Global } from './global.js';
import { Utils } from './Utils.js';

function getKey(metaKey: string, key: unknown): any {
  if (key == undefined) return `${metaKey}.${key}`;
  if (typeof key === 'object') return key;
  if (typeof key === 'symbol') return `${metaKey}.${key.description}`;
  return `${metaKey}.${key}`;
}

export class ObservableMap<K, V> extends Map<K, V> {
  get meta() {
    return Global.meta.get(this) || Admin.meta;
  }

  get size() {
    this.reportRead(`${this.meta.key}.keys`);
    return super.size;
  }

  reportRead(key: any) {
    Global.executor.report(this.meta.adm, key);
  }

  report(key: K, value?: V) {
    this.meta.adm.report(getKey(this.meta.key, key), value);
  }

  keys() {
    this.reportRead(`${this.meta.key}.keys`);
    return super.keys();
  }

  entries() {
    this.reportRead(`${this.meta.key}.keys`);
    return super.entries();
  }

  values() {
    this.reportRead(`${this.meta.key}.keys`);
    return super.values();
  }

  forEach(callback: (value: V, key: K, map: this) => void, thisArg?: any): void {
    this.reportRead(`${this.meta.key}.keys`);
    return super.forEach(callback, thisArg);
  }

  [Symbol.iterator]() {
    this.reportRead(`${this.meta.key}.keys`);
    return super[Symbol.iterator]();
  }

  has(key: K): boolean {
    this.reportRead(getKey(this.meta.key, key));
    return super.has(key);
  }

  get(key: K): V | undefined {
    this.reportRead(getKey(this.meta.key, key));
    return super.get(key);
  }

  set(key: K, value: V) {
    let newValue = value;
    if (this.meta.factory) {
      if (!Utils.isPrimitive(newValue)) {
        newValue = this.meta.factory(this.meta.key, value, this.meta.handler);
      }
    }
    const hasKey = super.has(key);
    const prevValue = super.get(key);
    const result = super.set(key, newValue);
    if (!hasKey) this.meta.adm.report(`${this.meta.key}.keys`, this);
    if (prevValue !== newValue) this.report(key, value);
    return result;
  }

  delete(key: K) {
    const result = super.delete(key);
    if (result) {
      this.report(key);
      this.meta.adm.report(`${this.meta.key}.keys`, this)
    }
    return result;
  }

  clear() {
    if (super.size === 0) return;
    const key = this.meta.key;
    for (const _key of this.keys()) {
      this.meta.adm.report(getKey(key, _key), undefined);
    }
    super.clear();
    this.meta.adm.report(`${this.meta.key}.keys`, this)
  }
}
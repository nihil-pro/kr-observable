import { Admin } from './Admin.js';
import { Global } from './global.js';
import { Utils } from './Utils.js';
import { Property } from './types';


/** A side effect which depends on Map will run depending on how it reads map entries:
 * - `map.has(key)` or `map.get(key)` - runs when an entry with this key is added or removed,
 * or when the value for this key is replaced with a new one.
 * - `map.keys()` – runs when the map size changes (an entry is added or removed).
 * - `map.values()` - runs when the map size changes, or when any value in the map is replaced with a new one.
 * - `map.entries()` - same as `map.values()` (runs on size changes or any value replacement).
 */
export class ObservableMap<K, V> extends Map<K, V> {
  static #getKey(metaKey: string, key: unknown): Property {
    if (key == undefined) return `${metaKey}.${key}`;
    if (typeof key === 'object') return key as unknown as Property;
    if (typeof key === 'symbol') return `${metaKey}.${key.description}`;
    return `${metaKey}.${key}`;
  }

  get meta() {
    return Global.meta.get(this) || Admin.meta;
  }

  get size() {
    Global.executor.report(this.meta.adm, `${this.meta.key}.keys`);
    return super.size;
  }

  keys() {
    Global.executor.report(this.meta.adm, `${this.meta.key}.keys`);
    return super.keys();
  }

  entries() {
    Global.executor.report(this.meta.adm, `${this.meta.key}.entries`);
    return super.entries();
  }

  values() {
    Global.executor.report(this.meta.adm, `${this.meta.key}.entries`);
    return super.values();
  }

  forEach(callback: (value: V, key: K, map: this) => void, thisArg?: any): void {
    Global.executor.report(this.meta.adm, `${this.meta.key}.entries`);
    return super.forEach(callback, thisArg);
  }

  [Symbol.iterator]() {
    Global.executor.report(this.meta.adm, `${this.meta.key}.entries`);
    return super[Symbol.iterator]();
  }

  has(key: K): boolean {
    Global.executor.report(this.meta.adm, ObservableMap.#getKey(this.meta.key, key));
    return super.has(key);
  }

  get(key: K): V | undefined {
    Global.executor.report(this.meta.adm, ObservableMap.#getKey(this.meta.key, key));
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

    if (!hasKey) {
      this.meta.adm.report(`${this.meta.key}.entries`, this);
      this.meta.adm.report(`${this.meta.key}.keys`, this);
      this.meta.adm.report(ObservableMap.#getKey(this.meta.key, key), newValue);
    } else if (prevValue !== newValue) {
      this.meta.adm.report(`${this.meta.key}.entries`, this);
      this.meta.adm.report(ObservableMap.#getKey(this.meta.key, key), newValue);
    }
    return result;
  }

  delete(key: K) {
    const result = super.delete(key);
    if (result) {
      // This is ok, since relevant side effects will react only on that key,
      // they are subscribed to
      this.meta.adm.report(ObservableMap.#getKey(this.meta.key, key), undefined);
      this.meta.adm.report(`${this.meta.key}.keys`, this);
      this.meta.adm.report(`${this.meta.key}.entries`, this);
    }
    return result;
  }

  clear() {
    if (super.size === 0) return;
    const metaKey = this.meta.key;
    for (const key of this.keys()) {
      this.meta.adm.report(ObservableMap.#getKey(metaKey, key), undefined);
    }
    super.clear();
    this.meta.adm.report(`${this.meta.key}.keys`, this);
    this.meta.adm.report(`${this.meta.key}.entries`, this);
  }
}
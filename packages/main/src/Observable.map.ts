import { lib } from './global.this.js';
import { ObservableAdm } from './Observable.adm.js';

export class ObservableMap<K, V> extends Map<K, V> {
  get meta() {
    return lib.meta.get(this) || ObservableAdm.meta;
  }

  report(key: K, value?: V) {
    this.meta.adm.report(this.meta.key, this);
    this.meta.adm.report(`${this.meta.key}.${key.toString()}`, value);
  }

  has(key: K): boolean {
    try {
      return super.has(key);
    } finally {
      // is needed to subscribe on a key in map
      lib.executor.report(this.meta.adm, `${this.meta.key}.${key.toString()}`);
    }
  }

  get(key: K): V | undefined {
    try {
      return super.get(key);
    } finally {
      lib.executor.report(this.meta.adm, `${this.meta.key}.${key.toString()}`);
    }
  }

  set(key: K, value: V) {
    try {
      return super.set(key, value);
    } finally {
      this.report(key, value);
    }
  }

  delete(key: K) {
    try {
      return super.delete(key);
    } finally {
      this.report(key);
    }
  }

  clear() {
    const key = this.meta.key;
    for (const _key of this.keys()) {
      this.meta.adm.report(`${key}.${_key.toString()}`, undefined)
    }
    try {
      return super.clear();
    } finally {
      this.meta.adm.report(key, this);
    }
  }
}
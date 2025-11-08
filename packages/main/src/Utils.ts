import { ObservableAdmin } from './types.js';

export class Utils {
  static AdmKey = Symbol.for('adm');

  /** Property is ignored by user */
  static IGNORED = 0;

  /** getter/setter pair or standalone getter/setter */
  static ACCESSOR = 1;

  /** Collection is marked by user as shallow.
   * Collections elements shouldn't be converted to observables */
  static SHALLOW = 2;

  /** Normal writable data property */
  static WRITABLE = 3;

  static isPlainObject(value: unknown) {
    const ctor = value?.constructor;
    return !ctor || ctor === Object;
  }

  static isPrimitive(val: any) {
    return val === null || (typeof val !== 'object' && typeof val !== 'function');
  }

  static isDeepEqual(a: any, b: any) {
    if (a == null || b == null) return Object.is(a, b);
    const A = a.valueOf();
    const B = b.valueOf();
    if (typeof A === 'object') {
      if (typeof B !== 'object') return false;
      const keys = Object.keys(A);
      if (keys.length !== Object.keys(B).length) return false;
      for (const key of keys) {
        if (!Utils.isDeepEqual(A[key], B[key])) return false;
      }
      return true;
    }
    return Object.is(a, b);
  }

  static getAdm(value: Object): ObservableAdmin | undefined {
    return value[Utils.AdmKey]
  }

}
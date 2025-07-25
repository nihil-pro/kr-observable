export function set(i: number, value: unknown) {
  this[i] = value;
}

export function equal(input: any) {
  if (input == null) return false;
  const voi = input.valueOf();
  const vot = this.valueOf();
  if (typeof vot === 'object') {
    if (typeof voi !== 'object') return false;
    const keys = Object.keys(vot);
    if (keys.length !== Object.keys(voi).length) return false;
    for (const key of keys) {
      const $vot = vot[key];
      const $voi = voi[key];
      if ($vot == null) {
        // eslint-disable-next-line max-depth,no-lonely-if
        if ($voi != null) return false;
      } else {
        // eslint-disable-next-line max-depth,no-lonely-if
        if (!$vot.$equal($voi)) return false;
      }
    }
    return true;
  }
  return Object.is(vot, voi);
}

declare global {
  interface Object {
    /** Indicates whether some other value is "equal to" this one <br/>
     * `$equal` compares content (even deeply), not references! <br/>
     * Since in JS anything is object (expect null and undefined), this allows to compare any non-nullish values:
     * @example
     * const num = 0
     * const str = ''
     * const nan = NaN
     * const obj = {}
     *
     * console.log(num.$equal(2)) // false
     * console.log(str.$equal('hello')) // false
     * console.log(nan.$equal(NaN)) // true
     * console.log(obj.$equal([])) // false
     * @description Inspired by same method in Java.
     *  */
    $equal(input: any): boolean;
  }

  /** Same as arr[index] = value */
  interface Array<T> {
    set(i: number, v: T): void;
  }
}

import { lib } from './global.this.js';

/** Accepts one function that should run every time anything it observes changes. <br />
 It also runs once when you create the autorun itself.
 Returns a dispose function.
 */
export function autorun(fn: () => void) {
  const { dispose } = lib.transactions.transaction(fn, fn);
  return dispose;
}

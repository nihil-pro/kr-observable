import { lib } from './global.this.js';

/** Accepts one function that should run every time anything it observes changes. <br />
 It also runs once when you create the autorun itself.
 Returns a dispose function.
 */
export function autorun(work: () => void) {
  const runnable = { run: work, subscriber: work, autosub: true };
  lib.executor.execute(runnable);
  return () => lib.executor.dispose(runnable);
}

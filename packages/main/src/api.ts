import { Admin } from './Admin.js';
import { Observable } from './Observable.js';
import { Property, Subscriber, Listener, Runnable, Disposer } from './types.js';
import { lib, executor, $adm } from './global.js';

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}

const registry = new Map<() => void, Runnable>();
const error = new TypeError('First argument must be Observable');

export function subscribe(target: Observable, cb: Subscriber, keys: Set<Property>): Disposer {
  const adm = target[$adm];
  if (!adm) throw error;
  if (registry.has(cb)) return noop;
  const runnable = { subscriber: cb, active: false } as Runnable;
  keys.forEach(key => adm.subscribe(key, runnable));
  registry.set(cb, runnable);
  return () => {
    registry.delete(cb);
    adm.removeRunnable(runnable);
  };
}

/** Will react on any changes in Observable */
export function listen(target: Observable, cb: Listener): Disposer {
  const adm = target[$adm];
  if (!adm) throw error;
  if (!adm.listeners) adm.listeners = new Set<Listener>();
  adm.listeners.add(cb);
  return () => void adm.listeners.delete(cb);
}

export function transaction(work: () => void) {
  lib.action = true;
  work();
  lib.action = false;
  lib.queue.forEach(Admin.batch);
  lib.queue.clear();
  lib.notifier.clear();
}

/** Accepts one function that should run every time anything it observes changes. <br />
 It also runs once when you create the autorun itself.
 Returns a dispose function.
 */
export function autorun(work: () => void | Promise<void>): Disposer {
  if (registry.has(work)) return noop;
  const runnable = {
    run: work,
    subscriber() {
      lib.executor.execute(this)
    },
    debug: false,
    active: false
  };
  registry.set(work, runnable);
  lib.executor.execute(runnable);
  return () => {
    registry.delete(work);
    executor.dispose(runnable);
  };
}

export function untracked(work: () => any) {
  lib.untracked = true;
  const result = work();
  lib.untracked = false;
  return result;
}


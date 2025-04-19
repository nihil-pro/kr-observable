import { Observable } from './Observable.js';
import { ObservableAdm } from './Observable.adm.js';
import { Property, Subscriber, Listener, ObservedRunnable } from './types.js';
import { $adm } from './shared.js';
import { lib } from './global.this.js';

const error = new TypeError('First argument must be Observable');

export function subscribe(target: Observable, cb: Subscriber, keys: Set<Property>) {
  const adm = Reflect.get(target, $adm) as ObservableAdm | undefined;
  if (!adm) throw error;
  const runnable = { subscriber: cb } as ObservedRunnable;
  adm.subscribers.set(runnable, keys);
  return () => {
    adm.subscribers.delete(runnable);
  };
}

export function listen(target: Observable, cb: Listener) {
  const adm = Reflect.get(target, $adm) as ObservableAdm | undefined;
  if (!adm) throw error;
  adm.listeners.add(cb);
  return () => {
    adm.listeners.delete(cb);
  };
}

export function transaction(work: () => void) {
  lib.action = true;
  work();
  lib.action = false;
  lib.queue.forEach((adm) => adm.batch());
  lib.queue.clear();
  lib.notifier.clear();
}

/** Accepts one function that should run every time anything it observes changes. <br />
 It also runs once when you create the autorun itself.
 Returns a dispose function.
 */
export function autorun(work: () => void) {
  const runnable = { run: work, subscriber: work, autosub: true };
  lib.executor.execute(runnable);
  return () => lib.executor.dispose(runnable);
}

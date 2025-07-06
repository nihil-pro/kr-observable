import { Observable } from './Observable.js';
import { ObservableAdm } from './Observable.adm.js';
import { Property, Subscriber, Listener, ObservedRunnable } from './types.js';
import { $adm, noop } from './shared.js';
import { lib } from './global.this.js';

const registry = new Map<() => void, ObservedRunnable>();
const error = new TypeError('First argument must be Observable');

export function subscribe(target: Observable, cb: Subscriber, keys: Set<Property>) {
  const adm = Reflect.get(target, $adm) as ObservableAdm | undefined;
  if (!adm) throw error;
  if (registry.has(cb)) return noop;
  const runnable = { subscriber: cb, disposed: false } as ObservedRunnable;
  keys.forEach((key) => {
    let deps = adm.deps.get(key);
    if (!deps) {
      deps = new Set<ObservedRunnable>();
      adm.deps.set(key, deps);
    }
    deps.add(runnable);
    registry.set(cb, runnable);
  });
  return () => {
    registry.delete(cb);
    adm.deps.forEach((list) => list.delete(runnable));
  };
}

/** Will react on any changes in Observable */
export function listen(target: Observable, cb: Listener) {
  const adm = Reflect.get(target, $adm) as ObservableAdm | undefined;
  if (!adm) throw error;
  if (!adm.listeners) adm.listeners = new Set<Listener>();
  adm.listeners.add(cb);
  return () => void adm.listeners.delete(cb);
}

export function transaction(work: () => void) {
  lib.action = true;
  work();
  lib.action = false;
  lib.queue.forEach((adm) => adm.batch());
  lib.queue.clear();
  lib.notifier.clear();
}


export function autorun(effect: () => Promise<void>): Promise<() => void>;
export function autorun(effect: () => void): () => void;
/** Accepts one function that should run every time anything it observes changes. <br />
 It also runs once when you create the autorun itself.
 Returns a dispose function.
 */
export function autorun(work: () => void) {
  if (registry.has(work)) return noop;
  const isAsync = work.constructor.name === 'AsyncFunction';
  const runnable = {
    run: work,
    subscriber: () => lib.executor.execute(runnable),
    isAsync,
    disposed: false,
    debug: false,
  };

  registry.set(work, runnable);
  if (isAsync) {
    let resolver;
    // @ts-ignore
    runnable.subscriber = async () => {
      await lib.executor.execute(runnable);
    }
    // @ts-ignore
    lib.executor.execute(runnable).then(() => {
      resolver(() => {
        registry.delete(work);
        lib.executor.dispose(runnable);
      })
    })
    return new Promise(resolve => resolver = resolve) as Promise<() => void>
  }
  lib.executor.execute(runnable);
  return () => {
    registry.delete(work);
    lib.executor.dispose(runnable);
  };
}


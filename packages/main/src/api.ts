import { Admin } from './Admin.js';
import { Observable } from './Observable.js';
import { Property, Subscriber, Listener, Disposer, Runnable } from './types.js';
import { Utils } from './Utils.js'
import { Global } from './global.js';

const registry = new Map<Function, Disposer>();
const error = new TypeError('First argument must be Observable');

/** this allows to use same subscriber callback for different observable objects */
const subscribersRegistry = new Map<Function, {
  disposer: Disposer,
  adms: Set<Admin>,
  runnable: Runnable
}>();

export function subscribe(target: Observable, cb: Subscriber, keys: Set<Property>): Disposer {
  const adm = Utils.getAdm(target);
  if (!adm) throw error;

  let registered = subscribersRegistry.get(cb);

  // if callback already registered
  if (registered) {
    // if callback isn't registered for current admin, register it
    if (!registered.adms.has(adm)) {
      keys.forEach(key => adm.subscribe(key, registered.runnable));
    }
    return registered.disposer;
  }
  // create runnable
  const runnable = { subscriber: cb, runId: 1, active: false, deps: new Set } as Runnable;
  // subscribe to current admin
  keys.forEach(key => adm.subscribe(key, runnable));
  // create disposer
  const disposer = () => {
    subscribersRegistry.delete(cb);
    Global.executor.dispose(runnable);
  }
  // create registration meta
  registered = { runnable, disposer, adms: new Set([adm]) };
  subscribersRegistry.set(cb, registered);
  return disposer;
}


/** Accepts one function that should run every time anything it observes changes. <br />
 It also runs once when you create the autorun itself.
 Returns a dispose function.
 */
export function autorun(work: () => void | Promise<void>): Disposer {
  let disposer = registry.get(work);
  if (disposer) return disposer;

  const runnable = {
    run: work,
    subscriber() {
      Global.executor.execute(this);
    },
    debug: false,
    runId: 1,
    active: false,
    deps: undefined
  };
  disposer = () => {
    registry.delete(work);
    Global.executor.dispose(runnable);
  }
  registry.set(work, disposer);
  Global.executor.execute(runnable);
  return disposer;
}

/** Will react on any changes in Observable */
export function listen(target: Observable, cb: Listener): Disposer {
  const adm = Utils.getAdm(target);
  if (!adm) throw error;
  if (!adm.listeners) adm.listeners = new Set<Listener>();
  adm.listeners.add(cb);
  return () => void adm.listeners.delete(cb);
}

export function transaction(work: () => void) {
  Global.action = true;
  work();
  Global.action = false;
  Global.queue.forEach(Admin.batch);
  Global.queue.clear();
  Global.notifier.flush();
}


export function untracked(work: () => any) {
  Global.untracked = true;
  const result = work();
  Global.untracked = false;
  return result;
}


import { ObservableExecutor } from './Observable.executor.js';
import { SubscribersNotifier } from './Subscribers.notifier.js';
import { Property, Structure, StructureMeta, Admin } from './types.js';

export const emptySet = Object.freeze(new Set()) as Set<Property>;
export const $adm = Symbol.for('$adm');

function getGlobal(): WindowOrWorkerGlobalScope {
  if (typeof self !== 'undefined') return self;
  if (typeof global !== 'undefined') return global as unknown as WindowOrWorkerGlobalScope;
  return {} as WindowOrWorkerGlobalScope;
}

const $lib = Symbol.for('observable');
if (!getGlobal()[$lib]) {
  const lib = Object.create(null);
  lib.untracked = false;
  lib.action = false;
  lib.queue = new Set<Admin>();
  lib.meta = new WeakMap<Structure, StructureMeta>();
  lib.executor = ObservableExecutor;
  lib.notifier = SubscribersNotifier;
  Reflect.set(getGlobal(), $lib, Object.seal(lib));
}

/** Maybe is not great idea, but it's a reliable way to get a singleton  */
export const lib = Reflect.get(getGlobal(), $lib);
export const executor: typeof ObservableExecutor = lib.executor;
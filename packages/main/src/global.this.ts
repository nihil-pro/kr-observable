import { ObservableExecutor } from './Observable.executor.js';
import { SubscribersNotifier } from './Subscribers.notifier.js';
import { equal, set } from './extensions.js';

function getGlobal(): WindowOrWorkerGlobalScope {
  if (typeof self !== 'undefined') return self;
  if (typeof global !== 'undefined') return global as unknown as WindowOrWorkerGlobalScope;
  return {} as WindowOrWorkerGlobalScope;
}

export const GlobalKey = Symbol.for('observable');
if (!getGlobal()[GlobalKey]) {
  const lib = Object.create(null);
  lib.action = false;
  lib.queue = new Set();
  lib.meta = new WeakMap();
  lib.executor = ObservableExecutor;
  lib.notifier = SubscribersNotifier;
  Reflect.set(getGlobal(), GlobalKey, Object.seal(lib));
}

if (!Reflect.has(Object.prototype, 'equal')) {
  Reflect.defineProperty(Object.prototype, 'equal', { enumerable: false, value: equal });
}

if (!Reflect.has(Array.prototype, 'set')) {
  Reflect.defineProperty(Array.prototype, 'set', { enumerable: false, value: set });
}

/** Maybe is not great idea, but it's a reliable way to get a singleton  */
export const lib = Reflect.get(getGlobal(), GlobalKey);

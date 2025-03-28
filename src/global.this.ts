import { ObservableExecutor } from './Observable.executor.js';
import { SubscribersNotifier } from './Subscribers.notifier.js';
import { equal } from './equal.js';

function getGlobal(): WindowOrWorkerGlobalScope {
  if (typeof self !== 'undefined') {
    return self;
  }
  if (typeof global !== 'undefined') {
    return global as unknown as WindowOrWorkerGlobalScope;
  }
  return {} as WindowOrWorkerGlobalScope;
}

export const GlobalKey = Symbol.for('observable');
Reflect.set(getGlobal(), GlobalKey, { action: false });

if (!Reflect.has(Object.prototype, 'equal')) {
  Reflect.defineProperty(Object.prototype, 'equal', {
    enumerable: false,
    value: equal,
  });
}

/** Maybe is not great idea, but it's a reliable way to get a singleton  */
export const lib = Reflect.get(getGlobal(), GlobalKey);

if (!lib.executor) {
  lib.executor = ObservableExecutor;
}

if (!lib.notifier) {
  lib.notifier = SubscribersNotifier;
}

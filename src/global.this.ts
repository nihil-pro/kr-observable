import { ObservableTransactions } from './Observable.transaction.js';
import { SubscribersNotifier } from './Subscribers.notifier.js';

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
Reflect.set(getGlobal(), GlobalKey, {});

/** Maybe is not great idea, but it's a reliable way to get a singleton  */
export const lib = Reflect.get(getGlobal(), GlobalKey);

if (!lib.transactions) {
  lib.transactions = ObservableTransactions;
}

if (!lib.notifier) {
  lib.notifier = SubscribersNotifier;
}

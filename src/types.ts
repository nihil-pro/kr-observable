import { GlobalKey } from './global.this.js';
import { ObservableTransactions } from './Observable.transaction.js';
import { SubscribersNotifier } from './Subscribers.notifier.js';

export type Subscriber = (changes?: Set<string | symbol>) => void | Promise<void>;
export type Listener = (property: string | symbol, value: any) => void | Promise<void>;
declare global {
  interface WindowOrWorkerGlobalScope {
    [GlobalKey]: {
      transactions: typeof ObservableTransactions;
      notifier: typeof SubscribersNotifier;
      action: boolean;
    };
  }
}

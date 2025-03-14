import { GlobalKey } from './global.this.js';
import { ObservableTransactions } from './Observable.transaction.js';
import { SubscribersNotifier } from './Subscribers.notifier.js';
import { ObservableAdministration } from './Observable.administration.js';

export type Subscriber = (changes?: Set<string | symbol>) => void | Promise<void>;
export type Listener = (property: string | symbol, value: any) => void | Promise<void>;
declare global {
  interface WindowOrWorkerGlobalScope {
    [GlobalKey]: {
      /** Is needed to exclude possibility of «Maximum call stack size exceeded» <br/>
       * This error can happen, if user accidentally mutate state in an effect, such as subscriber or autorun.<br/>
       * Since we know exactly when the effect is performed, we may not report any changes that occurred at that time.
       * */
      runningEffect: boolean;
      transactions: typeof ObservableTransactions;
      notifier: typeof SubscribersNotifier;
      changedInEffect: Map<ObservableAdministration, Set<string | symbol>>;
      action: boolean;
    };
  }
}

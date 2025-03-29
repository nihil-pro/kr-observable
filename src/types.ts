import { GlobalKey } from './global.this.js';
import { ObservableExecutor } from './Observable.executor.js';
import { SubscribersNotifier } from './Subscribers.notifier.js';

export type Subscriber = (changes?: Set<string | symbol>) => void;
export type Listener = (property: string | symbol, value: any) => void;
export interface WeakSubscriber {
  subscribe: Subscriber;
}

export interface ObservedRunnable {
  run: Function;
  subscriber: Subscriber;
  autosub: boolean;
}

declare global {
  interface WindowOrWorkerGlobalScope {
    [GlobalKey]: {
      executor: typeof ObservableExecutor;
      notifier: typeof SubscribersNotifier;
      action: boolean;
    };
  }
}

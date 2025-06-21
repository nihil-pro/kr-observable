import { GlobalKey } from './global.this.js';
import { ObservableExecutor } from './Observable.executor.js';
import { SubscribersNotifier } from './Subscribers.notifier.js';
import { ObservableAdm } from './Observable.adm.js';

export type Property = string | symbol;
export type Subscriber = (changes?: Set<string | symbol>) => void;
export type Listener = (property: string | symbol, value: any) => void;

export interface ObservedRunnable {
  run: Function;
  subscriber: Subscriber;
  isAsync?: boolean;
  disposed: boolean;
  debug: boolean;
}

type Structure = Map<any, any> | Set<any> | Array<any>;

/** Holds relationship between the *structure and the *structure owner object.
 * structure = ObservableArray, ObservableMap or ObservableSet */
export interface StructureMeta {
  key: Property;
  adm: ObservableAdm;
}

declare global {
  interface WindowOrWorkerGlobalScope {
    [GlobalKey]: {
      executor: typeof ObservableExecutor;
      notifier: typeof SubscribersNotifier;
      action: boolean;
      queue: Set<ObservableAdm>;
      meta: WeakMap<Structure, StructureMeta>;
    };
  }
}

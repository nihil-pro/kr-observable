import React, {
  ForwardRefExoticComponent,
  ForwardRefRenderFunction,
  FunctionComponent,
  MemoExoticComponent,
  PropsWithoutRef,
  RefAttributes,
  memo,
  useRef,
  useSyncExternalStore
} from 'react';
import { executor, ObservableAdmin, Runnable } from 'kr-observable';

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}

class Rss implements Runnable {
  active = false;
  debug = false;
  read?: Set<ObservableAdmin>;
  deps?: Set<Set<Runnable>>
  name: string;
  runId = 1;
  onStoreChange = noop;
  run: Function;

  constructor(rc: Function, debug: boolean) {
    this.name = rc.name;
    this.debug = debug;
    this.run = rc;
  }

  getSnapshot = () => this.runId;

  subscriber(changes?: Set<string | symbol>) {
    if (this.debug) {
      console.info(`[${this.name}] will re-render. Changes:`, changes);
    }
    this.onStoreChange();
  }

  subscribe = (onStoreChange: () => void) => {
    this.onStoreChange = onStoreChange;
    return () => {
      // @ts-ignore
      executor.dispose(this);
      if (this.debug) {
        console.info(`[${this.name}] was unmounted`);
      }
    };
  };
}

export function observer<P extends object, TRef = {}>(
  rc: ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<TRef>>,
  debug?: boolean
): MemoExoticComponent<ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<TRef>>>;

export function observer<P extends object>(
  rc: FunctionComponent<P>,
  debug?: boolean
): FunctionComponent<P>;

export function observer<P extends FunctionComponent<any> | ForwardRefRenderFunction<any>>(
  baseComponent: P,
  debug?: boolean
): P

export function observer<A extends object, B = {}>(
  rc:
    | ForwardRefRenderFunction<B, A>
    | FunctionComponent<A>
    | ForwardRefExoticComponent<PropsWithoutRef<A> & RefAttributes<B>>,
  debug = false
) {
  return memo(function render(props, _ref) {
    const ref = useRef<Rss>(null);
    if (!ref.current) ref.current = new Rss(rc, debug);
    const store = ref.current;
    useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    // @ts-ignore
    const result = executor.execute(store, props, _ref);
    if (debug) {
      const read = {};
      store.read?.forEach(adm => {
        adm.deps.forEach((list, key) => {
          // @ts-ignore
          if (list.has(store)) {
            let keys = read[adm.owner];
            if (!keys) {
              keys = new Set();
              read[adm.owner] = keys;
            }
            keys.add(key);
          }
        });
      });
      console.info(`[${rc.name}] was rendered. Read: `, read);
    }
    return result;
  });
}



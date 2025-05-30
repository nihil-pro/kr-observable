import {
  ForwardRefExoticComponent,
  ForwardRefRenderFunction,
  FunctionComponent,
  memo,
  MemoExoticComponent,
  PropsWithoutRef,
  RefAttributes,
  Ref,
  useRef,
  useSyncExternalStore,
} from 'react';

import { lib } from '../src/global.this.js';
import { ObservedRunnable } from '../src/types.js';
import { noop } from '../src/shared.js';

class Rss implements ObservedRunnable {
  version = 1;
  debug = false;
  rc: Function;
  onStoreChange = noop;
  run = noop;

  constructor(rc: Function, debug: boolean) {
    this.rc = rc;
    this.debug = debug;
  }

  getSnapshot = () => this.version;

  subscriber(changes?: Set<string | symbol>) {
    if (this.debug) console.info(`[${this.rc.name}] will re-render. Changes:`, changes);
    ++this.version;
    this.onStoreChange();
  }

  subscribe = (onStoreChange: () => void) => {
    this.onStoreChange = onStoreChange;
    return () => {
      lib.executor.dispose(this);
      if (this.debug) console.info(`[${this.rc.name}] was unmounted`);
    };
  };
}

function useObserver<T>(rc: () => T, debug = false) {
  const ref = useRef<Rss | null>(null);
  if (!ref.current) ref.current = new Rss(rc, debug);
  const store = ref.current!;
  store.run = rc;
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const TR = lib.executor.execute(store);
  if (TR.error) throw TR.error;
  if (debug) {
    const read: Record<string, Set<string | symbol>> = {};
    TR.read.forEach((adm) => {
      adm.deps.forEach((list, key) => {
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
  return TR.result;
}

export function observer<P extends object, TRef = {}>(
  rc: ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<TRef>>,
  debug?: boolean
): MemoExoticComponent<ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<TRef>>>;

export function observer<P extends object>(
  rc: FunctionComponent<P>,
  debug?: boolean
): FunctionComponent<P>;

export function observer<A extends object, B = {}>(
  rc:
    | ForwardRefRenderFunction<B, A>
    | FunctionComponent<A>
    | ForwardRefExoticComponent<PropsWithoutRef<A> & RefAttributes<B>>,
  debug = false
) {
  const observedComponent = (props: any, ref: Ref<B>) => useObserver(() => rc(props, ref), debug);
  return memo(observedComponent);
}

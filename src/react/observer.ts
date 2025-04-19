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

import { lib } from '../global.this.js';
import { ObservedRunnable } from '../types.js';

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}

class Rss implements ObservedRunnable {
  version = 1;
  autosub = true;
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
    if (this.debug) {
      console.info(`[${this.rc.name}] will re-render. Changes:`, changes);
    }
    ++this.version;
    this.onStoreChange();
  }

  subscribe = (onStoreChange: () => void) => {
    this.onStoreChange = onStoreChange;
    return () => {
      lib.executor.dispose(this);
      if (this.debug) {
        console.info(`[${this.rc.name}] was unmounted`);
      }
    };
  };
}

function useObserver<T>(rc: () => T, debug = false) {
  const ref = useRef<Rss | null>(null);
  if (!ref.current) {
    ref.current = new Rss(rc, debug);
  }
  const store = ref.current!;
  store.run = rc;
  useSyncExternalStore(store.subscribe, store.getSnapshot);
  const TR = lib.executor.execute(store);
  if (TR.error) throw TR.error;
  if (debug) {
    const read: Record<string, Set<string | symbol>> = {};
    TR.read.forEach((keys, adm) => (read[adm.owner] = keys));
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

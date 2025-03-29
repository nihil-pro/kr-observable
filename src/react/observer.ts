import {
  ForwardRefExoticComponent,
  ForwardRefRenderFunction,
  FunctionComponent,
  memo,
  MemoExoticComponent,
  PropsWithoutRef,
  Ref,
  RefAttributes,
  useRef,
  useSyncExternalStore,
} from 'react';

import { lib } from '../global.this.js';
import { ObservedRunnable } from '../types.js';

class Rss implements ObservedRunnable {
  props: any = {};
  ref: any = {};
  version = 1;
  autosub = true;
  debug = false;
  rc: Function;

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

  run() {
    return this.rc(this.props, this.ref);
  }

  subscribe = (onStoreChange: () => void) => {
    this.onStoreChange = onStoreChange;
    return this.unsubscribe;
  };
  unsubscribe = () => {
    lib.executor.dispose(this);
    if (this.debug) {
      console.info(`[${this.rc.name}] was unmounted`);
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onStoreChange() {}
}

type Rc<T> = (p: any, r: any) => T;

function useObserver<T>(rc: Rc<T>, props: any, ref: any, debug = false) {
  const rssRef = useRef<Rss | null>(null);
  if (!rssRef.current) {
    rssRef.current = new Rss(rc, debug);
  }
  const store = rssRef.current!;
  store.props = props;
  store.ref = ref;
  useSyncExternalStore(store.subscribe, store.getSnapshot);
  const TR = lib.executor.execute(store);
  if (TR.exception) throw TR.exception;
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
  const observedComponent = (props: any, ref: Ref<B>) => useObserver(rc, props, ref, debug);
  return memo(observedComponent);
}

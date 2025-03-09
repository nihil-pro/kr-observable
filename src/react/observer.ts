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
import { Subscriber } from '../types.js';
import { whoami } from '../Observable.js';

interface ReactSyncStore {
  name: string;
  version: number;
  onChange: Subscriber;
  subscribe(onStoreChange: () => void): () => void;
  getSnapshot(): number;
  work: Function;
  rc: Function;
}

function createSyncStore(rc: Function, name: string, debug: boolean): ReactSyncStore {
  const rss = {
    name,
    rc,
    work: () => rss.rc(),
    version: 0,
    onChange: () => void 0,
    getSnapshot: () => rss.version,
    subscribe: (onStoreChange: () => void) => {
      rss.onChange = (changes?: Set<string | symbol>) => {
        ++rss.version;
        if (debug) {
          console.info(`${name} will re-render. Changes: `, changes);
        }
        onStoreChange();
      };
      const read = lib.transactions.get(rss.work)?.read;
      read?.forEach((keys, adm) => adm.subscribe(rss.onChange, keys));
      return () => {
        if (debug) {
          console.info(`${rss.name} was unmounted`);
        }
        lib.transactions.dispose(rss.work);
      };
    },
  };
  return rss;
}

function useObserver<T>(render: () => T, name: string, debug = false) {
  const ref = useRef<ReactSyncStore | null>(null);
  if (!ref.current) {
    ref.current = createSyncStore(render, name, debug);
  }
  const store = ref.current!;
  store.rc = render;
  useSyncExternalStore(store.subscribe, store.getSnapshot);
  const TR = lib.transactions.transaction(store.work, store.onChange);
  if (TR?.exception) throw TR.exception;
  if (debug) {
    const read: Record<string, Set<string | symbol>> = {};
    TR?.read.forEach((keys, adm) => (read[adm[whoami]] = keys));
    console.info(`${name} was rendered. Read: `, read);
  }
  return TR?.result;
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
  const observedComponent = (props: any, ref: Ref<B>) => {
    return useObserver(() => rc(props, ref), rc.name, debug);
  };
  return memo(observedComponent);
}

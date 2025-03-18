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

class Rss {
  version = 0;
  name: string;
  debug: boolean;
  rc: Function;
  onStoreChange: () => void | undefined;

  constructor(rc: Function, name: string, debug: boolean) {
    this.rc = rc;
    this.name = name;
    this.debug = debug;
  }

  work = () => this.rc();
  getSnapshot = () => this.version;
  onChange = (changes?: Set<string | symbol>) => {
    if (this.debug) {
      console.info(`${this.name} will re-render. Changes:`, changes);
    }
    ++this.version;
    if (this.onStoreChange) {
      this.onStoreChange();
    }
  };
  subscribe = (onStoreChange: () => void) => {
    this.onStoreChange = onStoreChange;
    const read = lib.transactions.get(this.work)?.read;
    read.forEach((keys, adm) => adm.subscribe(this.onChange, keys));
    return () => {
      lib.transactions.dispose(this.work, this.onChange);
      if (this.debug) {
        console.info(`${this.name} was unmounted`);
      }
    };
  };
}

interface ReactSyncStore {
  name: string;
  version: number;
  onChange: Subscriber;
  subscribe(onStoreChange: () => void): () => void;
  getSnapshot(): number;
  work: Function;
  rc: Function;
}

// function noop(): void {}
//
// function createSyncStore(rc: Function, name: string, debug: boolean): ReactSyncStore {
//   const rss = {
//     name,
//     rc,
//     work: () => rss.rc(),
//     version: 0,
//     onChange: noop,
//     getSnapshot: () => rss.version,
//     subscribe: (onStoreChange: () => void) => {
//       rss.onChange = (changes?: Set<string | symbol>) => {
//         ++rss.version;
//         if (debug) {
//           console.info(`${name} will re-render. Changes: `, changes);
//         }
//         onStoreChange();
//       };
//       const read = lib.transactions.get(rss.work)?.read;
//       read?.forEach((keys, adm) => adm.subscribe(rss.onChange, keys));
//       return () => {
//         if (debug) {
//           console.info(`${rss.name} was unmounted`);
//         }
//         lib.transactions.dispose(rss.work, rss.onChange);
//       };
//     },
//   };
//   return rss;
// }

function useObserver<T>(render: () => T, name: string, debug = false) {
  const ref = useRef<ReactSyncStore | null>(null);
  if (!ref.current) {
    ref.current = new Rss(render, name, debug);
  }
  const store = ref.current!;
  store.rc = render;
  useSyncExternalStore(store.subscribe, store.getSnapshot);
  const TR = lib.transactions.transaction(store.work, store.onChange);
  if (TR?.exception) throw TR.exception;
  if (debug) {
    const read: Record<string, Set<string | symbol>> = {};
    TR?.read.forEach((keys, adm) => (read[adm.owner] = keys));
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

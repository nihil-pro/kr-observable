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
import { executor } from 'kr-observable';

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}

class Rss {
  version = 1;
  debug = false;
  disposed = false;
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
      const result = executor.get(this);
      if (result) {
        const rcDepsChanges = new Set();
        changes?.forEach((change) => {
          result.read.forEach(adm => {
            if (adm.deps.has(change)) rcDepsChanges.add(change);
          })
        })
        console.info(`[${this.rc.name}] will re-render. Changes:`, rcDepsChanges);
      } else {
        console.info(`[${this.rc.name}] will re-render. Changes:`, changes);
      }
    }
    ++this.version;
    this.onStoreChange();
  }

  subscribe = (onStoreChange: () => void) => {
    this.onStoreChange = onStoreChange;
    return () => {
      executor.dispose(this);
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
  const TR = executor.execute(store);
  // if (TR.error) throw TR.error;
  if (debug) {
    const read: Record<string, Set<string | symbol>> = {};
    TR.read?.forEach((adm) => {
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

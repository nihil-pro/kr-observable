import { executor } from 'kr-observable';
import { useRef } from 'preact/hooks';
import { useSyncExternalStore, memo, forwardRef } from 'preact/compat';
import { VNode, Ref, ComponentType } from 'preact';

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
    if (this.debug) console.info(`[${this.rc.name}] will re-render. Changes:`, changes);
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
  useSyncExternalStore(store.subscribe, store.getSnapshot);
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

// type _Ref<T> = Ref<T>;
type Component<P = {}> = ComponentType<P>;

// Helper to detect if component uses ref
function isForwardRef<P>(fn: Component<P>): boolean {
  return fn.length > 1;
}

export function observer<P>(
  rc: (props: P) => VNode<any>,
  debug?: boolean
): (props: P) => VNode<any>;

export function observer<P, T>(
  rc: (props: P, ref: Ref<T>) => VNode<any>,
  debug?: boolean
): (props: P, ref: Ref<T>) => VNode<any>;

export function observer<P, T>(
  rc: ((props: P) => VNode<any>) | ((props: P, ref: Ref<T>) => VNode<any>),
  debug = false
) {
  const wrapped = (props: P, ref: Ref<T>) => useObserver(() => rc(props, ref), debug);

  if (isForwardRef(rc)) {
    return memo(forwardRef(wrapped as (props: P, ref: Ref<T>) => VNode<any>));
  }
  return memo(wrapped as (props: P) => VNode<any>);
}

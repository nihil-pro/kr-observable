import {
  ForwardRefExoticComponent,
  ForwardRefRenderFunction,
  FunctionComponent,
  MemoExoticComponent,
  PropsWithoutRef,
  RefAttributes,
  memo,
  useRef,
  useSyncExternalStore,
  Component,
  PureComponent
} from 'react';
import { executor, ObservableAdmin, Runnable } from 'kr-observable';

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}

function shallowDiffers(a: Object, b: Object) {
  for (let i in a) if (!(i in b)) return true;
  for (let i in b) if (a[i] !== b[i]) return true;
  return false;
}

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

// @ts-ignore
export function observer<P extends object, TRef = {}>(
  rc: ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<TRef>>,
  debug?: boolean
): MemoExoticComponent<ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<TRef>>>;

export function observer<A extends object, B = {}>(
  rc: FunctionComponent<A>,
  debug?: boolean
): FunctionComponent<A>;

export function observer<T extends new (...args: any[]) => Component<any, any>>(
  rc: T,
  debug?: boolean
): T;


export function observer<A extends object, B = {}>(
  rc:
    | ForwardRefRenderFunction<B, A>
    | FunctionComponent<A>
    | ForwardRefExoticComponent<PropsWithoutRef<A> & RefAttributes<B>>
    | (new (...args: any[]) => Component<any, any>),
  debug = false
): any {

  const proto = Reflect.getPrototypeOf(rc);
  if (proto === Component || proto === PureComponent) {
    const ClassComponent = rc as new (...args: any[]) => Component<any, any>;
    return class extends ClassComponent implements Runnable {
      active = false;
      debug = debug;
      read?: Set<ObservableAdmin>;
      deps?: Set<Set<Runnable>>
      runId = 1;
      run: Function;
      subscriber: (changes?: Set<string | symbol>) => void;

      constructor(props: any, state: any) {
        super(props, state);
        this.run = this.render;
        this.render = () => executor.execute(this, this.props)
        this.subscriber = () => this.forceUpdate();

        // PureComponent can't define shouldComponentUpdate
        if (proto === Component) {
          this.shouldComponentUpdate = nextProps => shallowDiffers(this.props, nextProps);
        }
      }
    }
  }

  return memo(function render(props, _ref) {
    const ref = useRef<Rss>(null);
    if (!ref.current) ref.current = new Rss(rc, debug);
    const store = ref.current;
    useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
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



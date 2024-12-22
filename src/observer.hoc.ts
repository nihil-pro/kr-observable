import {
  useEffect,
  useState,
  memo,
  useCallback,
  Ref,
  ForwardRefRenderFunction,
  FunctionComponent,
  PropsWithoutRef,
  RefAttributes,
  ForwardRefExoticComponent,
  MemoExoticComponent,
} from 'react';

import { ObservableTransactions } from './Observable.transaction.js';

function useObservable<T>(fn: () => T, name: string, props: any, debug = false) {
  const { 1: render } = useState(0);
  const work = useCallback(fn, [props]);
  const cb = useCallback((reason?: Set<string | symbol>) => {
    if (debug) {
      console.info(`${name} will re-render because of changes:`, reason);
    }
    render((prev) => prev + 1); // 1 - prev
  }, []);
  const TR = ObservableTransactions.transaction(work, cb);
  useEffect(() => {
    return () => {
      TR?.dispose();
      if (debug) {
        console.info(`${name} was unmount`);
      }
    };
  }, []);

  if (debug) {
    const plainReads = new Map();
    TR.read.forEach((keys, adm) => {
      plainReads.set(adm[Symbol.for('whoami')], keys);
    });
    console.info(`${name} was rendered ${TR.count} times.`, plainReads);
  }

  if (TR.exception) {
    console.error(`In > ${name}`, TR.exception);
    throw TR.exception;
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
  const observedComponent = (props: any, ref: Ref<B>) => {
    return useObservable(() => rc(props, ref), rc.name, props, debug);
  };
  return memo(observedComponent);
}

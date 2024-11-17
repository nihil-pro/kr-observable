import { useEffect, useState, memo, useCallback } from 'react'
import type {
    Ref,
    ForwardRefRenderFunction,
    FunctionComponent,
    PropsWithoutRef,
    RefAttributes,
    ForwardRefExoticComponent,
    MemoExoticComponent
} from 'react'
import { ObservableTransactions } from './Observable.transaction.js';

interface ObserverOptions {
    debug?: boolean,
    name?: string
}

function useObservable<T>(fn: () => T, name: string, options = {} as ObserverOptions) {
    const debugName = options?.name || name
    const debug = options?.debug || false
    const { 0: value, 1: render } = useState(0)
    const work = useCallback(fn, [])
    const cb = useCallback((reason?: Set<string | symbol>) => {
        render((prev) => 1 - prev)
        if (debug) {
            console.info(`${debugName} will re-render because of changes:`, reason)
        }
    }, [])
    let renderResult!: T
    const { dispose, stats, exception, result } = ObservableTransactions.transaction(work, cb)
    renderResult = result
    if (debug) {
        const plainReads = new Map()
        stats.read.forEach((keys, adm) => {
            plainReads.set(adm[Symbol.for('whoami')], keys)
        })
        console.info(`${debugName} was rendered ${stats.count} times.`, plainReads)
    }

    useEffect(() => {
        return () => {
            dispose()
            if (debug) {
                console.info(`${debugName} was unmount`)
            }
        }
    }, []);

    if (exception) {
        console.error(`In > ${name}`, exception)
        throw exception;
    }
    return renderResult
}

export function observer<P extends object, TRef = {}>(
  rc: ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<TRef>>, options?: ObserverOptions
): MemoExoticComponent<ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<TRef>>>

export function observer<P extends object>(rc: FunctionComponent<P>, options?: ObserverOptions): FunctionComponent<P>

export function observer<A extends object, B = {}>(
    rc: ForwardRefRenderFunction<B, A> | FunctionComponent<A> | ForwardRefExoticComponent<PropsWithoutRef<A> & RefAttributes<B>>,
    options?: ObserverOptions
) {
    let observedComponent = (props: any, ref: Ref<B>) => useObservable(() => rc(props, ref), rc.name, options)
    observedComponent = memo(observedComponent)
    return observedComponent
}

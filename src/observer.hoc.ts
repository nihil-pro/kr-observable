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
import { ObservableTransactions, TransactionResult } from './Observable.transaction.js';

function useObservable<T>(fn: () => T, name: string, props: any, debug = false) {
    const { 0: value, 1: render } = useState(0)
    const work = useCallback(fn, [props])
    const cb = useCallback((reason?: Set<string | symbol>) => {
        if (debug) {
            console.info(`${name} will re-render because of changes:`, reason)
        }
        render((prev) => prev + 1) // 1 - prev
    }, [])
    let TR!: TransactionResult

    useEffect(() => {
        return () => {
            TR?.dispose()
            if (debug) {
                console.info(`${name} was unmount`)
            }
        }
    }, []); // toDo maybe props

    TR = ObservableTransactions.transaction(work, cb, false)

    if (debug) {
        const plainReads = new Map()
        TR.stats.read.forEach((keys, adm) => {
            plainReads.set(adm[Symbol.for('whoami')], keys)
        })
        console.info(`${name} was rendered ${TR.stats.count} times.`, plainReads)
    }

    if (TR.exception) {
        console.error(`In > ${name}`, TR.exception)
        throw TR.exception;
    }
    return TR.result
}

export function observer<P extends object, TRef = {}>(
  rc: ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<TRef>>, debug?: boolean
): MemoExoticComponent<ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<TRef>>>

export function observer<P extends object>(rc: FunctionComponent<P>, debug?: boolean): FunctionComponent<P>

export function observer<A extends object, B = {}>(
    rc: ForwardRefRenderFunction<B, A> | FunctionComponent<A> | ForwardRefExoticComponent<PropsWithoutRef<A> & RefAttributes<B>>,
    debug = false
) {
    let observedComponent = (props: any, ref: Ref<B>) => useObservable(() => rc(props, ref), rc.name, props, debug)
    // observedComponent = memo(observedComponent)
    return memo(observedComponent)
}

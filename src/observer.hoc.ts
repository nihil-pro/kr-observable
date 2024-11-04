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
import { TransactionExecutor } from "./Observable";
import { getGlobal } from "./global.this";

const Executor = getGlobal()[TransactionExecutor]

function useObservable<T>(fn: () => T, name: string) {
    const { 0: value, 1: render } = useState(0)
    const cb = () => render((prev) => 1 - prev)
    const work = useCallback(fn, [])
    let renderResult!: T
    const { read, changed, exception, result } = Executor.transaction(work)
    renderResult = result
    useEffect(() => {
        read.forEach((keys, observable) => observable.subscribe(cb, keys))
        return () => {
            read.forEach((_, observable) => observable.unsubscribe(cb))
            read.clear()
        }
    }, [changed]);

    if (exception) {
        console.error(`In > ${name}`, exception)
        throw exception;
    }
    return renderResult
}

export function observer<P extends object, TRef = {}>(
  rc: ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<TRef>>
): MemoExoticComponent<ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<TRef>>>

export function observer<P extends object>(rc: FunctionComponent<P>): FunctionComponent<P>

export function observer<A extends object, B = {}>(
    rc: ForwardRefRenderFunction<B, A> | FunctionComponent<A> | ForwardRefExoticComponent<PropsWithoutRef<A> & RefAttributes<B>>
) {
    let observedComponent = (props: any, ref: Ref<B>) => useObservable(() => rc(props, ref), rc.name)
    observedComponent = memo(observedComponent)
    return observedComponent
}

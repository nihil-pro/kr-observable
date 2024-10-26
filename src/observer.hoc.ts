import { useEffect, useState, memo } from 'react'
import type {
    Ref,
    ForwardRefRenderFunction,
    FunctionComponent,
    PropsWithoutRef,
    RefAttributes,
    ForwardRefExoticComponent,
    MemoExoticComponent
} from 'react'
import { global } from "./Observable";

function useObservable<T>(fn: () => T, name: string) {
    const { 0: value, 1: render } = useState(0)
    const cb = () => render((prev) => prev + 1)
    let renderResult!: T
    let exception: any
    const { read } = self[global]?.transaction(() => {
        try {
            renderResult = fn()
        } catch (e) { exception = e }
    })

    useEffect(() => {
        read?.forEach((keys, observable) => observable.subscribe(cb, keys))
        return () => read?.forEach((_, observable) => observable.unsubscribe(cb))
    }, [read]);

    if (exception) { throw exception; }
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

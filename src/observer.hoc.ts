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
import { ObservableTransactions } from "./Observable";

// toDo need only one instance in global
if (!('__ObservableTransactions__' in self)) {
    Reflect.set(self, '__ObservableTransactions__', ObservableTransactions)
}

function useObservable<T>(fn: () => T, name: string) {
    const [_, render] = useState('')
    const cb = () => render(crypto.randomUUID())
    let renderResult!: T
    let exception: any
    const { read, hash } = self.__ObservableTransactions__.transaction(() => {
        try {
            renderResult = fn()
        } catch (e) { exception = e }
    })

    useEffect(() => {
        read?.forEach((keys, observable) => observable.subscribe(cb, keys))
        return () => read?.forEach((_, observable) => observable.unsubscribe(cb))
    }, [hash]);

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

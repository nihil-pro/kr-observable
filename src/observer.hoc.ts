import { useEffect, useState, memo, Ref, ForwardRefRenderFunction, FunctionComponent, PropsWithoutRef, RefAttributes, ForwardRefExoticComponent } from 'react'

function useObservable<T>(fn: () => T, name: string) {
    const [_, render] = useState('')
    const cb = () => render(crypto.randomUUID())
    let renderResult!: T
    let exception: any
    const read = self.__ObservableTransactions__.transaction(() => {
        try {
            renderResult = fn()
        } catch (e) { exception = e }
    })

    useEffect(() => {
        read.forEach((keys, observable) => observable.subscribe(cb, keys))
        return () => read.forEach((_, observable) => observable.unsubscribe(cb))
    }, []);

    if (exception) { throw exception; }
    return renderResult
}

export function observer<A extends object, B = {}>(
    rc: ForwardRefRenderFunction<B, A> | FunctionComponent<A> | ForwardRefExoticComponent<PropsWithoutRef<A> & RefAttributes<B>>
) {
    let observedComponent = (props: any, ref: Ref<B>) => useObservable(() => rc(props, ref), rc.name)
    observedComponent = memo(observedComponent)
    return observedComponent
}

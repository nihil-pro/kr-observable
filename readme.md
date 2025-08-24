# [Observable](https://observable.ru/)
## Adds reactivity power for your JavaScript 😎

[![npm](https://img.shields.io/npm/v/kr-observable)](https://www.npmjs.com/package/kr-observable)
![coverage](https://github.com/nihil-pro/observable-class/blob/main/assets/coverage.svg)
[![size-esm](https://github.com/nihil-pro/observable-class/blob/main/assets/esm.svg)](https://bundlephobia.com/package/kr-observable)
[![size-cjs](https://github.com/nihil-pro/observable-class/blob/main/assets/cjs.svg)](https://bundlephobia.com/package/kr-observable)

1. Easy to use and provides a great developer experience;
2. Supports classes and plain objects;
3. Supports subclassing;
4. Works in all runtimes (Node.js, Web, e.t.c);
5. Well typed;
6. Framework-agnostic.
7. Bindings for React, Preact and Vue

## Built in bindings
- [React](https://observable.ru/integrations/React.html)
- [Preact](https://observable.ru/integrations/Preact.html)
- [Solid-js](https://observable.ru/integrations/Solid.html)
- [Vue](https://observable.ru/integrations/Vue.html)

### Docs – [observable.ru](https://observable.ru/)

## Example with React
```ts
import { makeObservable } from 'kr-observable'
import { observer } from 'kr-observable/react'

const state = makeObservable({ count: 0 })

function App() {
  return (
    <div>
      <button onClick={() => --state.count}>-</button>
      <div>{state.count}</div>
      <button onClick={() => ++state.count}>+</button>
    </div>
  )
}
export default observer(App)
```

More example and full docs on [observable.ru](https://observable.ru/)

## Performance and memory usage benchmark
[js-framework-benchmark](https://krausest.github.io/js-framework-benchmark/index.html)

## Reactivity benchmark
[mol.hyoo.ru](https://mol.hyoo.ru/#!section=bench/bench=reactivity)

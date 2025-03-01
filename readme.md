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

For use as a state-manager, it comes with `observer` HOC (higher-order component) for React, as most popular library. 
But it can be used with any JavaScript framework or library.

### Docs – [observable.ru](https://observable.ru/)

## Example with React
```ts
import { Observable, observer } from 'kr-observable'

class Counter extends Observable {
  count = 0;
  increase() { ++this.count; }
  decrease() { --this.count; }
}

const counter = new Counter()

function App() {
  return (
    <div>
      <button onClick={counter.decrease}>-</button>
      <div>{counter.count}</div>
      <button onClick={counter.increase}>+</button>
    </div>
)
}
export default observer(App)
```

More example and full docs on [observable.ru](https://observable.ru/)


## Performance 
Is fast enough.
![observable performance](https://avtodoka-msk.ru/perf.png)

## Memory usage
![observable memory usage](https://avtodoka-msk.ru/mem.png)

## Limitations
There is only one limitation: if you assign a new element to the array by index – changes will happen, of course, but You will not be notified.
```typescript
import { Observable } from 'kr-observable';

class Example extends Observable {
  array = []
}

const state = new Example()
state.listen((p,v) => console.log(p,v))
state.array[0] = 1 // 
state.array.set(0,1) // array 1
```
There is a new `set` method in Array which you can use for that.
# Observable
A proxy-based observer, and  observable-based state-manager for react/preact.
1. Small size – 2 kB (gzipped, non minified)
2. Easy to use, see examples below.
3. Supports subclasses.
4. No dependencies.

## Usage with react or preact/compat
Write a class that extends Observable, and wrap the component in observer hoc. <br />
Nothing else is needed.
```tsx
import { Observable, observer } from "kr-observable";

class State extends Observable {
  results: string[] = []
  text = ''
  loading = false
  
  // All methods are automatically bounded, 
  // so you can safely use them as listeners
  setText(event: Event) {
    this.text = event.target.value
  }
  
  async search() {
    try {
      this.loading = true
      const response = await fetch('/someApi')
      this.results = await response.json()
    } catch(e) {
      console.warn(e)
    } finally {
      this.loading = false
    }
  }
  
  reset() {
    this.results = []
  }
}

const state = new State()

const Results = observer(function results() {
  // Will re-render only if the results change
  return (
    <div>
      {state.results.map(result => <div key={result}>{result}</div>)}
    </div>
  )
})

const Component = observer(function component() {
  // Will re-render only if the text or loading change
  return (
    <div>
      <input 
        placeholder="Text..." 
        onChange={state.setText}
        disabled={state.loading}
        value={state.text}
      />
      <button 
        onClick={state.search}
        disabled={state.loading}
      >
        Submit
      </button>
      
      <button onClick={state.reset}> 
        Reset
      </button>
      <Results />
    </div>
  )
})
```

More complicated example on [CodeSandbox](https://codesandbox.io/p/sandbox/v7zf47)

## Debug in react/preact
```tsx
import { observer } from "kr-observable";

const Component = observer(
  function () {
    return <jsx></jsx>
  }, 
  { 
    debug: true, 
    name: 'MyComponent' // optional
  } // 
)

// will print something like that:
// "MyComponent rendered 0 times. {list of observables  that component is subscribed to}"
// "MyComponent will re-render because of changes: {list of observable values that were changed}"
// ...
```

## Interface
```typescript
type Subscriber = (property: string | symbol, value: any) => void | Promise<void>
type Listener = () => void | Promise<void>

interface Observable {
  // The callback will be triggered on each change
  listen(cb: Subscriber): void
  // remove listener
  unlisten(cb: Subscriber): void
  
  // The callback will be triggered on each "batch" 
  // i.e. some part of changes made almost at the same time,
  // for the properties passed as second argument
  subscribe(cb: Listener, keys: Set<keyof Observable>): void
  // remove subscriber
  unsubscribe(cb: Listener): void
}
```

## Features
```typescript
import { Observable } from "kr-observable";

class Example extends Observable {
  #private = 1 // ignored
  string = '' // observable
  number = 0 // observable
  array = [] // observable 
  set = new Set() // observable
  map = new Map() // observable
  plain = {
    foo: 'baz', // observable
    nestedArray: [] // observable
  } // observable
  date = new Date() // observable
  
  get something() {
    return this.number + this.string // computed 
  }
}

const example = new Example() 

const listener = (property: string | symbol, value: any) => {
  console.log(`${property} was changed, new value = `, value)
}

// will be called only once, 
// because the changes happened (almost) at the same time 
const subscriber = () => {
  console.log('subscriber was notified')
}

example.listen(listener)
example.subscribe(subscriber, new Set(['string', 'number', 'array'])) 

example.string = 'hello' // string was changed, new value = hello 
example.number = 2 // number was changed, new value = 2 
// anything that mutates an Array, Map, Set or Date is considered a change
example.array.push('string') // array was changed, new value = string 
example.array = [] // array was changed, new value = [] 
example.date.setHour(12) // date was changed, new value = 12
example.plain.foo = '' // foo was changed, new value = ''
example.plain.nestedArray.push(42) // nestedArray was changed, new value = 42
```

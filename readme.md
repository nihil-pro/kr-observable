# Observable class
A proxy-based observable with a hoc for react/preact. 

## Usage with react or preact
Write a class that extends Observable and wrap the component in observer hoc. <br />
Nothing else is needed.
```tsx
import { Observable, observer } from "observable-class";

class State extends Observable {
  results: string[] = []
  text = ''
  loading = false
  
  // All methods are automatically bounded, so you can safely use them as listeners
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
      
      {/* When click, only <Results /> will re-render, because reset doesn't change text or loading */}
      <button onClick={state.reset}> 
        Reset
      </button>
      <Results />
    </div>
  )
})
```

## Opportunities

### Before, let's see the interface
```typescript
interface Observable {
  // The callback will be called every time there is a change in the Observable
  listen(cb: (property: string | symbol, value: any) => void): void
  unlisten(cb: (property: string | symbol, value: any) => void): void
  
  // The callback will be called when the value of one of the passed keys changes 
  // The callback does not pass a key whose value has changed, 
  // because there could be several changes at the same time, but they are batched
  subscribe(cb: () => void | Promise<void>, keys: Set<string | symbol>): void
  unsubscribe(cb: () => void | Promise<void>): void
}
```

```typescript
import { Observable } from "observable-class";

class Example extends Observable {
  string = '' // observable
  number = 0 // observable
  array = [] // observable 
  set = new Set() // observable
  map = new Map() // observable
  plain = {
    foo: 'baz', // observable
    nestedArray: []
  } // observable
  date = new Date() // observable
}

const example = new Example() 

const listener = (property: string | symbol, value: any) => {
  console.log(`${property} was changed, new value = `, value)
}

// will be called only once, because the changes happened (almost) at the same time 
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
import { describe, test } from 'node:test'
import expect from 'node:assert';
import { Observable, makeObservable } from '../Observable';

// Observable notify subscribers in setTimeout. It takes some time, that's why we need delay in tests
const delay = (ms: number) => new Promise((resolve) => setTimeout(() => resolve(true), ms));

describe('Observable', () => {
  class Foo extends Observable {
    name = ''
    age = 42
    city = 'Moscow'
    arr = [1,2]

    swap(){
      const i = this.arr[0]
      this.arr[0] = this.arr[1]
      this.arr[1] = i
    }

    setAll() {
      this.city = 'Texas'
      this.age = 52
      this.name = 'Egor'
      this.city = 'London'
    }

    async setAsynchronously() {
      this.name = 'John'
      await delay(100)
      this.city = 'Rome'
      return true
    }
  }
  const foo = new Foo()

  test('Should pass "instanceof" check', async (ctx) => {
    expect.equal(foo instanceof Observable, true)
    expect.equal(foo instanceof Foo, true)
  })

  test('subscribe',async (ctx) => {
    const subscriber = ctx.mock.fn()

    foo.subscribe(subscriber, new Set(['name', 'city', 'surname']))
    foo.setAll()

    await ctx.test('Should be called once per synchronous transaction', async () => {
      await delay(10)
      expect.equal(subscriber.mock.callCount(), 1)
    })

    await ctx.test('Should not be called when changing a property that we are not subscribed to', async () => {
      subscriber.mock.resetCalls()
      foo.age = 62 // We are not subscribed to age
      expect.equal(subscriber.mock.callCount(), 0)
    })

    await ctx.test('Should be called twice when transaction was interrupted by Promise', async () => {
      subscriber.mock.resetCalls()
      await foo.setAsynchronously()
      await delay(10)
      expect.equal(subscriber.mock.callCount(), 2)
    })

    await ctx.test('Should not be called when properties were changed with same values', async () => {
      subscriber.mock.resetCalls()
      await foo.setAsynchronously()
      await delay(10)
      expect.equal(subscriber.mock.callCount(), 0)
    })

    await ctx.test('Should be called for each subscriber', async () => {
      subscriber.mock.resetCalls()

      const subscriber2 = ctx.mock.fn()
      foo.subscribe(subscriber2, new Set(['name', 'city']))

      foo.city = 'Seoul'
      foo.name = 'Choi'

      await delay(10)
      expect.equal(subscriber.mock.callCount(), 1)
      expect.equal(subscriber2.mock.callCount(), 1)

      foo.unsubscribe(subscriber2)
    })

    await ctx.test('Should not be called after unsubscribe', async () => {
      subscriber.mock.resetCalls()
      foo.unsubscribe(subscriber)
      foo.city = 'Beijing'
      foo.name = 'Chan'
      await delay(10)
      expect.equal(subscriber.mock.callCount(), 0)
    })
  })

  test('listen',async (ctx) => {
    const listener = ctx.mock.fn()
    foo.listen(listener)
    foo.setAll()

    await ctx.test('Should be called on each change', () => {
      expect.equal(listener.mock.callCount(), 4)
    })

    await ctx.test('Should not be called after unlisten', () => {
      listener.mock.resetCalls()
      foo.unlisten(listener)
      foo.setAll()
      expect.equal(listener.mock.callCount(), 0)
    })
  })
})

describe('Observable Map', () => {
  class WithMap extends Observable {
    map = new Map<string, string>()
  }

  const firstKey = 'firstKey'
  const secondKey = 'secondKey'

  const withMap = new WithMap()

  test('Should notify when Map changes', async (ctx) => {
    const onSizeChange = ctx.mock.fn()
    withMap.subscribe(onSizeChange, new Set(['map']))

    withMap.map.set('hello', 'world')
    await delay(10)

    withMap.map.set('hello', 'javascript') // adding new value to the existed key
    await delay(10)
    // expected behaviour
    // the size doesn't change, but the map in fact is
    // because map can be used like this [...map.values()].map(...)
    expect.equal(onSizeChange.mock.callCount(), 2)

    withMap.map.clear()
    await delay(10)
    expect.equal(onSizeChange.mock.callCount(), 3)

    withMap.map = new Map()
    await delay(10)
    expect.equal(onSizeChange.mock.callCount(), 4)
  })

  test('Should notify when specific item is added, changed or removed', async (ctx) => {
    const onFirstKeyChange = ctx.mock.fn()
    withMap.subscribe(onFirstKeyChange, new Set(['map.firstKey']))

    withMap.map.set(firstKey, firstKey)
    await delay(10)
    expect.equal(onFirstKeyChange.mock.callCount(), 1)

    withMap.map.set(firstKey, 'blah blah blah')
    await delay(10)
    // adding new item to map doesn't trigger subscriber,
    expect.equal(onFirstKeyChange.mock.callCount(), 2)

    withMap.map.delete(firstKey)
    await delay(10)
    expect.equal(onFirstKeyChange.mock.callCount(), 3)
    withMap.unsubscribe(onFirstKeyChange)
  })

  test('Should not notify when other items were changed', async (ctx) => {
    const onFirstKeyChange = ctx.mock.fn()
    withMap.subscribe(onFirstKeyChange, new Set(['map.firstKey']))

    withMap.map.set(firstKey, 'some value')
    await delay(10)
    expect.equal(onFirstKeyChange.mock.callCount(), 1)

    withMap.map.set(secondKey, 'blah blah blah')
    await delay(10)
    // adding new item to map doesn't trigger subscriber,
    expect.equal(onFirstKeyChange.mock.callCount(), 1)
  })
})

describe('Observable plain object', () => {
  const foo = makeObservable({
    name: '',
    age: 42,
    city: 'Moscow',

    setAll() {
      this.city = 'Texas'
      this.age = 52
      this.name = 'Egor'
      this.city = 'London'
    },

    async setAsynchronously() {
      this.name = 'John'
      await delay(100)
      this.city = 'Rome'
      return true
    }
  })


  test('subscribe',async (ctx) => {
    const subscriber = ctx.mock.fn()

    foo.subscribe(subscriber, new Set(['name', 'city', 'surname']))
    foo.setAll()

    await ctx.test('Should be called once per synchronous transaction', async () => {
      await delay(10)
      expect.equal(subscriber.mock.callCount(), 1)
    })

    await ctx.test('Should not be called when changing a property that we are not subscribed to', async () => {
      subscriber.mock.resetCalls()
      foo.age = 62 // We are not subscribed to age
      expect.equal(subscriber.mock.callCount(), 0)
    })

    await ctx.test('Should be called twice when transaction was interrupted by Promise', async () => {
      subscriber.mock.resetCalls()
      await foo.setAsynchronously()
      await delay(10)
      expect.equal(subscriber.mock.callCount(), 2)
    })

    await ctx.test('Should not be called when properties were changed with same values', async () => {
      subscriber.mock.resetCalls()
      await foo.setAsynchronously()
      await delay(10)
      expect.equal(subscriber.mock.callCount(), 0)
    })

    await ctx.test('Should be called for each subscriber', async () => {
      subscriber.mock.resetCalls()

      const subscriber2 = ctx.mock.fn()
      foo.subscribe(subscriber2, new Set(['name', 'city']))

      foo.city = 'Seoul'
      foo.name = 'Choi'

      await delay(10)
      expect.equal(subscriber.mock.callCount(), 1)
      expect.equal(subscriber2.mock.callCount(), 1)

      foo.unsubscribe(subscriber2)
    })

    await ctx.test('Should not be called after unsubscribe', async () => {
      subscriber.mock.resetCalls()
      foo.unsubscribe(subscriber)
      foo.city = 'Beijing'
      foo.name = 'Chan'
      await delay(10)
      expect.equal(subscriber.mock.callCount(), 0)
    })
  })

  test('listen',async (ctx) => {
    const listener = ctx.mock.fn()
    foo.listen(listener)
    foo.setAll()

    await ctx.test('Should be called on each change', () => {
      expect.equal(listener.mock.callCount(), 4)
    })

    await ctx.test('Should not be called after unlisten', () => {
      listener.mock.resetCalls()
      foo.unlisten(listener)
      foo.setAll()
      expect.equal(listener.mock.callCount(), 0)
    })
  })
})

describe('Observable Array', () => {

  test('Should notify when add item by push', async (ctx) => {
    class WithArray extends Observable {
      array = []
    }
    const withArray = new WithArray()
    const onSizeChange = ctx.mock.fn()
    withArray.subscribe(onSizeChange, new Set(['array']))
    await delay(10)
    withArray.array.push(9)
    withArray.array.push(10)
    withArray.array.push(11,12,13)
    await delay(2)
    expect.equal(onSizeChange.mock.callCount(), 1)
    withArray.array = []
  })

  test('Should notify when set item by index', async (ctx) => {
    class WithArray extends Observable {
      array: any[] = []
    }
    const withArray = new WithArray()
    const onSizeChange = ctx.mock.fn()
    withArray.subscribe(onSizeChange, new Set(['array']))

    withArray.array.set(0, { foo: 'bar' })
    await delay(2)

    expect.equal(onSizeChange.mock.callCount(), 1)
    onSizeChange.mock.resetCalls()
    withArray.unsubscribe(onSizeChange)
    withArray.array = []
  })

  test('Should notify on splice', async (ctx) => {
    class WithArray extends Observable {
      array = []
    }
    const withArray = new WithArray()
    const onSizeChange = ctx.mock.fn()
    withArray.array = [1,2,3]
    withArray.subscribe(onSizeChange, new Set(['array']))

    withArray.array.splice(0,2)
    await delay(10)

    expect.equal(onSizeChange.mock.callCount(), 1)
    onSizeChange.mock.resetCalls()
    withArray.unsubscribe(onSizeChange)
    withArray.array = []
  })

  test('Should notify on shift and pop', async (ctx) => {
    class WithArray extends Observable {
      array = []
    }
    const withArray = new WithArray()
    const onSizeChange = ctx.mock.fn()
    withArray.array = [1,2,3]
    withArray.subscribe(onSizeChange, new Set(['array']))

    withArray.array.shift()
    await delay(10)
    expect.equal(onSizeChange.mock.callCount(), 1)

    withArray.array.pop()
    await delay(10)
    expect.equal(onSizeChange.mock.callCount(), 2)
    onSizeChange.mock.resetCalls()
    withArray.unsubscribe(onSizeChange)
    withArray.array = []
  })

  test('Should notify on sort and reverse', async (ctx) => {
    class WithArray extends Observable {
      array = []
    }
    const withArray = new WithArray()
    const onSizeChange = ctx.mock.fn()
    withArray.array = [1,2,3]
    withArray.subscribe(onSizeChange, new Set(['array']))

    withArray.array.sort((a, b) => b - a)
    await delay(10)
    expect.equal(onSizeChange.mock.callCount(), 1)

    withArray.array.reverse()
    await delay(10)
    expect.equal(onSizeChange.mock.callCount(), 2)
    withArray.unsubscribe(onSizeChange)
    withArray.array = []
  })
})
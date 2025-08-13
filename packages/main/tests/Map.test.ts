import { describe, test, mock } from 'node:test';
import assert from 'node:assert';

import { Observable, autorun, transaction } from '../index.js';

describe('Map tests', () => {
  test('Map tests', async (ctx) => {
    class Foo extends Observable {
      map = new Map()

      async init() {
        this.map.clear()
        const x = await fetch('https://jsonplaceholder.typicode.com/posts')
        this.map.set(1, { name: 1 })
        this.map.set(2, { name: 2 })
        this.map.set(3, { name: 3 })
      }

      get array() {
        return [...this.map.values()]
      }
    }

    const foo = new Foo();

    const sb = mock.fn()
    let result: any
    let count = 0;
    autorun(() => {
      ++count;
      sb()
      result = foo.array;
      ctx.diagnostic(`Count: ${count}` + JSON.stringify(foo.array))
    })

    foo.init()

    await new Promise(r => setTimeout(r, 1000));
    assert.deepStrictEqual(result, [{ name: 1 }, { name: 2 }, { name: 3 }]);
    assert.equal(sb.mock.callCount(), 2);
  })


  test('Map tests 2', async (ctx) => {
    class Foo extends Observable {
      map = new Map();
      loading = false;

      async init() {
        this.loading = true;
        const x = await fetch('https://jsonplaceholder.typicode.com/posts')
        this.map.set(1, { name: 1 })
        this.map.set(2, { name: 2 })
        this.map.set(3, { name: 3 })
        this.loading = false;
      }

      get array() {
        return [...this.map.values()]
      }
    }

    const foo = new Foo();

    const sb = mock.fn()
    let result: any
    let count = 0;
    autorun(() => {
      ++count;
      sb()
      result = foo.array;
      ctx.diagnostic(`Count: ${count} ${String(foo.loading)}` + JSON.stringify(foo.array))
    })

    foo.init()

    await new Promise(r => setTimeout(r, 1000));
    assert.deepStrictEqual(result, [{ name: 1 }, { name: 2 }, { name: 3 }]);
    assert.equal(sb.mock.callCount(), 3);
  })
})
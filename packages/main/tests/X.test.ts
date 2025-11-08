import { describe, test, mock } from 'node:test';
import assert from 'node:assert';

import { Observable, autorun, makeObservable, transaction } from '../index.js';


test(`supports reacting to properties read by a getter`, (ctx) => {
  const o = makeObservable({
    foo: 1,
    bar: 2,
    get fn() {
      return this.foo + this.bar;
    },
  });

  const sb = mock.fn();

  autorun(() => {
    sb();
    ctx.diagnostic(`${o.fn}`);
  });

  assert.equal(sb.mock.callCount(), 1);

  transaction(() => (o.foo = 10));
  assert.equal(sb.mock.callCount(), 2);
  assert.equal(o.fn, 12);

  transaction(() => (o.bar = 20));
  assert.equal(sb.mock.callCount(), 3);
  assert.equal(o.fn, 30);
});


describe('Map tests', () => {

  test(`array: should observe iteration`, () => {

    const list = makeObservable({ arr: [{ foo: 1 }] });
    const d = []
    list.arr.forEach((a) => {
      d.push(autorun(() => {
        console.log(a.foo)
      }))
    })
    transaction(() => list.arr = []);
    d.forEach(x => x())
  });

  test(`array: should observe iteration`, () => {
    let dummy;
    const list = makeObservable({ arr: ['Hello'] });
    autorun(() => {
      dummy = list.arr.join(' ')
    });
    assert.equal(dummy, 'Hello');

    transaction(() => list.arr.push('World!'));
    assert.equal(dummy, 'Hello World!');

    transaction(() => list.arr.shift());
    assert.equal(dummy, 'World!');
  });
  test('s', () => {
    const state = makeObservable({
      countA: 1,
      countB: 2,
      items: [],
      metadata: new Map(),
      get summary() {
        return this.countB + this.items.length;
      },
      mutate() {
        this.countA += 1;
        this.countB += 2;
        this.items.push(Date.now());
        this.metadata.set(Date.now(), 'value');
      }
    });

    autorun(() => {
      console.warn(state.summary)
    })

    state.mutate();
    // console.log(state[Symbol.for('$adm')])
  })

  test('computed should be compute when accessed', async (ctx) => {
    class Foo extends Observable {
      a = 0;

      get computed() {
        return `computed from ${this.a}`;
      }
    }
    const foo = new Foo();

    let $res1 = '';
    let $res2 = '';
    let $res3 = '';

    function reaction() {
      ctx.diagnostic('first autorun');
      $res1 = `${foo.a}`;
    }

    autorun(reaction);

    autorun(() => {
      ctx.diagnostic('second autorun');
      $res2 = `${foo.a}`;
      $res3 = foo.computed;
    });

    assert.equal($res1, '0');
    assert.equal($res2, '0');
    assert.equal($res3, 'computed from 0');
    await new Promise((resolve) => {
      setTimeout(() => {
        foo.a += 1;
        resolve(true);
      });
    });
    assert.equal($res1, '1');
    assert.equal($res2, '1');
    assert.equal($res3, 'computed from 1');
  });
  test('should invoke reaction once, when nested computeds are changed at the same time', (ctx) => {
    class Foo extends Observable {
      a = 1;
      b = { a: 1 };
      get c() {
        return this.a + this.b.a;
      }

      get e() {
        return this.c + 2;
      }
    }
    const foo = new Foo();

    const subscriber = mock.fn();

    autorun(() => {
      subscriber();
      ctx.diagnostic(`Current values in autorun: a: ${foo.a}, c: ${foo.c}, e: ${foo.e}`);
    });

    foo.a = 2;
    foo.b.a = 2;

    assert.equal(foo.a, 2);
    assert.equal(foo.c, 4);
    assert.equal(foo.e, 6);

    assert.equal(subscriber.mock.callCount(), 2, 'Should be called twice');
  });

  test('Map tests', async (ctx) => {
    class Foo extends Observable {
      map = new Map()

      async init() {
        this.map.clear()
        await new Promise(resolve => setTimeout(resolve, 200))
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

    await foo.init()

    await new Promise(r => setTimeout(r, 1000));
    assert.deepStrictEqual(result, [{ name: 1 }, { name: 2 }, { name: 3 }]);
    assert.equal(sb.mock.callCount(), 2);
  })


  test('fuck', async (ctx) => {
    let future = 2;
    class Test2 extends Observable {
      data: any = [];
      cursor = -1;

      constructor() {
        super();
        autorun(this.start);
        autorun(this.update);
      }

      n(){
        this.cursor++;
      }

      p() {
        this.cursor--;
      }

      get next() {
        return this.data[this.cursor + 1];
      }

      get current() {
        return this.data[this.cursor];
      }

      get prev() {
        return this.data[this.cursor - 1];
      }

      async start() {
        if (this.data.length > 0) return;
        const result = await new Promise((ok) =>
          setTimeout(() => {
            ok(1);
          }, 100)
        );
        this.data = [result];
        this.cursor = 0;
      }

      async update() {
        if (this.current === undefined) {
          return
        }
        if (this.next !== undefined) {
          return
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
        console.log('---- push to data ----')
        this.data.push(future++);
        if (this.data.length === 2) {
          console.log('---- changing cursor -----')
          this.cursor++;
        }
      }
    }

    const state = new Test2();

    autorun(function react() {
      ctx.diagnostic(`State: Prev:${state.prev} Current:${state.current} Next: ${state.next}`)
    })

    await new Promise(resolve => setTimeout(resolve,1000));
    console.clear();
    console.log('!!!!!! -----Press next')
    // ctx.diagnostic(`!!!!!! -----Press next`);
    state.n()

    await new Promise(resolve => setTimeout(resolve,1000));
    // state.n()
    // await new Promise(resolve => setTimeout(resolve,1000));
    // ctx.diagnostic(`State next after change: ${state.next}`);
  })

  test.skip('', async () => {
    let a = makeObservable({
      count: 1,
      items: [],
      get total() {
        return this.count + this.items.length;
      },
      mutate() {
        this.count += 1;
        this.items.push(Date.now());
      }
    });
    let count = 0;
    autorun(() => {
      count = a.total;
      console.log('autorun');
      if (count === 2) {
        console.log(a);
      }
    });
    a.mutate();

    // return new Promise(resolve => {
    //   let dispose;
    //   dispose = autorun(() => {
    //     count = a.a + a.b;
    //     if (count === 2) {
    //       console.log(a, a[Symbol.for('$adm')]);
    //       dispose();
    //       resolve();
    //     }
    //   });
    //   a.update();
    // })
  })
  test.skip('Map tests', async (ctx) => {
    class Foo extends Observable {
      map = new Map()

      async init() {
        this.map.clear()
        await new Promise(resolve => setTimeout(resolve, 200))
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
    autorun(function her() {
      ++count;
      sb()
      result = foo.array;
      ctx.diagnostic(`Count: ${count}` + JSON.stringify(foo.array))
    })
    console.log('autorun was executed')
    ctx.diagnostic('autorun was executed')
    foo.init()

    await new Promise(r => setTimeout(r, 1000));
    assert.deepStrictEqual(result, [{ name: 1 }, { name: 2 }, { name: 3 }]);
    assert.equal(sb.mock.callCount(), 2);
  })


  // test.skip('Map tests 2', async (ctx) => {
  //   class Foo extends Observable {
  //     map = new Map();
  //     loading = false;
  //
  //     async init() {
  //       this.loading = true;
  //       const x = await fetch('https://jsonplaceholder.typicode.com/posts')
  //       this.map.set(1, { name: 1 })
  //       this.map.set(2, { name: 2 })
  //       this.map.set(3, { name: 3 })
  //       this.loading = false;
  //     }
  //
  //     get array() {
  //       return [...this.map.values()]
  //     }
  //   }
  //
  //   const foo = new Foo();
  //
  //   const sb = mock.fn()
  //   let result: any
  //   let count = 0;
  //   autorun(() => {
  //     ++count;
  //     sb()
  //     result = foo.array;
  //     ctx.diagnostic(`Count: ${count} ${String(foo.loading)}` + JSON.stringify(foo.array))
  //   })
  //
  //   foo.init()
  //
  //   await new Promise(r => setTimeout(r, 1000));
  //   assert.deepStrictEqual(result, [{ name: 1 }, { name: 2 }, { name: 3 }]);
  //   assert.equal(sb.mock.callCount(), 3);
  // })

})

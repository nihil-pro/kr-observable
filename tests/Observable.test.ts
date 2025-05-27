import { describe, mock, test } from 'node:test';
import assert from 'node:assert';

import { Observable, autorun, subscribe, transaction } from '../src/index.js';

describe('Synchronous batching', () => {
  test('should invoke subscriber once, when values are changed at the same time', (ctx) => {
    class Foo extends Observable {
      a = 1;
      b = '';
      c = false;
      method() {
        return 'foo';
      }
    }
    const foo = new Foo();
    const subscriber = mock.fn();
    subscribe(foo, subscriber, new Set(['a', 'b', 'c']));
    subscribe(
      foo,
      (changes) => {
        let changed = '';
        changes?.forEach((property) => {
          changed += `${String(property)} `;
        });
        ctx.diagnostic(`Changed properties: ${changed}`);
      },
      new Set(['a', 'b', 'c'])
    );
    foo.a = 2;
    foo.b = 'hello';
    foo.c = true;
    assert.equal(foo.a, 2);
    assert.equal(foo.b, 'hello');
    assert.equal(foo.c, true);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');
  });

  test('should not invoke subscriber, when values are not changed', () => {
    class Foo extends Observable {
      a = 1;
      b = '';
      c = false;
    }
    const foo = new Foo();
    const subscriber = mock.fn();
    subscribe(foo, subscriber, new Set(['a', 'b', 'c']));
    foo.a = 1;
    foo.b = '';
    foo.c = false;
    assert.equal(foo.a, 1);
    assert.equal(foo.b, '');
    assert.equal(foo.c, false);
    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called');
  });

  test('should invoke reaction once, when both observables and deep observables are changed at the same time', (ctx) => {
    class Foo extends Observable {
      a = 1;
      b = { a: 1 };
      c: number[] = [];
    }
    const foo = new Foo();

    const subscriber = mock.fn();

    autorun(() => {
      subscriber();
      ctx.diagnostic(`Current values in autorun: a: ${foo.a}, b.a: ${foo.b.a}, c[0]: ${foo.c[0]}`);
    });

    foo.a = 2;
    foo.b.a = 2;
    foo.c.push(2);

    assert.equal(foo.a, 2);
    assert.equal(foo.b.a, 2);
    assert.equal(foo.c[0], 2);

    assert.equal(subscriber.mock.callCount(), 2, 'Should be called twice');
  });

  test('should invoke reaction once, when different observables are changed at the same time', (ctx) => {
    class Foo extends Observable {
      a = 1;
      b = { a: 1 };
    }
    class Bar extends Observable {
      a = 1;
      b = { a: 1 };
    }
    const foo = new Foo();
    const bar = new Bar();

    const subscriber = mock.fn();

    autorun(() => {
      subscriber();
      ctx.diagnostic(`Current values in autorun for foo: a: ${foo.a}, b.a: ${foo.b.a}`);
      ctx.diagnostic(`Current values in autorun for bar: a: ${bar.a}, b.a: ${bar.b.a}`);
    });

    foo.a = 2;
    foo.b.a = 2;
    bar.a = 2;
    bar.b.a = 2;

    assert.equal(foo.a, 2);
    assert.equal(foo.b.a, 2);
    assert.equal(bar.a, 2);
    assert.equal(bar.b.a, 2);

    assert.equal(subscriber.mock.callCount(), 2, 'Should be called twice');
  });

  test('should invoke reaction once, when observable and computed are changed at the same time', (ctx) => {
    class Foo extends Observable {
      a = 1;
      b = { a: 1 };
      get c() {
        return this.a + this.b.a;
      }
    }
    const foo = new Foo();

    const subscriber = mock.fn();

    autorun(() => {
      subscriber();
      ctx.diagnostic(`Current values in autorun: a: ${foo.a}, c: ${foo.c}`);
    });

    foo.a = 2;
    foo.b.a = 2;

    assert.equal(foo.a, 2);
    assert.equal(foo.c, 4);

    assert.equal(subscriber.mock.callCount(), 2, 'Should be called twice');
  });

  test('should invoke reaction once, when different observables and computeds are changed at the same time', (ctx) => {
    class Foo extends Observable {
      a = 1;
      b = { a: 1 };
      get c() {
        return this.a + this.b.a;
      }
    }
    class Bar extends Observable {
      a = 1;
      b = { a: 1 };
      get c() {
        return this.a + this.b.a;
      }
    }
    const foo = new Foo();
    const bar = new Bar();

    const subscriber = mock.fn();

    autorun(() => {
      subscriber();
      ctx.diagnostic(`Current values in autorun for foo: a: ${foo.a}, c: ${foo.c}`);
      ctx.diagnostic(`Current values in autorun for bar: a: ${foo.a}, c: ${foo.c}`);
    });

    foo.a = 2;
    foo.b.a = 2;

    bar.a = 2;
    bar.b.a = 2;

    assert.equal(foo.a, 2);
    assert.equal(foo.c, 4);

    assert.equal(bar.a, 2);
    assert.equal(bar.c, 4);

    assert.equal(subscriber.mock.callCount(), 2, 'Should be called twice');
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

  test('should invoke reaction once, when changes are made inside reaction', (ctx) => {
    class Foo extends Observable {
      value = '';
      disabled = false;
      effect = false;
    }

    const foo = new Foo();

    const subscriber = mock.fn();

    autorun(() => {
      foo.effect = foo.value === '';
      foo.effect = foo.disabled;
      ctx.diagnostic(
        `Current values in autorun: value: ${foo.value}, disabled: ${foo.disabled}, effect: ${foo.effect}`
      );
      subscriber();
    });

    foo.value = 'text';

    assert.equal(foo.value, 'text');
    assert.equal(foo.disabled, false);
    assert.equal(foo.effect, false);
    assert.equal(subscriber.mock.callCount(), 2, 'Should be called twice');
  });

  test('should not invoke reaction, when computed value are not changed', async (ctx) => {
    class Foo extends Observable {
      a = 1;
      b = 2;
      get c() {
        return this.a < this.b;
      }
    }

    const foo = new Foo();

    const subscriber = mock.fn();

    autorun(() => {
      ctx.diagnostic(
        `Current computed dependencies values: a: ${foo.a}, b: ${foo.b}. Result (a < b): ${foo.a < foo.b}`
      );
    });

    autorun(() => {
      ctx.diagnostic(`Current computed value in autorun: ${foo.c}`);
      subscriber();
    });

    const interval = setInterval(() => {
      foo.b += 1;
      // ctx.diagnostic(`Current computed dependency value: ${foo.b}`);
    }, 10);

    await new Promise((resolve) => {
      setTimeout(() => {
        clearInterval(interval);
        resolve(true);
      }, 50);
    });

    foo.b = 1;
    assert.equal(foo.b, 1);
    assert.equal(foo.c, false);
    assert.equal(subscriber.mock.callCount(), 2, 'Should be called twice');
  });

  test('should have actual value in computed', async () => {
    class Foo extends Observable {
      a = 1;
      b = 2;
      get isLess() {
        return this.a < this.b;
      }
    }

    const foo = new Foo();
    assert.equal(foo.isLess, true);
    foo.a = 2;
    assert.equal(foo.isLess, false);
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    assert.equal(foo.isLess, false);
  });

  test('should work normal when change state inside autorun', (ctx) => {
    class Foo extends Observable {
      a = 0;

      get computed() {
        return `computed from ${this.a}`;
      }

      change() {
        this.a += 1;
      }
    }

    const foo = new Foo();

    const subscriber1 = mock.fn();
    const subscriber2 = mock.fn();

    autorun(() => {
      foo.a += 1;
      ctx.diagnostic(`Current value of "a": ${foo.a}`);
      subscriber1();
    });

    autorun(() => {
      ctx.diagnostic(`Current value of "computed": ${foo.computed}`);
      subscriber2();
    });

    foo.change();
    assert.equal(foo.a, 3);
    assert.equal(foo.computed, 'computed from 3');

    assert.equal(subscriber1.mock.callCount(), 2);
    assert.equal(subscriber2.mock.callCount(), 2);
  });

  test('should run all changes in one action', () => {
    class Foo extends Observable {
      a = 1;
      b = '';
      c = false;

      setA() {
        this.a += 1;
      }

      setB() {
        this.b = 'string';
      }

      setC() {
        this.c = !this.c;
      }

      changeAll() {
        this.setA();
        this.setB();
        this.setC();
      }
    }
    const foo = new Foo();
    const subscriber = mock.fn();
    subscribe(foo, subscriber, new Set(['a', 'b', 'c']));
    foo.changeAll();
    assert.equal(foo.a, 2);
    assert.equal(foo.b, 'string');
    assert.equal(foo.c, true);
    assert.equal(subscriber.mock.callCount(), 1, 'Should not be called');
  });

  test('consistency', (ctx) => {
    class Foo extends Observable {
      a = 0;

      get computed() {
        return `computed from ${this.a}`;
      }

      change() {
        this.a += 1;
        ctx.diagnostic('changed');
      }
    }
    const foo = new Foo();

    let $res1 = '';
    let $res2 = '';
    let $res3 = '';

    function reaction() {
      ctx.diagnostic('first autorun');
      foo.a += 1;
      $res1 = `${foo.a}`;
    }

    autorun(reaction);

    autorun(() => {
      ctx.diagnostic('second autorun');
      $res2 = `${foo.a}`;
      $res3 = foo.computed;
    });

    assert.equal($res1, '1');
    assert.equal($res2, '1');
    assert.equal($res3, 'computed from 1');

    foo.change();
    assert.equal($res1, '3');
    assert.equal($res2, '3');
    assert.equal($res3, 'computed from 3');
  });

  test('Can mutate state in autorun', (ctx) => {
    const subscriber = mock.fn();

    class Foo extends Observable {
      a = 0;

      someWork() {
        ctx.diagnostic(`Work in method: ${this.a}`);
        subscriber();
      }
    }

    const state = new Foo();

    autorun(() => {
      state.a = 2;
    });

    autorun(state.someWork);
    assert.equal(subscriber.mock.callCount(), 1);
  });

  test('should react only when property was read (not changed) in autorun', (ctx) => {
    const subscriber = mock.fn();

    class Foo extends Observable {
      a = 0;
      b = 0;
    }

    const state = new Foo();

    autorun(() => {
      state.a = state.b + 1;
      ctx.diagnostic(`in autorun`);
      subscriber();
    });

    assert.equal(subscriber.mock.callCount(), 1);

    transaction(() => ++state.a);
    assert.equal(state.a, 2);
    assert.equal(state.b, 0);
    assert.equal(subscriber.mock.callCount(), 1);
  });

  test('magic', (ctx) => {
    const subscriber = mock.fn();

    class State extends Observable {
      loading = true;
      postId = 1;
      post = null;

      constructor() {
        super();
        autorun(this.getPost);
      }

      async getPost() {
        subscriber();
        try {
          this.loading = true;
          const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${this.postId}`);
          this.post = await response.json();
        } catch (e) {
          this.post = null;
          console.error(e);
          ctx.diagnostic(`${e.message}`);
        } finally {
          this.loading = false;
        }
      }
    }

    const state = new State();
    // autorun(state.getPost);
    assert.equal(subscriber.mock.callCount(), 1);
    return new Promise((resolve) => {
      autorun(() => {
        ctx.diagnostic(`second autorun`);
        if (!state.loading) {
          ctx.diagnostic(`${state.loading} ${state.post} ${state.post?.title}`);
          assert.equal(subscriber.mock.callCount(), 1);
          resolve();
        }
      });
    });
  });
});

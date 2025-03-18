import { describe, mock, test } from 'node:test';
import assert from 'node:assert';

import { Observable, autorun } from '../src/index.js';

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
    foo.subscribe(subscriber, new Set(['a', 'b', 'c']));
    foo.subscribe(
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
    foo.subscribe(subscriber, new Set(['a', 'b', 'c']));
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
      foo.disabled = foo.value === '';
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
});

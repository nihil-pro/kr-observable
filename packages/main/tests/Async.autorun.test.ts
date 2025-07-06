import { describe, it, test, mock } from 'node:test';
import assert from 'node:assert/strict';

import { autorun, Observable, transaction } from '../index.js';

describe('async autorun', () => {
  it('tracks basic async dependencies', async () => {
    class Model extends Observable {
      value = 0;
    }

    const m = new Model();
    const logs = [];

    await autorun(async () => {
      await Promise.resolve();
      logs.push(m.value);
    });

    m.value = 1;
    await new Promise(r => setTimeout(r, 10));

    assert.deepStrictEqual(logs, [0, 1]);
  });

  it('tracks across multiple awaits', async () => {
    class Model extends Observable {
      a = 1;
      b = 2;
    }

    const m = new Model();
    const logs = [];

    await autorun(async () => {
      await Promise.resolve();
      logs.push(`a=${m.a}`);
      await Promise.resolve();
      logs.push(`b=${m.b}`);
    });

    m.a = 10;
    m.b = 20;
    await new Promise(r => setTimeout(r, 10));

    assert.deepStrictEqual(logs, ['a=1', 'b=2', 'a=10', 'b=20']);
  });

  it('works with then/catch syntax when using return', async () => {
    class Model extends Observable {
      value = 0;
    }

    const m = new Model();
    const logs = [];

    await autorun(async () => {
      return Promise.resolve()
        .then(() => {
          logs.push(m.value);
        });
    });

    m.value = 1;
    await new Promise(r => setTimeout(r, 10));

    assert.deepStrictEqual(logs, [0, 1]);
  });

  it('handles errors in async reactions', async () => {
    class Model extends Observable {
      value = 1;
    }

    const m = new Model();
    const logs = [];
    const errors = [];

    await autorun(async () => {
      try {
        await Promise.resolve();
        if (m.value === 2) throw new Error('test error');
        logs.push(m.value);
      } catch (e) {
        errors.push(e.message);
      }
    });

    m.value = 2;
    await new Promise(r => setTimeout(r, 10));
    m.value = 3;
    await new Promise(r => setTimeout(r, 10));

    assert.deepStrictEqual(logs, [1, 3]);
    assert.deepStrictEqual(errors, ['test error']);
  });

  it('tracks multiple observables in same reaction', async () => {
    class A extends Observable { val = 'a'; }
    class B extends Observable { val = 'b'; }

    const a = new A();
    const b = new B();
    const logs = [];

    await autorun(async () => {
      await Promise.resolve();
      logs.push(a.val + b.val);
    });

    a.val = 'A';
    await new Promise(r => setTimeout(r, 10));
    b.val = 'B';
    await new Promise(r => setTimeout(r, 10));

    assert.deepStrictEqual(logs, ['ab', 'Ab', 'AB']);
  });

  it('tracks conditional dependencies correctly', async () => {
    class Model extends Observable {
      a = 1;
      b = 2;
      flag = true;
    }

    const m = new Model();
    const logs = [];

    await autorun(async () => {
      await Promise.resolve();
      logs.push(m.flag ? m.a : m.b);
    });

    // await new Promise(r => setTimeout(r, 10));
    m.a = 10;
    await new Promise(r => setTimeout(r, 10));
    m.b = 20;
    await new Promise(r => setTimeout(r, 10));
    m.flag = false;
    await new Promise(r => setTimeout(r, 10));
    m.b = 30;
    m.a = 40;
    await new Promise(r => setTimeout(r, 10));

    assert.deepStrictEqual(logs, [1, 10, 20, 30]);
  });

  describe('Microtask Support', () => {
    it('DOES track dependencies in queueMicrotask', async () => {
      class Model extends Observable {
        value = 0;
      }

      const m = new Model();
      const logs = [];

      await autorun(async () => {
        await Promise.resolve();
        queueMicrotask(() => {
          logs.push(m.value);
        });
      });

      m.value = 1;
      await new Promise(r => setTimeout(r, 10));

      assert.deepStrictEqual(logs, [0, 1]);
    });

    it('does NOT track in setTimeout', async () => {
      class Model extends Observable {
        value = 0;
      }

      const m = new Model();
      const logs = [];

      await autorun(async () => {
        await Promise.resolve();
        setTimeout(() => {
          logs.push(m.value);
        }, 1);
      });

      await new Promise(r => setTimeout(r, 10));
      m.value = 1;
      await new Promise(r => setTimeout(r, 10));

      assert.deepStrictEqual(logs, [0]);
    });
  });

  it('tracks dependencies after async/await in loops', async () => {
    class Model extends Observable {
      value = 0;
    }
    const m = new Model();
    const logs = [];

    await autorun(async () => {
      for (let i = 0; i < 2; i++) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
        logs.push(m.value);
      }
    });

    m.value = 1;
    await new Promise(r => setTimeout(r, 10));

    assert.deepStrictEqual(logs, [0, 0, 1, 1]);
  });

  it('tracks dependencies in parallel async operations', async () => {
    class Model extends Observable {
      a = 1;
      b = 2;
    }
    const m = new Model();
    const logs = [];

    await autorun(async () => {
      await Promise.all([
        Promise.resolve().then(() => logs.push(`a=${m.a}`)),
        Promise.resolve().then(() => logs.push(`b=${m.b}`))
      ]);
    });

    m.a = 10;
    m.b = 20;
    await new Promise(r => setTimeout(r, 10));

    assert.deepStrictEqual(logs, ['a=1', 'b=2', 'a=10', 'b=20']);
  });

  it('tracks dynamically accessed properties', async () => {
    class Model extends Observable {
      first = 1;
      second = 2;
    }
    const m = new Model();
    const logs = [];
    const prop = 'first';

    await autorun(async () => {
      await Promise.resolve();
      logs.push(m[prop]);
    });

    m.first = 10;
    await new Promise(r => setTimeout(r, 10));

    assert.deepStrictEqual(logs, [1, 10]);
  });

  it('works with inherited observable classes', async () => {
    class Base extends Observable {
      baseVal = 1;
    }
    class Extended extends Base {
      extendedVal = 2;
    }

    const e = new Extended();
    const logs = [];

    await autorun(async () => {
      await Promise.resolve();
      logs.push(e.baseVal + e.extendedVal);
    });

    // await new Promise(r => setTimeout(r, 10));
    e.baseVal = 10;
    await new Promise(r => setTimeout(r, 10));
    e.extendedVal = 20;
    await new Promise(r => setTimeout(r, 10));

    assert.deepStrictEqual(logs, [3, 12, 30]);
  });

  it('does not leak memory when reactions are disposed', async (ctx) => {
    class Model extends Observable {
      value = 0;
    }
    const m = new Model();
    let runs = 0;

    const dispose = await autorun(async function asyncDisposer() {
      await Promise.resolve();
      runs++;
      ctx.diagnostic(`${m.value}`)
    });
    // await new Promise(r => setTimeout(r, 10));
    dispose();
    m.value = 100; // Should not trigger reaction

    assert.strictEqual(runs, 1);
  });

  it('handles complex async data fetching scenario', async () => {
    class Store extends Observable {
      userId = null;
      profile = null;
      posts = [];
    }

    const store = new Store();
    const logs = [];

    // Simulate data fetching
    async function fetchUser() {
      await Promise.resolve();
      store.userId = 123;
    }

    async function fetchProfile() {
      await Promise.resolve();
      if (store.userId) {
        store.profile = { name: `User ${store.userId}` };
      }
    }

    await autorun(async () => {
      await Promise.resolve();
      logs.push(`Profile: ${store.profile?.name || 'loading'}`);
    });

    await fetchUser();
    await fetchProfile();
    await new Promise(r => setTimeout(r, 10));

    assert.deepStrictEqual(logs, [
      'Profile: loading',
      'Profile: User 123'
    ]);
  });

  it('handles 1000 sequential reactive updates', async () => {
    class Model extends Observable {
      value = 0;
    }
    const m = new Model();
    let count = 0;
    let res;

    await autorun(async () => {
      await Promise.resolve();
      count++;
      res = m.value;
    });

    for (let i = 0; i < 1000; i++) {
      transaction(() => m.value++);
      // eslint-disable-next-line no-await-in-loop no-loop-func
      await new Promise(r => queueMicrotask(() => r(res)));
    }

    assert.ok(count >= 1000); // May be more due to microtask batching
  });

  it('handles mixed sync/async reactions to same property', async () => {
    class Model extends Observable {
      value = 0;
    }
    const m = new Model();
    const logs = [];

    // Sync reaction
    autorun(() => {
      logs.push(`sync: ${m.value}`);
    });

    // Async reaction
    await autorun(async () => {
      await Promise.resolve();
      logs.push(`async: ${m.value}`);
    });

    assert.deepStrictEqual(logs, [
      'sync: 0',
      'async: 0'
    ]);

    // Update
    logs.length = 0;
    m.value = 1;
    await new Promise(r => setTimeout(r, 10));

    assert.deepStrictEqual(logs, [
      'sync: 1',
      'async: 1'
    ]);
  });

  it('coordinates multiple async reactions sharing dependency', async () => {
    class Model extends Observable {
      value = 0;
    }
    const m = new Model();
    const executionOrder = [];

    await autorun(async () => {
      await new Promise(r => setTimeout(r));
      executionOrder.push(`react1: ${m.value}`);
    });

    await autorun(async () => {
      await new Promise(r => setTimeout(r));
      executionOrder.push(`react2: ${m.value}`);
    });

    // await new Promise(r => setTimeout(r, 10));
    m.value = 1;
    await new Promise(r => setTimeout(r, 10));

    // Both reactions should run for each change, order may vary
    assert.strictEqual(executionOrder.length, 4);
    assert.ok(executionOrder.includes('react1: 0'));
    assert.ok(executionOrder.includes('react2: 0'));
    assert.ok(executionOrder.includes('react1: 1'));
    assert.ok(executionOrder.includes('react2: 1'));
  });

  it('handles sync+async reactions with conditional deps', async () => {
    class Model extends Observable {
      a = 1;
      b = 2;
      flag = true;
    }
    const m = new Model();
    const logs = [];

    // Sync reaction
    autorun(() => {
      logs.push(`sync: ${m.flag ? m.a : m.b}`);
    });

    // Async reaction
    await autorun(async () => {
      await Promise.resolve();
      logs.push(`async: ${m.flag ? m.a : m.b}`);
    });

    // await new Promise(r => setTimeout(r, 10));
    m.a = 10;
    await new Promise(r => setTimeout(r, 10));
    m.flag = false;
    await new Promise(r => setTimeout(r, 10));
    m.b = 20;
    await new Promise(r => setTimeout(r, 10));

    assert.deepStrictEqual(logs, [
      'sync: 1',
      'async: 1',
      'sync: 10',
      'async: 10',
      'sync: 2',
      'async: 2',
      'sync: 20',
      'async: 20'
    ]);
  });

  it('handles 100+ mixed reactions on same property', async () => {
    class Model extends Observable {
      value = 0;
    }
    const m = new Model();
    let syncCount = 0;
    let asyncCount = 0;

    // Create 50 sync reactions
    for (let i = 0; i < 50; i++) {
      // eslint-disable-next-line no-loop-func
      autorun(() => {
        // eslint-disable-next-line no-loop-func
        syncCount++;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const v = m.value; // Track dependency
      });
    }

    for (let i = 0; i < 50; i++) {
      // eslint-disable-next-line no-await-in-loop
      await autorun(async () => {
        await new Promise(r => setTimeout(r));
        // eslint-disable-next-line no-loop-func
        asyncCount++;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const v = m.value; // Track dependency
      });
    }

    const initialSync = syncCount;
    const initialAsync = asyncCount;
    m.value++;

    await new Promise(r => setTimeout(r, 50));

    // Each reaction should run exactly once more
    assert.strictEqual(syncCount, initialSync + 50);
    assert.strictEqual(asyncCount, initialAsync + 50);
  });

  it('maintains consistent execution order between sync/async', async () => {
    class Model extends Observable {
      value = 0;
    }
    const m = new Model();
    const order = [];

    // This sync reaction should always run first
    autorun(() => {
      order.push(`sync1: ${m.value}`);
    });

    // Async reaction
    await autorun(async () => {
      await Promise.resolve();
      order.push(`async: ${m.value}`);
    });

    // Another sync reaction
    autorun(() => {
      order.push(`sync2: ${m.value}`);
    });

    await new Promise(r => setTimeout(r, 10));
    m.value = 1;
    await new Promise(r => setTimeout(r, 10));

    // Sync reactions should always precede async ones
    assert.deepStrictEqual(order, [
      'sync1: 0',
      'async: 0',
      'sync2: 0',
      'sync1: 1',
      'sync2: 1',
      'async: 1'
    ]);
  });

  it('handles concurrent mutations during async processing', async () => {
    class Model extends Observable {
      value = 0;
    }
    const m = new Model();
    const logs = [];

    // Change during async processing
    setTimeout(() => m.value = 1, 10);

    await autorun(async () => {
      logs.push(`start: ${m.value}`);
      await new Promise(r => setTimeout(r, 50));
      logs.push(`end: ${m.value}`);
    });

    await new Promise(r => setTimeout(r, 100));

    assert.deepStrictEqual(logs, [
      'start: 0',
      'end: 1' // Should capture latest value
    ]);
  });

  it('continues tracking after failed async reaction', async () => {
    class Model extends Observable {
      value = 0;
    }
    const m = new Model();
    const logs = [];
    let errorCount = 0;

    await autorun(async () => {
      try {
        await new Promise(r => setTimeout(r));
        if (m.value === 1) throw new Error('test');
        logs.push(m.value);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        errorCount++;
      }
    });

    m.value = 1;
    await new Promise(r => setTimeout(r, 20));
    m.value = 2;
    await new Promise(r => setTimeout(r, 20));

    assert.strictEqual(errorCount, 1);
    assert.deepStrictEqual(logs, [0, 2]);
  });

  it('tracks dependencies discovered late in async flow', async () => {
    class Model extends Observable {
      a = 1;
      b = 2;
    }
    const m = new Model();
    const logs = [];

    await autorun(async () => {
      await Promise.resolve();
      logs.push(m.a); // First dependency
      await Promise.resolve();
      logs.push(m.b); // Late-discovered dependency
    });

    m.a = 10;
    m.b = 20;
    await new Promise(r => setTimeout(r, 10));

    assert.deepStrictEqual(logs, [1, 2, 10, 20]);
  });

  it('isolates dependencies between different observable classes', async () => {
    class A extends Observable { value = 1 }
    class B extends Observable { value = 2 }

    const a = new A();
    const b = new B();
    const aLogs = [];
    const bLogs = [];

    await autorun(async function foo() {
      await new Promise(r => setTimeout(r));
      aLogs.push(a.value);
    });

    await autorun(async function bar() {
      await new Promise(r => setTimeout(r));
      bLogs.push(b.value);
    });

    a.value = 10;
    b.value = 20;
    await new Promise(r => setTimeout(r, 10));

    assert.deepStrictEqual(aLogs, [1, 10]);
    assert.deepStrictEqual(bLogs, [2, 20]);
  });

  it('tracks nested properties independently', async () => {
    class Config extends Observable {
      theme = { dark: false }
    }
    class Auth extends Observable {
      user = { token: null }
    }

    const config = new Config();
    const auth = new Auth();
    const themeLogs = [];
    const authLogs = [];

    await autorun(async () => {
      await new Promise(r => setTimeout(r));
      themeLogs.push(config.theme.dark);
    });

    await autorun(async () => {
      await new Promise(r => setTimeout(r));
      authLogs.push(auth.user.token);
    });

    await new Promise(r => setTimeout(r, 10));

    // Should only affect theme reaction
    config.theme = { dark: true };
    // await new Promise(r => setTimeout(r, 10));

    // Should only affect auth reaction
    auth.user.token = 'abc123';
    await new Promise(r => setTimeout(r, 10));

    assert.deepStrictEqual(themeLogs, [false, true]);
    assert.deepStrictEqual(authLogs, [null, 'abc123']);
  });

  describe('Concurrency', () => {
    class A extends Observable { value = 'A' }
    class B extends Observable { value = 'B' }
    class C extends Observable { value = 'C' }

    describe('Observable Isolation', () => {
      it('tracks only assigned observables per autorun', async () => {
        const a = new A();
        const b = new B();
        const c = new C();
        const logs: string[] = [];

        // Test Case 1: Sequential delayed access
        await autorun(async () => {
          await delay(100);
          logs.push(`1: ${a.value}`);
          await delay(50);
          logs.push(`1: ${b.value}`);
        });

        // Test Case 2: Mixed timing
        await autorun(async () => {
          await delay(30);
          logs.push(`2: ${c.value}`);
          await delay(200);
          logs.push(`2: ${a.value}`);
        });

        // Test Case 3: Immediate access
        await autorun(async () => {
          logs.push(`3: ${b.value}`);
          await delay(150);
          logs.push(`3: ${c.value}`);
        });

        // Mutations
        await delay(50);
        a.value = 'A2';
        b.value = 'B2';
        await delay(100);
        c.value = 'C2';
        await delay(200);

        assert.deepStrictEqual(logs, [
          '1: A', // first run
          '1: B', // first run
          '2: C', // first run
          '2: A', // first run
          '3: B', // first run
          '3: C', // first run
          // changing a and b
          '3: B2', // it logs 3B2 then await 150ms that's why second autorun start executing
          '2: C',  // while third autorun await second start execution, it logs 2C
          // because it wasn't changed, and then wait 200ms, this time first autorun start
          '1: A2', // it logs 1:A2 and wait 50vs
          '3: C2', // this time c.value was changed and third autorun execute and logs 3: C2
          '1: B2', // while first autorun wait only 50ms, is ready and logs 1: B2
          '2: A2', // now second is ready and logs 2: A2
        ]);
      });

      it('handles overlapping async dependencies', async () => {
        const a = new A();
        const b = new B();
        const executionOrder: string[] = [];

        await autorun(async () => {
          await delay(50);
          executionOrder.push(`A: ${a.value}`);
          // eslint-disable-next-line no-unused-expressions
          b.value; // Late dependency
        });

        await autorun(async () => {
          await delay(25);
          executionOrder.push(`B: ${b.value}`);
        });

        await delay(10);
        a.value = 'A1';
        await delay(100);

        assert.deepStrictEqual(executionOrder, [
          'A: A',
          'B: B',  // 25ms
          'A: A1', // 50ms
        ]);
      });

    });

    it('tracks independent sync/async autoruns without conflicts', async () => {
      class User extends Observable { name = 'Alice' }
      class Product extends Observable { price = 100 }

      const user = new User();
      const product = new Product();
      const userLogs: string[] = [];
      const productLogs: string[] = [];

      // Sync autorun tracking user.name
      const disposeSync = autorun(() => {
        userLogs.push(`SYNC: ${user.name}`);
      });

      // Async autorun tracking product.price
      const disposeAsync = await autorun(async () => {
        await Promise.resolve();
        productLogs.push(`ASYNC: ${product.price}`);
        await delay(50);
        productLogs.push(`ASYNC (late): ${product.price}`);
      });

      // Initial state verification
      assert.deepStrictEqual(userLogs, ['SYNC: Alice']);
      assert.deepStrictEqual(productLogs, ['ASYNC: 100', 'ASYNC (late): 100']); // Async hasn't resolved yet

      await delay(10); // Let async autorun start

      // Make changes
      user.name = 'Bob';
      await delay(10);
      product.price = 150;
      await delay(100); // Wait for all async operations

      // Verify isolation
      assert.deepStrictEqual(userLogs, [
        'SYNC: Alice',
        'SYNC: Bob'  // Only reacted to user change
      ]);

      assert.deepStrictEqual(productLogs, ['ASYNC: 100', 'ASYNC (late): 100', 'ASYNC: 150', 'ASYNC (late): 150']);

      // Cleanup
      disposeSync();
      disposeAsync();
    });

    function delay(ms: number): Promise<void> {
      return new Promise(r => setTimeout(r, ms));
    }
  })

  test('mutate state inside async autorun', async (ctx) => {
    const subscriber = mock.fn();

    class State extends Observable {
      loading = true;
      postId = 1;
      post = null;

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
    await autorun(state.getPost);
    assert.strictEqual(subscriber.mock.callCount(), 1);
    autorun(() => {
      ctx.diagnostic(`second autorun`);
      if (!state.loading) {
        ctx.diagnostic(`${state.loading} ${state.post} ${state.post?.title}`);
        assert.strictEqual(subscriber.mock.callCount(), 1);
      }
    });

    state.loading = true;
    await new Promise(r => setTimeout(r, 10));
    assert.strictEqual(subscriber.mock.callCount(), 1);
  });

  test('track observable in async context with await', async (ctx) => {
    class Foo extends Observable {
      prop = 1;
    }

    const state = new Foo();
    const subscriber = mock.fn();

    // We'll use this to control when the test completes
    let resolveTest: (value?: any) => void;
    const testPromise = new Promise((resolve) => {
      resolveTest = resolve;
    });

    let runCount = 0;

    const dispose = await autorun(async () => {
      subscriber();
      runCount++;
      ctx.diagnostic(`Run ${runCount}`);

      try {
        if (runCount === 1) {
          // First run - trigger async operation
          const data1 = await fetch('https://jsonplaceholder.typicode.com/posts/1');
          await fetch('https://jsonplaceholder.typicode.com/posts/1');
          ctx.diagnostic(
            `Fetched successfully, read observable ${state.prop}, data id: ${Reflect.get(data1, 'id')}`
          );

          // Schedule prop change after current execution context
          setTimeout(() => {
            state.prop += 1;
          }, 0);
        } else if (runCount === 2) {
          // Second run - complete the test
          assert.strictEqual(subscriber.mock.callCount(), 2);
          dispose(); // Clean up
          resolveTest();
        }
      } catch (e) {
        ctx.diagnostic('Failed to fetch');
        dispose(); // Clean up on error
        resolveTest(e);
      }
    });

    return testPromise as any;
  });

  test('track observable in .then() chain with autorun returning promise', async (ctx) => {
    class Foo extends Observable {
      a = 1;
      b = 2;
      c = 3;
    }

    const state = new Foo();
    const subscriber = mock.fn();
    let runCount = 0;

    // Autorun will return this promise
    const autorunPromise = new Promise((resolveAutorun, rejectAutorun) => {
      const dispose = autorun(() => {
        subscriber();
        runCount++;
        ctx.diagnostic(`Run ${runCount}: a=${state.a}, b=${state.b}, c=${state.c}`);

        // Pure promise chain without async/await
        fetch('https://jsonplaceholder.typicode.com/posts/1')
          .then(() => {
            ctx.diagnostic(`Then 1 - reading a: ${state.a}`);
            return state.a;
          })
          .then(() => {
            ctx.diagnostic(`Then 2 - reading b: ${state.b}`);
            return state.b;
          })
          .then(() => {
            ctx.diagnostic(`Then 3 - reading c: ${state.c}`);
            return state.c;
          })
          .then(() => {
            if (runCount === 1) {
              setTimeout(() => {
                state.a += 1;
                ctx.diagnostic('Changed a');
              }, 50);
            } else if (runCount === 2) {
              setTimeout(() => {
                state.b += 1;
                ctx.diagnostic('Changed b');
              }, 50);
            } else if (runCount === 3) {
              setTimeout(() => {
                state.c += 1;
                ctx.diagnostic('Changed c');
              }, 50);
            } else if (runCount === 4) {
              assert.strictEqual(subscriber.mock.callCount(), 4);
              dispose();
              resolveAutorun(3);
            }
          })
          .catch((e) => {
            ctx.diagnostic(`Error: ${e}`);
            dispose();
            rejectAutorun(e);
          });
      });
    });

    return autorunPromise as any;
  });

  test('track observable inside conditional async branches', async (ctx) => {
    class State extends Observable {
      flag = true;
      value = 0;
    }

    const state = new State();
    const subscriber = mock.fn();

    let runCount = 0;
    // We'll use this to control when the test completes
    let resolveTest: (value?: any) => void;
    const testPromise = new Promise((resolve) => {
      resolveTest = resolve;
    });

    const dispose = await autorun(async () => {
      subscriber();
      runCount++;
      ctx.diagnostic(`Run ${runCount}`);

      if (state.flag) {
        await fetch('https://jsonplaceholder.typicode.com/posts/1');
        ctx.diagnostic(`Flag true: ${state.value}`);
      } else {
        await fetch('https://jsonplaceholder.typicode.com/posts/2');
        ctx.diagnostic(`Flag false: ${state.value}`);
      }

      if (runCount === 1) {
        setTimeout(() => {
          state.value += 1;
        }, 0);
      } else if (runCount === 2) {
        setTimeout(() => {
          state.flag = false;
        }, 0);
      } else if (runCount === 3) {
        setTimeout(() => {
          state.value += 1;
        }, 0);
      } else if (runCount === 4) {
        assert.strictEqual(subscriber.mock.callCount(), 4);
        dispose();
        resolveTest();
      }
    });

    return testPromise as any;
  });

  test('track multiple observables across async steps', async (ctx) => {
    class State extends Observable {
      a = 1;
      b = 2;
      c = 3;
    }

    const state = new State();
    const subscriber = mock.fn();

    let runCount = 0;
    // We'll use this to control when the test completes
    let resolveTest: (value?: any) => void;
    const testPromise = new Promise((resolve) => {
      resolveTest = resolve;
    });

    const dispose = await autorun(async () => {
      subscriber();
      runCount++;
      ctx.diagnostic(`Run ${runCount}`);

      const data = await fetch('https://jsonplaceholder.typicode.com/posts/1');
      const json = await data.json();

      ctx.diagnostic(`Read a=${state.a}, b=${state.b}, c=${state.c}`);
      ctx.diagnostic(`${json.id}, ${state.a}, ${state.b}, ${state.c}}`);

      if (runCount === 1) {
        setTimeout(() => {
          state.a += 1;
        }, 0);
      } else if (runCount === 2) {
        setTimeout(() => {
          state.b += 1;
        }, 0);
      } else if (runCount === 3) {
        setTimeout(() => {
          state.c += 1;
        }, 0);
      } else if (runCount === 4) {
        assert.strictEqual(subscriber.mock.callCount(), 4);
        dispose();
        resolveTest();
      }
    });

    return testPromise as any;
  });

  test('error handling in async effect does not break tracking', async (ctx) => {
    class State extends Observable {
      fail = false;
      value = 0;
    }

    const state = new State();
    const subscriber = mock.fn();

    let runCount = 0;
    // We'll use this to control when the test completes
    let resolveTest: (value?: any) => void;
    const testPromise = new Promise((resolve) => {
      resolveTest = resolve;
    });

    const dispose = await autorun(async () => {
      subscriber();
      runCount++;
      ctx.diagnostic(`Run ${runCount}`);

      try {
        if (state.fail) {
          throw new Error('Simulated failure');
        }

        const data = await fetch('https://jsonplaceholder.typicode.com/posts/1');
        const json = await data.json();
        ctx.diagnostic(`Success: ${json.id}, value: ${state.value}`);
      } catch (e) {
        ctx.diagnostic(`Error caught: ${e.message}`);
      }

      if (runCount === 1) {
        setTimeout(() => {
          state.fail = true; // trigger error
        }, 0);
      } else if (runCount === 2) {
        setTimeout(() => {
          state.fail = false; // clear error
          state.value += 1;
        }, 0);
      } else if (runCount === 3) {
        assert.strictEqual(subscriber.mock.callCount(), 3);
        dispose();
        resolveTest();
      }
    });

    return testPromise as any;
  });

  test('long promise chain with many .then() steps', async (ctx) => {
    class State extends Observable {
      value = 0;
    }

    const state = new State();
    const subscriber = mock.fn();

    let runCount = 0;

    const dispose = await autorun(() => {
      subscriber();
      runCount++;
      ctx.diagnostic(`Run ${runCount}`);

      return fetch('https://jsonplaceholder.typicode.com/posts/1')
        .then(() => {
          ctx.diagnostic(`Step 1: ${state.value}`);
          return state.value;
        })
        .then(() => {
          ctx.diagnostic(`Step 2: ${state.value}`);
          return state.value;
        })
        .then(() => {
          ctx.diagnostic(`Step 3: ${state.value}`);
          return state.value;
        })
        .then(() => {
          ctx.diagnostic(`Step 4: ${state.value}`);
          return state.value;
        })
        .then(() => {
          ctx.diagnostic(`Step 5: ${state.value}`);
          return state.value;
        })
        .then(() => {
          if (runCount === 1) {
            setTimeout(() => {
              state.value += 1;
            }, 0);
          } else if (runCount === 2) {
            setTimeout(() => {
              state.value += 1;
            }, 0);
          } else if (runCount === 3) {
            assert.strictEqual(subscriber.mock.callCount(), 3);
            dispose();
          }
        });
    });

    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  test('two autorun track different observables independently', async (ctx) => {
    let resolveTest: (value?: any) => void;
    const testPromise = new Promise((resolve) => {
      resolveTest = resolve;
    });

    // Define two observable classes
    class StateA extends Observable {
      value = 0;
    }

    class StateB extends Observable {
      value = 0;
    }

    const stateA = new StateA();
    const stateB = new StateB();

    const subA = mock.fn();
    const subB = mock.fn();

    let runCountA = 0;
    let runCountB = 0;

    // Effect A tracks stateA
    const disposeA = await autorun(async () => {
      subA();
      runCountA++;
      await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate async work
      ctx.diagnostic(`Effect A Run ${runCountA}: ${stateA.value}`);
      if (runCountA >= 5) {
        ctx.diagnostic(`Effect A completed all runs`);
      }
    });

    // Effect B tracks stateB
    const disposeB = await autorun(async () => {
      subB();
      runCountB++;
      await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate async work
      ctx.diagnostic(`Effect B Run ${runCountB}: ${stateB.value}`);
      if (runCountB >= 5) {
        ctx.diagnostic(`Effect B completed all runs`);
      }
    });

    // Trigger updates every 1000ms
    let ticks = 0;
    const interval = setInterval(() => {
      ticks++;
      stateA.value += 1;
      stateB.value += 1;
      ctx.diagnostic(`Tick ${ticks}: Updated both observables`);

      if (ticks >= 5) {
        clearInterval(interval);
        setTimeout(() => {
          // Final assertions
          assert.strictEqual(runCountA, 6); // initial + 5 updates
          assert.strictEqual(runCountB, 6);
          assert.strictEqual(subA.mock.callCount(), 6);
          assert.strictEqual(subB.mock.callCount(), 6);

          // Cleanup
          disposeA();
          disposeB();
          ctx.diagnostic('Test completed successfully');
          resolveTest();
        }, 1200);
      }
    }, 1000);

    return testPromise as any;
  });

  test('two observables with different update intervals trigger correct effects', async (ctx) => {
    class StateA extends Observable {
      value = 0;
    }

    class StateB extends Observable {
      value = 0;
    }

    const stateA = new StateA();
    const stateB = new StateB();

    const subA = mock.fn();
    const subB = mock.fn();

    let runCountA = 0;
    let runCountB = 0;

    // Effect A tracks stateA
    const disposeA = await autorun(async () => {
      subA();
      runCountA++;
      await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate async work
      ctx.diagnostic(`Effect A Run ${runCountA}: stateA.value = ${stateA.value}`);
    });

    // Effect B tracks stateB
    const disposeB = await autorun(async () => {
      subB();
      runCountB++;
      await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate async work
      ctx.diagnostic(`Effect B Run ${runCountB}: stateB.value = ${stateB.value}`);
    });

    // Start two independent intervals
    const intervalA = setInterval(() => {
      transaction(() => stateA.value += 1)
      // ctx.diagnostic(`[Change] stateA.value = ${stateA.value}`);
    }, 500);

    const intervalB = setInterval(() => {
      transaction(() => stateB.value += 1)
      // ctx.diagnostic(`[Change] stateB.value = ${stateB.value}`);
    }, 600);

    // Let it run for 3 seconds
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Stop intervals
    clearInterval(intervalA);
    clearInterval(intervalB);

    // Allow final reactions to settle
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Assertions
    ctx.diagnostic(`Final: runCountA=${runCountA}, runCountB=${runCountB}`);

    assert.ok(runCountA > 3);
    assert.ok(runCountB > 3);

    assert.strictEqual(subA.mock.callCount(), runCountA);
    assert.strictEqual(subB.mock.callCount(), runCountB);

    // Cleanup
    disposeA();
    disposeB();

    ctx.diagnostic('Test completed successfully');
  });
});



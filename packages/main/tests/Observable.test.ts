import { describe, mock, test } from 'node:test';
import assert from 'node:assert';

import { Observable, autorun, subscribe, transaction } from '../index.js';

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

    const dispose = autorun(async () => {
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
          assert.equal(subscriber.mock.callCount(), 2);
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
              assert.equal(subscriber.mock.callCount(), 4);
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

    const dispose = autorun(async () => {
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
        assert.equal(subscriber.mock.callCount(), 4);
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

    const dispose = autorun(async () => {
      subscriber();
      runCount++;
      ctx.diagnostic(`Run ${runCount}`);

      const data = await fetch('https://jsonplaceholder.typicode.com/posts/1');
      const json = await data.json();

      ctx.diagnostic(`Read a=${state.a}, b=${state.b}, c=${state.c}`);
      ctx.diagnostic(json.id, state.a, state.b, state.c);

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
        assert.equal(subscriber.mock.callCount(), 4);
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

    const dispose = autorun(async () => {
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
        assert.equal(subscriber.mock.callCount(), 3);
        dispose();
        resolveTest();
      }
    });

    return testPromise as any;
  });

  test('concurrent effects with shared observable do not interfere', async (ctx) => {
    class State extends Observable {
      value = 0;
    }

    const state = new State();
    const subA = mock.fn();
    const subB = mock.fn();

    let countA = 0;
    let countB = 0;

    const disposeA = autorun(async () => {
      subA();
      countA++;
      ctx.diagnostic(`Effect A: Run ${countA}`);
      await fetch('https://jsonplaceholder.typicode.com/posts/1');
      ctx.diagnostic(`Effect A reads: ${state.value}`);
      if (countA === 1) {
        setTimeout(() => {
          state.value += 1;
        }, 0);
      }
    });

    const disposeB = autorun(async () => {
      subB();
      countB++;
      ctx.diagnostic(`Effect B: Run ${countB}`);
      await fetch('https://jsonplaceholder.typicode.com/posts/2');
      ctx.diagnostic(`Effect B reads: ${state.value}`);
      if (countB === 1) {
        setTimeout(() => {
          state.value += 1;
        }, 0);
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 300));

    assert.equal(countA, 2);
    assert.equal(countB, 2);
    assert.equal(state.value, 2);

    disposeA();
    disposeB();
  });

  test('long promise chain with many .then() steps', async (ctx) => {
    class State extends Observable {
      value = 0;
    }

    const state = new State();
    const subscriber = mock.fn();

    let runCount = 0;

    const dispose = autorun(() => {
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
            assert.equal(subscriber.mock.callCount(), 3);
            dispose();
          }
        });
    });

    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  // test('async tracking with two observables', async (ctx) => {
  //   const state1 = makeObservable({ value: 0 });
  //   const state2 = makeObservable({ value: 0 });
  //
  //   const subscriber1 = mock.fn();
  //   const subscriber2 = mock.fn();
  //
  //   let runCount1 = 0;
  //   let runCount2 = 0;
  //
  //   // We'll use this to control when the test completes
  //   let resolveTest: (value?: any) => void;
  //
  //   const testPromise = new Promise(resolve => {
  //     resolveTest = resolve;
  //   });
  //
  //   const dispose1 = autorun(async function effect1() {
  //     await new Promise(resolve => setTimeout(resolve, 500));
  //     ctx.diagnostic(`Value in state1 ${state1.value}, runCount1 ${runCount1}`)
  //     ++runCount1
  //   })
  //
  //   autorun(async function effect2() {
  //     await new Promise(resolve => setTimeout(resolve, 500));
  //     ctx.diagnostic(`Value in state2 ${state2.value}, runCount1 ${runCount2}`)
  //     ++runCount2
  //   })
  //
  //   let interval1 = setInterval(() => {
  //     if (runCount1 >= 5) {
  //       clearInterval(interval1);
  //       dispose1()
  //     }
  //     state1.value += 1;
  //   }, 1000)
  //
  //   return testPromise as any;
  // });

  test('two autoruns track different observables independently', async (ctx) => {
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
    const disposeA = autorun(async () => {
      subA();
      runCountA++;
      await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate async work
      ctx.diagnostic(`Effect A Run ${runCountA}: ${stateA.value}`);
      if (runCountA >= 5) {
        ctx.diagnostic(`Effect A completed all runs`);
      }
    });

    // Effect B tracks stateB
    const disposeB = autorun(async () => {
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
          assert.equal(runCountA, 6); // initial + 5 updates
          assert.equal(runCountB, 6);
          assert.equal(subA.mock.callCount(), 6);
          assert.equal(subB.mock.callCount(), 6);

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
    const disposeA = autorun(async () => {
      subA();
      runCountA++;
      await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate async work
      ctx.diagnostic(`Effect A Run ${runCountA}: stateA.value = ${stateA.value}`);
    });

    // Effect B tracks stateB
    const disposeB = autorun(async () => {
      subB();
      runCountB++;
      await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate async work
      ctx.diagnostic(`Effect B Run ${runCountB}: stateB.value = ${stateB.value}`);
    });

    // Start two independent intervals
    const intervalA = setInterval(() => {
      stateA.value += 1;
      // ctx.diagnostic(`[Change] stateA.value = ${stateA.value}`);
    }, 500);

    const intervalB = setInterval(() => {
      stateB.value += 1;
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

    assert.ok(runCountA > 2); // ~10+ runs expected due to 100ms interval
    assert.ok(runCountB >= 6); // ~6 runs expected due to 500ms interval over 3s

    assert.equal(subA.mock.callCount(), runCountA);
    assert.equal(subB.mock.callCount(), runCountB);

    // Cleanup
    disposeA();
    disposeB();

    ctx.diagnostic('Test completed successfully');
  });
});

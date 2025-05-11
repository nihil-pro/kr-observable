/**
 * References:
 * https://github.com/potahtml/pota/tree/master/src/lib/store
 *
 * https://github.com/solidjs/solid/blob/main/packages/solid/store/test/
 * https://github.com/solidjs-community/solid-primitives/tree/main/packages/makeObservable/test
 * https://github.com/solidjs-community/solid-primitives/blob/main/packages/map/test/index.test.ts
 * https://github.com/vobyjs/oby/blob/master/test/index.js
 * https://github.com/vuejs/core/tree/main/packages/reactivity/__tests__
 * https://discord.com/channels/722131463138705510/1217920934548082748
 * https://discord.com/invite/solidjs
 */

import { describe, mock, test } from 'node:test';
import assert from 'node:assert';

import { Observable, autorun, makeObservable, transaction, subscribe } from '../src/index.js';

describe('Big test', () => {
  test('value: object property', () => {
    const source = { cat: 'quack' };
    const result = makeObservable(source);
    assert.equal(source.cat, 'quack');
    assert.equal(result.cat, 'quack');
  });

  test(`mutation: object property`, () => {
    const source = { cat: 'quack' };
    const result = makeObservable(source);

    assert.equal(source.cat, 'quack');
    assert.equal(result.cat, 'quack');

    result.cat = 'murci';
    assert.equal(source.cat, 'murci');
    assert.equal(result.cat, 'murci');
  });

  test(`mutation: object nested`, () => {
    const source = makeObservable({
      data: { starting: 1, ending: 1 },
    });

    assert.equal(source.data.starting, 1);
    assert.equal(source.data.ending, 1);

    source.data.ending = 2;
    assert.equal(source.data.starting, 1);
    assert.equal(source.data.ending, 2);

    source.data.starting = 2;
    assert.equal(source.data.starting, 2);
    assert.equal(source.data.ending, 2);
  });

  test(`mutation: object frozen`, (ctx) => {
    const source = makeObservable(
      Object.freeze({
        user: { name: 'John', last: 'Snow' },
      })
    );

    assert.equal(source.user.name, 'John');
    assert.equal(source.user.last, 'Snow');

    const subscriber = mock.fn();

    autorun(() => {
      ctx.diagnostic(`${source.user.name} ${source.user.last}`);
      subscriber();
    });
    assert.equal(subscriber.mock.callCount(), 1);

    try {
      // @ts-ignore
      source.user = 'something else';
    } catch (error) {
      assert.equal(error instanceof TypeError, true);
    }
  });

  test(`mutation: object frozen nested`, (ctx) => {
    const source = makeObservable({
      data: Object.freeze({
        user: { name: 'John', last: 'Snow' },
      }),
    });

    const subscriber = mock.fn();

    autorun(() => {
      ctx.diagnostic(`${source.data.user.name} ${source.data.user.last}`);
      subscriber();
    });
    assert.equal(subscriber.mock.callCount(), 1);

    assert.equal(source.data.user.name, 'John');
    assert.equal(source.data.user.last, 'Snow');

    try {
      source.data.user = 'something else';
    } catch (error) {
      assert.equal(error instanceof Error, true);
    }
  });

  test(`mutation: object frozen within frozen nested`, (ctx) => {
    const source = makeObservable(
      Object.freeze({
        data: Object.freeze({
          user: { store: { name: 'John', last: 'Snow' } },
        }),
      })
    );

    const subscriber = mock.fn();

    autorun(() => {
      ctx.diagnostic(`${source.data.user.store.name} ${source.data.user.store.last}`);
      subscriber();
    });

    assert.equal(subscriber.mock.callCount(), 1);
    assert.equal(source.data.user.store.name, 'John');
    assert.equal(source.data.user.store.last, 'Snow');

    try {
      source.data.user = 'something else';
    } catch (error) {
      assert.equal(error instanceof Error, true);
    }
  });

  test(`mutation: function`, () => {
    const result = makeObservable({
      fn: () => 1,
    });

    assert.equal(result.fn(), 1);
    // @ts-ignore
    result.fn = () => 2;
    assert.equal(result.fn(), 2);
  });

  /** Unacceptable behavior. A reactive system shouldn't change the result returned by a function */
  // test(`mutation: returned object by function call is makeObservable [solid, oby]`, (ctx) => {
  //   const result = makeObservable({
  //     fn: () => ({
  //       cat: 'quack',
  //     }),
  //   });
  //
  //   assert.equal(result.fn().cat).toBe('quack');
  //
  //   assert.equal(isProxy(result.fn())).toBe(true);
  //
  //   const r = result.fn();
  //   assert.equal(r.cat).toBe('quack');
  //
  //   let calls = 0;
  //   const execute = memo(() => {
  //     calls++;
  //     r.cat;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   r.cat = 'murci';
  //   execute();
  //   assert.equal(r.cat).toBe('murci');
  //   assert.equal(calls).toBe(2);
  // });

  test(`getters: object`, () => {
    const result = makeObservable({
      cat: 'quack',
      get greeting() {
        return `hi, ${this.cat}`;
      },
    });
    assert.equal(result.greeting, 'hi, quack');

    result.cat = 'murci';
    assert.equal(result.greeting, 'hi, murci');
  });

  test(`getters: returning object`, () => {
    let value = 'quack';
    const result = makeObservable({
      get greeting() {
        return { greet: `hi, ${value}` };
      },
      set greeting(val) {
        // @ts-ignore
        value = val;
      },
    });
    assert.equal(result.greeting.greet, 'hi, quack');

    // @ts-ignore
    result.greeting = 'murci';
    assert.equal(result.greeting.greet, 'hi, murci');
  });

  test(`getters: returning getter`, () => {
    let value = 'quack';
    const result = makeObservable({
      get greeting() {
        return {
          get greet() {
            return `hi, ${value}`;
          },
        };
      },
      set greeting(val) {
        // @ts-ignore
        value = val;
      },
    });
    assert.equal(result.greeting.greet, 'hi, quack');

    // @ts-ignore
    result.greeting = 'murci';
    assert.equal(result.greeting.greet, 'hi, murci');
  });

  test(`getters: returning frozen object`, () => {
    let value = 'quack';
    const result = makeObservable({
      get greeting() {
        return Object.freeze({ greet: `hi, ${value}` });
      },
      set greeting(val) {
        // @ts-ignore
        value = val;
      },
    });
    assert.equal(result.greeting.greet, 'hi, quack');

    // @ts-ignore
    result.greeting = 'murci';
    assert.equal(result.greeting.greet, 'hi, murci');
  });

  test(`getters: returning frozen object nested`, () => {
    let value = 'quack';
    const result = makeObservable({
      get greeting() {
        return Object.freeze({
          greet: Object.freeze({ text: `hi, ${value}` }),
        });
      },
      set greeting(val) {
        // @ts-ignore
        value = val;
      },
    });
    assert.equal(result.greeting.greet.text, 'hi, quack');

    // @ts-ignore
    result.greeting = 'murci';
    assert.equal(result.greeting.greet.text, 'hi, murci');
  });

  test(`getter/setters: class`, () => {
    class Cat extends Observable {
      #name = 'quack';
      get name2() {
        return this.#name;
      }
      set name2(value) {
        this.#name = value;
        console.warn('set name2', value, this.#name);
      }
      get greeting2() {
        return `hi, ${this.#name}`;
      }
    }
    const result = new Cat();
    assert.equal(result.greeting2, 'hi, quack');

    result.name2 = 'mishu22';
    assert.equal(result.greeting2, 'hi, mishu22');
  });

  test(`getter/setters: class 2`, (ctx) => {
    class Cat extends Observable {
      #name = 'quack';
      get name() {
        return this.#name;
      }
      set name(value) {
        this.#name = value;
      }
      get greeting() {
        return `hi, ${this.#name}`;
      }
    }
    const result = new Cat();
    assert.equal(result.greeting, 'hi, quack');
    assert.equal(result.name, 'quack');

    const subscriber = mock.fn();
    autorun(() => {
      ctx.diagnostic(result.name);
      subscriber();
    });
    assert.equal(subscriber.mock.callCount(), 1);

    result.name = 'mishu';

    assert.equal(result.name, 'mishu');
    assert.equal(subscriber.mock.callCount(), 2);
    assert.equal(result.greeting, 'hi, mishu');
  });

  test(`getter/setters: class, should fail when trying to set in a getter`, () => {
    class Cat extends Observable {
      #name = 'quack';
      get name() {
        return this.#name;
      }
      get greeting() {
        return `hi, ${this.#name}`;
      }
    }
    const result = new Cat();
    assert.equal(result.greeting, 'hi, quack');

    try {
      // @ts-ignore
      result.name = 'mishu';
    } catch (error) {
      assert.equal(error instanceof Error, true);
    }

    assert.equal(result.greeting, 'hi, quack');
  });

  test(`getter/setters: object`, () => {
    const result = makeObservable({
      name: 'John',
      last: 'Smith',
      get full() {
        return `${this.name} ${this.last}`;
      },
      set full(value) {
        const parts = value.split(' ');
        this.name = parts[0];
        this.last = parts[1];
      },
    });
    assert.equal(result.name, 'John');
    assert.equal(result.last, 'Smith');
    assert.equal(result.full, 'John Smith');

    transaction(() => (result.name = 'Jake'));
    assert.equal(result.name, 'Jake');
    assert.equal(result.last, 'Smith');
    assert.equal(result.full, 'Jake Smith');

    transaction(() => (result.last = 'Lala'));
    assert.equal(result.name, 'Jake');
    assert.equal(result.last, 'Lala');
    assert.equal(result.full, 'Jake Lala');

    transaction(() => (result.full = 'Bogi One'));
    assert.equal(result.name, 'Bogi');
    assert.equal(result.last, 'One');
    assert.equal(result.full, 'Bogi One');
  });

  test(`deleting: undefined object property`, () => {
    const result = makeObservable({
      name: 'quack',
    });

    assert.equal('last' in result, false);
    try {
      // @ts-ignore
      delete result.last;
    } catch (error) {
      assert.equal(error instanceof Error, true);
    }
    assert.equal('last' in result, false);

    // @ts-ignore
    assert.equal(result.last, undefined);
  });

  test(`deleting: should throw when non-configurable`, () => {
    const result = makeObservable({});

    Object.defineProperty(result, 'cat', {
      value: 'quack',
      configurable: false,
      writable: false,
    });

    try {
      // @ts-ignore
      delete result.cat;
    } catch (error) {
      assert.equal(error instanceof Error, true);
    }
  });

  test(`setting to undefined shouldn't delete the property`, () => {
    const result = makeObservable({
      name: 'quack',
    });
    assert.equal('name' in result, true);

    result.name = undefined;
    assert.equal('name' in result, true);
    assert.equal(result.name, undefined);
    assert.equal('name' in result, true);

    delete result.name;
    assert.equal('name' in result, false);
    assert.equal(result.name, undefined);
    assert.equal('name' in result, false);
  });

  test(`delete key with undefined value does trigger reactivity - object.keys `, (ctx) => {
    const result = makeObservable({ a: 'somevalue', b: undefined });
    assert.equal('a' in result, true);
    assert.equal('b' in result, true);

    const subscriber = mock.fn();
    autorun(() => {
      ctx.diagnostic(Object.keys(result).toString());
      subscriber();
    });
    assert.equal(subscriber.mock.callCount(), 1);

    delete result.b;

    assert.equal('b' in result, false);
    assert.equal(subscriber.mock.callCount(), 2);
  });

  test(`delete non existent key doesnt trigger reactivity - object.keys`, (ctx) => {
    const result = makeObservable({ a: 'somevalue' });
    assert.equal('a' in result, true);
    assert.equal('b' in result, false);

    const subscriber = mock.fn();
    autorun(() => {
      subscriber();
      ctx.diagnostic(Object.keys(result).toString());
    });

    assert.equal(subscriber.mock.callCount(), 1);

    assert.equal('b' in result, false);
    assert.equal(subscriber.mock.callCount(), 1);

    try {
      // @ts-ignore
      delete result.b;
    } catch (error) {
      assert.equal(error instanceof Error, true);
    }

    assert.equal('b' in result, false);
    assert.equal(subscriber.mock.callCount(), 1);
  });

  test(`delete non existent key doesnt trigger reactivity - value`, (ctx) => {
    const result = makeObservable({ a: 'somevalue' });
    assert.equal('a' in result, true);
    assert.equal('b' in result, false);

    const subscriber = mock.fn();
    autorun(() => {
      subscriber();
      // @ts-ignore
      ctx.diagnostic(`${result.b}`);
    });
    assert.equal(subscriber.mock.callCount(), 1);

    assert.equal('b' in result, false);
    assert.equal(subscriber.mock.callCount(), 1);

    try {
      // @ts-ignore
      delete result.b;
    } catch (error) {
      assert.equal(error instanceof Error, true);
    }

    assert.equal('b' in result, false);
    assert.equal(subscriber.mock.callCount(), 1);
  });

  test(`delete non existent key doesnt trigger reactivity - in`, (ctx) => {
    const result = makeObservable({ a: 'somevalue' });
    assert.equal('a' in result, true);
    assert.equal('b' in result, false);

    const subscriber = mock.fn();
    autorun(() => {
      subscriber();
      // @ts-ignore
      ctx.diagnostic(`${'b' in result}`);
    });
    assert.equal(subscriber.mock.callCount(), 1);

    assert.equal('b' in result, false);
    assert.equal(subscriber.mock.callCount(), 1);

    try {
      // @ts-ignore
      delete result.b;
    } catch (error) {
      assert.equal(error instanceof Error, true);
    }

    assert.equal('b' in result, false);
    assert.equal(subscriber.mock.callCount(), 1);
  });

  test(`delete key with defined value does trigger reactivity - object.keys `, (ctx) => {
    const result = makeObservable({ a: 'somevalue', b: undefined });
    assert.equal('a' in result, true);
    assert.equal('b' in result, true);

    const subscriber = mock.fn();
    autorun(() => {
      subscriber();
      ctx.diagnostic(Object.keys(result).toString());
    });

    assert.equal(subscriber.mock.callCount(), 1);

    delete result.a;

    assert.equal('a' in result, false);
    assert.equal(subscriber.mock.callCount(), 2);
  });

  // This can be implemented,
  // but it seems that apart from increasing the size of the library and memory consumption, nothing will bring.
  test.skip(`delete key with undefined value does not trigger reactivity - reading`, (ctx) => {
    const result = makeObservable({ a: 'somevalue', b: undefined });
    assert.equal('a' in result, true);
    assert.equal('b' in result, true);

    const subscriber = mock.fn();
    autorun(() => {
      subscriber();
      ctx.diagnostic(`${result.b}`);
    });

    assert.equal(subscriber.mock.callCount(), 1);
    delete result.b;
    assert.equal('b' in result, false);
    assert.equal(subscriber.mock.callCount(), 1);
  });

  test(`delete key with undefined value does trigger reactivity - in`, (ctx) => {
    const result = makeObservable({ a: 'somevalue', b: undefined });
    assert.equal('a' in result, true);
    assert.equal('b' in result, true);

    const subscriber = mock.fn();
    autorun(() => {
      subscriber();
      ctx.diagnostic(`${'b' in result}`);
    });
    assert.equal(subscriber.mock.callCount(), 1);

    delete result.b;
    assert.equal('b' in result, false);
    assert.equal(subscriber.mock.callCount(), 2);
  });

  test(`delete key with defined value does trigger reactivity - reading `, (ctx) => {
    const result = makeObservable({ a: 'somevalue', b: undefined });
    assert.equal('a' in result, true);
    assert.equal('b' in result, true);

    const subscriber = mock.fn();
    autorun(() => {
      subscriber();
      ctx.diagnostic(result.a);
    });
    assert.equal(subscriber.mock.callCount(), 1);

    delete result.a;
    assert.equal('a' in result, false);
    assert.equal(subscriber.mock.callCount(), 2);
  });

  test(`deleting: defined object property`, () => {
    const source = { name: 'quack', last: 'murci' };
    const result = makeObservable(source);

    assert.equal(result.name, 'quack');
    assert.equal(result.last, 'murci');

    assert.equal('name' in result, true);
    assert.equal('last' in result, true);

    delete result.name;

    assert.equal('name' in result, false);
    assert.equal('last' in result, true);

    assert.equal(result.name, undefined);
    assert.equal(result.last, 'murci');

    assert.equal('name' in result, false);
    assert.equal('last' in result, true);

    assert.equal(result.name, undefined);
    assert.equal(result.last, 'murci');
  });

  test(`should trigger only once `, (ctx) => {
    const result = makeObservable({ a: 1 });
    assert.equal('a' in result, true);

    const subscriber = mock.fn();
    let tmp;
    autorun(() => {
      subscriber();
      tmp = { ...result };
      ctx.diagnostic(tmp.toString());
    });

    assert.equal(subscriber.mock.callCount(), 1);

    setTimeout(() => {
      result.a = 333;
      result.a = 333;
      Promise.resolve().then(() => {
        assert.equal(subscriber.mock.callCount(), 2);
      });
    }, 200);
  });

  // modified compare to original, cause ks-observable supports Map and Set
  test(`misc objects (should not make observable non supported types)`, () => {
    const sources = [
      new Date(),
      /[a-z]/,
      // document.createElement('div'),
      Symbol(),
    ];
    const result = makeObservable({
      sources: new Array(...sources),
    });
    result.sources.forEach((source, index) => {
      assert.equal(source, sources[index]);
    });
  });

  // not applicable for kr-observable
  // test(`misc objects (nested)`, (ctx) => {
  //   const sources = [
  //     new Date(),
  //     /[a-z]/,
  //     document.createElement('div'),
  //     new Set([1, 2, 3]),
  //     new Map(),
  //     Symbol(),
  //   ];
  //   for (const source of sources) {
  //     try {
  //       const result = makeObservable({ o: source });
  //       if (result.o instanceof Map && supportsMap) {
  //         assert.equal(result.o).not.toBe(source);
  //         assert.equal(isProxy(result.o)).toBe(true);
  //       } else {
  //         assert.equal(result.o).toBe(source);
  //         assert.equal(isProxy(result.o)).toBe(false);
  //       }
  //     } catch (e) {
  //       console.error('misc objects (nested): throws having nested', source);
  //     }
  //   }
  //
  //   const source = {};
  //   const result = makeObservable({ o: source });
  //   assert.equal(result.o).not.toBe(source);
  //   assert.equal(isProxy(result.o)).toBe(true);
  // });

  test(`misc native objects should work`, () => {
    const result = makeObservable({ set: new Set(), map: new Map() });

    assert.equal(result.set instanceof Set, true);
    assert.equal(result.map instanceof Map, true);

    result.set.add(1);
    result.set.delete(2);
    result.set.delete(1);
    result.set.clear();

    result.map.set(1, 1);
    result.map.delete(1);
    result.map.clear();
  });

  test(`misc objects (effect)`, (ctx) => {
    const sources = [new Date(), /[a-z]/];
    for (const source of sources) {
      const result = makeObservable({ o: source });

      assert.equal(result.o, source);

      const subscriber = mock.fn();
      autorun(() => {
        subscriber();
        // @ts-ignore
        ctx.diagnostic(`${result.o.something}`);
      });

      assert.equal(subscriber.mock.callCount(), 1);

      // @ts-ignore
      result.o.something = true;
      // @ts-ignore
      result.o.something = false;
      assert.equal(subscriber.mock.callCount(), 1);

      // @ts-ignore
      delete result.o.something;
      assert.equal(subscriber.mock.callCount(), 1);

      transaction(() => {
        // @ts-ignore
        result.o.something = true;
        // @ts-ignore
        result.o.something = false;
      });
      assert.equal(subscriber.mock.callCount(), 1);

      // again but when reading its defined already
      autorun(() => {
        subscriber();
        // @ts-ignore
        ctx.diagnostic(`${result.o.something}`);
      });

      assert.equal(subscriber.mock.callCount(), 2);

      transaction(() => {
        // @ts-ignore
        result.o.something = true;
        // @ts-ignore
        result.o.something = false;
      });
      assert.equal(subscriber.mock.callCount(), 2);

      // @ts-ignore
      delete result.o.something;
      assert.equal(subscriber.mock.callCount(), 2);

      // @ts-ignore
      result.o.something = true;
      // @ts-ignore
      result.o.something = false;
      assert.equal(subscriber.mock.callCount(), 2);
    }
  });

  test(`in: getters to not be called 1`, () => {
    let access = 0;
    const result = makeObservable({
      a: 1,
      get b() {
        access++;
        return 2;
      },
    });

    assert.equal('a' in result, true);
    assert.equal('b' in result, true);
    assert.equal('c' in result, false);
    assert.equal(access, 0);
  });

  test(`in: getters to not be called 2`, () => {
    let access = 0;
    const result = makeObservable({
      a: 1,
      get b() {
        access++;
        return 2;
      },
    });
    // @ts-ignore
    result.c = 0;

    assert.equal('a' in result, true);
    assert.equal('b' in result, true);
    assert.equal('c' in result, true);
    assert.equal(access, 0);
  });

  test(`in: getters to not be called 3`, () => {
    let access = 0;
    const result = makeObservable({
      a: 1,
      get b() {
        access++;
        return 2;
      },
    });

    try {
      // @ts-ignore
      result.b = 0;
    } catch (error) {
      assert.equal(error instanceof Error, true);
    }

    assert.equal(access, 0);
    assert.equal('a' in result, true);
    assert.equal('b' in result, true);
    assert.equal(access, 0);
  });

  test(`in: getters to not be called 3.1`, () => {
    let access = 0;
    let val = 2;
    const result = makeObservable({
      a: 1,
      get b() {
        access++;
        return val;
      },
      set b(value) {
        val = value;
      },
    });

    assert.equal(access, 0);
    assert.equal('a' in result, true);
    assert.equal('b' in result, true);
    assert.equal(access, 0);

    assert.equal(result.b, 2);
    assert.equal(access, 1);

    result.b = 3;

    assert.equal(result.b, 3);
    assert.equal(access, 2);
  });

  test(`in: getters to not be called 4`, (ctx) => {
    let access = 0;
    const result = makeObservable({
      a: 1,
      get b() {
        access++;
        return 2;
      },
    });

    assert.equal(access, 0);
    assert.equal('a' in result, true);
    assert.equal('b' in result, true);
    assert.equal(access, 0);

    // @ts-ignore
    delete result.b;

    assert.equal('a' in result, true);
    assert.equal('b' in result, false);
    assert.equal(access, 0);

    ctx.diagnostic(`${result.b}`);

    assert.equal('a' in result, true);
    assert.equal('b' in result, false);
    assert.equal(access, 0);

    // @ts-ignore
    result.b = 3;

    assert.equal('a' in result, true);
    assert.equal('b' in result, true);
    assert.equal(result.b, 3);
    assert.equal(access, 0);
  });

  test(`track: value`, (ctx) => {
    const source = { name: 'quack' };
    const result = makeObservable(source);

    const subscriber = mock.fn();
    autorun(() => {
      subscriber();
      ctx.diagnostic(result.name);
    });

    // setting to same value
    transaction(() => (result.name = 'quack'));
    assert.equal(result.name, 'quack');
    assert.equal(subscriber.mock.callCount(), 1);

    // change
    transaction(() => (result.name = 'murci'));
    assert.equal(result.name, 'murci');
    assert.equal(subscriber.mock.callCount(), 2);

    // same value again should not retrigger
    transaction(() => (result.name = 'murci'));
    assert.equal(result.name, 'murci');
    assert.equal(subscriber.mock.callCount(), 2);

    // third
    transaction(() => (result.name = 'mishu'));
    assert.equal(result.name, 'mishu');
    assert.equal(subscriber.mock.callCount(), 3);
  });

  test(`track: value nested`, (ctx) => {
    const source = { data: { name: 'quack' } };
    const result = makeObservable(source);

    const subscriber = mock.fn();
    autorun(() => {
      subscriber();
      ctx.diagnostic(result.data.name);
    });

    // same value again should not retrigger
    transaction(() => (result.data.name = 'quack'));
    assert.equal(result.data.name, 'quack');
    assert.equal(subscriber.mock.callCount(), 1);

    transaction(() => (result.data.name = 'murci'));
    assert.equal(result.data.name, 'murci');
    assert.equal(subscriber.mock.callCount(), 2);

    // same value again should not retrigger
    transaction(() => (result.data.name = 'murci'));
    assert.equal(result.data.name, 'murci');
    assert.equal(subscriber.mock.callCount(), 2);

    // third
    transaction(() => (result.data.name = 'mishu'));
    assert.equal(result.data.name, 'mishu');
    assert.equal(subscriber.mock.callCount(), 3);
  });

  test(`track: undefined value`, (ctx) => {
    const source = {};
    const result = makeObservable(source);

    const subscriber = mock.fn();
    autorun(() => {
      subscriber();
      // @ts-ignore
      ctx.diagnostic(`${result.name}`);
    });
    assert.equal(subscriber.mock.callCount(), 1);

    // @ts-ignore
    transaction(() => (result.name = 'murci'));
    // @ts-ignore
    assert.equal(result.name, 'murci');
    assert.equal(subscriber.mock.callCount(), 2);

    // same value again should not retrigger
    // @ts-ignore
    transaction(() => (result.name = 'murci'));
    // @ts-ignore
    assert.equal(result.name, 'murci');
    assert.equal(subscriber.mock.callCount(), 2);

    // @ts-ignore
    transaction(() => delete result.name);
    assert.equal(subscriber.mock.callCount(), 3);
    assert.equal('name' in result, false);
    assert.equal(subscriber.mock.callCount(), 3);

    // @ts-ignore
    transaction(() => (result.name = 'mishu'));
    assert.equal(subscriber.mock.callCount(), 4);
  });

  test(`track: deleted value`, () => {
    const result = makeObservable({ name: 'hola' });

    const subscriber = mock.fn();
    subscribe(result, subscriber, new Set(['name']));
    assert.equal(subscriber.mock.callCount(), 0);

    transaction(() => (result.name = 'murci'));
    assert.equal(result.name, 'murci');
    assert.equal(subscriber.mock.callCount(), 1);

    transaction(() => delete result.name);
    assert.equal(subscriber.mock.callCount(), 2);
    assert.equal('name' in result, false);
    assert.equal(subscriber.mock.callCount(), 2);

    transaction(() => (result.name = 'mishu'));
    assert.equal(subscriber.mock.callCount(), 3);
  });

  test(`track: undefined value nested`, (ctx) => {
    const result = makeObservable({});

    const subscriber = mock.fn();
    autorun(() => {
      subscriber();
      // @ts-ignore
      ctx.diagnostic(`${result.data}`);
    });

    assert.equal(subscriber.mock.callCount(), 1);

    // @ts-ignore
    transaction(() => (result.data = {}));
    // @ts-ignore
    transaction(() => (result.data.name = 'murci'));
    // @ts-ignore
    transaction(() => (result.data.name = 'murci'));
    assert.equal(subscriber.mock.callCount(), 2);
    // @ts-ignore
    assert.equal(result.data.name, 'murci');
  });

  // not applicable for kr-observable
  // test(`track: state from signal`, (ctx) => {
  //   const [read, write] = signal('init');
  //   const result = makeObservable({ data: '' });
  //
  //   let called = 0;
  //   const execute = memo(() => {
  //     called++;
  //     result.data = read();
  //   });
  //   execute();
  //   assert.equal(called).toBe(1);
  //   assert.equal(result.data).toBe('init');
  //
  //   write('signal');
  //   execute();
  //   assert.equal(called).toBe(2);
  //   assert.equal(result.data).toBe('signal');
  // });

  test(`track \`in\``, (ctx) => {
    let access = 0;
    const result = makeObservable({
      a: 1,
      get b() {
        access++;
        return 2;
      },
    });

    const subscriber = mock.fn();
    autorun(() => {
      ctx.diagnostic(`${'a' in result}, ${'b' in result}`);
      subscriber();
    });

    assert.equal(subscriber.mock.callCount(), 1);

    transaction(() => delete result.a);

    assert.equal(subscriber.mock.callCount(), 2);
    assert.equal('a' in result, false);
    assert.equal(subscriber.mock.callCount(), 2);

    // @ts-ignore
    transaction(() => (result.a = true));
    assert.equal(subscriber.mock.callCount(), 3);

    assert.equal(access, 0);
  });

  // /* classes */

  test(`read and set class`, (ctx) => {
    class D extends Observable {
      f = 1;
      get e() {
        return this.f * 4;
      }
    }

    class A extends Observable {
      a = 1;
      get b() {
        return this.a * 4;
      }
      child = new D();
    }

    const subscriber = mock.fn();
    const childSubscriber = mock.fn();

    const m = new A();

    autorun(() => {
      ctx.diagnostic(m.b.toString());
      subscriber();
    });

    autorun(() => {
      ctx.diagnostic(m.child.f.toString());
      childSubscriber();
    });

    const increment = () => {
      transaction(() => {
        m.a++;
        m.child.f++;
      });
    };

    // initial
    assert.equal(m.b, 4);
    assert.equal(m.child.e, 4);
    assert.equal(subscriber.mock.callCount(), 1);
    assert.equal(childSubscriber.mock.callCount(), 1);

    // incrementing
    increment();
    assert.equal(m.b, 8);
    assert.equal(m.child.e, 8);
    assert.equal(subscriber.mock.callCount(), 2);
    assert.equal(childSubscriber.mock.callCount(), 2);

    increment();
    assert.equal(m.b, 12);
    assert.equal(m.child.e, 12);
    assert.equal(subscriber.mock.callCount(), 3);
    assert.equal(childSubscriber.mock.callCount(), 3);

    increment();
    assert.equal(m.b, 16);
    assert.equal(m.child.e, 16);
    assert.equal(subscriber.mock.callCount(), 4);
    assert.equal(childSubscriber.mock.callCount(), 4);
  });

  test(`read and set outside class`, (ctx) => {
    const m = makeObservable({
      a: 1,
      get b() {
        return this.a * 4;
      },
    });

    const subscriber = mock.fn();
    autorun(() => {
      ctx.diagnostic(`${m.b}`);
      subscriber();
    });

    const increment = () => {
      transaction(() => m.a++);
    };

    // initial
    assert.equal(m.a, 1);
    assert.equal(m.b, 4);
    assert.equal(subscriber.mock.callCount(), 1);

    // incrementing
    increment();
    assert.equal(m.a, 2);
    assert.equal(m.b, 8);
    assert.equal(subscriber.mock.callCount(), 2);

    increment();
    assert.equal(m.a, 3);
    assert.equal(m.b, 12);
    assert.equal(subscriber.mock.callCount(), 3);
  });

  test(`read and set inside class`, (ctx) => {
    class Test extends Observable {
      a = 1;
      get b() {
        return this.a * 4;
      }

      increment() {
        this.a++;
      }
    }

    const m = new Test();

    const subscriber = mock.fn();
    autorun(() => {
      ctx.diagnostic(`${m.b}`);
      subscriber();
    });

    assert.equal(subscriber.mock.callCount(), 1);

    // initial
    assert.equal(m.a, 1);
    assert.equal(m.b, 4);

    // incrementing
    m.increment();
    assert.equal(subscriber.mock.callCount(), 2);
    assert.equal(m.a, 2);
    assert.equal(m.b, 8);

    m.increment();
    assert.equal(m.a, 3);
    assert.equal(m.b, 12);
    assert.equal(subscriber.mock.callCount(), 3);
  });

  test(`read and set inside extended class`, (ctx) => {
    class Tests2 extends Observable {
      get b() {
        // @ts-ignore
        return this.a * 4;
      }
      get logA() {
        // @ts-ignore
        return this.a;
      }
    }
    class Test extends Tests2 {
      a = 1;
      increment() {
        this.a++;
      }
    }

    const m = new Test();

    const subscriber = mock.fn();
    autorun(() => {
      ctx.diagnostic(`${m.b}`);
      subscriber();
    });

    // initial
    assert.equal(m.a, 1);
    assert.equal(m.logA, 1);
    assert.equal(m.b, 4);
    assert.equal(subscriber.mock.callCount(), 1);

    // incrementing
    m.increment();
    assert.equal(m.a, 2);
    assert.equal(m.b, 8);
    assert.equal(subscriber.mock.callCount(), 2);

    m.increment();
    assert.equal(m.a, 3);
    assert.equal(m.b, 12);
    assert.equal(subscriber.mock.callCount(), 3);
  });

  test(`read and set inside extended x2 class`, (ctx) => {
    class Test4 extends Observable {
      get b() {
        // @ts-ignore
        return this.a * 4;
      }
      get logA() {
        // @ts-ignore
        return this.a;
      }
    }
    class Test3 extends Test4 {}
    class Tests2 extends Test3 {
      a = 1;
    }
    class Test extends Tests2 {
      increment() {
        this.a++;
      }
    }

    const m = new Test();

    const subscriber = mock.fn();
    autorun(() => {
      ctx.diagnostic(`${m.b}`);
      subscriber();
    });

    // initial
    assert.equal(m.a, 1);
    assert.equal(m.logA, 1);
    assert.equal(m.b, 4);
    assert.equal(subscriber.mock.callCount(), 1);

    // incrementing
    m.increment();
    assert.equal(m.a, 2);
    assert.equal(m.b, 8);
    assert.equal(subscriber.mock.callCount(), 2);

    m.increment();
    assert.equal(m.a, 3);
    assert.equal(m.b, 12);
    assert.equal(subscriber.mock.callCount(), 3);
  });

  // test(`hasOwnProperty shoulnt throw`, (ctx) => {
  //   let m = makeObservable({ a: { deep: 'test' } });
  //   m.hasOwnProperty('a');
  //   m.a.hasOwnProperty('deep');
  //
  //   m = makeObservable(Object.create(null));
  //   m.a = { deep: 'test' };
  //   // m.hasOwnProperty('a')
  //   m.a.hasOwnProperty('deep');
  // });
  //
  // test(`reacts to hasOwnProperty [solid, oby]`, (ctx) => {
  //   const m = makeObservable({ a: { deep: 'test' }, c: {} });
  //
  //   let has;
  //
  //   let calls1 = 0;
  //   const execute1 = memo(() => {
  //     calls1++;
  //     has = m.hasOwnProperty('b');
  //   });
  //
  //   let calls2 = 0;
  //   const execute2 = memo(() => {
  //     calls2++;
  //     has = m.a.hasOwnProperty('b');
  //   });
  //
  //   let calls3 = 0;
  //   const execute3 = memo(() => {
  //     calls3++;
  //     has = Object.hasOwn(m, 'z');
  //   });
  //
  //   execute1(), execute2(), execute3();
  //   assert.equal(calls1).toBe(1);
  //   assert.equal(calls2).toBe(1);
  //   assert.equal(calls3).toBe(1);
  //   assert.equal(has).toBe(false);
  //
  //   m.b = 1;
  //
  //   execute1(), execute2(), execute3();
  //   assert.equal(calls1).toBe(2);
  //   assert.equal(calls2).toBe(1);
  //   assert.equal(calls3).toBe(1);
  //   assert.equal(has).toBe(true);
  //   has = false;
  //   assert.equal(has).toBe(false);
  //
  //   m.a.b = 1;
  //
  //   execute1(), execute2(), execute3();
  //   assert.equal(calls1).toBe(2);
  //   assert.equal(calls2).toBe(2);
  //   assert.equal(calls3).toBe(1);
  //   assert.equal(has).toBe(true);
  //   has = false;
  //   assert.equal(has).toBe(false);
  //
  //   m.z = 1;
  //
  //   execute1(), execute2(), execute3();
  //   assert.equal(calls1).toBe(2);
  //   assert.equal(calls2).toBe(2);
  //   assert.equal(calls3).toBe(2);
  //   assert.equal(has).toBe(true);
  // });
  //
  // // oby test suite
  //
  // test(`is both a getter and a setter, for shallow primitive properties`, (ctx) => {
  //   const o = makeObservable({ value: undefined });
  //   assert.equal(o.value).toBe(undefined);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.value = v;
  //     },
  //     () => o.value
  //   );
  // });
  //
  // test(`Object.create(null)`, (ctx) => {
  //   const o = makeObservable(Object.create(null));
  //   assert.equal(o.value).toBe(undefined);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.value = v;
  //     },
  //     () => o.value
  //   );
  // });
  //
  // test(`Object.create(null) nested`, (ctx) => {
  //   const o = makeObservable({ value: Object.create(null) });
  //   assert.equal(o.value).not.toBe(undefined);
  //   assert.equal(o.value.deep).toBe(undefined);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.value.deep = v;
  //     },
  //     () => o.value.deep
  //   );
  // });
  //
  // test(`${
  //   lib
  // }deeper: is both a getter and a setter, for shallow primitive properties`, (ctx) => {
  //   const o = makeObservable({ value: { deeper: undefined } });
  //   assert.equal(o.value.deeper).toBe(undefined);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.value.deeper = v;
  //     },
  //     () => o.value.deeper
  //   );
  // });
  //
  // test(`is both a getter and a setter, for shallow non-primitive properties`, (ctx) => {
  //   const obj1 = { foo: 123 };
  //   const obj2 = {};
  //
  //   const o = makeObservable({ value: obj1 });
  //   assert.equal(o.value).toEqual(obj1);
  //
  //   o.value = obj2;
  //   assert.equal(o.value).toEqual(obj2);
  //
  //   o.value = obj1;
  //   assert.equal(o.value).toEqual(obj1);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.value = v;
  //     },
  //     () => o.value
  //   );
  // });
  //
  // test(`is both a getter and a setter, for deep primitive properties`, (ctx) => {
  //   const o = makeObservable({ deep: { value: undefined } });
  //   assert.equal(o.deep.value).toBe(undefined);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.deep.value = v;
  //     },
  //     () => o.deep.value
  //   );
  // });
  //
  // test(`is both a getter and a setter, for deep non-primitive properties`, (ctx) => {
  //   const obj1 = { foo: 123 };
  //   const obj2 = {};
  //
  //   const o = makeObservable({ deep: { value: obj1 } });
  //   assert.equal(o.deep.value).toEqual(obj1);
  //
  //   o.deep.value = obj2;
  //   assert.equal(o.deep.value).toEqual(obj2);
  //
  //   o.deep.value = obj1;
  //   assert.equal(o.deep.value).toEqual(obj1);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.deep.value = v;
  //     },
  //     () => o.deep.value
  //   );
  // });
  //
  // test(`is both a getter and a setter, for deep non-primitive properties`, (ctx) => {
  //   const obj1 = { foo: 123 };
  //   const obj2 = {};
  //
  //   const o = makeObservable({ deep: { value: obj1 } });
  //   assert.equal(o.deep.value).toEqual(obj1);
  //
  //   let calls = 0;
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.deep.value;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.deep.value = obj2;
  //   execute();
  //   assert.equal(o.deep.value).toEqual(obj2);
  //   assert.equal(calls).toBe(2);
  //
  //   o.deep.value = obj1;
  //   execute();
  //   assert.equal(o.deep.value).toEqual(obj1);
  //   assert.equal(calls).toBe(3);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.deep.value = v;
  //     },
  //     () => o.deep.value
  //   );
  // });
  //
  // test(`creates a dependency in a memo when getting a shallow property`, (ctx) => {
  //   const o = makeObservable({ value: 1 });
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.value = v;
  //     },
  //     () => o.value
  //   );
  // });
  //
  // test(`creates a dependency in a memo when getting a deep property`, (ctx) => {
  //   const o = makeObservable({ deep: { value: 1 } });
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.deep.value = v;
  //     },
  //     () => o.deep.value
  //   );
  // });
  //
  // test(`${
  //   lib
  // }creates a single dependency in an memo even if getting a shallow property multiple times`, (ctx) => {
  //   const o = makeObservable({ value: 1 });
  //
  //   let calls = 0;
  //
  //   const value = memo(() => {
  //     calls += 1;
  //     o.value;
  //     o.value;
  //     o.value;
  //     return o.value;
  //   });
  //
  //   assert.equal(value()).toBe(1);
  //   assert.equal(calls).toBe(1);
  //
  //   o.value = 2;
  //
  //   assert.equal(value()).toBe(2);
  //   assert.equal(calls).toBe(2);
  //
  //   o.value = 3;
  //
  //   assert.equal(value()).toBe(3);
  //   assert.equal(calls).toBe(3);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.value = v;
  //     },
  //     () => o.value
  //   );
  // });
  //
  // test(`${
  //   lib
  // }creates a single dependency even if getting a shallow property multiple times`, (ctx) => {
  //   const o = makeObservable({ value: 1 });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.value;
  //     o.value;
  //     o.value;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.value = 2;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //
  //   o.value = 3;
  //   execute();
  //   assert.equal(calls).toBe(3);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.value = v;
  //     },
  //     () => o.value
  //   );
  // });
  //
  // test(`${
  //   lib
  // }creates a single dependency in a memo even if getting a deep property multiple times`, (ctx) => {
  //   const o = makeObservable({ deep: { value: 1 } });
  //
  //   let calls = 0;
  //
  //   const value = memo(() => {
  //     calls += 1;
  //     o.deep.value;
  //     o.deep.value;
  //     o.deep.value;
  //     return o.deep.value;
  //   });
  //
  //   assert.equal(value()).toBe(1);
  //   assert.equal(calls).toBe(1);
  //
  //   o.deep.value = 2;
  //
  //   assert.equal(value()).toBe(2);
  //   assert.equal(calls).toBe(2);
  //
  //   o.deep.value = 3;
  //
  //   assert.equal(value()).toBe(3);
  //   assert.equal(calls).toBe(3);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.deep.value = v;
  //     },
  //     () => o.deep.value
  //   );
  // });
  //
  // test(`${
  //   lib
  // }creates a single dependency in an effect even if getting a deep property multiple times`, (ctx) => {
  //   const o = makeObservable({ deep: { value: 1 } });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.deep.value;
  //     o.deep.value;
  //     o.deep.value;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.deep.value = 2;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //
  //   o.deep.value = 3;
  //   execute();
  //   assert.equal(calls).toBe(3);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.deep.value = v;
  //     },
  //     () => o.deep.value
  //   );
  // });
  //
  // test(`does not create a dependency in a memo when creating`, (ctx) => {
  //   let o;
  //   let calls = 0;
  //
  //   const value = memo(() => {
  //     calls += 1;
  //     o = makeObservable({ value: 1 });
  //   });
  //
  //   assert.equal(value()).toBe(undefined);
  //   assert.equal(calls).toBe(1);
  //
  //   o.value = 2;
  //
  //   assert.equal(value()).toBe(undefined);
  //   assert.equal(calls).toBe(1);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.value = v;
  //     },
  //     () => o.value
  //   );
  //
  //   assert.equal(calls).toBe(1);
  // });
  //
  // test(`does not create a dependency in an effect when creating`, (ctx) => {
  //   let o;
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o = makeObservable({ value: 1 });
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.value = 2;
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.value = v;
  //     },
  //     () => o.value
  //   );
  //
  //   assert.equal(calls).toBe(1);
  // });
  //
  // test(`does not create a dependency in a memo when setting a shallow property`, (ctx) => {
  //   const o = makeObservable({ value: 0 });
  //   let calls = 0;
  //
  //   const value = memo(() => {
  //     calls += 1;
  //     o.value = 1;
  //   });
  //
  //   assert.equal(value()).toBe(undefined);
  //   assert.equal(calls).toBe(1);
  //
  //   o.value = 2;
  //
  //   assert.equal(value()).toBe(undefined);
  //   assert.equal(calls).toBe(1);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.value = v;
  //     },
  //     () => o.value
  //   );
  // });
  //
  // test(`${
  //   lib
  // }does not create a dependency in an effect when setting a shallow property`, (ctx) => {
  //   const o = makeObservable({ value: 0 });
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.value = 1;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.value = 2;
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.value = v;
  //     },
  //     () => o.value
  //   );
  // });
  //
  // test(`${
  //   lib
  // }does not create a dependency in a memo when getting a parent property of the one being updated`, (ctx) => {
  //   const o = makeObservable({ deep: { value: 1 } });
  //
  //   let calls = 0;
  //
  //   const value = memo(() => {
  //     calls += 1;
  //     o.deep;
  //   });
  //
  //   assert.equal(value()).toBe(undefined);
  //   assert.equal(calls).toBe(1);
  //
  //   o.deep.value = 2;
  //
  //   assert.equal(value()).toBe(undefined);
  //   assert.equal(calls).toBe(1);
  //
  //   o.deep.value = 3;
  //
  //   assert.equal(value()).toBe(undefined);
  //   assert.equal(calls).toBe(1);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.deep.value = v;
  //     },
  //     () => o.deep.value
  //   );
  // });
  //
  // test(`${
  //   lib
  // }does not create a dependency in an effect when getting a parent property of the one being updated`, (ctx) => {
  //   const o = makeObservable({ deep: { value: 1 } });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.deep;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.deep.value = 2;
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.deep.value = 3;
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.deep = v;
  //     },
  //     () => o.deep
  //   );
  // });
  //
  // test(`${
  //   lib
  // }does create a dependency (on the parent) in a memo when setting a deep property`, (ctx) => {
  //   // FIXME: This can't quite be fixed, it's a quirk of how makeObservable stores work
  //
  //   const o = makeObservable({ deep: { value: 1 } });
  //
  //   let calls = 0;
  //
  //   const value = memo(() => {
  //     calls += 1;
  //     o.deep.value = 2;
  //   });
  //
  //   assert.equal(value()).toBe(undefined);
  //   assert.equal(calls).toBe(1);
  //
  //   o.deep.value = 3;
  //   assert.equal(value()).toBe(undefined);
  //   assert.equal(calls).toBe(1);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.deep.value = v;
  //     },
  //     () => o.deep.value
  //   );
  //
  //   o.deep = {};
  //   assert.equal(value()).toBe(undefined);
  //   assert.equal(calls).toBe(2);
  // });
  //
  // test(`${
  //   lib
  // }does create a dependency (on the parent) in an effect when setting a deep property`, (ctx) => {
  //   // FIXME: This can't quite be fixed, it's a quirk of how makeObservable stores work
  //
  //   const o = makeObservable({ deep: { value: 1 } });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.deep.value = 2;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.deep.value = 3;
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.deep.value = v;
  //     },
  //     () => o.deep.value
  //   );
  //
  //   o.deep = {};
  //   execute();
  //   assert.equal(calls).toBe(2);
  // });
  //
  // test(`returns primitive values as is`, (ctx) => {
  //   // solid doesnt wrap non-objects
  //   if (lib !== 'solid: ') {
  //     let o = makeObservable(123);
  //     assert.equal(o).toBe(123);
  //
  //     o = makeObservable(321);
  //     assert.equal(o).toBe(321);
  //
  //     o = makeObservable(undefined);
  //     assert.equal(o).toBe(undefined);
  //
  //     o = makeObservable(null);
  //     assert.equal(o).toBe(null);
  //
  //     o = makeObservable('');
  //     assert.equal(o).toBe('');
  //
  //     o = makeObservable('string');
  //     assert.equal(o).toBe('string');
  //
  //     o = makeObservable(true);
  //     assert.equal(o).toBe(true);
  //
  //     o = makeObservable(false);
  //     assert.equal(o).toBe(false);
  //
  //     o = makeObservable(Infinity);
  //     assert.equal(o).toBe(Infinity);
  //   }
  //
  //   let o = makeObservable([true]);
  //   assert.equal(o).toEqual([true]);
  //
  //   o = makeObservable({ 0: true });
  //   assert.equal(o).toEqual({ 0: true });
  //
  //   o = makeObservable([true]);
  //   assert.equal(o).toEqual([true]);
  //
  //   o = makeObservable({ 0: true });
  //   assert.equal(o).toEqual({ 0: true });
  // });
  //
  // test(`${
  //   lib
  // }returns unproxied "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "toSource", "toString", "valueOf", properties [solid]`, (ctx) => {
  //   const o = makeObservable({});
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.hasOwnProperty;
  //     o.isPrototypeOf;
  //     o.propertyIsEnumerable;
  //     o.toLocaleString;
  //     o.toSource;
  //     o.toString;
  //     o.valueOf;
  //   });
  //   execute();
  //
  //   assert.equal(calls).toBe(1);
  //
  //   o.hasOwnProperty = 1;
  //   o.isPrototypeOf = 1;
  //   o.propertyIsEnumerable = 1;
  //   o.toLocaleString = 1;
  //   o.toSource = 1;
  //   o.toString = 1;
  //   o.valueOf = 1;
  //   execute();
  //
  //   if (lib === 'oby: ') {
  //     assert.equal(calls).toBe(1);
  //   } else {
  //     assert.equal(calls).toBe(2);
  //   }
  // });
  //
  // test(`returns the value being set`, (ctx) => {
  //   const o = makeObservable({ value: undefined });
  //
  //   assert.equal((o.value = 123)).toBe(123);
  //   assert.equal((o.value = undefined)).toBe(undefined);
  //   assert.equal((o.value = null)).toBe(null);
  //   assert.equal((o.value = '')).toBe('');
  //   assert.equal((o.value = 'string')).toBe('string');
  //   assert.equal((o.value = [true])).toEqual([true]);
  //   assert.equal((o.value = { 0: true })).toEqual({ 0: true });
  //   assert.equal((o.value = true)).toBe(true);
  //   assert.equal((o.value = false)).toBe(false);
  //   assert.equal((o.value = Infinity)).toBe(Infinity);
  //   assert.equal((o.value = 0)).toBe(0);
  //   assert.equal(Object.is((o.value = NaN), NaN)).toBe(true);
  //   assert.equal((o.value = 1)).toBe(1);
  // });
  //
  // test(`supports setting functions`, (ctx) => {
  //   const fn = () => {};
  //   const o = makeObservable({ value: () => {} });
  //
  //   o.value = fn;
  //   // pota will return wrapped functions
  //   if (lib === 'pota: ') {
  //     assert.equal(typeof o.value).toBe('function');
  //   } else {
  //     assert.equal(o.value).toBe(fn);
  //   }
  // });
  //
  // test(`supports wrapping a plain object`, (ctx) => {
  //   const o = makeObservable({});
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.value;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.value = 2;
  //   execute();
  //   assert.equal(calls).toBe(2);
  // });
  //
  // test(`supports wrapping a deep plain object inside a plain object`, (ctx) => {
  //   const o = makeObservable({ value: {} });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.value.lala;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.value.lala = 3;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //   assert.equal(o.value.lala).toBe(3);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.value.lala = v;
  //     },
  //     () => o.value.lala
  //   );
  // });
  //
  // test(`supports reacting to deleting a shallow property`, (ctx) => {
  //   const o = makeObservable({ value: 123 });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.value;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   delete o.value;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //   assert.equal('value' in o).toBe(false);
  //   assert.equal(calls).toBe(2);
  //
  //   o.value = undefined;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //
  //   o.value = true;
  //   execute();
  //   assert.equal(calls).toBe(3);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.value = v;
  //     },
  //     () => o.value
  //   );
  // });
  //
  // test(`${
  //   lib
  // }supports not reacting when deleting a shallow property that was undefined [solid]`, (ctx) => {
  //   const o = makeObservable({ value: undefined });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.value;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   delete o.value;
  //   execute();
  //   assert.equal(calls).toBe(1);
  //   assert.equal('value' in o).toBe(false);
  //   assert.equal(calls).toBe(1);
  //
  //   o.value = undefined;
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.value = true;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.value = v;
  //     },
  //     () => o.value
  //   );
  // });
  // test(`supports reacting when deleting a shallow property that was null`, (ctx) => {
  //   const o = makeObservable({ value: null });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.value;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   delete o.value;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //
  //   assert.equal('value' in o).toBe(false);
  //   assert.equal(calls).toBe(2);
  //
  //   o.value = undefined;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //
  //   o.value = true;
  //   execute();
  //   assert.equal(calls).toBe(3);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.value = v;
  //     },
  //     () => o.value
  //   );
  // });
  //
  // test(`supports reacting to deleting a deep property`, (ctx) => {
  //   const o = makeObservable({ deep: { value: 123 } });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.deep.value;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   delete o.deep.value;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //
  //   assert.equal('value' in o.deep).toBe(false);
  //   assert.equal(calls).toBe(2);
  //
  //   o.deep.value = undefined;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //
  //   o.deep.value = true;
  //   execute();
  //   assert.equal(calls).toBe(3);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.deep.value = v;
  //     },
  //     () => o.deep.value
  //   );
  // });
  //
  // test(`${
  //   lib
  // }supports not reacting when deleting a deep property that was undefined [solid]`, (ctx) => {
  //   const o = makeObservable({ deep: { value: undefined } });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.deep.value;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   delete o.deep.value;
  //   execute();
  //   assert.equal(calls).toBe(1);
  //   assert.equal('value' in o.deep).toBe(false);
  //   assert.equal(calls).toBe(1);
  //
  //   o.deep.value = undefined;
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.deep.value = true;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.deep.value = v;
  //     },
  //     () => o.deep.value
  //   );
  // });
  //
  // test(`supports not reacting when setting a primitive property to itself`, (ctx) => {
  //   const o = makeObservable({ value: 1 });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.value;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.value = 1;
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.value = v;
  //     },
  //     () => o.value
  //   );
  // });
  //
  // test(`supports not reacting when setting a non-primitive property to itself`, (ctx) => {
  //   const o = makeObservable({ deep: { value: 2 } });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.deep.value;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.deep = o.deep;
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.deep.value = v;
  //     },
  //     () => o.deep.value
  //   );
  // });
  //
  // test(`${
  //   lib
  // }supports not reacting when setting a non-primitive property to itself, when reading all values - object `, (ctx) => {
  //   const o = makeObservable({ value: {} });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.value;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.value = o.value;
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.value = v;
  //     },
  //     () => o.value
  //   );
  // });
  //
  // test(`${
  //   lib
  // }supports not reacting when reading the length on a non-array, when reading all values, if the length does not actually change`, (ctx) => {
  //   // TODO
  //
  //   const o = makeObservable({ length: 0 });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.length;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.length = o.length;
  //   execute();
  //   assert.equal(calls).toBe(1);
  // });
  //
  // test(`supports reacting to own keys`, (ctx) => {
  //   const o = makeObservable({ foo: 1, bar: 2, baz: 3 });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     Object.keys(o);
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.qux = 4;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //
  //   o.foo = 2; // already in
  //   o.bar = 3; // already in
  //   o.baz = 4; // already in
  //   o.qux = 5; // already in
  //   execute();
  //   assert.equal(calls).toBe(2);
  //
  //   o.qux = 5;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //
  //   o.qux = 6;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //
  //   o.qux2 = 7;
  //   execute();
  //   assert.equal(calls).toBe(3);
  //
  //   delete o.foo;
  //   execute();
  //   assert.equal(calls).toBe(4);
  //   assert.equal('foo' in o).toBe(false);
  //   assert.equal(calls).toBe(4);
  //
  //   o.foo = undefined;
  //   execute();
  //   assert.equal(calls).toBe(5);
  //   assert.equal(o.foo).toBe(undefined);
  //   assert.equal('foo' in o).toBe(true);
  //
  //   o.foo = true;
  //   execute();
  //   assert.equal(calls).toBe(5);
  //   assert.equal(o.foo).toBe(true);
  //   assert.equal('foo' in o).toBe(true);
  // });
  //
  // test(`supports reacting to own keys deep [solid]`, (ctx) => {
  //   const o = makeObservable({ value: { foo: 1, bar: 2, baz: 3 } });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     Object.keys(o.value);
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.value.qux = 4;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //
  //   o.value.foo = 2;
  //   o.value.bar = 3;
  //   o.value.baz = 4;
  //   o.value.qux = 5;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //
  //   o.value.qux = 5;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //
  //   o.value.qux2 = 5;
  //   execute();
  //   assert.equal(calls).toBe(3);
  //
  //   delete o.value.foo;
  //   execute();
  //   assert.equal(calls).toBe(4);
  //   assert.equal('foo' in o.value).toBe(false);
  //   assert.equal(calls).toBe(4);
  //
  //   o.value.foo = undefined;
  //   execute();
  //   assert.equal(calls).toBe(5);
  //   assert.equal(o.value.foo).toBe(undefined);
  //   assert.equal('foo' in o.value).toBe(true);
  //
  //   o.value.foo = true;
  //   execute();
  //   assert.equal(calls).toBe(5);
  //   assert.equal(o.value.foo).toBe(true);
  //   assert.equal('foo' in o.value).toBe(true);
  // });
  //
  // test(`supports reacting to properties read by a getter`, (ctx) => {
  //   const o = makeObservable({
  //     foo: 1,
  //     bar: 2,
  //     get fn() {
  //       return this.foo + this.bar;
  //     },
  //   });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.fn;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.foo = 10;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //   assert.equal(o.fn).toBe(12);
  //
  //   o.bar = 20;
  //   execute();
  //   assert.equal(calls).toBe(3);
  //   assert.equal(o.fn).toBe(30);
  // });
  //
  // test(`supports reacting to properties read by a regular function`, (ctx) => {
  //   const o = makeObservable({
  //     foo: 1,
  //     bar: 2,
  //     fn() {
  //       return this.foo + this.bar;
  //     },
  //   });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.fn();
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.foo = 10;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //   assert.equal(o.fn()).toBe(12);
  //
  //   o.bar = 20;
  //   execute();
  //   assert.equal(calls).toBe(3);
  //   assert.equal(o.fn()).toBe(30);
  // });
  //
  // test(`${
  //   lib
  // }supports reacting to properties read by a regular function, called via the call method`, (ctx) => {
  //   const o = makeObservable({
  //     foo: 1,
  //     bar: 2,
  //     fn() {
  //       return this.foo + this.bar;
  //     },
  //   });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.fn.call(o);
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.foo = 10;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //   assert.equal(o.fn.call(o)).toBe(12);
  //
  //   o.bar = 20;
  //   execute();
  //   assert.equal(calls).toBe(3);
  //   assert.equal(o.fn.call(o)).toBe(30);
  // });
  //
  // test(`${
  //   lib
  // }supports reacting to properties read by a regular function, called via the apply method`, (ctx) => {
  //   const o = makeObservable({
  //     foo: 1,
  //     bar: 2,
  //     fn() {
  //       return this.foo + this.bar;
  //     },
  //   });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.fn.apply(o);
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.foo = 10;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //   assert.equal(o.fn.apply(o)).toBe(12);
  //
  //   o.bar = 20;
  //   execute();
  //   assert.equal(calls).toBe(3);
  //   assert.equal(o.fn.apply(o)).toBe(30);
  // });
  //
  // test(`supports batching implicitly - unsupported`, (ctx) => {
  //   batch(() => {
  //     const o = makeObservable({ foo: 1, bar: 2 });
  //
  //     let calls = 0;
  //
  //     const execute = memo(() => {
  //       calls += 1;
  //       o.foo;
  //       o.bar;
  //     });
  //     execute();
  //     assert.equal(calls).toBe(1);
  //
  //     o.foo = 10;
  //     o.bar = 20;
  //     execute();
  //     assert.equal(calls).toBe(2);
  //
  //     assert.equal(o.foo).toBe(10);
  //     assert.equal(o.bar).toBe(20);
  //   });
  // });
  //
  // test(`supports batching setters automatically`, (ctx) => {
  //   const o = makeObservable({
  //     foo: 1,
  //     bar: 2,
  //     set fn(increment) {
  //       this.foo += increment;
  //       this.bar += increment;
  //     },
  //   });
  //
  //   let calls = 0;
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.foo;
  //     o.bar;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.fn = 1;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //
  //   assert.equal(o.foo).toBe(2);
  //   assert.equal(o.bar).toBe(3);
  // });
  //
  // test(`supports batching deletions automatically Object.keys`, (ctx) => {
  //   const o = makeObservable({ foo: 1, bar: 2 });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.foo;
  //     if ('foo' in o) {
  //     }
  //     Object.keys(o);
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   delete o.foo;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //   assert.equal('foo' in o).toBe(false);
  //   assert.equal(calls).toBe(2);
  //
  //   assert.equal('foo' in o).toBe(false);
  //   assert.equal(calls).toBe(2);
  // });
  //
  // test(`supports batching deletions automatically no Object.keys`, (ctx) => {
  //   const o = makeObservable({ foo: 1, bar: 2 });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.foo;
  //     if ('foo' in o) {
  //     }
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   delete o.foo;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //   assert.equal('foo' in o).toBe(false);
  //   assert.equal(calls).toBe(2);
  //
  //   assert.equal('foo' in o).toBe(false);
  //   assert.equal(calls).toBe(2);
  // });
  //
  // test(`supports batching additions automatically Object.keys`, (ctx) => {
  //   const o = makeObservable({ bar: 2 });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.foo;
  //     if ('foo' in o) {
  //     }
  //     Object.keys(o);
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.foo = 1;
  //   execute();
  //   assert.equal(calls).toBe(2);
  // });
  //
  // test(`supports batching additions automatically no Object.keys`, (ctx) => {
  //   const o = makeObservable({ bar: 2 });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.foo;
  //     if ('foo' in o) {
  //     }
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.foo = 1;
  //   execute();
  //   assert.equal(calls).toBe(2);
  // });
  //
  // test(`supports batching additions automatically no Object.keys, no reading`, (ctx) => {
  //   const o = makeObservable({ bar: 2 });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     if ('foo' in o) {
  //     }
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.foo = 1;
  //   execute();
  //   assert.equal(calls).toBe(2);
  // });
  //
  // test(`supports batching additions automatically new property `, (ctx) => {
  //   const o = makeObservable({ bar: 2 });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.foo;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.foo = 1;
  //   execute();
  //   assert.equal(calls).toBe(2);
  // });
  //
  // test(`supports reacting to changes on custom classes`, (ctx) => {
  //   class Foo {
  //     constructor() {
  //       this.foo = 0;
  //       return makeObservable(this);
  //     }
  //   }
  //
  //   class Bar extends Foo {
  //     constructor() {
  //       super();
  //       this.bar = 0;
  //       return makeObservable(this);
  //     }
  //   }
  //
  //   const foo = new Foo();
  //   const bar = new Bar();
  //
  //   let calls = '';
  //
  //   const execute1 = memo(() => {
  //     foo.foo;
  //     calls += 'f';
  //   });
  //   execute1();
  //
  //   const execute2 = memo(() => {
  //     bar.bar;
  //     calls += 'b';
  //   });
  //   execute1(), execute2();
  //
  //   assert.equal(calls).toBe('fb');
  //
  //   foo.foo += 1;
  //   execute1(), execute2();
  //   assert.equal(calls).toBe('fbf');
  //
  //   bar.bar += 1;
  //   execute1(), execute2();
  //   assert.equal(calls).toBe('fbfb');
  // });
  //
  // test(`${
  //   lib
  // }supports reacting to property checks when value is undefined, deleting [solid]`, (ctx) => {
  //   const o = makeObservable({ value: undefined });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     if ('value' in o) {
  //     }
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   delete o.value;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //   assert.equal('value' in o).toBe(false);
  //   assert.equal(calls).toBe(2);
  //
  //   delete o.value;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //   assert.equal('value' in o).toBe(false);
  //   assert.equal(calls).toBe(2);
  // });
  //
  // test(`${
  //   lib
  // }supports reacting to property checks when value is undefined, deleting deep [solid]`, (ctx) => {
  //   const o = makeObservable({ value: { deep: undefined } });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     if ('deep' in o.value) {
  //     }
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   delete o.value.deep;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //   assert.equal('deep' in o.value).toBe(false);
  //   assert.equal(calls).toBe(2);
  //
  //   delete o.value.deep;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //   assert.equal('deep' in o.value).toBe(false);
  //   assert.equal(calls).toBe(2);
  // });
  //
  // test(`supports reacting to property checks, adding [solid]`, (ctx) => {
  //   const o = makeObservable({});
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     if ('value' in o) {
  //     }
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.value = undefined;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //
  //   o.value = undefined;
  //   execute();
  //   assert.equal(calls).toBe(2);
  // });
  //
  // test(`supports reacting to property checks, adding deep [solid]`, (ctx) => {
  //   const o = makeObservable({ value: Object.create(null) });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     if ('deep' in o.value) {
  //     }
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.value.deep = undefined;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //
  //   o.value.deep = undefined;
  //   execute();
  //   assert.equal(calls).toBe(2);
  // });
  //
  // test(`survives reading a value inside a discarded root`, (ctx) => {
  //   const o = makeObservable({ value: 123 });
  //
  //   let calls = 0;
  //
  //   root((dispose) => {
  //     o.value;
  //
  //     root(() => {
  //       o.value;
  //     });
  //
  //     dispose();
  //   });
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //
  //     o.value;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.value = 321;
  //   execute();
  //   assert.equal(calls).toBe(2);
  // });
  //
  // test(`does nothing for primitives`, (ctx) => {
  //   const o = makeObservable({ foo: 123 });
  //   assert.equal(o.foo).toBe(123);
  //
  //   o.foo = 321;
  //   assert.equal(o.foo).toBe(321);
  //
  //   o.foo = undefined;
  //   assert.equal(o.foo).toBe(undefined);
  //
  //   o.foo = null;
  //   assert.equal(o.foo).toBe(null);
  //
  //   o.foo = 0;
  //   assert.equal(o.foo).toBe(0);
  //
  //   o.foo = '';
  //   assert.equal(o.foo).toBe('');
  //
  //   o.foo = 'string';
  //   assert.equal(o.foo).toBe('string');
  //
  //   o.foo = [true];
  //   assert.equal(o.foo).toEqual([true]);
  //
  //   o.foo = { 0: true };
  //   assert.equal(o.foo).toEqual({ 0: true });
  //
  //   o.foo = [true];
  //   assert.equal(o.foo).toEqual([true]);
  //
  //   o.foo = true;
  //   assert.equal(o.foo).toBe(true);
  //
  //   o.foo = false;
  //   assert.equal(o.foo).toBe(false);
  //
  //   o.foo = Infinity;
  //   assert.equal(o.foo).toBe(Infinity);
  //
  //   o.foo = Infinity;
  //   assert.equal(o.foo).toBe(Infinity);
  //
  //   o.foo = NaN;
  //   assert.equal(Object.is(o.foo, NaN)).toBe(true);
  //
  //   o.foo = 1;
  //   assert.equal(o.foo).toBe(1);
  // });
  //
  // test(`can mutate object returned by getter [oby]`, (ctx) => {
  //   const result = makeObservable({
  //     get greeting() {
  //       return { greet: { deep: `hi, quack` } };
  //     },
  //     set greeting(val) {},
  //   });
  //   assert.equal(result.greeting.greet.deep).toBe('hi, quack');
  //
  //   result.greeting.greet.deep = undefined;
  //   assert.equal(result.greeting.greet.deep).toBe('hi, quack');
  //
  //   const tmp1 = result.greeting;
  //   assert.equal(tmp1.greet.deep).toBe('hi, quack');
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       tmp1.greet.deep = v;
  //     },
  //     () => tmp1.greet.deep
  //   );
  //
  //   const tmp2 = result.greeting.greet;
  //   assert.equal(tmp2.deep).toBe('hi, quack');
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       tmp2.deep = v;
  //     },
  //     () => tmp2.deep
  //   );
  // });
  //
  // // vue
  //
  // test(`object.keys`, (ctx) => {
  //   const original = { foo: 1 };
  //   const result = makeObservable(original);
  //   assert.equal(result.foo).toBe(1);
  //   assert.equal(result).not.toBe(original);
  //
  //   assert.equal('foo' in result).toBe(true);
  //
  //   assert.equal(Object.keys(result)).toEqual(['foo']);
  // });
  //
  // test(`observed value should proxy mutations to original (Object)`, (ctx) => {
  //   const original = { foo: 1 };
  //   const observed = makeObservable(original);
  //   // set
  //   observed.bar = 1;
  //   assert.equal(observed.bar).toBe(1);
  //   assert.equal(original.bar).toBe(1);
  //
  //   // delete
  //   delete observed.foo;
  //   assert.equal('foo' in observed).toBe(false);
  //   assert.equal('foo' in original).toBe(false);
  // });
  //
  // test(`original value change should reflect in observed value (Object)`, (ctx) => {
  //   // same as before test but the value set is on original rather than observed
  //   const original = { foo: 1 };
  //   const observed = makeObservable(original);
  //
  //   // set
  //   original.bar = 1;
  //   assert.equal(original.bar).toBe(1);
  //   assert.equal(observed.bar).toBe(1);
  //
  //   // delete
  //   delete original.foo;
  //   assert.equal('foo' in original).toBe(false);
  //   assert.equal('foo' in observed).toBe(false);
  // });
  //
  // test(`setting a property with an unobserved value should wrap with reactive`, (ctx) => {
  //   const observed = makeObservable({});
  //   const raw = {};
  //   observed.foo = raw;
  //   assert.equal(observed.foo).not.toBe(raw);
  //
  //   let calls = 0;
  //   const execute = memo(() => {
  //     calls++;
  //     observed.foo;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   observed.foo = false;
  //   execute();
  //   assert.equal(calls).toBe(2);
  // });
  //
  // test(`observing already observed value should return same Proxy`, (ctx) => {
  //   const original = { foo: 1 };
  //   const observed = makeObservable(original);
  //   const observed2 = makeObservable(observed);
  //   assert.equal(observed2).toBe(observed);
  // });
  //
  // test(`observing the same value multiple times should return same Proxy`, (ctx) => {
  //   const original = { foo: 1 };
  //   const observed = makeObservable(original);
  //   const observed2 = makeObservable(original);
  //   assert.equal(observed).toBe(observed2);
  // });
  //
  // // #1246
  // test(`mutation on objects using reactive as prototype should trigger`, (ctx) => {
  //   const observed = makeObservable({ foo: 1 });
  //   const original = Object.create(observed);
  //   let dummy;
  //   const execute = memo(() => (dummy = original.foo));
  //   execute();
  //   assert.equal(dummy).toBe(1);
  //
  //   observed.foo = 2;
  //   execute();
  //   assert.equal(dummy).toBe(2);
  //   assert.equal(observed.foo).toBe(2);
  //   assert.equal(original.foo).toBe(2);
  //
  //   original.foo = 3;
  //   execute();
  //   assert.equal(dummy).toBe(3);
  //   assert.equal(observed.foo).toBe(3);
  //   assert.equal(original.foo).toBe(3);
  //
  //   original.foo = 4;
  //   execute();
  //   assert.equal(dummy).toBe(4);
  //   assert.equal(observed.foo).toBe(4);
  //   assert.equal(original.foo).toBe(4);
  // });
  //
  // test(`should not observe non-extensible objects [solid]`, (ctx) => {
  //   let makeObservableObj;
  //   let testObj;
  //
  //   function createObjects() {
  //     makeObservableObj = makeObservable({
  //       foo: Object.preventExtensions({ a: 1 }),
  //       bar: Object.freeze({ a: 1 }),
  //       baz: Object.seal({ a: 1 }),
  //     });
  //
  //     testObj = {
  //       foo: Object.preventExtensions({ a: 1 }),
  //       bar: Object.freeze({ a: 1 }),
  //       baz: Object.seal({ a: 1 }),
  //     };
  //   }
  //
  //   createObjects();
  //
  //   assert.equal(makeObservableObj.foo).toEqual({ a: 1 });
  //   assert.equal(makeObservableObj.bar).toEqual({ a: 1 });
  //   assert.equal(makeObservableObj.baz).toEqual({ a: 1 });
  //
  //   assert.equal(Object.isExtensible(makeObservableObj.foo.a)).toBe(false);
  //   assert.equal(Object.isExtensible(makeObservableObj.bar.a)).toBe(false);
  //   assert.equal(Object.isExtensible(makeObservableObj.baz.a)).toBe(false);
  //   assert.equal(Object.isFrozen(makeObservableObj.bar.a)).toBe(true);
  //   assert.equal(Object.isSealed(makeObservableObj.bar.a)).toBe(true);
  //
  //   // if js engine fails, then makeObservable should fail too
  //   function testAgainstJSEngine(key) {
  //     // change value
  //     createObjects();
  //     try {
  //       testObj[key].a = 2;
  //       try {
  //         makeObservableObj[key].a = 2;
  //       } catch (e) {
  //         console.error("shouldn't have failed to mutate value of", key);
  //       }
  //       // check the value actually changed [engine]
  //       assert.equal(testObj[key].a).toBe(2);
  //       // check the value actually changed
  //       assert.equal(makeObservableObj[key].a).toBe(2);
  //     } catch (e) {
  //       let fail = false;
  //       try {
  //         makeObservableObj[key].a = 2;
  //         fail = true;
  //       } catch (e) {}
  //       if (fail) {
  //         console.error("shouldn't have mutated value of", key);
  //       }
  //     }
  //     assert.equal(makeObservableObj[key].a).toBe(testObj[key].a);
  //     assert.equal('a' in makeObservableObj[key]).toBe('a' in testObj[key]);
  //
  //     // delete value
  //     createObjects();
  //     try {
  //       delete testObj[key].a;
  //       try {
  //         delete makeObservableObj[key].a;
  //       } catch (e) {
  //         console.error("shouldn't have deleted property of", key);
  //       }
  //       // check the value actually changed [engine]
  //       assert.equal('a' in testObj[key]).toBe(false);
  //       // check the value actually changed
  //       assert.equal('a' in makeObservableObj[key]).toBe(false);
  //     } catch (e) {
  //       let fail = false;
  //       try {
  //         delete makeObservableObj[key].a;
  //         fail = true;
  //       } catch (e) {}
  //       if (fail) {
  //         console.error("shouldn't have deleted property of", key);
  //       }
  //     }
  //     assert.equal(makeObservableObj[key].a).toBe(testObj[key].a);
  //     assert.equal('a' in makeObservableObj[key]).toBe('a' in testObj[key]);
  //
  //     // defineProperty
  //     createObjects();
  //     try {
  //       Object.defineProperty(testObj[key], 'ohai', { value: 17 });
  //       try {
  //         Object.defineProperty(makeObservableObj[key], 'ohai', {
  //           value: 17,
  //         });
  //       } catch (e) {
  //         console.error("shouldn't have mutated", key);
  //       }
  //     } catch (e) {
  //       let fail = false;
  //       try {
  //         Object.defineProperty(makeObservableObj[key], 'ohai', {
  //           value: 17,
  //         });
  //         fail = true;
  //       } catch (e) {}
  //       if (fail) {
  //         console.error("shouldn't have mutated", key);
  //       }
  //     }
  //     assert.equal(makeObservableObj[key].ohai).toBe(testObj[key].ohai);
  //     assert.equal('ohai' in makeObservableObj[key]).toBe('ohai' in testObj[key]);
  //
  //     // setPrototypeOf
  //     createObjects();
  //     try {
  //       Object.setPrototypeOf(testObj[key], { x: 17 });
  //       try {
  //         Object.setPrototypeOf(makeObservableObj[key], { x: 17 });
  //       } catch (e) {
  //         console.error("shouldn't have changed prototype of", key);
  //       }
  //     } catch (e) {
  //       let fail = false;
  //       try {
  //         Object.setPrototypeOf(makeObservableObj[key], { x: 17 });
  //         fail = true;
  //       } catch (e) {}
  //       if (fail) {
  //         console.error("shouldn't have changed prototype of", key);
  //       }
  //     }
  //
  //     // __proto__
  //     createObjects();
  //     try {
  //       testObj[key].__proto__ = { x: 17 };
  //       try {
  //         makeObservableObj[key].__proto__ = { x: 17 };
  //       } catch (e) {
  //         console.error("shouldn't have changed prototype of", key);
  //       }
  //     } catch (e) {
  //       let fail = false;
  //       try {
  //         makeObservableObj[key].__proto__ = { x: 17 };
  //         fail = true;
  //       } catch (e) {}
  //       if (fail) {
  //         console.error("shouldn't have changed prototype of", key);
  //       }
  //     }
  //   }
  //
  //   testAgainstJSEngine('foo');
  //   testAgainstJSEngine('bar');
  //   testAgainstJSEngine('baz');
  // });
  //
  // test(`makeObservable identity`, (ctx) => {
  //   const raw = {};
  //   const obj1 = makeObservable(raw);
  //   const obj2 = makeObservable(raw);
  //   const obj3 = makeObservable(obj1);
  //   const obj4 = makeObservable(obj2);
  //
  //   assert.equal(obj1 === obj2 && obj2 === obj3 && obj3 === obj4).toBe(true);
  // });
  //
  // test(`makeObservable identity nested`, (ctx) => {
  //   const raw = {};
  //   const obj1 = makeObservable({ value: raw });
  //   const obj2 = makeObservable({ value: raw });
  //   const obj3 = makeObservable({ value: obj1 });
  //   const obj4 = makeObservable({ value: obj2 });
  //
  //   assert.equal(obj1.value === obj2.value).toBe(true);
  //   assert.equal(obj2.value === obj3.value.value).toBe(true);
  //   assert.equal(obj3.value === obj1).toBe(true);
  //   assert.equal(obj3.value.value === obj4.value.value).toBe(true);
  // });
  //
  // test(`should observe basic properties`, (ctx) => {
  //   let dummy;
  //   const counter = makeObservable({ num: 0 });
  //
  //   let calls = 0;
  //   const execute = memo(() => {
  //     calls += 1;
  //     dummy = counter.num;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //   assert.equal(dummy).toBe(0);
  //
  //   counter.num = 7;
  //   execute();
  //   assert.equal(dummy).toBe(7);
  //   assert.equal(calls).toBe(2);
  // });
  //
  // test(`should observe multiple properties`, (ctx) => {
  //   batch(() => {
  //     let dummy;
  //     const counter = makeObservable({ num1: 0, num2: 0 });
  //     let calls = 0;
  //     const execute = memo(() => {
  //       calls += 1;
  //       dummy = counter.num1 + counter.num1 + counter.num2;
  //     });
  //     execute();
  //     assert.equal(calls).toBe(1);
  //     assert.equal(dummy).toBe(0);
  //
  //     counter.num1 = counter.num2 = 7;
  //     execute();
  //     assert.equal(dummy).toBe(21);
  //     // fabio implementation of memo is clever
  //     assert.equal(calls).toBe(2);
  //   });
  // });
  //
  // test(`should handle multiple effects`, (ctx) => {
  //   let dummy1;
  //   let dummy2;
  //   const counter = makeObservable({ num: 0 });
  //   const execute1 = memo(() => (dummy1 = counter.num));
  //   const execute2 = memo(() => (dummy2 = counter.num));
  //   execute1(), execute2();
  //
  //   assert.equal(dummy1).toBe(0);
  //   assert.equal(dummy2).toBe(0);
  //   counter.num++;
  //   execute1(), execute2();
  //   assert.equal(dummy1).toBe(1);
  //   assert.equal(dummy2).toBe(1);
  // });
  //
  // test(`should observe nested properties`, (ctx) => {
  //   let dummy;
  //   const counter = makeObservable({ nested: { num: 0 } });
  //   const execute = memo(() => (dummy = counter.nested.num));
  //   execute();
  //
  //   assert.equal(dummy).toBe(0);
  //
  //   counter.nested.num = 8;
  //   execute();
  //   assert.equal(dummy).toBe(8);
  // });
  //
  // test(`should observe delete operations`, (ctx) => {
  //   let dummy;
  //   const obj = makeObservable({ prop: 'value' });
  //   const execute = memo(() => (dummy = obj.prop));
  //   execute();
  //
  //   assert.equal(dummy).toBe('value');
  //
  //   delete obj.prop;
  //   execute();
  //   assert.equal(dummy).toBe(undefined);
  // });
  //
  // test(`should observe has operations`, (ctx) => {
  //   let dummy;
  //   const obj = makeObservable({ prop: 'value' });
  //   const execute = memo(() => (dummy = 'prop' in obj));
  //   execute();
  //
  //   assert.equal(dummy).toBe(true);
  //
  //   delete obj.prop;
  //   execute();
  //   assert.equal(dummy).toBe(false);
  //   obj.prop = 12;
  //   execute();
  //   assert.equal(dummy).toBe(true);
  // });
  //
  // test(`should observe properties on the prototype chain [solid]`, (ctx) => {
  //   let dummy;
  //   const counter = makeObservable({ num: 0 });
  //   const parentCounter = makeObservable({ num: 2 });
  //   Object.setPrototypeOf(counter, parentCounter);
  //   const execute = memo(() => (dummy = counter.num));
  //   execute();
  //
  //   assert.equal(dummy).toBe(0);
  //
  //   delete counter.num;
  //   execute();
  //   assert.equal(dummy).toBe(2);
  //
  //   parentCounter.num = 4;
  //   execute();
  //   assert.equal(dummy).toBe(4);
  //
  //   counter.num = 3;
  //   execute();
  //   assert.equal(dummy).toBe(3);
  // });
  //
  // test(`should observe has operations on the prototype chain`, (ctx) => {
  //   let dummy;
  //   const counter = makeObservable({ num: 0 });
  //   const parentCounter = makeObservable({ num: 2 });
  //   Object.setPrototypeOf(counter, parentCounter);
  //   const execute = memo(() => (dummy = 'num' in counter));
  //   execute();
  //
  //   assert.equal(dummy).toBe(true);
  //
  //   delete counter.num;
  //   execute();
  //   assert.equal(dummy).toBe(true);
  //
  //   delete parentCounter.num;
  //   execute();
  //   assert.equal(dummy).toBe(false);
  //
  //   counter.num = 3;
  //   execute();
  //   assert.equal(dummy).toBe(true);
  // });
  //
  // test(`prototype change [oby]`, (ctx) => {
  //   let dummy;
  //   let parentDummy;
  //   let hiddenValue;
  //   const obj = makeObservable({});
  //   const parent = makeObservable({
  //     set prop(value) {
  //       hiddenValue = value;
  //     },
  //     get prop() {
  //       return hiddenValue;
  //     },
  //   });
  //   Object.setPrototypeOf(obj, parent);
  //   const execute1 = memo(() => (dummy = obj.prop));
  //   const execute2 = memo(() => (parentDummy = parent.prop));
  //   execute1(), execute2();
  //
  //   assert.equal(dummy).toBe(undefined);
  //   assert.equal(parentDummy).toBe(undefined);
  //
  //   obj.prop = 4;
  //   execute1(), execute2();
  //   assert.equal(obj.prop).toBe(4);
  //   assert.equal(dummy).toBe(4);
  //
  //   parent.prop = 2;
  //   execute1(), execute2();
  //   assert.equal(obj.prop).toBe(2);
  //   assert.equal(dummy).toBe(2);
  //   assert.equal(parentDummy).toBe(2);
  //   assert.equal(parent.prop).toBe(2);
  // });
  //
  // test(`should observe function call chains`, (ctx) => {
  //   let dummy;
  //   const counter = makeObservable({ num: 0 });
  //   const execute = memo(() => (dummy = getNum()));
  //   execute();
  //
  //   function getNum() {
  //     return counter.num;
  //   }
  //
  //   assert.equal(dummy).toBe(0);
  //
  //   counter.num = 2;
  //   execute();
  //   assert.equal(dummy).toBe(2);
  // });
  //
  // test(`should observe iteration`, (ctx) => {
  //   let dummy;
  //   const list = makeObservable({ value: 'Hello' });
  //   const execute = memo(() => (dummy = list.value));
  //   execute();
  //
  //   assert.equal(dummy).toBe('Hello');
  //
  //   list.value += ' World!';
  //   execute();
  //   assert.equal(dummy).toBe('Hello World!');
  //
  //   list.value = list.value.replace('Hello ', '');
  //   execute();
  //   assert.equal(dummy).toBe('World!');
  // });
  //
  // test(`should observe enumeration`, (ctx) => {
  //   const numbers = makeObservable({ num1: 3 });
  //
  //   let sum = 0;
  //   const execute = memo(() => {
  //     sum = 0;
  //     for (const key in numbers) {
  //       sum += numbers[key];
  //     }
  //   });
  //   execute();
  //
  //   assert.equal(sum).toBe(3);
  //
  //   numbers.num2 = 4;
  //   execute();
  //   assert.equal(sum).toBe(7);
  //
  //   delete numbers.num1;
  //   execute();
  //   assert.equal(sum).toBe(4);
  // });
  //
  // test(`should observe symbol keyed properties`, (ctx) => {
  //   const key = Symbol('symbol keyed prop');
  //
  //   let dummy;
  //   let hasDummy;
  //
  //   const obj = makeObservable({ [key]: 'value' });
  //
  //   let calls1 = 0;
  //   const execute1 = memo(() => {
  //     calls1++;
  //     dummy = obj[key];
  //   });
  //   execute1();
  //
  //   let calls2 = 0;
  //   const execute2 = memo(() => {
  //     calls2++;
  //     hasDummy = key in obj;
  //   });
  //   execute1(), execute2();
  //
  //   assert.equal(calls1).toBe(1);
  //   assert.equal(calls2).toBe(1);
  //
  //   assert.equal(dummy).toBe('value');
  //   assert.equal(hasDummy).toBe(true);
  //
  //   assert.equal(calls1).toBe(1);
  //   assert.equal(calls2).toBe(1);
  //
  //   obj[key] = 'newValue';
  //   execute1(), execute2();
  //
  //   assert.equal(calls1).toBe(2);
  //   assert.equal(calls2).toBe(1);
  //
  //   assert.equal(dummy).toBe('newValue');
  //   assert.equal(hasDummy).toBe(true);
  //
  //   assert.equal(calls1).toBe(2);
  //   assert.equal(calls2).toBe(1);
  //
  //   delete obj[key];
  //   execute1(), execute2();
  //
  //   assert.equal(calls1).toBe(3);
  //   assert.equal(calls2).toBe(2);
  //
  //   assert.equal(dummy).toBe(undefined);
  //   assert.equal(hasDummy).toBe(false);
  // });
  //
  // test(`should observe function valued properties`, (ctx) => {
  //   const oldFunc = () => {};
  //   const newFunc = () => {};
  //
  //   let dummy;
  //   const obj = makeObservable({ func: oldFunc });
  //   const execute = memo(() => (dummy = obj.func));
  //   execute();
  //   if (lib === 'pota: ') {
  //     assert.equal(typeof dummy).toBe('function');
  //     obj.func = newFunc;
  //     execute();
  //     assert.equal(typeof obj.func).toBe('function');
  //   } else {
  //     assert.equal(dummy).toBe(oldFunc);
  //     obj.func = newFunc;
  //     execute();
  //     assert.equal(dummy).toBe(newFunc);
  //   }
  // });
  //
  // test(`should observe getters relying on this`, (ctx) => {
  //   const obj = makeObservable({
  //     a: 1,
  //     get b() {
  //       return this.a;
  //     },
  //   });
  //
  //   let dummy;
  //   const execute = memo(() => {
  //     dummy = obj.b;
  //   });
  //   execute();
  //   assert.equal(dummy).toBe(1);
  //
  //   obj.a++;
  //   execute();
  //   assert.equal(dummy).toBe(2);
  // });
  //
  // test(`should observe methods relying on this`, (ctx) => {
  //   const obj = makeObservable({
  //     a: 1,
  //     b() {
  //       return this.a;
  //     },
  //   });
  //
  //   let dummy;
  //   const execute = memo(() => {
  //     dummy = obj.b();
  //   });
  //   execute();
  //   assert.equal(dummy).toBe(1);
  //
  //   obj.a++;
  //   execute();
  //   assert.equal(dummy).toBe(2);
  // });
  //
  // test(`should not observe set operations without a value change`, (ctx) => {
  //   let hasDummy;
  //   let getDummy;
  //   const obj = makeObservable({ prop: 'value' });
  //
  //   let calls1 = 0;
  //   let calls2 = 0;
  //   const execute1 = memo(() => {
  //     calls1++;
  //     getDummy = obj.prop;
  //   });
  //   execute1();
  //   const execute2 = memo(() => {
  //     calls2++;
  //     hasDummy = 'prop' in obj;
  //   });
  //   execute2();
  //   assert.equal(calls1).toBe(1);
  //   assert.equal(calls2).toBe(1);
  //
  //   assert.equal(getDummy).toBe('value');
  //   assert.equal(hasDummy).toBe(true);
  //
  //   obj.prop = 'value';
  //   execute1(), execute2();
  //
  //   assert.equal(calls1).toBe(1);
  //   assert.equal(calls2).toBe(1);
  //   assert.equal(getDummy).toBe('value');
  //   assert.equal(hasDummy).toBe(true);
  // });
  //
  // test(`should cut the loop`, (ctx) => {
  //   const counter = makeObservable({ num: 0 });
  //   const execute = memo(() => {
  //     if (counter.num < 10) {
  //       counter.num++;
  //     }
  //   });
  //   execute();
  //   assert.equal(counter.num).toBe(10);
  // });
  //
  // test(`${
  //   lib
  // }should not be triggered by mutating a property, which is used in an inactive branch`, (ctx) => {
  //   let dummy;
  //   const obj = makeObservable({ prop: 'value', run: true });
  //
  //   let calls = 0;
  //   const execute = memo(() => {
  //     calls++;
  //     dummy = obj.run ? obj.prop : 'other';
  //   });
  //   execute();
  //
  //   assert.equal(dummy).toBe('value');
  //   assert.equal(calls).toBe(1);
  //
  //   obj.run = false;
  //   execute();
  //   assert.equal(dummy).toBe('other');
  //   assert.equal(calls).toBe(2);
  //
  //   obj.prop = 'value2';
  //   execute();
  //   assert.equal(dummy).toBe('other');
  //   assert.equal(calls).toBe(2);
  // });
  //
  // test(`should not run multiple times for a single mutation`, (ctx) => {
  //   let dummy;
  //   const obj = makeObservable({});
  //   let calls = 0;
  //   const execute = memo(() => {
  //     calls++;
  //     for (const key in obj) {
  //       dummy = obj[key];
  //     }
  //     dummy = obj.prop;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   obj.prop = 16;
  //   execute();
  //
  //   assert.equal(dummy).toBe(16);
  //   assert.equal(calls).toBe(2);
  // });
  //
  // test(`should observe json methods`, (ctx) => {
  //   let dummy = {};
  //   const obj = makeObservable({});
  //   const execute = memo(() => {
  //     dummy = JSON.parse(JSON.stringify(obj));
  //   });
  //   execute();
  //
  //   obj.a = 1;
  //   execute();
  //   assert.equal(dummy.a).toBe(1);
  // });
  //
  // test(`should observe class method invocations`, (ctx) => {
  //   class Model {
  //     count;
  //     constructor() {
  //       this.count = 0;
  //     }
  //     inc() {
  //       this.count++;
  //     }
  //   }
  //   const model = makeObservable(new Model());
  //   let dummy;
  //   const execute = memo(() => {
  //     dummy = model.count;
  //   });
  //   execute();
  //   assert.equal(dummy).toBe(0);
  //
  //   model.inc();
  //   execute();
  //   assert.equal(dummy).toBe(1);
  // });
  //
  // test(`${
  //   lib
  // }should not be triggered when the value and the old value both are NaN [solid]`, (ctx) => {
  //   const obj = makeObservable({
  //     foo: NaN,
  //   });
  //   let calls = 0;
  //   const execute = memo(() => {
  //     calls++;
  //     obj.foo;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   obj.foo = NaN;
  //   execute();
  //   assert.equal(calls).toBe(1);
  // });
  //
  // test(`should not be triggered when set with the same proxy [oby]`, (ctx) => {
  //   const obj = makeObservable({ foo: 1 });
  //   const observed = makeObservable({ obj });
  //
  //   let calls = 0;
  //   const execute = memo(() => {
  //     calls++;
  //     observed.obj;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   observed.obj = obj;
  //   execute();
  //   assert.equal(calls).toBe(1);
  // });
  //
  // test(`should return updated value`, (ctx) => {
  //   const value = makeObservable({});
  //   const cValue = memo(() => value.foo);
  //   assert.equal(cValue()).toBe(undefined);
  //   value.foo = 1;
  //   assert.equal(cValue()).toBe(1);
  // });
  //
  // test(`should trigger effect`, (ctx) => {
  //   const value = makeObservable({});
  //   const cValue = memo(() => value.foo);
  //   let dummy;
  //   const execute = memo(() => {
  //     dummy = cValue();
  //   });
  //   execute();
  //
  //   assert.equal(dummy).toBe(undefined);
  //
  //   value.foo = 1;
  //   execute();
  //   assert.equal(dummy).toBe(1);
  // });
  //
  // test(`should work when chained`, (ctx) => {
  //   const value = makeObservable({ foo: 0 });
  //   const c1 = memo(() => value.foo);
  //   const c2 = memo(() => c1() + 1);
  //   assert.equal(c2()).toBe(1);
  //   assert.equal(c1()).toBe(0);
  //   value.foo++;
  //   assert.equal(c2()).toBe(2);
  //   assert.equal(c1()).toBe(1);
  // });
  //
  // test(`should trigger effect when chained`, (ctx) => {
  //   const value = makeObservable({ foo: 0 });
  //
  //   let calls1 = 0;
  //   let calls2 = 0;
  //
  //   const c1 = memo(() => {
  //     calls1++;
  //     return value.foo;
  //   });
  //   const c2 = memo(() => {
  //     calls2++;
  //     return c1() + 1;
  //   });
  //
  //   let dummy;
  //   const execute = memo(() => {
  //     dummy = c2();
  //   });
  //   execute();
  //
  //   assert.equal(dummy).toBe(1);
  //   assert.equal(calls1).toBe(1);
  //   assert.equal(calls2).toBe(1);
  //
  //   value.foo++;
  //   execute();
  //   assert.equal(dummy).toBe(2);
  //   // should not result in duplicate calls
  //   assert.equal(calls1).toBe(2);
  //   assert.equal(calls2).toBe(2);
  // });
  //
  // test(`should trigger effect when chained (mixed invocations)`, (ctx) => {
  //   const value = makeObservable({ foo: 0 });
  //
  //   let calls1 = 0;
  //   let calls2 = 0;
  //
  //   const c1 = memo(() => {
  //     calls1++;
  //     return value.foo;
  //   });
  //   const c2 = memo(() => {
  //     calls2++;
  //     return c1() + 1;
  //   });
  //
  //   let dummy;
  //   const execute = memo(() => {
  //     dummy = c1() + c2();
  //   });
  //   execute();
  //   assert.equal(dummy).toBe(1);
  //
  //   assert.equal(calls1).toBe(1);
  //   assert.equal(calls2).toBe(1);
  //
  //   value.foo++;
  //   execute();
  //
  //   assert.equal(dummy).toBe(3);
  //   // should not result in duplicate calls
  //   assert.equal(calls1).toBe(2);
  //   assert.equal(calls2).toBe(2);
  // });
  //
  // test(`should avoid infinite loops with other effects`, (ctx) => {
  //   batch(() => {
  //     const nums = makeObservable({ num1: 0, num2: 1 });
  //
  //     let calls1 = 0;
  //     let calls2 = 0;
  //
  //     const execute1 = memo(() => {
  //       calls1++;
  //       nums.num1 = nums.num2;
  //     });
  //     execute1();
  //     assert.equal(nums.num1).toBe(1);
  //     assert.equal(nums.num2).toBe(1);
  //
  //     const execute2 = memo(() => {
  //       calls2++;
  //       nums.num2 = nums.num1;
  //     });
  //     execute1(), execute2();
  //
  //     assert.equal(nums.num1).toBe(1);
  //     assert.equal(nums.num2).toBe(1);
  //     assert.equal(calls1).toBe(1);
  //     assert.equal(calls2).toBe(1);
  //
  //     nums.num2 = 4;
  //     execute1(), execute2();
  //
  //     assert.equal(nums.num1).toBe(4);
  //     assert.equal(nums.num2).toBe(4);
  //     assert.equal(calls1).toBe(2);
  //     assert.equal(calls2).toBe(2);
  //
  //     nums.num1 = 10;
  //     execute1(), execute2();
  //
  //     assert.equal(nums.num1).toBe(10);
  //     assert.equal(nums.num2).toBe(10);
  //     // this is just implementation specific, but shouldnt run more than 3 times
  //     assert.equal(calls1).toBe(2);
  //     assert.equal(calls2).toBe(3);
  //   });
  // });
  //
  // // #1246
  // test(`mutation on objects using makeObservable as prototype should trigger`, (ctx) => {
  //   const original = makeObservable({ foo: 1 });
  //
  //   const user = Object.create(original);
  //
  //   let dummy;
  //   const execute = memo(() => (dummy = user.foo));
  //   execute();
  //   assert.equal(dummy).toBe(1);
  //
  //   original.foo = 2;
  //   execute();
  //   assert.equal(dummy).toBe(2);
  //
  //   user.foo = 3;
  //   execute();
  //   assert.equal(dummy).toBe(3);
  //
  //   user.foo = 4;
  //   execute();
  //   assert.equal(dummy).toBe(4);
  // });
  //
  // /** ARRAY */
  //
  // test(`array: value: array property`, (ctx) => {
  //   const source = [{ cat: 'quack' }];
  //   const obj = makeObservable(source);
  //
  //   assert.equal(source[0].cat).toBe('quack');
  //   assert.equal(obj[0].cat).toBe('quack');
  // });
  //
  // test(`array: functions`, (ctx) => {
  //   const list = makeObservable([0, 1, 2]);
  //   const filtered = memo(() => list.filter((i) => i % 2));
  //   assert.equal(filtered()).toEqual([1]);
  // });
  //
  // test(`array: functions nested`, (ctx) => {
  //   const list = makeObservable({ data: [0, 1, 2] });
  //   const filtered = memo(() => list.data.filter((i) => i % 2));
  //   assert.equal(filtered()).toEqual([1]);
  // });
  //
  // test(`array: equality: different array`, (ctx) => {
  //   const source = [];
  //   const result = makeObservable(source);
  //   assert.equal(result).not.toBe(source);
  //   assert.equal(isProxy(result)).toBe(true);
  // });
  //
  // test(`array: equality: different array nested`, (ctx) => {
  //   const source = [];
  //   const result = makeObservable({ source });
  //   assert.equal(result.source).not.toBe(source);
  // });
  //
  // test(`array: equality: isArray`, (ctx) => {
  //   const source = [];
  //   const result = makeObservable(source);
  //   assert.equal(Array.isArray(result)).toBe(true);
  //   assert.equal(isProxy(result)).toBe(true);
  // });
  //
  // test(`array: equality: isArray nested`, (ctx) => {
  //   const source = { data: [] };
  //   const result = makeObservable(source);
  //   assert.equal(Array.isArray(result.data)).toBe(true);
  //   assert.equal(isProxy(result.data)).toBe(true);
  // });
  //
  // test(`array: mutation: array property`, (ctx) => {
  //   const source = [{ cat: 'quack' }];
  //   const result = makeObservable(source);
  //
  //   assert.equal(source[0].cat).toBe('quack');
  //   assert.equal(result[0].cat).toBe('quack');
  //
  //   result[0].cat = 'murci';
  //   assert.equal(source[0].cat).toBe('murci');
  //   assert.equal(result[0].cat).toBe('murci');
  // });
  //
  // test(`array: mutation: array todos`, (ctx) => {
  //   const todos = makeObservable([
  //     { id: 1, title: 'quack', done: true },
  //     { id: 2, title: 'murci', done: false },
  //   ]);
  //
  //   assert.equal(todos[1].done).toBe(false);
  //   todos[1].done = Infinity;
  //   assert.equal(todos[1].done).toBe(Infinity);
  //
  //   assert.equal(todos.length).toBe(2);
  //   todos.push({ id: 3, title: 'mishu', done: false });
  //   assert.equal(todos.length).toBe(3);
  //
  //   assert.equal(todos[1].done).toBe(Infinity);
  //   assert.equal(Array.isArray(todos)).toBe(true);
  //   assert.equal(todos[0].title).toBe('quack');
  //   assert.equal(todos[1].title).toBe('murci');
  //   assert.equal(todos[2].title).toBe('mishu');
  // });
  //
  // test(`array: mutation: array batch`, (ctx) => {
  //   const result = makeObservable([1, 2, 3]);
  //   batch(() => {
  //     assert.equal(result.length).toBe(3);
  //     const move = result.splice(1, 1);
  //     assert.equal(result.length).toBe(2);
  //     result.splice(0, 0, ...move);
  //     assert.equal(result.length).toBe(3);
  //     assert.equal(result).toEqual([2, 1, 3]);
  //     result.push(4);
  //     assert.equal(result.length).toBe(4);
  //     assert.equal(result).toEqual([2, 1, 3, 4]);
  //   });
  //   assert.equal(result.length).toBe(4);
  //   assert.equal(result.pop()).toBe(4);
  //   assert.equal(result.length).toBe(3);
  //   assert.equal(result).toEqual([2, 1, 3]);
  // });
  //
  // test(`array: getters: array`, (ctx) => {
  //   const result = makeObservable([
  //     {
  //       cat: 'quack',
  //       get greeting() {
  //         return `hi, ${this.cat}`;
  //       },
  //     },
  //   ]);
  //   assert.equal(result[0].greeting).toBe('hi, quack');
  //
  //   result[0].cat = 'mishu';
  //   assert.equal(result[0].greeting).toBe('hi, mishu');
  // });
  //
  // test(`array: getter/setters: class in array`, (ctx) => {
  //   class Cat {
  //     #name = 'quack';
  //     get name() {
  //       return this.#name;
  //     }
  //     set name(value) {
  //       this.#name = value;
  //     }
  //     get greeting() {
  //       return `hi, ${this.#name}`;
  //     }
  //   }
  //   const result = makeObservable([new Cat()]);
  //   assert.equal(result[0].greeting).toBe('hi, quack');
  //
  //   result[0].name = 'mishu';
  //   assert.equal(result[0].greeting).toBe('hi, mishu');
  // });
  //
  // test(`array: supports wrapping a deep array inside a plain object`, (ctx) => {
  //   const o = makeObservable({ value: [] });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.value[0];
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.value[0] = 3;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //   assert.equal(o.value[0]).toBe(3);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.value[0] = v;
  //     },
  //     () => o.value[0]
  //   );
  // });
  //
  // test(`array: supports wrapping an array`, (ctx) => {
  //   const o = makeObservable([]);
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o[0];
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o[0] = 3;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //   assert.equal(o[0]).toBe(3);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o[0] = v;
  //     },
  //     () => o[0]
  //   );
  // });
  //
  // test(`array: supports wrapping a deep array inside an array`, (ctx) => {
  //   const o = makeObservable([[]]);
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o[0][0];
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o[0][0] = 3;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //   assert.equal(o[0][0]).toBe(3);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o[0][0] = v;
  //     },
  //     () => o[0][0]
  //   );
  // });
  //
  // test(`array: supports wrapping a deep plain object inside an array`, (ctx) => {
  //   const o = makeObservable([{}]);
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o[0].lala;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o[0].lala = 3;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //   assert.equal(o[0].lala).toBe(3);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o[0].lala = v;
  //     },
  //     () => o[0].lala
  //   );
  // });
  //
  // test(`${
  //   lib
  // }array: supports not reacting when reading the length on a array, when reading all values, if the length does not actually change`, (ctx) => {
  //   const o = makeObservable({ value: [0] });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.value.length;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //   assert.equal(o.value.length).toBe(1);
  //
  //   o.value.splice(0, 1, 1);
  //   execute();
  //   assert.equal(calls).toBe(1);
  // });
  //
  // test(`array: should make Array reactive`, (ctx) => {
  //   const original = [{ foo: 1 }];
  //   const observed = makeObservable(original);
  //   assert.equal(observed).not.toBe(original);
  //
  //   // get
  //   assert.equal(observed[0].foo).toBe(1);
  //
  //   let calls = 0;
  //   const execute = memo(() => {
  //     calls++;
  //     observed[0].foo;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   assert.equal(observed[0].foo).toBe(1);
  //
  //   observed[0].foo = 2;
  //   execute();
  //   assert.equal(observed[0].foo).toBe(2);
  //   assert.equal(calls).toBe(2);
  //
  //   // has
  //   assert.equal(0 in observed).toBe(true);
  //   // ownKeys
  //   assert.equal(Object.keys(observed)).toEqual(['0']);
  // });
  //
  // test(`array: slice test`, (ctx) => {
  //   [
  //     ['ant', 'bison', 'camel', 'duck', 'elephant'],
  //     makeObservable(['ant', 'bison', 'camel', 'duck', 'elephant']),
  //   ].forEach((array) => {
  //     assert.equal(array.slice(2)).toEqual(['camel', 'duck', 'elephant']);
  //     assert.equal(array.slice(2, 4)).toEqual(['camel', 'duck']);
  //     assert.equal(array.slice(1, 5)).toEqual(['bison', 'camel', 'duck', 'elephant']);
  //     assert.equal(array.slice(-2)).toEqual(['duck', 'elephant']);
  //     assert.equal(array.slice(2, -1)).toEqual(['camel', 'duck']);
  //     assert.equal(array.slice()).toEqual(['ant', 'bison', 'camel', 'duck', 'elephant']);
  //
  //     assert.equal(array.slice(-400, 600)).toEqual(['ant', 'bison', 'camel', 'duck', 'elephant']);
  //
  //     assert.equal(array.slice(-400, -44)).toEqual([]);
  //     assert.equal(array.slice(-44, -400)).toEqual([]);
  //     assert.equal(array.slice(2, -400)).toEqual([]);
  //     assert.equal(array.slice(2, -3)).toEqual([]);
  //   });
  // });
  //
  // test(`array: sliced test [solid, oby]`, (ctx) => {
  //   const original = [{ foo: 1 }];
  //   const result = makeObservable(original);
  //   const clone = result.slice();
  //   assert.equal(clone[0]).toBe(result[0]);
  //   assert.equal(clone[0]).toBe(original[0]);
  //   assert.equal(clone).not.toBe(result);
  //
  //   let calls = 0;
  //   const execute = memo(() => {
  //     calls++;
  //     clone[0].foo;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   assert.equal(clone[0].foo).toBe(1);
  //
  //   clone[0].foo = 2;
  //   execute();
  //   assert.equal(clone[0].foo).toBe(2);
  //   assert.equal(result[0].foo).toBe(2);
  //   assert.equal(original[0].foo).toBe(2);
  //   assert.equal(calls).toBe(2);
  // });
  //
  // test(`array: makeObservable identity`, (ctx) => {
  //   const raw = [];
  //   const obj1 = makeObservable(raw);
  //   const obj2 = makeObservable(raw);
  //   const obj3 = makeObservable(obj1);
  //   const obj4 = makeObservable(obj2);
  //
  //   assert.equal(obj1 === obj2 && obj2 === obj3 && obj3 === obj4).toBe(true);
  // });
  //
  // test(`array: makeObservable identity nested`, (ctx) => {
  //   const raw = [];
  //   const obj1 = makeObservable({ value: raw });
  //   const obj2 = makeObservable({ value: raw });
  //   const obj3 = makeObservable({ value: obj1 });
  //   const obj4 = makeObservable({ value: obj2 });
  //
  //   assert.equal(obj1.value === obj2.value).toBe(true);
  //   assert.equal(obj2.value === obj3.value.value).toBe(true);
  //   assert.equal(obj3.value === obj1).toBe(true);
  //   assert.equal(obj3.value.value === obj4.value.value).toBe(true);
  // });
  //
  // class Sub3 extends Array {
  //   lastPushed;
  //   lastSearched;
  //
  //   push(item) {
  //     // console.log('pushing from SubArray', item)
  //     this.lastPushed = item;
  //     return super.push(item);
  //   }
  //
  //   indexOf(searchElement, fromIndex) {
  //     this.lastSearched = searchElement;
  //     return super.indexOf(searchElement, fromIndex);
  //   }
  // }
  // class Sub2 extends Sub3 {}
  // class Sub1 extends Sub2 {}
  // class SubArray extends Sub1 {}
  //
  // test(`array: calls correct mutation method on Array subclass`, (ctx) => {
  //   const subArray = new SubArray(4, 5, 6);
  //   const observed = makeObservable(subArray);
  //
  //   subArray.push(7);
  //   assert.equal(subArray.lastPushed).toBe(7);
  //   observed.push(9);
  //   assert.equal(observed.lastPushed).toBe(9);
  // });
  //
  // test(`array: calls correct identity-sensitive method on Array subclass`, (ctx) => {
  //   const subArray = new SubArray(4, 5, 6);
  //   const observed = makeObservable(subArray);
  //   let index;
  //
  //   index = subArray.indexOf(4);
  //   assert.equal(index).toBe(0);
  //   assert.equal(subArray.lastSearched).toBe(4);
  //
  //   index = observed.indexOf(6);
  //   assert.equal(index).toBe(2);
  //   assert.equal(observed.lastSearched).toBe(6);
  //
  //   assert.equal(makeObservable(observed)).toBe(makeObservable(subArray));
  //   assert.equal(observed).toBe(makeObservable(subArray));
  //   assert.equal(makeObservable(observed).slice()).not.toBe(makeObservable(subArray).slice());
  // });
  //
  // test(`array: should be triggered when set length with string`, (ctx) => {
  //   let ret1 = 'idle';
  //   let ret2 = 'idle';
  //   const arr1 = makeObservable(new Array(11).fill(0));
  //   const arr2 = makeObservable(new Array(11).fill(0));
  //   const execute1 = memo(() => {
  //     ret1 = arr1[10] === undefined ? 'arr[10] is set to empty' : 'idle';
  //   });
  //   execute1();
  //   const execute2 = memo(() => {
  //     ret2 = arr2[10] === undefined ? 'arr[10] is set to empty' : 'idle';
  //   });
  //   execute2();
  //
  //   arr1.length = 2;
  //   arr2.length = '2';
  //   execute1();
  //   execute2();
  //
  //   assert.equal(ret1).toBe(ret2);
  // });
  //
  // test(`${
  //   lib
  // }array: is both a getter and a setter, for shallow non-primitive properties`, (ctx) => {
  //   const obj1 = [{ foo: 123 }];
  //   const obj2 = [];
  //
  //   const o = makeObservable({ value: obj1 });
  //   assert.equal(o.value).toEqual(obj1);
  //
  //   o.value = obj2;
  //   assert.equal(o.value).toEqual(obj2);
  //
  //   o.value = obj1;
  //   assert.equal(o.value).toEqual(obj1);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.value = v;
  //     },
  //     () => o.value
  //   );
  // });
  //
  // test(`${
  //   lib
  // }array: deeper: is both a getter and a setter, for shallow non-primitive properties`, (ctx) => {
  //   const obj1 = { foo: 123 };
  //   const obj2 = [];
  //
  //   const o = makeObservable({ value: { deeper: obj1 } });
  //   assert.equal(o.value.deeper).toEqual(obj1);
  //
  //   o.value.deeper = obj2;
  //   assert.equal(o.value.deeper).toEqual(obj2);
  //
  //   o.value.deeper = obj1;
  //   assert.equal(o.value.deeper).toEqual(obj1);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.value.deeper = v;
  //     },
  //     () => o.value.deeper
  //   );
  // });
  //
  // test(`${
  //   lib
  // }array: is both a getter and a setter, for deep non-primitive properties`, (ctx) => {
  //   const obj1 = { foo: 123 };
  //   const obj2 = [];
  //
  //   const o = makeObservable({ deep: { value: obj1 } });
  //   assert.equal(o.deep.value).toEqual(obj1);
  //
  //   o.deep.value = obj2;
  //   assert.equal(o.deep.value).toEqual(obj2);
  //
  //   o.deep.value = obj1;
  //   assert.equal(o.deep.value).toEqual(obj1);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.deep.value = v;
  //     },
  //     () => o.deep.value
  //   );
  // });
  //
  // test(`${
  //   lib
  // }array: is both a getter and a setter, for deep non-primitive properties`, (ctx) => {
  //   const obj1 = { foo: 123 };
  //   const obj2 = [];
  //
  //   const o = makeObservable({ deep: { value: obj1 } });
  //   assert.equal(o.deep.value).toEqual(obj1);
  //
  //   let calls = 0;
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.deep.value;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.deep.value = obj2;
  //   execute();
  //   assert.equal(o.deep.value).toEqual(obj2);
  //   assert.equal(calls).toBe(2);
  //
  //   o.deep.value = obj1;
  //   execute();
  //   assert.equal(o.deep.value).toEqual(obj1);
  //   assert.equal(calls).toBe(3);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o.deep.value = v;
  //     },
  //     () => o.deep.value
  //   );
  // });
  //
  // test(`array: reading length and pusing doesnt loop`, (ctx) => {
  //   const result = makeObservable([]);
  //
  //   let read = 0;
  //   const execute = memo(() => {
  //     read++;
  //     if (read < 100) {
  //       result.length;
  //       result.push(Date.now());
  //       result.length;
  //     }
  //     return read;
  //   });
  //   execute();
  //   assert.equal(read).toBe(100);
  // });
  //
  // test(`array: mutating array length`, (ctx) => {
  //   const result = makeObservable([69]);
  //
  //   let calls = 0;
  //   const execute1 = memo(() => {
  //     calls++;
  //     result[40];
  //   });
  //   execute1();
  //
  //   let calls2 = 0;
  //   const execute2 = memo(() => {
  //     calls2++;
  //     result[2];
  //   });
  //   execute1(), execute2();
  //
  //   let calls3 = 0;
  //   const execute3 = memo(() => {
  //     calls3++;
  //     result.length;
  //   });
  //   execute1(), execute2(), execute3();
  //
  //   assert.equal(result.length).toBe(1);
  //   assert.equal(result[40]).toBe(undefined);
  //   assert.equal(result[2]).toBe(undefined);
  //   assert.equal(result[0]).toBe(69);
  //
  //   assert.equal(calls).toBe(1);
  //   assert.equal(calls2).toBe(1);
  //   assert.equal(calls3).toBe(1);
  //
  //   result.length = 45;
  //   execute1(), execute2(), execute3();
  //
  //   assert.equal(result.length).toBe(45);
  //   assert.equal(calls).toBe(1);
  //   assert.equal(calls2).toBe(1);
  //   assert.equal(calls3).toBe(2);
  //
  //   result[40] = true;
  //   execute1(), execute2(), execute3();
  //
  //   assert.equal(result[40]).toBe(true);
  //   assert.equal(calls).toBe(2);
  //   assert.equal(calls2).toBe(1);
  //   assert.equal(calls3).toBe(2);
  //
  //   result[41] = true;
  //   execute1(), execute2(), execute3();
  //
  //   assert.equal(result[41]).toBe(true);
  //   assert.equal(calls).toBe(2);
  //   assert.equal(calls2).toBe(1);
  //   assert.equal(calls3).toBe(2);
  //
  //   result[2] = true;
  //   execute1(), execute2(), execute3();
  //
  //   assert.equal(result[2]).toBe(true);
  //   assert.equal(calls).toBe(2);
  //   assert.equal(calls2).toBe(2);
  //   assert.equal(calls3).toBe(2);
  //
  //   result.push();
  //   execute1(), execute2(), execute3();
  //
  //   assert.equal(calls).toBe(2);
  //   assert.equal(calls2).toBe(2);
  //   assert.equal(calls3).toBe(2);
  //
  //   result.unshift();
  //   execute1(), execute2(), execute3();
  //
  //   assert.equal(calls).toBe(2);
  //   assert.equal(calls2).toBe(2);
  //   assert.equal(calls3).toBe(2);
  //
  //   result.push(1);
  //   execute1(), execute2(), execute3();
  //
  //   assert.equal(calls).toBe(2);
  //   assert.equal(calls2).toBe(2);
  //   assert.equal(calls3).toBe(3);
  // });
  //
  // test(`array: pushing in two separated effects doesnt loop [solid, oby]`, (ctx) => {
  //   const result = makeObservable([0]);
  //
  //   const execute1 = memo(() => {
  //     result.push(1);
  //   });
  //   execute1();
  //
  //   const execute2 = memo(() => {
  //     result.push(2);
  //   });
  //   execute1(), execute2();
  //
  //   assert.equal(result).toEqual([0, 1, 2]);
  // });
  //
  // test(`array: track: array functions`, (ctx) => {
  //   const result = makeObservable([{ username: 'lala' }]);
  //
  //   let called = 0;
  //   const execute = memo(() => {
  //     try {
  //       result[0].username;
  //     } catch (e) {}
  //     called++;
  //   });
  //   execute();
  //
  //   assert.equal(result[0].username).toBe('lala');
  //   assert.equal(called).toBe(1);
  //
  //   result[0].username = 'lala2';
  //   execute();
  //   assert.equal(result[0].username).toBe('lala2');
  //   assert.equal(called).toBe(2);
  //
  //   // setting to same value
  //   result[0].username = 'lala2';
  //   execute();
  //
  //   assert.equal(result[0].username).toBe('lala2');
  //   assert.equal(called).toBe(2);
  //
  //   result.pop();
  //   execute();
  //   assert.equal(called).toBe(3);
  //   assert.equal(result.length).toBe(0);
  //
  //   result.push({ username: 'lala2' });
  //   execute();
  //   assert.equal(called).toBe(4);
  //
  //   result.push({ username: 'lala3' });
  //   execute();
  //   assert.equal(called).toBe(4);
  //
  //   result.push({ username: 'lala4' });
  //   execute();
  //   assert.equal(called).toBe(4);
  //
  //   result[0].username = 'lala5';
  //   execute();
  //   assert.equal(called).toBe(5);
  // });
  //
  // test(`array: track: array functions read vs write`, (ctx) => {
  //   const result = makeObservable([1]);
  //
  //   let called = 0;
  //   const execute = memo(() => {
  //     JSON.stringify(result);
  //     called++;
  //   });
  //   execute();
  //
  //   assert.equal(result[0]).toBe(1);
  //   assert.equal(called).toBe(1);
  //
  //   result.filter((i) => i % 2);
  //   execute();
  //   assert.equal(called).toBe(1);
  //
  //   result.filter((i) => i % 2);
  //   execute();
  //   assert.equal(called).toBe(1);
  //
  //   result.push(2);
  //   execute();
  //   assert.equal(called).toBe(2);
  // });
  //
  // test(`array: track: array functions read`, (ctx) => {
  //   const result = makeObservable([1]);
  //
  //   let called = 0;
  //   const execute = memo(() => {
  //     result.filter((i) => i % 2);
  //     called++;
  //   });
  //   execute();
  //   assert.equal(result[0]).toBe(1);
  //   assert.equal(called).toBe(1);
  //
  //   result.push(2);
  //   execute();
  //   assert.equal(called).toBe(2);
  //
  //   result.push(3);
  //   execute();
  //   assert.equal(called).toBe(3);
  //
  //   result.push(4);
  //   execute();
  //   assert.equal(called).toBe(4);
  // });
  //
  // test(`${
  //   lib
  // }array: supports not reacting when setting a non-primitive property to itself, when reading all values`, (ctx) => {
  //   const o = makeObservable([0]);
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o[0];
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o[0] = o[0];
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o[0] = v;
  //     },
  //     () => o[0]
  //   );
  // });
  //
  // test(`array: supports reacting when array length changes`, (ctx) => {
  //   const o = makeObservable({ value: [0] });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.value.length;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //   assert.equal(o.value.length).toBe(1);
  //
  //   o.value.pop();
  //   execute();
  //   assert.equal(calls).toBe(2);
  //   assert.equal(o.value.length).toBe(0);
  // });
  // test(`array: supports reacting when array length is set explicity`, (ctx) => {
  //   const o = makeObservable({ value: [0] });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.value.length;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //   assert.equal(o.value.length).toBe(1);
  //
  //   o.value.length = 0;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //   assert.equal(o.value.length).toBe(0);
  // });
  //
  // test(`${
  //   lib
  // }array: supports reacting when array length is set explicity while reading value`, (ctx) => {
  //   const o = makeObservable({ value: [0, 2] });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.value[0];
  //     o.value[1];
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //   assert.equal(o.value.length).toBe(2);
  //
  //   o.value.length = 0;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //   assert.equal(o.value.length).toBe(0);
  //   assert.equal(o.value[0]).toBe(undefined);
  // });
  //
  // test(`array: supports not reacting when array reading function is called `, (ctx) => {
  //   const o = makeObservable({ value: [0, 1] });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.value;
  //     o.value[0];
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //   assert.equal(o.value.length).toBe(2);
  //
  //   o.value.filter(() => {});
  //   execute();
  //
  //   assert.equal(calls).toBe(1);
  //   assert.equal(o.value.length).toBe(2);
  // });
  //
  // test(`array: supports not reacting when array writing function is called `, (ctx) => {
  //   const o = makeObservable({ value: [0, 1] });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.value[0];
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //   assert.equal(o.value.length).toBe(2);
  //
  //   o.value.push(2);
  //   execute();
  //
  //   assert.equal(calls).toBe(1);
  //   assert.equal(o.value.length).toBe(3);
  // });
  //
  // test(`array: supports reacting to changes in deep arrays`, (ctx) => {
  //   const o = makeObservable({ value: [1, 2] });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.value.length;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.value.pop();
  //   execute();
  //   assert.equal(calls).toBe(2);
  //
  //   o.value.pop();
  //   execute();
  //   assert.equal(calls).toBe(3);
  //
  //   o.value.push(1);
  //   execute();
  //   assert.equal(calls).toBe(4);
  // });
  //
  // test(`array: supports not reacting to no-changes in deep arrays`, (ctx) => {
  //   const o = makeObservable({ value: [1, 2] });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.value.length;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.value.filter(() => {});
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.value.filter(() => {});
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.value.push(1);
  //   execute();
  //   assert.equal(calls).toBe(2);
  // });
  //
  // test(`array: supports reacting to changes in top-level arrays`, (ctx) => {
  //   const o = makeObservable([1, 2]);
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.length;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.pop();
  //   execute();
  //   assert.equal(calls).toBe(2);
  //
  //   o.pop();
  //   execute();
  //   assert.equal(calls).toBe(3);
  //
  //   o.push(1);
  //   execute();
  //   assert.equal(calls).toBe(4);
  //
  //   o[0] = true;
  //   execute();
  //   assert.equal(calls).toBe(4);
  // });
  //
  // test(`array: supports not reacting to changes in top-level arrays`, (ctx) => {
  //   const o = makeObservable([1, 2]);
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.length;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.filter(() => {});
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.filter(() => {});
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.push(3);
  //   execute();
  //   assert.equal(calls).toBe(2);
  //
  //   o.push(4);
  //   execute();
  //   assert.equal(calls).toBe(3);
  //
  //   o[0] = false;
  //   execute();
  //   assert.equal(calls).toBe(3);
  // });
  //
  // test(`array: supports reacting to changes at a specific index in deep arrays`, (ctx) => {
  //   const o = makeObservable({ value: [1, 2] });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.value[0];
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.value.pop();
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.value.push(10);
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.value[0] = 123;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //
  //   o.value.unshift(1);
  //   execute();
  //   assert.equal(calls).toBe(3);
  //
  //   o.value.unshift(1);
  //   execute();
  //   assert.equal(calls).toBe(3);
  //
  //   o.value.unshift(2);
  //   execute();
  //   assert.equal(calls).toBe(4);
  // });
  //
  // test(`${
  //   lib
  // }array: supports reacting to changes at a specific index in top-level arrays`, (ctx) => {
  //   const o = makeObservable([1, 2]);
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o[0];
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.pop();
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.push(10);
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o[0] = 123;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //
  //   o.unshift(1);
  //   execute();
  //   assert.equal(calls).toBe(3);
  //
  //   o.unshift(1);
  //   execute();
  //   assert.equal(calls).toBe(3);
  //
  //   o.unshift(2);
  //   execute();
  //   assert.equal(calls).toBe(4);
  // });
  //
  // test(`array: supports batching array methods automatically`, (ctx) => {
  //   const o = makeObservable({ value: [1, 2, 3] });
  //
  //   let calls = 0;
  //
  //   const execute = memo(() => {
  //     calls += 1;
  //     o.value.forEach(() => {});
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   o.value.forEach((value, index) => {
  //     // console.log(o.value)
  //     o.value[index] = value * 2;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(2);
  // });
  //
  // test(`array: treats number and string properties the same way`, (ctx) => {
  //   const o = makeObservable([0]);
  //
  //   let callsNumber = 0;
  //   let callsString = 0;
  //
  //   const execute1 = memo(() => {
  //     callsNumber += 1;
  //     o[0];
  //   });
  //   execute1();
  //   const execute2 = memo(() => {
  //     callsString += 1;
  //     o['0'];
  //   });
  //   execute1(), execute2();
  //
  //   assert.equal(callsNumber).toBe(1);
  //   assert.equal(callsString).toBe(1);
  //
  //   o[0] = 1;
  //   execute1(), execute2();
  //   assert.equal(callsNumber).toBe(2);
  //   assert.equal(callsString).toBe(2);
  //
  //   o['0'] = 2;
  //   execute1(), execute2();
  //   assert.equal(callsNumber).toBe(3);
  //   assert.equal(callsString).toBe(3);
  // });
  //
  // test(`array: observed value should proxy mutations to original [solid, oby]`, (ctx) => {
  //   const original = [{ foo: 1 }, { bar: 2 }];
  //   const observed = makeObservable(original);
  //
  //   // set
  //   const value = { baz: 3 };
  //   const result = makeObservable(value);
  //   observed[0] = value;
  //   assert.equal(observed[0]).toBe(result);
  //   assert.equal(isProxy(observed[0])).toBe(true);
  //   assert.equal(original[0]).not.toBe(value);
  //
  //   // delete
  //   delete observed[0];
  //   assert.equal(observed[0]).toBe(undefined);
  //   assert.equal(original[0]).toBe(undefined);
  //
  //   // mutating methods
  //   observed.push(value);
  //   assert.equal(observed[2]).toBe(result);
  //   assert.equal(original[2]).toBe(result);
  // });
  //
  // test(`array: identity methods should work [solid, oby]`, (ctx) => {
  //   const og = {};
  //   let arr;
  //
  //   function test(value) {
  //     assert.equal(arr.indexOf(value || og)).toBe(2);
  //     assert.equal(arr.indexOf(value || og, 3)).toBe(-1);
  //     assert.equal(arr.includes(value || og)).toBe(true);
  //     assert.equal(arr.includes(value || og, 3)).toBe(false);
  //     assert.equal(arr.lastIndexOf(value || og)).toBe(2);
  //     assert.equal(arr.lastIndexOf(value || og, 1)).toBe(-1);
  //     assert.equal(arr.lastIndexOf(0)).toBe(6);
  //   }
  //
  //   // sanity check, plain objects
  //   arr = [{}, {}, og, {}, {}, {}, 0];
  //   test();
  //
  //   // makeObservable
  //   arr = makeObservable([{}, {}, og, {}, {}, {}, 0]);
  //   test();
  //
  //   // should work with the proxy
  //   test(arr[2]);
  //
  //   // one is the proxy, the other is the original object
  //   assert.equal(arr[2]).not.toBe(og);
  // });
  //
  // test(`array: identity methods should be reactive`, (ctx) => {
  //   const obj = {};
  //   const arr = makeObservable([obj, {}]);
  //
  //   const search = arr[0];
  //
  //   let index = -1;
  //   const execute = memo(() => {
  //     index = arr.indexOf(search);
  //   });
  //   execute();
  //   assert.equal(index).toBe(0);
  //
  //   arr.reverse();
  //   execute();
  //   assert.equal(index).toBe(1);
  //   /*
  //     console.log(
  //       arr,
  //       search,
  //       arr[0],
  //       search === arr[0],
  //       search === arr[1],
  //     )*/
  // });
  //
  // test(`${
  //   lib
  // }array: internal array functions should search for the makeObservable versions of it [solid, oby]`, (ctx) => {
  //   const item1 = { id: 1 };
  //   const item2 = { id: 2 };
  //
  //   const state = makeObservable({ items: [] });
  //
  //   state.items = [...state.items, item1];
  //
  //   assert.equal(state.items.indexOf(item1)).toBe(0);
  //
  //   state.items = [...state.items, item2];
  //
  //   assert.equal(state.items.indexOf(item2)).toBe(1);
  // });
  //
  // test(`array: delete on Array should not trigger length dependency`, (ctx) => {
  //   const arr = makeObservable([1, 2, 3]);
  //
  //   let calls = 0;
  //   const execute = memo(() => {
  //     calls++;
  //     arr.length;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   delete arr[1];
  //   execute();
  //   assert.equal(calls).toBe(1);
  // });
  //
  // test(`array: shift on Array should trigger dependency once`, (ctx) => {
  //   const arr = makeObservable([1, 2, 3]);
  //
  //   let calls = 0;
  //   const execute = memo(() => {
  //     calls++;
  //     for (let i = 0; i < arr.length; i++) {
  //       arr[i];
  //     }
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   arr.shift();
  //   execute();
  //   assert.equal(calls).toBe(2);
  // });
  //
  // // #6018
  // test(`${
  //   lib
  // }array: edge case: avoid trigger effect in deleteProperty when array length-decrease mutation methods called`, (ctx) => {
  //   const arr = makeObservable([1]);
  //
  //   let calls = 0;
  //   const execute = memo(() => {
  //     calls++;
  //     if (arr.length > 0) {
  //       arr.slice();
  //     }
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   arr.splice(0);
  //   execute();
  //   assert.equal(calls).toBe(2);
  // });
  //
  // test(`${
  //   lib
  // }array: add existing index on Array should not trigger length dependency`, (ctx) => {
  //   const array = new Array(3);
  //   const observed = makeObservable(array);
  //   let calls = 0;
  //   const execute = memo(() => {
  //     calls++;
  //     observed.length;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   observed[1] = 1;
  //   execute();
  //   assert.equal(calls).toBe(1);
  // });
  //
  // test(`${
  //   lib
  // }array: add non-integer prop on Array should not trigger length dependency`, (ctx) => {
  //   const array = new Array(3);
  //   const observed = makeObservable(array);
  //   let calls = 0;
  //   const execute = memo(() => {
  //     calls++;
  //     observed.length;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   observed.x = 'x';
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   observed[-1] = 'x';
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   observed[NaN] = 'x';
  //   execute();
  //   assert.equal(calls).toBe(1);
  // });
  //
  // // #2427
  // test(`array: track length on for ... in iteration`, (ctx) => {
  //   const array = makeObservable([1]);
  //   let length = '';
  //   const execute = memo(() => {
  //     length = '';
  //     for (const key in array) {
  //       length += key;
  //     }
  //   });
  //   execute();
  //   assert.equal(length).toBe('0');
  //
  //   array.push(1);
  //   execute();
  //   assert.equal(length).toBe('01');
  // });
  //
  // // #9742
  // test(`array: mutation on user proxy of reactive Array`, (ctx) => {
  //   const array = makeObservable([]);
  //   const proxy = new Proxy(array, {});
  //   proxy.push(1);
  //   assert.equal(array.length).toBe(1);
  //   assert.equal(proxy.length).toBe(1);
  // });
  //
  // test(`array: should observe iteration`, (ctx) => {
  //   let dummy;
  //   const list = makeObservable(['Hello']);
  //   const execute = memo(() => (dummy = list.join(' ')));
  //   execute();
  //
  //   assert.equal(dummy).toBe('Hello');
  //
  //   list.push('World!');
  //   execute();
  //   assert.equal(dummy).toBe('Hello World!');
  //
  //   list.shift();
  //   execute();
  //   assert.equal(dummy).toBe('World!');
  // });
  //
  // test(`array: should observe implicit array length changes`, (ctx) => {
  //   let dummy;
  //   const list = makeObservable(['Hello']);
  //   const execute = memo(() => (dummy = list.join(' ')));
  //   execute();
  //
  //   assert.equal(dummy).toBe('Hello');
  //
  //   list[1] = 'World!';
  //   execute();
  //   assert.equal(dummy).toBe('Hello World!');
  //
  //   list[3] = 'Hello!';
  //   execute();
  //   assert.equal(dummy).toBe('Hello World!  Hello!');
  // });
  //
  // test(`array: should observe sparse array mutations`, (ctx) => {
  //   let dummy;
  //   const list = makeObservable([]);
  //   list[1] = 'World!';
  //   const execute = memo(() => (dummy = list.join(' ')));
  //   execute();
  //   assert.equal(dummy).toBe(' World!');
  //
  //   list[0] = 'Hello';
  //   execute();
  //   assert.equal(dummy).toBe('Hello World!');
  //
  //   list.pop();
  //   execute();
  //   assert.equal(dummy).toBe('Hello');
  // });
  //
  // test(`array: should not observe well-known symbol keyed properties`, (ctx) => {
  //   const key = Symbol.isConcatSpreadable;
  //   let dummy;
  //   const array = makeObservable([]);
  //   const execute = memo(() => (dummy = array[key]));
  //   execute();
  //
  //   assert.equal(array[key]).toBe(undefined);
  //   assert.equal(dummy).toBe(undefined);
  //
  //   array[key] = true;
  //   execute();
  //   assert.equal(array[key]).toBe(true);
  //   assert.equal(dummy).toBe(true);
  // });
  //
  // test(`${
  //   lib
  // }array: should support manipulating an array while observing symbol keyed properties`, (ctx) => {
  //   const key = Symbol();
  //   let dummy;
  //   const array = makeObservable([1, 2, 3]);
  //   const execute = memo(() => (dummy = array[key]));
  //   execute();
  //
  //   assert.equal(dummy).toBe(undefined);
  //
  //   array.pop();
  //   execute();
  //
  //   array.shift();
  //   execute();
  //
  //   array.splice(0, 1);
  //   execute();
  //
  //   assert.equal(dummy).toBe(undefined);
  //
  //   array[key] = 'value';
  //   execute();
  //
  //   array.length = 0;
  //   execute();
  //   assert.equal(dummy).toBe('value');
  // });
  //
  // test(`array: should trigger all effects when array length is set to 0`, (ctx) => {
  //   const observed = makeObservable([1]);
  //
  //   let length;
  //   const execute1 = memo(() => {
  //     length = observed.length;
  //   });
  //   execute1();
  //
  //   let a;
  //   const execute2 = memo(() => {
  //     a = observed[0];
  //   });
  //   execute2();
  //
  //   assert.equal(length).toBe(1);
  //   assert.equal(a).toBe(1);
  //   // console.log(observed)
  //
  //   observed[1] = 2;
  //   execute1(), execute2();
  //
  //   // console.log(observed)
  //   assert.equal(observed[1]).toBe(2);
  //   assert.equal(observed.length).toBe(2);
  //   assert.equal(length).toBe(2);
  //
  //   observed.unshift(3);
  //   execute1(), execute2();
  //   assert.equal(length).toBe(3);
  //   assert.equal(a).toBe(3);
  //
  //   observed.length = 0;
  //   execute1(), execute2();
  //   assert.equal(length).toBe(0);
  //   assert.equal(a).toBe(undefined);
  // });
  //
  // test(`${
  //   lib
  // }array: identity methods should work if raw value contains reactive objects`, (ctx) => {
  //   const nativearr = [];
  //   const obj = makeObservable({});
  //   nativearr.push(obj);
  //
  //   const reactivearr = makeObservable(nativearr);
  //   // console.log(reactivearr, nativearr, obj)
  //   assert.equal(reactivearr.includes(obj)).toBe(true);
  // });
  //
  // test(`array: iterator references`, (ctx) => {
  //   const item = { a: 1 };
  //
  //   const obj = makeObservable([item, item]);
  //
  //   let count = 0;
  //   let calls = 0;
  //   const execute = memo(() => {
  //     calls++;
  //     for (const key in obj) {
  //       count += obj.includes(obj[key]) ? 1 : 0;
  //     }
  //     assert.equal(count).toBe(2);
  //
  //     for (const key in obj) {
  //       count += obj.indexOf(obj[key]) !== -1 ? 1 : 0;
  //     }
  //     assert.equal(count).toBe(4);
  //
  //     for (const item of obj) {
  //       count += obj.includes(item) ? 1 : 0;
  //     }
  //     assert.equal(count).toBe(6);
  //
  //     for (const item of obj) {
  //       count += obj.indexOf(item) !== -1 ? 1 : 0;
  //     }
  //     assert.equal(count).toBe(8);
  //
  //     for (const item of obj.values()) {
  //       count += obj.includes(item) ? 1 : 0;
  //     }
  //     assert.equal(count).toBe(10);
  //
  //     for (const item of obj.values()) {
  //       count += obj.indexOf(item) !== -1 ? 1 : 0;
  //     }
  //     assert.equal(count).toBe(12);
  //
  //     for (const [k, item] of obj.entries()) {
  //       count += obj.includes(item) ? 1 : 0;
  //     }
  //     assert.equal(count).toBe(14);
  //
  //     for (const [k, item] of obj.entries()) {
  //       count += obj.indexOf(item) !== -1 ? 1 : 0;
  //     }
  //     assert.equal(count).toBe(16);
  //   });
  //   execute();
  //
  //   assert.equal(calls).toBe(1);
  //
  //   assert.equal(count).toBe(16);
  //
  //   assert.equal(calls).toBe(1);
  // });
  //
  // test(`${
  //   lib
  // }array: should avoid infinite recursive loops when use Array.prototype.push/unshift/pop/shift [solid, oby]`, (ctx) => {
  //   ['push', 'unshift'].forEach((key) => {
  //     const arr = makeObservable([]);
  //     let calls1 = 0;
  //     let calls2 = 0;
  //     const execute1 = memo(() => {
  //       calls1++;
  //       arr[key](1);
  //     });
  //     execute1();
  //     const execute2 = memo(() => {
  //       calls2++;
  //       arr[key](2);
  //     });
  //     execute2();
  //     assert.equal(arr.length).toBe(2);
  //     assert.equal(calls1).toBe(1);
  //     assert.equal(calls2).toBe(1);
  //   });
  //   ['pop', 'shift'].forEach((key) => {
  //     const arr = makeObservable([1, 2, 3, 4]);
  //     let calls1 = 0;
  //     let calls2 = 0;
  //     const execute1 = memo(() => {
  //       calls1++;
  //       arr[key]();
  //     });
  //     execute1();
  //     const execute2 = memo(() => {
  //       calls2++;
  //       arr[key]();
  //     });
  //     execute2();
  //     assert.equal(arr.length).toBe(2);
  //     assert.equal(calls1).toBe(1);
  //     assert.equal(calls2).toBe(1);
  //   });
  // });
  //
  // /* vue array instrumentation https://github.com/vuejs/core/pull/9511/files */
  //
  // test(`array: vue array instrumentation: iterator`, (ctx) => {
  //   const shallow = makeObservable([1, 2, 3, 4]);
  //   let result = memo(() => {
  //     let sum = 0;
  //     for (const x of shallow) {
  //       sum += x ** 2;
  //     }
  //     return sum;
  //   });
  //   assert.equal(result()).toBe(30);
  //
  //   shallow[2] = 0;
  //   assert.equal(result()).toBe(21);
  //
  //   const deep = makeObservable([{ val: 1 }, { val: 2 }]);
  //   result = memo(() => {
  //     let sum = 0;
  //     for (const x of deep) {
  //       sum += x.val ** 2;
  //     }
  //     return sum;
  //   });
  //   assert.equal(result()).toBe(5);
  //
  //   deep[1].val = 3;
  //   assert.equal(result()).toBe(10);
  // });
  //
  // test(`array: vue array instrumentation: concat`, (ctx) => {
  //   batch(() => {
  //     const a1 = makeObservable([1, { val: 2 }]);
  //     const a2 = makeObservable([{ val: 3 }]);
  //     const a3 = [4, 5];
  //
  //     const result = memo(() => a1.concat(a2, a3));
  //     assert.equal(result()).toEqual([1, { val: 2 }, { val: 3 }, 4, 5]);
  //     assert.equal(isProxy(result()[1])).toBe(true);
  //     assert.equal(isProxy(result()[2])).toBe(true);
  //
  //     a1.shift();
  //     assert.equal(result()).toEqual([{ val: 2 }, { val: 3 }, 4, 5]);
  //
  //     a2.pop();
  //     assert.equal(result()).toEqual([{ val: 2 }, 4, 5]);
  //
  //     // a3 is not reactive, so this wont trigger a memo refresh
  //     a3.pop();
  //     assert.equal(result()).toEqual([{ val: 2 }, 4, 5]);
  //   });
  // });
  //
  // test(`array: vue array instrumentation: entries`, (ctx) => {
  //   const shallow = makeObservable([0, 1]);
  //   const result1 = memo(() => Array.from(shallow.entries()));
  //   assert.equal(result1()).toEqual([
  //     [0, 0],
  //     [1, 1],
  //   ]);
  //
  //   shallow[1] = 10;
  //   assert.equal(result1()).toEqual([
  //     [0, 0],
  //     [1, 10],
  //   ]);
  //
  //   const deep = makeObservable([{ val: 0 }, { val: 1 }]);
  //   const result2 = memo(() => Array.from(deep.entries()));
  //   assert.equal(result2()).toEqual([
  //     [0, { val: 0 }],
  //     [1, { val: 1 }],
  //   ]);
  //   assert.equal(isProxy(result2()[0][1])).toBe(true);
  //
  //   deep.pop();
  //   assert.equal(Array.from(result2())).toEqual([[0, { val: 0 }]]);
  // });
  //
  // test(`array: vue array instrumentation: every`, (ctx) => {
  //   const shallow = makeObservable([1, 2, 5]);
  //   let result = memo(() => shallow.every((x) => x < 5));
  //   assert.equal(result()).toBe(false);
  //
  //   shallow.pop();
  //   assert.equal(result()).toBe(true);
  //
  //   const deep = makeObservable([{ val: 1 }, { val: 5 }]);
  //   result = memo(() => deep.every((x) => x.val < 5));
  //   assert.equal(result()).toBe(false);
  //
  //   deep[1].val = 2;
  //   assert.equal(result()).toBe(true);
  // });
  //
  // test(`array: vue array instrumentation: filter`, (ctx) => {
  //   const shallow = makeObservable([1, 2, 3, 4]);
  //   const result1 = memo(() => shallow.filter((x) => x < 3));
  //   assert.equal(result1()).toEqual([1, 2]);
  //
  //   shallow[2] = 0;
  //   assert.equal(result1()).toEqual([1, 2, 0]);
  //
  //   const deep = makeObservable([{ val: 1 }, { val: 2 }]);
  //   const result2 = memo(() => deep.filter((x) => x.val < 2));
  //   assert.equal(result2()).toEqual([{ val: 1 }]);
  //   assert.equal(isProxy(result2()[0])).toBe(true);
  //
  //   deep[1].val = 0;
  //   assert.equal(result2()).toEqual([{ val: 1 }, { val: 0 }]);
  // });
  //
  // test(`array: vue array instrumentation: find and co.`, (ctx) => {
  //   const _reactive = makeObservable([{ val: 1 }, { val: 2 }]);
  //
  //   let find = memo(() => _reactive.find((x) => x.val === 2));
  //   // @ts-expect-error tests are not limited to es2016
  //   let findLast = memo(() => _reactive.findLast((x) => x.val === 2));
  //   let findIndex = memo(() => _reactive.findIndex((x) => x.val === 2));
  //   let findLastIndex = memo(() =>
  //     // @ts-expect-error tests are not limited to es2016
  //     _reactive.findLastIndex((x) => x.val === 2)
  //   );
  //
  //   assert.equal(find()).toBe(_reactive[1]);
  //   assert.equal(isProxy(find())).toBe(true);
  //   assert.equal(findLast()).toBe(_reactive[1]);
  //   assert.equal(isProxy(findLast())).toBe(true);
  //   assert.equal(findIndex()).toBe(1);
  //   assert.equal(findLastIndex()).toBe(1);
  //
  //   _reactive[1].val = 0;
  //
  //   assert.equal(find()).not.toBe(_reactive[1]);
  //   assert.equal(findLast()).not.toBe(_reactive[1]);
  //   assert.equal(findIndex()).toBe(-1);
  //   assert.equal(findLastIndex()).toBe(-1);
  //
  //   _reactive.pop();
  //
  //   assert.equal(find()).toBe(undefined);
  //   assert.equal(findLast()).toBe(undefined);
  //   assert.equal(findIndex()).toBe(-1);
  //   assert.equal(findLastIndex()).toBe(-1);
  //
  //   const deep = makeObservable([{ val: 1 }, { val: 2 }]);
  //   find = memo(() => deep.find((x) => x.val === 2));
  //   // @ts-expect-error tests are not limited to es2016
  //   findLast = memo(() => deep.findLast((x) => x.val === 2));
  //   findIndex = memo(() => deep.findIndex((x) => x.val === 2));
  //   // @ts-expect-error tests are not limited to es2016
  //   findLastIndex = memo(() => deep.findLastIndex((x) => x.val === 2));
  //
  //   assert.equal(find()).toBe(deep[1]);
  //   assert.equal(isProxy(find())).toBe(true);
  //   assert.equal(findLast()).toBe(deep[1]);
  //   assert.equal(isProxy(findLast())).toBe(true);
  //   assert.equal(findIndex()).toBe(1);
  //   assert.equal(findLastIndex()).toBe(1);
  //
  //   deep[1].val = 0;
  //
  //   assert.equal(find()).toBe(undefined);
  //   assert.equal(findLast()).toBe(undefined);
  //   assert.equal(findIndex()).toBe(-1);
  //   assert.equal(findLastIndex()).toBe(-1);
  // });
  //
  // test(`array: vue array instrumentation: forEach`, (ctx) => {
  //   const shallow = makeObservable([1, 2, 3, 4]);
  //   let result = memo(() => {
  //     let sum = 0;
  //     shallow.forEach((x) => (sum += x ** 2));
  //     return sum;
  //   });
  //   assert.equal(result()).toBe(30);
  //
  //   shallow[2] = 0;
  //   assert.equal(result()).toBe(21);
  //
  //   const deep = makeObservable([{ val: 1 }, { val: 2 }]);
  //   result = memo(() => {
  //     let sum = 0;
  //     deep.forEach((x) => (sum += x.val ** 2));
  //     return sum;
  //   });
  //   assert.equal(result()).toBe(5);
  //
  //   deep[1].val = 3;
  //   assert.equal(result()).toBe(10);
  // });
  //
  // test(`array: vue array instrumentation: join`, (ctx) => {
  //   function toString() {
  //     return this.val;
  //   }
  //   const shallow = makeObservable([
  //     { val: 1, toString },
  //     { val: 2, toString },
  //   ]);
  //   let result = memo(() => shallow.join('+'));
  //   assert.equal(result()).toBe('1+2');
  //
  //   shallow[1].val = 23;
  //   assert.equal(result()).toBe('1+23');
  //
  //   shallow.pop();
  //   assert.equal(result()).toBe('1');
  //
  //   const deep = makeObservable([
  //     { val: 1, toString },
  //     { val: 2, toString },
  //   ]);
  //   result = memo(() => deep.join());
  //   assert.equal(result()).toBe('1,2');
  //
  //   deep[1].val = 23;
  //   assert.equal(result()).toBe('1,23');
  // });
  //
  // test(`array: vue array instrumentation: map`, (ctx) => {
  //   // uno
  //   const shallow = makeObservable([1, 2, 3, 4]);
  //   let result = memo(() => {
  //     return shallow.map((x) => x ** 2);
  //   });
  //   assert.equal(result()).toEqual([1, 4, 9, 16]);
  //
  //   shallow[2] = 0;
  //
  //   assert.equal(result()).toEqual([1, 4, 0, 16]);
  //
  //   // uno + empty
  //   const shallow2 = makeObservable([]);
  //   const result2 = memo(() => {
  //     return shallow2.map((x) => x ** 2);
  //   });
  //   assert.equal(result2()).toEqual([]);
  //
  //   shallow2[0] = 1;
  //   shallow2[1] = 2;
  //
  //   assert.equal(result2()).toEqual([1, 4]);
  //
  //   // dos
  //
  //   const deep = makeObservable([{ val: 1 }, { val: 2 }]);
  //   result = memo(() => deep.map((x) => x.val ** 2));
  //   assert.equal(result()).toEqual([1, 4]);
  //
  //   deep[1].val = 3;
  //   assert.equal(result()).toEqual([1, 9]);
  // });
  //
  // test(`array: vue array instrumentation: reduce left and right`, (ctx) => {
  //   function toString() {
  //     return `${this.val}-`;
  //   }
  //   const reactive = makeObservable([
  //     { val: 1, toString },
  //     { val: 2, toString },
  //   ]);
  //
  //   assert.equal(reactive.reduce((acc, x) => String(acc) + x.val, undefined)).toBe('undefined12');
  //
  //   let left = memo(() => reactive.reduce((acc, x) => String(acc) + x.val));
  //   let right = memo(() => reactive.reduceRight((acc, x) => String(acc) + x.val));
  //   assert.equal(left()).toBe('1-2');
  //   assert.equal(right()).toBe('2-1');
  //
  //   reactive[1].val = 23;
  //   assert.equal(left()).toBe('1-23');
  //   assert.equal(right()).toBe('23-1');
  //
  //   reactive.pop();
  //   assert.equal(left()).toBe(reactive[0]);
  //   assert.equal(right()).toBe(reactive[0]);
  //
  //   const deep = makeObservable([{ val: 1 }, { val: 2 }]);
  //   left = memo(() => deep.reduce((acc, x) => acc + x.val, '0'));
  //   right = memo(() => deep.reduceRight((acc, x) => acc + x.val, '3'));
  //   assert.equal(left()).toBe('012');
  //   assert.equal(right()).toBe('321');
  //
  //   deep[1].val = 23;
  //   assert.equal(left()).toBe('0123');
  //   assert.equal(right()).toBe('3231');
  // });
  //
  // test(`array: vue array instrumentation: some`, (ctx) => {
  //   const shallow = makeObservable([1, 2, 5]);
  //   let result = memo(() => shallow.some((x) => x > 4));
  //   assert.equal(result()).toBe(true);
  //
  //   shallow.pop();
  //   assert.equal(result()).toBe(false);
  //
  //   const deep = makeObservable([{ val: 1 }, { val: 5 }]);
  //   result = memo(() => deep.some((x) => x.val > 4));
  //   assert.equal(result()).toBe(true);
  //
  //   deep[1].val = 2;
  //   assert.equal(result()).toBe(false);
  // });
  //
  // // Node 20+
  // test(`array: vue array instrumentation: toReversed`, (ctx) => {
  //   const array = makeObservable([1, { val: 2 }]);
  //   const result = memo(() => array.toReversed());
  //   assert.equal(array).not.toBe(result());
  //   assert.equal(result()).toEqual([{ val: 2 }, 1]);
  //   assert.equal(isProxy(result()[0])).toBe(true);
  //   assert.equal(result()[0]).toEqual({ val: 2 });
  //
  //   // modify original array, doesnt modify copied array
  //   // but the memo should rerun yielding 2,1
  //   array.splice(1, 1, 2);
  //
  //   assert.equal(array).toEqual([1, 2]);
  //   assert.equal(result()).toEqual([2, 1]);
  // });
  //
  // // Node 20+
  // test(`array: vue array instrumentation: toSorted`, (ctx) => {
  //   // No comparer
  //
  //   assert.equal(makeObservable([2, 1, 3]).toSorted()).toEqual([1, 2, 3]);
  //
  //   const r = makeObservable([{ val: 2 }, { val: 1 }, { val: 3 }]);
  //   let result;
  //
  //   result = memo(() => r.toSorted((a, b) => a.val - b.val));
  //   assert.equal(result().map((x) => x.val)).toEqual([1, 2, 3]);
  //   assert.equal(isProxy(result()[0])).toBe(true);
  //
  //   r[0].val = 4;
  //   assert.equal(result().map((x) => x.val)).toEqual([1, 3, 4]);
  //
  //   r.pop();
  //   assert.equal(result().map((x) => x.val)).toEqual([1, 4]);
  //
  //   const deep = makeObservable([{ val: 2 }, { val: 1 }, { val: 3 }]);
  //
  //   result = memo(() => deep.toSorted((a, b) => a.val - b.val));
  //   assert.equal(result().map((x) => x.val)).toEqual([1, 2, 3]);
  //   assert.equal(isProxy(result()[0])).toBe(true);
  //
  //   deep[0].val = 4;
  //   assert.equal(result().map((x) => x.val)).toEqual([1, 3, 4]);
  // });
  //
  // // Node 20+
  //
  // test(`array: vue array instrumentation: toSpliced`, (ctx) => {
  //   const array = makeObservable([1, 2, 3]);
  //   assert.equal(array).toEqual([1, 2, 3]);
  //
  //   const result = memo(() => array.toSpliced(1, 1, -2));
  //   assert.equal(result()).toEqual([1, -2, 3]);
  //
  //   assert.equal(array).toEqual([1, 2, 3]);
  //
  //   array[0] = 0;
  //   assert.equal(array).toEqual([0, 2, 3]);
  //
  //   assert.equal(result()).toEqual([0, -2, 3]);
  //
  //   assert.equal(array).toEqual([0, 2, 3]);
  // });
  //
  // test(`array: vue array instrumentation: values`, (ctx) => {
  //   const reactive = makeObservable([{ val: 1 }, { val: 2 }]);
  //   const result = memo(() => Array.from(reactive.values()));
  //   assert.equal(result()).toEqual([{ val: 1 }, { val: 2 }]);
  //   assert.equal(isProxy(result()[0])).toBe(true);
  //
  //   reactive.pop();
  //   assert.equal(result()).toEqual([{ val: 1 }]);
  //
  //   const deep = makeObservable([{ val: 1 }, { val: 2 }]);
  //   const firstItem = Array.from(deep.values())[0];
  //   assert.equal(isProxy(firstItem)).toBe(true);
  // });
  //
  // // map
  //
  // if (supportsMap) {
  //   // vue
  //
  //   test(`Map: instanceof`, (ctx) => {
  //     const original = new Map();
  //     const observed = makeObservable(original);
  //     const observed2 = makeObservable({ value: original });
  //     const observed3 = makeObservable([original]);
  //
  //     assert.equal(original instanceof Map).toBe(true);
  //     assert.equal(observed instanceof Map).toBe(true);
  //     assert.equal(observed2.value instanceof Map).toBe(true);
  //     assert.equal(observed3[0] instanceof Map).toBe(true);
  //
  //     assert.equal(isProxy(original)).toBe(false);
  //     assert.equal(isProxy(observed)).toBe(true);
  //     assert.equal(isProxy(observed2.value)).toBe(true);
  //     assert.equal(isProxy(observed3[0])).toBe(true);
  //   });
  //
  //   test(`Map: should observe mutations`, (ctx) => {
  //     let dummy;
  //     const map = makeObservable(new Map());
  //     const execute = memo(() => {
  //       dummy = map.get('key');
  //     });
  //     execute();
  //
  //     assert.equal(dummy).toBe(undefined);
  //     map.set('key', 'value');
  //     execute();
  //
  //     assert.equal(dummy).toBe('value');
  //     map.set('key', 'value2');
  //     execute();
  //
  //     assert.equal(dummy).toBe('value2');
  //     map.delete('key');
  //     execute();
  //
  //     assert.equal(dummy).toBe(undefined);
  //   });
  //
  //   test(`Map: should observe mutations with observed value as key`, (ctx) => {
  //     let dummy;
  //     const key = makeObservable({});
  //     const value = makeObservable({});
  //     const map = makeObservable(new Map());
  //     const execute = memo(() => {
  //       dummy = map.get(key);
  //     });
  //     execute();
  //
  //     assert.equal(dummy).toBe(undefined);
  //     map.set(key, value);
  //     execute();
  //
  //     assert.equal(dummy).toBe(value);
  //     map.delete(key);
  //     execute();
  //
  //     assert.equal(dummy).toBe(undefined);
  //   });
  //
  //   test(`Map: should observe size mutations`, (ctx) => {
  //     let dummy;
  //     const map = makeObservable(new Map());
  //     const execute = memo(() => (dummy = map.size));
  //     execute();
  //
  //     assert.equal(dummy).toBe(0);
  //
  //     map.set('key1', 'value');
  //     execute();
  //
  //     map.set('key2', 'value2');
  //     execute();
  //     assert.equal(dummy).toBe(2);
  //
  //     map.delete('key1');
  //     execute();
  //     assert.equal(dummy).toBe(1);
  //
  //     map.clear();
  //     execute();
  //     assert.equal(dummy).toBe(0);
  //   });
  //
  //   test(`Map: should observe for of iteration`, (ctx) => {
  //     let dummy;
  //     const map = makeObservable(new Map());
  //     const execute = memo(() => {
  //       dummy = 0;
  //       for (const [key, num] of map) {
  //         key;
  //         dummy += num;
  //       }
  //     });
  //     execute();
  //
  //     assert.equal(dummy).toBe(0);
  //     map.set('key1', 3);
  //     execute();
  //
  //     assert.equal(dummy).toBe(3);
  //     map.set('key2', 2);
  //     execute();
  //
  //     assert.equal(dummy).toBe(5);
  //
  //     // iteration should track mutation of existing entries (#709)
  //     map.set('key1', 4);
  //     execute();
  //     assert.equal(dummy).toBe(6);
  //
  //     map.delete('key1');
  //     execute();
  //     assert.equal(dummy).toBe(2);
  //
  //     map.clear();
  //     execute();
  //     assert.equal(dummy).toBe(0);
  //   });
  //
  //   test(`Map: should observe forEach iteration`, (ctx) => {
  //     let dummy;
  //     const map = makeObservable(new Map());
  //     const execute = memo(() => {
  //       dummy = 0;
  //       map.forEach((num) => (dummy += num));
  //     });
  //     execute();
  //
  //     assert.equal(dummy).toBe(0);
  //     map.set('key1', 3);
  //     execute();
  //
  //     assert.equal(dummy).toBe(3);
  //     map.set('key2', 2);
  //     execute();
  //
  //     assert.equal(dummy).toBe(5);
  //     // iteration should track mutation of existing entries (#709)
  //     map.set('key1', 4);
  //     execute();
  //
  //     assert.equal(dummy).toBe(6);
  //     map.delete('key1');
  //     execute();
  //
  //     assert.equal(dummy).toBe(2);
  //     map.clear();
  //     execute();
  //
  //     assert.equal(dummy).toBe(0);
  //   });
  //
  //   test(`Map: should observe keys iteration`, (ctx) => {
  //     let dummy;
  //     const map = makeObservable(new Map());
  //     const execute = memo(() => {
  //       dummy = 0;
  //       for (const key of map.keys()) {
  //         dummy += key;
  //       }
  //     });
  //     execute();
  //
  //     assert.equal(dummy).toBe(0);
  //     map.set(3, 3);
  //     execute();
  //
  //     assert.equal(dummy).toBe(3);
  //     map.set(2, 2);
  //     execute();
  //
  //     assert.equal(dummy).toBe(5);
  //     map.delete(3);
  //     execute();
  //
  //     assert.equal(dummy).toBe(2);
  //     map.clear();
  //     execute();
  //
  //     assert.equal(dummy).toBe(0);
  //   });
  //
  //   test(`Map: should observe values iteration`, (ctx) => {
  //     let dummy;
  //     const map = makeObservable(new Map());
  //     const execute = memo(() => {
  //       dummy = 0;
  //       for (const num of map.values()) {
  //         dummy += num;
  //       }
  //     });
  //     execute();
  //     assert.equal(dummy).toBe(0);
  //
  //     map.set('key1', 3);
  //     execute();
  //     assert.equal(dummy).toBe(3);
  //
  //     map.set('key2', 2);
  //     execute();
  //     assert.equal(dummy).toBe(5);
  //
  //     // iteration should track mutation of existing entries (#709)
  //     map.set('key1', 4);
  //     execute();
  //     assert.equal(dummy).toBe(6);
  //
  //     map.delete('key1');
  //     execute();
  //     assert.equal(dummy).toBe(2);
  //
  //     map.clear();
  //     execute();
  //     assert.equal(dummy).toBe(0);
  //   });
  //
  //   test(`Map: should observe entries iteration`, (ctx) => {
  //     let dummy;
  //     let dummy2;
  //     const map = makeObservable(new Map());
  //     const execute = memo(() => {
  //       dummy = '';
  //       dummy2 = 0;
  //       for (const [key, num] of map.entries()) {
  //         dummy += key;
  //         dummy2 += num;
  //       }
  //     });
  //     execute();
  //
  //     assert.equal(dummy).toBe('');
  //     assert.equal(dummy2).toBe(0);
  //     map.set('key1', 3);
  //     execute();
  //
  //     assert.equal(dummy).toBe('key1');
  //     assert.equal(dummy2).toBe(3);
  //     map.set('key2', 2);
  //     execute();
  //
  //     assert.equal(dummy).toBe('key1key2');
  //     assert.equal(dummy2).toBe(5);
  //     // iteration should track mutation of existing entries (#709)
  //     map.set('key1', 4);
  //     execute();
  //
  //     assert.equal(dummy).toBe('key1key2');
  //     assert.equal(dummy2).toBe(6);
  //     map.delete('key1');
  //     execute();
  //
  //     assert.equal(dummy).toBe('key2');
  //     assert.equal(dummy2).toBe(2);
  //     map.clear();
  //     execute();
  //
  //     assert.equal(dummy).toBe('');
  //     assert.equal(dummy2).toBe(0);
  //   });
  //
  //   test(`Map: should be triggered by clearing`, (ctx) => {
  //     let dummy;
  //     const map = makeObservable(new Map());
  //     const execute = memo(() => (dummy = map.get('key')));
  //
  //     assert.equal(dummy).toBe(undefined);
  //     map.set('key', 3);
  //     execute();
  //
  //     assert.equal(dummy).toBe(3);
  //     map.clear();
  //     execute();
  //
  //     assert.equal(dummy).toBe(undefined);
  //   });
  //
  //   test(`Map: should observe custom property mutations`, (ctx) => {
  //     let dummy;
  //     const map = makeObservable(new Map());
  //     const execute = memo(() => (dummy = map.customProp));
  //     execute();
  //
  //     assert.equal(dummy).toBe(undefined);
  //     map.customProp = 'Hello World';
  //     execute();
  //
  //     assert.equal(dummy).toBe('Hello World');
  //   });
  //
  //   test(`Map: should not observe non value changing mutations`, (ctx) => {
  //     let dummy;
  //     const map = makeObservable(new Map());
  //     let calls = 0;
  //     const execute = memo(() => {
  //       calls++;
  //       dummy = map.get('key');
  //     });
  //     execute();
  //
  //     assert.equal(dummy).toBe(undefined);
  //     assert.equal(calls).toBe(1);
  //
  //     map.set('key', undefined);
  //     execute();
  //     assert.equal(dummy).toBe(undefined);
  //     assert.equal(calls).toBe(1);
  //
  //     map.set('key', 'value');
  //     execute();
  //     assert.equal(dummy).toBe('value');
  //     assert.equal(calls).toBe(2);
  //
  //     map.set('key', 'value');
  //     execute();
  //     assert.equal(dummy).toBe('value');
  //     assert.equal(calls).toBe(2);
  //
  //     map.set('key', undefined);
  //     execute();
  //     assert.equal(dummy).toBe(undefined);
  //     assert.equal(calls).toBe(3);
  //
  //     map.delete('key');
  //     execute();
  //     assert.equal(dummy).toBe(undefined);
  //     assert.equal(calls).toBe(3);
  //
  //     map.delete('key');
  //     execute();
  //     assert.equal(dummy).toBe(undefined);
  //     assert.equal(calls).toBe(3);
  //
  //     map.clear();
  //     execute();
  //     assert.equal(dummy).toBe(undefined);
  //     assert.equal(calls).toBe(3);
  //   });
  //
  //   test(`Map: should not pollute original Map with Proxies`, (ctx) => {
  //     const map = new Map();
  //     const observed = makeObservable(map);
  //     const original = {};
  //     const value = makeObservable(original);
  //     observed.set('key', value);
  //     assert.equal(map.get('key')).toBe(value);
  //     assert.equal(map.get('key')).not.toBe(original);
  //   });
  //
  //   test(`Map: should return observable versions of contained values`, (ctx) => {
  //     const observed = makeObservable(new Map());
  //     const value = {};
  //     observed.set('key', value);
  //     const wrapped = observed.get('key');
  //     assert.equal(wrapped).not.toBe(value);
  //   });
  //
  //   test(`Map: should observed nested data`, (ctx) => {
  //     const observed = makeObservable(new Map());
  //     observed.set('key', { a: 1 });
  //     let dummy;
  //     const execute = memo(() => {
  //       dummy = observed.get('key').a;
  //     });
  //     execute();
  //
  //     observed.get('key').a = 2;
  //     assert.equal(dummy).toBe(2);
  //   });
  //
  //   test(`Map: should observe nested values in iterations (forEach)`, (ctx) => {
  //     const map = makeObservable(new Map([[1, { foo: 1 }]]));
  //     let dummy;
  //     const execute = memo(() => {
  //       dummy = 0;
  //       map.forEach((value) => {
  //         dummy += value.foo;
  //       });
  //     });
  //     execute();
  //
  //     assert.equal(dummy).toBe(1);
  //     map.get(1).foo++;
  //     assert.equal(dummy).toBe(2);
  //   });
  //
  //   test(`Map: should observe nested values in iterations (values)`, (ctx) => {
  //     const map = makeObservable(new Map([[1, { foo: 1 }]]));
  //     let dummy;
  //     const execute = memo(() => {
  //       dummy = 0;
  //       for (const value of map.values()) {
  //         dummy += value.foo;
  //       }
  //     });
  //     execute();
  //
  //     assert.equal(dummy).toBe(1);
  //     map.get(1).foo++;
  //     assert.equal(dummy).toBe(2);
  //   });
  //
  //   test(`Map: should observe nested values in iterations (entries)`, (ctx) => {
  //     const key = {};
  //     const map = makeObservable(new Map([[key, { foo: 1 }]]));
  //     let dummy;
  //     const execute = memo(() => {
  //       dummy = 0;
  //       for (const [key, value] of map.entries()) {
  //         key;
  //
  //         dummy += value.foo;
  //       }
  //     });
  //     execute();
  //
  //     assert.equal(dummy).toBe(1);
  //     map.get(key).foo++;
  //     assert.equal(dummy).toBe(2);
  //   });
  //
  //   test(`Map: should observe nested values in iterations (for...of)`, (ctx) => {
  //     const key = {};
  //     const map = makeObservable(new Map([[key, { foo: 1 }]]));
  //     let dummy;
  //     const execute = memo(() => {
  //       dummy = 0;
  //       for (const [key, value] of map) {
  //         key;
  //
  //         dummy += value.foo;
  //       }
  //     });
  //     execute();
  //
  //     assert.equal(dummy).toBe(1);
  //     map.get(key).foo++;
  //     assert.equal(dummy).toBe(2);
  //   });
  //
  //   test(`${
  //     lib
  //   }Map: should not be trigger when the value and the old value both are NaN`, (ctx) => {
  //     const map = makeObservable(new Map([['foo', NaN]]));
  //     let calls = 0;
  //     const execute = memo(() => {
  //       calls++;
  //       map.get('foo');
  //     });
  //     execute();
  //
  //     map.set('foo', NaN);
  //     execute();
  //
  //     assert.equal(calls).toBe(1);
  //   });
  //
  //   test(`Map: should work with reactive keys in raw map`, (ctx) => {
  //     const raw = new Map();
  //     const key = makeObservable({});
  //     raw.set(key, 1);
  //     const map = makeObservable(raw);
  //
  //     assert.equal(map.has(key)).toBe(true);
  //     assert.equal(map.get(key)).toBe(1);
  //
  //     assert.equal(map.delete(key)).toBe(true);
  //     assert.equal(map.has(key)).toBe(false);
  //     assert.equal(map.get(key)).toBe(undefined);
  //   });
  //
  //   test(`Map: should track set of makeObservable keys in raw map`, (ctx) => {
  //     const raw = new Map();
  //     const key = makeObservable({});
  //     raw.set(key, 1);
  //     const map = makeObservable(raw);
  //
  //     let dummy;
  //     const execute = memo(() => {
  //       dummy = map.get(key);
  //     });
  //     execute();
  //
  //     assert.equal(dummy).toBe(1);
  //
  //     map.set(key, 2);
  //     execute();
  //
  //     assert.equal(dummy).toBe(2);
  //   });
  //
  //   test(`Map: should track deletion of reactive keys in raw map`, (ctx) => {
  //     const raw = new Map();
  //     const key = makeObservable({});
  //     raw.set(key, 1);
  //     const map = makeObservable(raw);
  //
  //     let dummy;
  //     const execute = memo(() => {
  //       dummy = map.has(key);
  //     });
  //     execute();
  //
  //     assert.equal(dummy).toBe(true);
  //
  //     map.delete(key);
  //     execute();
  //
  //     assert.equal(dummy).toBe(false);
  //   });
  //
  //   // #877
  //   test(`Map: should not trigger key iteration when setting existing keys `, (ctx) => {
  //     const map = makeObservable(new Map());
  //
  //     let calls = 0;
  //     const execute = memo(() => {
  //       calls++;
  //       const keys = [];
  //       for (const key of map.keys()) {
  //         keys.push(key);
  //       }
  //     });
  //     execute();
  //     assert.equal(calls).toBe(1);
  //
  //     map.set('a', 0);
  //     execute();
  //     assert.equal(calls).toBe(2);
  //
  //     map.set('b', 0);
  //     execute();
  //     assert.equal(calls).toBe(3);
  //
  //     // keys didn't change, should not trigger
  //     map.set('b', 1);
  //     execute();
  //
  //     assert.equal(calls).toBe(3);
  //   });
  //
  //   test(`Map: should return proxy from Map.set call `, (ctx) => {
  //     const map = makeObservable(new Map());
  //     const result = map.set('a', 'a');
  //     assert.equal(result).toBe(map);
  //   });
  //
  //   test(`Map: observing subtypes of IterableCollections(Map, Set)`, (ctx) => {
  //     // subtypes of Map
  //     class CustomMap extends Map {}
  //     const cmap = makeObservable(new CustomMap());
  //
  //     assert.equal(cmap instanceof Map).toBe(true);
  //
  //     const val = {};
  //     cmap.set('key', val);
  //     assert.equal(isProxy(cmap.get('key'))).toBe(true);
  //     assert.equal(cmap.get('key')).not.toBe(val);
  //   });
  //
  //   test(`Map: observing subtypes of IterableCollections(Map, Set) deep`, (ctx) => {
  //     // subtypes of Map
  //     class CustomMap extends Map {}
  //     const cmap = makeObservable({ value: new CustomMap() });
  //
  //     assert.equal(cmap.value instanceof Map).toBe(true);
  //
  //     const val = {};
  //     cmap.value.set('key', val);
  //     assert.equal(isProxy(cmap.value.get('key'))).toBe(true);
  //     assert.equal(cmap.value.get('key')).not.toBe(val);
  //   });
  //
  //   test(`Map: should work with observed value as key`, (ctx) => {
  //     const key = makeObservable({});
  //     const m = makeObservable(new Map());
  //     m.set(key, 1);
  //     const roM = m;
  //
  //     let calls = 0;
  //     const execute = memo(() => {
  //       calls++;
  //       roM.get(key);
  //     });
  //     execute();
  //
  //     assert.equal(calls).toBe(1);
  //     m.set(key, 1);
  //     execute();
  //
  //     assert.equal(calls).toBe(1);
  //     m.set(key, 2);
  //     execute();
  //
  //     assert.equal(calls).toBe(2);
  //   });
  //
  //   // solid-primitives
  //
  //   test(`Map: behaves like a Map`, (ctx) => {
  //     const obj1 = {};
  //     const obj2 = {};
  //
  //     const map = makeObservable(
  //       new Map([
  //         [obj1, 123],
  //         [1, 'foo'],
  //       ])
  //     );
  //
  //     assert.equal(map.has(obj1)).toBe(true);
  //     assert.equal(map.has(1)).toBe(true);
  //     assert.equal(map.has(2)).toBe(false);
  //
  //     assert.equal(map.get(obj1)).toBe(123);
  //     assert.equal(map.get(1)).toBe('foo');
  //
  //     map.set(obj2, 'bar');
  //     assert.equal(map.get(obj2)).toBe('bar');
  //     map.set(obj1, 'change');
  //     assert.equal(map.get(obj1)).toBe('change');
  //
  //     assert.equal(map.delete(obj2)).toBe(true);
  //     assert.equal(map.has(obj2)).toBe(false);
  //
  //     assert.equal(map.size).toBe(2);
  //     map.clear();
  //     assert.equal(map.size).toBe(0);
  //
  //     assert.equal(map instanceof Map).toBe(true);
  //   });
  //
  //   test(`Map: has() is reactive`, (ctx) => {
  //     const map = makeObservable(
  //       new Map([
  //         [1, {}],
  //         [1, {}],
  //         [2, {}],
  //         [3, {}],
  //       ])
  //     );
  //
  //     const captured = [];
  //     const execute = memo(() => {
  //       captured.push(map.has(2));
  //     });
  //     execute();
  //
  //     assert.equal(captured).toEqual([true]);
  //
  //     map.set(4, {});
  //     assert.equal(captured).toEqual([true]);
  //
  //     map.delete(4);
  //     assert.equal(captured).toEqual([true]);
  //
  //     map.delete(2);
  //     assert.equal(captured).toEqual([true, false]);
  //
  //     map.set(2, {});
  //     assert.equal(captured).toEqual([true, false, true]);
  //
  //     map.clear();
  //     assert.equal(captured).toEqual([true, false, true, false]);
  //   });
  //
  //   test(`Map: get() is reactive`, (ctx) => {
  //     const obj1 = {};
  //     const obj2 = {};
  //     const obj3 = {};
  //     const obj4 = {};
  //
  //     const map = makeObservable(
  //       new Map([
  //         [1, obj1],
  //         [1, obj2],
  //         [2, obj3],
  //         [3, obj4],
  //       ])
  //     );
  //
  //     let calls = 0;
  //     let dummy;
  //     const execute = memo(() => {
  //       calls++;
  //       dummy = map.get(2);
  //     });
  //     execute();
  //
  //     map.set(4, {});
  //     assert.equal(calls).toBe(1);
  //
  //     map.delete(4);
  //     assert.equal(calls).toBe(1);
  //
  //     map.delete(2);
  //     assert.equal(dummy).toBe(undefined);
  //     assert.equal(calls).toBe(2);
  //
  //     map.set(2, obj4);
  //     assert.equal(dummy).toBe(makeObservable(obj4));
  //
  //     map.set(2, obj4);
  //     assert.equal(calls).toBe(3);
  //
  //     map.clear();
  //     assert.equal(dummy).toBe(undefined);
  //     assert.equal(calls).toBe(4);
  //   });
  //
  //   test(`Map: spread values is reactive`, (ctx) => {
  //     const map = makeObservable(
  //       new Map([
  //         [1, 'a'],
  //         [1, 'b'],
  //         [2, 'c'],
  //         [3, 'd'],
  //       ])
  //     );
  //
  //     const captured = [];
  //
  //     const execute = memo(() => captured.push([...map.values()]));
  //     execute();
  //
  //     assert.equal(captured.length).toBe(1);
  //     assert.equal(captured[0]).toEqual(['b', 'c', 'd']);
  //
  //     map.set(4, 'e');
  //     assert.equal(captured.length).toBe(2);
  //     assert.equal(captured[1]).toEqual(['b', 'c', 'd', 'e']);
  //
  //     map.set(4, 'e');
  //     assert.equal(captured.length).toBe(2);
  //
  //     map.delete(4);
  //     assert.equal(captured.length).toBe(3);
  //     assert.equal(captured[2]).toEqual(['b', 'c', 'd']);
  //
  //     map.delete(2);
  //     assert.equal(captured.length).toBe(4);
  //     assert.equal(captured[3]).toEqual(['b', 'd']);
  //
  //     map.delete(2);
  //     assert.equal(captured.length).toBe(4);
  //
  //     map.set(2, 'a');
  //     assert.equal(captured.length).toBe(5);
  //     assert.equal(captured[4]).toEqual(['b', 'd', 'a']);
  //
  //     map.set(2, 'b');
  //     assert.equal(captured.length).toBe(6);
  //     assert.equal(captured[5]).toEqual(['b', 'd', 'b']);
  //
  //     map.clear();
  //     assert.equal(captured.length).toBe(7);
  //     assert.equal(captured[6]).toEqual([]);
  //   });
  //
  //   test(`Map: .size is reactive`, (ctx) => {
  //     const map = makeObservable(
  //       new Map([
  //         [1, {}],
  //         [1, {}],
  //         [2, {}],
  //         [3, {}],
  //       ])
  //     );
  //
  //     const captured = [];
  //     const execute = memo(() => {
  //       captured.push(map.size);
  //     });
  //     execute();
  //
  //     assert.equal(captured.length).toBe(1);
  //     assert.equal(captured[0]).toBe(3);
  //
  //     map.set(4, {});
  //     assert.equal(captured.length).toBe(2);
  //     assert.equal(captured[1]).toBe(4);
  //
  //     map.delete(4);
  //     assert.equal(captured.length).toBe(3);
  //     assert.equal(captured[2]).toBe(3);
  //
  //     map.delete(2);
  //     assert.equal(captured.length).toBe(4);
  //     assert.equal(captured[3]).toBe(2);
  //
  //     map.delete(2);
  //     assert.equal(captured.length).toBe(4);
  //
  //     map.set(2, {});
  //     assert.equal(captured.length).toBe(5);
  //     assert.equal(captured[4]).toBe(3);
  //
  //     map.set(2, {});
  //     assert.equal(captured.length).toBe(5);
  //
  //     map.clear();
  //     assert.equal(captured.length).toBe(6);
  //     assert.equal(captured[5]).toBe(0);
  //   });
  //
  //   test(`Map: .keys() is reactive`, (ctx) => {
  //     const map = makeObservable(
  //       new Map([
  //         [1, 'a'],
  //         [2, 'b'],
  //         [3, 'c'],
  //         [4, 'd'],
  //       ])
  //     );
  //
  //     const captured = [];
  //
  //     const execute = memo(() => {
  //       const run = [];
  //       for (const key of map.keys()) {
  //         run.push(key);
  //         if (key === 3) break; // don't iterate over all keys
  //       }
  //       captured.push(run);
  //     });
  //     execute();
  //
  //     assert.equal(captured.length).toBe(1);
  //     assert.equal(captured[0]).toEqual([1, 2, 3]);
  //
  //     map.set(1);
  //     assert.equal(captured.length).toBe(1);
  //
  //     map.set(5);
  //     assert.equal(captured.length).toBe(1);
  //
  //     map.delete(1);
  //     assert.equal(captured.length).toBe(2);
  //     assert.equal(captured[1]).toEqual([2, 3]);
  //   });
  //
  //   test(`Map: .values() is reactive`, (ctx) => {
  //     const map = makeObservable(
  //       new Map([
  //         [1, 'a'],
  //         [2, 'b'],
  //         [3, 'c'],
  //         [4, 'd'],
  //       ])
  //     );
  //
  //     const captured = [];
  //
  //     const execute = memo(() => {
  //       const run = [];
  //       let i = 0;
  //       for (const v of map.values()) {
  //         run.push(v);
  //         if (i === 2) break; // don't iterate over all keys
  //         i += 1;
  //       }
  //       captured.push(run);
  //     });
  //     execute();
  //
  //     assert.equal(captured.length).toBe(1);
  //     assert.equal(captured[0]).toEqual(['a', 'b', 'c']);
  //
  //     map.set(1, 'e');
  //     assert.equal(captured.length).toBe(2);
  //     assert.equal(captured[1]).toEqual(['e', 'b', 'c']);
  //
  //     map.set(4, 'f');
  //     assert.equal(captured.length).toBe(2);
  //
  //     map.delete(4);
  //     assert.equal(captured.length).toBe(2);
  //
  //     map.delete(1);
  //     assert.equal(captured.length).toBe(3);
  //     assert.equal(captured[2]).toEqual(['b', 'c']);
  //   });
  //
  //   test(`Map: .entries() is reactive`, (ctx) => {
  //     const map = makeObservable(
  //       new Map([
  //         [1, 'a'],
  //         [2, 'b'],
  //         [3, 'c'],
  //         [4, 'd'],
  //       ])
  //     );
  //
  //     const captured = [];
  //
  //     const execute = memo(() => {
  //       const run = [];
  //       let i = 0;
  //       for (const e of map.entries()) {
  //         run.push(e);
  //         if (i === 2) break; // don't iterate over all keys
  //         i += 1;
  //       }
  //       captured.push(run);
  //     });
  //     execute();
  //
  //     assert.equal(captured.length).toBe(1);
  //     assert.equal(captured[0]).toEqual([
  //       [1, 'a'],
  //       [2, 'b'],
  //       [3, 'c'],
  //     ]);
  //
  //     map.set(1, 'e');
  //     assert.equal(captured.length).toBe(2);
  //     assert.equal(captured[1]).toEqual([
  //       [1, 'e'],
  //       [2, 'b'],
  //       [3, 'c'],
  //     ]);
  //
  //     map.set(4, 'f');
  //     assert.equal(captured.length).toBe(2);
  //
  //     map.delete(4);
  //     assert.equal(captured.length).toBe(2);
  //
  //     map.delete(1);
  //     assert.equal(captured.length).toBe(3);
  //     assert.equal(captured[2]).toEqual([
  //       [2, 'b'],
  //       [3, 'c'],
  //     ]);
  //   });
  //
  //   test(`Map: .forEach() is reactive`, (ctx) => {
  //     const map = makeObservable(
  //       new Map([
  //         [1, 'a'],
  //         [2, 'b'],
  //         [3, 'c'],
  //         [4, 'd'],
  //       ])
  //     );
  //
  //     const captured = [];
  //
  //     const execute = memo(() => {
  //       const run = [];
  //       map.forEach((v, k) => {
  //         run.push([k, v]);
  //       });
  //       captured.push(run);
  //     });
  //     execute();
  //
  //     assert.equal(captured.length).toBe(1);
  //     assert.equal(captured[0]).toEqual([
  //       [1, 'a'],
  //       [2, 'b'],
  //       [3, 'c'],
  //       [4, 'd'],
  //     ]);
  //
  //     map.set(1, 'e');
  //     assert.equal(captured.length).toBe(2);
  //     assert.equal(captured[1]).toEqual([
  //       [1, 'e'],
  //       [2, 'b'],
  //       [3, 'c'],
  //       [4, 'd'],
  //     ]);
  //
  //     map.delete(4);
  //     assert.equal(captured.length).toBe(3);
  //     assert.equal(captured[2]).toEqual([
  //       [1, 'e'],
  //       [2, 'b'],
  //       [3, 'c'],
  //     ]);
  //   });
  // }
  // // misc 2
  //
  // test(`misc 2: avoids type confusion with inherited properties [oby]`, (ctx) => {
  //   class Test4 {
  //     a = 13;
  //     get b() {
  //       return this.a * 4;
  //     }
  //     get myA() {
  //       return this.a;
  //     }
  //     set myA(value) {
  //       this.a = value;
  //     }
  //   }
  //   class Test3 extends Test4 {}
  //   class Tests2 extends Test3 {
  //     a = 1;
  //   }
  //   class Test extends Tests2 {}
  //
  //   const m = makeObservable(new Test());
  //
  //   let calls = 0;
  //   const execute = memo(() => {
  //     m.b;
  //     calls++;
  //   });
  //   execute();
  //
  //   const increment = () => {
  //     m.a++;
  //     execute();
  //   };
  //
  //   // initial
  //   assert.equal(m.a).toBe(1);
  //   assert.equal(m.b).toBe(4);
  //   assert.equal(m.myA).toBe(1);
  //   assert.equal(calls).toBe(1);
  //
  //   // incrementing
  //   increment();
  //   assert.equal(m.a).toBe(2);
  //   assert.equal(m.b).toBe(8);
  //   assert.equal(m.myA).toBe(2);
  //   assert.equal(calls).toBe(2);
  //
  //   increment();
  //   assert.equal(m.a).toBe(3);
  //   assert.equal(m.b).toBe(12);
  //   assert.equal(m.myA).toBe(3);
  //   assert.equal(calls).toBe(3);
  // });
  //
  // // misc
  //
  // test(`misc 2: doesnt change keys`, (ctx) => {
  //   let result;
  //
  //   // object
  //   result = makeObservable({});
  //   assert.equal(Object.keys(result).length).toBe(0);
  //
  //   // array
  //   result = makeObservable([]);
  //   assert.equal(Object.keys(result).length).toBe(0);
  //
  //   // deep object
  //   result = makeObservable({ value: {} });
  //   assert.equal(Object.keys(result.value).length).toBe(0);
  //
  //   // deep array
  //   result = makeObservable({ value: [] });
  //   assert.equal(Object.keys(result.value).length).toBe(0);
  //
  //   // map
  //   result = makeObservable(new Map());
  //   assert.equal(Object.keys(result).length).toBe(0);
  // });
  //
  // test(`misc 2: reacts when getter/setter using external signal`, (ctx) => {
  //   const [read, write] = signal(1);
  //   // object
  //   const result = makeObservable({
  //     get lala() {
  //       read();
  //       return 1;
  //     },
  //     set lala(value) {
  //       write(value);
  //     },
  //   });
  //
  //   let calls = 0;
  //   const execute = memo(() => {
  //     result.lala;
  //     calls++;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   write(1);
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   result.lala = 1;
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   result.lala = 2;
  //   execute();
  //   assert.equal(calls).toBe(2);
  //
  //   write(2);
  //   execute();
  //   assert.equal(calls).toBe(2);
  // });
  //
  // test(`misc 2: reacts when its only a getter with an external write`, (ctx) => {
  //   const [read, write] = signal(1);
  //   // object
  //   const result = makeObservable({
  //     get lala() {
  //       read();
  //       return 1;
  //     },
  //   });
  //
  //   let calls = 0;
  //   const execute = memo(() => {
  //     result.lala;
  //     calls++;
  //   });
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   write(1);
  //   execute();
  //   assert.equal(calls).toBe(1);
  //
  //   write(2);
  //   execute();
  //   assert.equal(calls).toBe(2);
  // });
  //
  // test(`misc 2: proxy invariants`, (ctx) => {
  //   const o = {
  //     frozen: Object.freeze({}),
  //   };
  //
  //   Object.defineProperty(o, 'test', {
  //     configurable: false,
  //     writable: false,
  //     value: { test: 1 },
  //   });
  //
  //   // if broken this will crash
  //   const result = makeObservable(o);
  //
  //   assert.equal(result.test).toBe(o.test);
  //
  //   assert.equal(result.frozen).toBe(o.frozen);
  // });
  //
  // test(`misc 2: can mutate child of frozen object 1`, (ctx) => {
  //   const source = makeObservable(
  //     Object.freeze({
  //       user: { name: 'John', last: 'Snow' },
  //     })
  //   );
  //
  //   assert.equal(source.user.name).toBe('John');
  //   assert.equal(source.user.last).toBe('Snow');
  //
  //   let called = 0;
  //
  //   const execute = memo(() => {
  //     source.user.name;
  //     source.user.last;
  //     called++;
  //   });
  //   execute();
  //   assert.equal(called).toBe(1);
  //
  //   source.user.name = 'quack';
  //   execute();
  //   assert.equal(called).toBe(2);
  //
  //   source.user.last = 'murci';
  //   execute();
  //   assert.equal(called).toBe(3);
  //
  //   assert.equal(source.user.name).toBe('quack');
  //   assert.equal(source.user.last).toBe('murci');
  //
  //   try {
  //     source.user = 'something else';
  //     // solid by design modifies frozen objects
  //     if (lib !== 'solid: ') {
  //       assert.equal('frozen value to not be changed').toBe(true);
  //     }
  //   } catch (e) {
  //     // this is expected to fail
  //   }
  // });
  //
  // test(`misc 2: can mutate child of frozen object 2`, (ctx) => {
  //   const source = makeObservable({
  //     data: Object.freeze({
  //       user: { name: 'John', last: 'Snow' },
  //     }),
  //   });
  //
  //   let called = 0;
  //
  //   const execute = memo(() => {
  //     called++;
  //
  //     source.data.user.name;
  //     source.data.user.last;
  //   });
  //   execute();
  //   assert.equal(called).toBe(1);
  //
  //   assert.equal(source.data.user.name).toBe('John');
  //   assert.equal(source.data.user.last).toBe('Snow');
  //
  //   source.data.user.name = 'quack';
  //   execute();
  //   assert.equal(called).toBe(2);
  //
  //   source.data.user.last = 'murci';
  //   execute();
  //   assert.equal(called).toBe(3);
  //
  //   assert.equal(source.data.user.name).toBe('quack');
  //   assert.equal(source.data.user.last).toBe('murci');
  //
  //   try {
  //     source.data.user = 'something else';
  //     // solid by design modifies frozen objects
  //     if (lib !== 'solid: ') {
  //       assert.equal('frozen value to not be changed').toBe(true);
  //     }
  //   } catch (e) {
  //     // this is expected to fail
  //   }
  // });
  //
  // test(`misc 2: can mutate child of frozen object 3`, (ctx) => {
  //   const source = makeObservable(
  //     Object.freeze({
  //       data: Object.freeze({
  //         user: { store: { name: 'John', last: 'Snow' } },
  //       }),
  //     })
  //   );
  //
  //   let called = 0;
  //
  //   const execute = memo(() => {
  //     called++;
  //
  //     source.data.user.store.name;
  //     source.data.user.store.last;
  //   });
  //   execute();
  //   assert.equal(called).toBe(1);
  //
  //   assert.equal(source.data.user.store.name).toBe('John');
  //   assert.equal(source.data.user.store.last).toBe('Snow');
  //
  //   source.data.user.store.name = 'quack';
  //   execute();
  //   assert.equal(called).toBe(2);
  //
  //   source.data.user.store.last = 'murci';
  //   execute();
  //   assert.equal(called).toBe(3);
  //
  //   assert.equal(source.data.user.store.name).toBe('quack');
  //   assert.equal(source.data.user.store.last).toBe('murci');
  //
  //   try {
  //     source.data.user = 'something else';
  //     // solid by design modifies frozen objects
  //     if (lib !== 'solid: ') {
  //       assert.equal('frozen value to not be changed').toBe(true);
  //     }
  //   } catch (e) {
  //     // this is expected to fail
  //   }
  // });
  //
  // test(`${
  //   lib
  // }blacklist: doesnt creates a proxy for HTMLElement, Date, RegExp, Promise`, (ctx) => {
  //   const values = [
  //     document.createElement('div'),
  //     document.createElement('lala'),
  //     document.createElement('my-el'),
  //     new Date(),
  //     /test/i,
  //     new Promise(() => {}),
  //   ];
  //   for (const val of values) {
  //     assert.equal(isProxy(makeObservable(val))).toBe(false);
  //     assert.equal(isProxy(makeObservable({ nested: val }).nested)).toBe(false);
  //   }
  //
  //   // nested
  // });
  //
  // test(`${
  //   lib
  // }crash: doesnt crash with  window, globalThis, document, documentElement, body`, (ctx) => {
  //   const values = [window, globalThis, document, document.documentElement, document.body];
  //   for (const val of values) {
  //     assert.equal(isProxy(makeObservable(val))).toBe(false);
  //     assert.equal(isProxy(makeObservable({ nested: val }).nested)).toBe(false);
  //   }
  // });
  //
  // test(`prototype walk in the right order`, (ctx) => {
  //   class c {
  //     get value() {
  //       return 3;
  //     }
  //   }
  //
  //   class b extends c {
  //     get value() {
  //       return 1;
  //     }
  //   }
  //
  //   class a extends b {
  //     get value() {
  //       return 2;
  //     }
  //   }
  //
  //   assert.equal(new a().value).toBe(2);
  //   assert.equal(makeObservable(new a()).value).toBe(2);
  //
  //   class d1 {
  //     value = 4;
  //   }
  //   class c1 extends d1 {
  //     get value() {
  //       return 3;
  //     }
  //   }
  //
  //   class b1 extends c1 {
  //     get value() {
  //       return 1;
  //     }
  //   }
  //
  //   class a1 extends b1 {
  //     get value() {
  //       return 2;
  //     }
  //   }
  //
  //   assert.equal(new a1().value).toBe(4);
  //   assert.equal(makeObservable(new a1()).value).toBe(4);
  // });
  //
  // if (lib === 'pota: ') {
  //   // test should work with regular objects and with makeObservable too
  //   [identity, makeObservable].map((makeObservable) => {
  //     test(`reconcile replace - a simple object`, (ctx) => {
  //       const state = makeObservable({
  //         data: 2,
  //         missing: 'soon',
  //       });
  //
  //       assert.equal(state.data).toBe(2);
  //       assert.equal(state.missing).toBe('soon');
  //       replace(state, { data: 5 });
  //       assert.equal(state.data).toBe(5);
  //       assert.equal(state.missing).toBe(undefined);
  //       assert.equal(state).toEqual({ data: 5 });
  //     });
  //
  //     test(`reconcile replace - a super simple object`, (ctx) => {
  //       const state = makeObservable({
  //         missing: 'soon',
  //       });
  //
  //       assert.equal(state.missing).toBe('soon');
  //       replace(state, { missing: 5 });
  //       assert.equal(state.missing).toBe(5);
  //       assert.equal(state).toEqual({
  //         missing: 5,
  //       });
  //     });
  //
  //     test(`reconcile replace - array with nulls`, (ctx) => {
  //       const state = makeObservable([null, 'a']);
  //       assert.equal(state[0]).toBe(null);
  //       assert.equal(state[1]).toBe('a');
  //       replace(state, ['b', null]);
  //       assert.equal(state[0]).toBe('b');
  //       assert.equal(state[1]).toBe(null);
  //     });
  //
  //     test(`reconcile replace - a simple object on a nested path`, (ctx) => {
  //       const state = makeObservable({
  //         data: {
  //           user: {
  //             firstName: 'John',
  //             middleName: '',
  //             lastName: 'Snow',
  //           },
  //         },
  //       });
  //       assert.equal(state.data.user.firstName).toBe('John');
  //       assert.equal(state.data.user.lastName).toBe('Snow');
  //       replace(state.data.user, {
  //         firstName: 'Jake',
  //         middleName: 'R',
  //       });
  //       assert.equal(state.data.user.firstName).toBe('Jake');
  //       assert.equal(state.data.user.middleName).toBe('R');
  //       assert.equal(state.data.user.lastName).toBe(undefined);
  //     });
  //
  //     test(`${
  //       lib
  //     }reconcile replace - a simple object on a nested path with no prev state`, (ctx) => {
  //       const state = makeObservable({});
  //       assert.equal(state.user).toBe(undefined);
  //       replace(state, {
  //         user: { firstName: 'Jake', middleName: 'R' },
  //       });
  //       assert.equal(state.user.firstName).toBe('Jake');
  //       assert.equal(state.user.middleName).toBe('R');
  //     });
  //
  //     test(`reconcile replace - reorder a keyed array`, (ctx) => {
  //       const JOHN = { id: 1, firstName: 'John' };
  //       const NED = { id: 2, firstName: 'Ned' };
  //       const BRANDON = { id: 3, firstName: 'Brandon' };
  //       const ARYA = { id: 4, firstName: 'Arya' };
  //       const state = makeObservable(
  //         copy({
  //           users: [JOHN, NED, BRANDON],
  //         })
  //       );
  //
  //       assert.equal(state.users[0]).toEqual(JOHN);
  //       assert.equal(state.users[1]).toEqual(NED);
  //       assert.equal(state.users[2]).toEqual(BRANDON);
  //
  //       replace(state.users, [NED, JOHN, BRANDON]);
  //
  //       assert.equal(state.users[0]).toEqual(NED);
  //       assert.equal(state.users[1]).toEqual(JOHN);
  //       assert.equal(state.users[2]).toEqual(BRANDON);
  //
  //       replace(state.users, [NED, BRANDON, JOHN]);
  //       assert.equal(state.users[0]).toEqual(NED);
  //       assert.equal(state.users[1]).toEqual(BRANDON);
  //       assert.equal(state.users[2]).toEqual(JOHN);
  //
  //       replace(state.users, [NED, BRANDON, JOHN, ARYA]);
  //       assert.equal(state.users[0]).toEqual(NED);
  //       assert.equal(state.users[1]).toEqual(BRANDON);
  //       assert.equal(state.users[2]).toEqual(JOHN);
  //       assert.equal(state.users[3]).toEqual(ARYA);
  //
  //       replace(state.users, [BRANDON, JOHN, ARYA]);
  //       assert.equal(state.users[0]).toEqual(BRANDON);
  //       assert.equal(state.users[1]).toEqual(JOHN);
  //       assert.equal(state.users[2]).toEqual(ARYA);
  //     });
  //
  //     test(`reconcile replace - overwrite in non-keyed`, (ctx) => {
  //       const JOHN = { id: 1, firstName: 'John', lastName: 'Snow' };
  //       const NED = { id: 2, firstName: 'Ned', lastName: 'Stark' };
  //       const BRANDON = {
  //         id: 3,
  //         firstName: 'Brandon',
  //         lastName: 'Start',
  //       };
  //       const state = makeObservable(
  //         copy({
  //           users: [{ ...JOHN }, { ...NED }, { ...BRANDON }],
  //         })
  //       );
  //       assert.equal(state.users[0].id).toBe(1);
  //       assert.equal(state.users[0].firstName).toBe('John');
  //       assert.equal(state.users[1].id).toBe(2);
  //       assert.equal(state.users[1].firstName).toBe('Ned');
  //       assert.equal(state.users[2].id).toBe(3);
  //       assert.equal(state.users[2].firstName).toBe('Brandon');
  //       replace(state.users, [{ ...NED }, { ...JOHN }, { ...BRANDON }]);
  //       assert.equal(state.users[0].id).toBe(2);
  //       assert.equal(state.users[0].firstName).toBe('Ned');
  //       assert.equal(state.users[1].id).toBe(1);
  //       assert.equal(state.users[1].firstName).toBe('John');
  //       assert.equal(state.users[2].id).toBe(3);
  //       assert.equal(state.users[2].firstName).toBe('Brandon');
  //     });
  //
  //     test(`reconcile replace - top level key mismatch`, (ctx) => {
  //       const JOHN = { id: 1, firstName: 'John', lastName: 'Snow' };
  //       const NED = { id: 2, firstName: 'Ned', lastName: 'Stark' };
  //
  //       const user = makeObservable(JOHN);
  //       assert.equal(user.id).toBe(1);
  //       assert.equal(user.firstName).toBe('John');
  //       replace(user, NED);
  //       assert.equal(user.id).toBe(2);
  //       assert.equal(user.firstName).toBe('Ned');
  //     });
  //     test(`reconcile replace - nested top level key mismatch`, (ctx) => {
  //       const JOHN = { id: 1, firstName: 'John', lastName: 'Snow' };
  //       const NED = { id: 2, firstName: 'Ned', lastName: 'Stark' };
  //
  //       const user = makeObservable({ user: JOHN });
  //       assert.equal(user.user.id).toBe(1);
  //       assert.equal(user.user.firstName).toBe('John');
  //       replace(user.user, NED);
  //       assert.equal(user.user.id).toBe(2);
  //       assert.equal(user.user.firstName).toBe('Ned');
  //     });
  //
  //     test(`reconcile replace - top level key missing`, (ctx) => {
  //       const store = makeObservable({
  //         id: 0,
  //         value: 'value',
  //       });
  //       replace(store, {});
  //       assert.equal(store.id).toBe(undefined);
  //       assert.equal(store.value).toBe(undefined);
  //     });
  //     test(`reconcile replace - overwrite an object with an array`, (ctx) => {
  //       const store = makeObservable({
  //         value: { a: { b: 1 } },
  //       });
  //
  //       replace(store, { value: { c: [1, 2, 3] } });
  //       assert.equal(store.value).toEqual({ c: [1, 2, 3] });
  //     });
  //
  //     test(`reconcile replace - overwrite an array with an object`, (ctx) => {
  //       const store = makeObservable({
  //         value: [1, 2, 3],
  //       });
  //       assert.equal(Array.isArray(store.value)).toBe(true);
  //
  //       replace(store, { value: { name: 'John' } });
  //
  //       assert.equal(Array.isArray(store.value)).toBe(false);
  //       assert.equal(store.value).toEqual({ name: 'John' });
  //
  //       replace(store, { value: [1, 2, 3] });
  //       assert.equal(Array.isArray(store.value)).toBe(true);
  //       assert.equal(store.value).toEqual([1, 2, 3]);
  //
  //       replace(store, { value: { q: 'aa' } });
  //       assert.equal(Array.isArray(store.value)).toBe(false);
  //       assert.equal(store.value).toEqual({ q: 'aa' });
  //     });
  //
  //     test(`reconcile replace - overwrite an object with an array`, (ctx) => {
  //       const store = makeObservable({
  //         value: { name: 'John' },
  //       });
  //       assert.equal(Array.isArray(store.value)).toBe(false);
  //
  //       replace(store, { value: [1, 2, 3] });
  //       assert.equal(Array.isArray(store.value)).toBe(true);
  //       assert.equal(store.value).toEqual([1, 2, 3]);
  //
  //       replace(store, { value: { name: 'John' } });
  //       assert.equal(Array.isArray(store.value)).toBe(false);
  //       assert.equal(store.value).toEqual({ name: 'John' });
  //
  //       replace(store, { value: { q: 'aa' } });
  //       assert.equal(Array.isArray(store.value)).toBe(false);
  //       assert.equal(store.value).toEqual({ q: 'aa' });
  //     });
  //
  //     test(`reconcile merge - adding and modifying property`, (ctx) => {
  //       const target = makeObservable({ a: true, q: [1, 2, 3, 4] });
  //
  //       assert.equal(target).toEqual({ a: true, q: [1, 2, 3, 4] });
  //
  //       const source = { b: true, q: [3] };
  //
  //       merge(target, source);
  //
  //       assert.equal(target).toEqual({
  //         a: true,
  //         q: [3, 2, 3, 4],
  //         b: true,
  //       });
  //     });
  //
  //     test(`reconcile merge - change array to object`, (ctx) => {
  //       const target = makeObservable({ a: true, q: [1, 2, 3, 4] });
  //
  //       assert.equal(target).toEqual({ a: true, q: [1, 2, 3, 4] });
  //
  //       const source = { b: true, q: { test: 'hola' } };
  //
  //       merge(target, source);
  //
  //       assert.equal(target).toEqual({
  //         a: true,
  //         q: { test: 'hola' },
  //         b: true,
  //       });
  //     });
  //
  //     test(`reconcile merge - change object to array`, (ctx) => {
  //       const target = makeObservable({ a: true, q: { test: 'hola' } });
  //
  //       assert.equal(target).toEqual({ a: true, q: { test: 'hola' } });
  //
  //       const source = { b: true, q: [1, 2, 3, 4] };
  //
  //       merge(target, source);
  //
  //       assert.equal(target).toEqual({
  //         a: true,
  //         q: [1, 2, 3, 4],
  //         b: true,
  //       });
  //     });
  //
  //     test(`reconcile merge - overwrite`, (ctx) => {
  //       const target = makeObservable({ a: true, q: [1, 2, 3, 4] });
  //
  //       assert.equal(target).toEqual({ a: true, q: [1, 2, 3, 4] });
  //
  //       const source = { a: false, q: [2, 4, 6, 8] };
  //
  //       merge(target, source);
  //
  //       assert.equal(target).toEqual({
  //         a: false,
  //         q: [2, 4, 6, 8],
  //       });
  //     });
  //
  //     // using keys - merge
  //
  //     test(`reconcile merge - add new item using keys`, (ctx) => {
  //       const target = makeObservable({ c: [{ id: 1 }] });
  //
  //       assert.equal(target).toEqual({
  //         c: [{ id: 1 }],
  //       });
  //
  //       const source = {
  //         c: [{ id: 2 }],
  //       };
  //
  //       merge(target, source, { c: { key: 'id' } });
  //
  //       assert.equal(target).toEqual({
  //         c: [{ id: 1 }, { id: 2 }],
  //       });
  //     });
  //
  //     test(`reconcile merge - add new item using keys nested`, (ctx) => {
  //       const target = makeObservable({
  //         q: { u: { a: { c: { k: [{ d: [{ id: 1 }] }] } } } },
  //       });
  //
  //       assert.equal(target).toEqual({
  //         q: { u: { a: { c: { k: [{ d: [{ id: 1 }] }] } } } },
  //       });
  //
  //       const source = {
  //         q: { u: { a: { c: { k: [{ d: [{ id: 2 }] }] } } } },
  //       };
  //
  //       merge(target, source, {
  //         q: { u: { a: { c: { k: { d: { key: 'id' } } } } } },
  //       });
  //
  //       assert.equal(target).toEqual({
  //         q: {
  //           u: { a: { c: { k: [{ d: [{ id: 1 }, { id: 2 }] }] } } },
  //         },
  //       });
  //     });
  //
  //     test(`reconcile merge - add new item using keys nested and modify`, (ctx) => {
  //       const target = makeObservable({
  //         q: {
  //           u: { a: { c: { k: [{ d: [{ id: 1, name: 'a' }] }] } } },
  //         },
  //       });
  //
  //       assert.equal(target).toEqual({
  //         q: {
  //           u: { a: { c: { k: [{ d: [{ id: 1, name: 'a' }] }] } } },
  //         },
  //       });
  //
  //       const source = {
  //         q: {
  //           u: {
  //             a: {
  //               c: {
  //                 k: [{ d: [{ id: 2 }, { id: 1, name: 'b' }] }],
  //               },
  //             },
  //           },
  //         },
  //       };
  //
  //       merge(target, source, {
  //         q: { u: { a: { c: { k: { d: { key: 'id' } } } } } },
  //       });
  //
  //       assert.equal(target).toEqual({
  //         q: {
  //           u: {
  //             a: {
  //               c: {
  //                 k: [{ d: [{ id: 1, name: 'b' }, { id: 2 }] }],
  //               },
  //             },
  //           },
  //         },
  //       });
  //     });
  //
  //     test(`reconcile merge - add 2 new items using keys`, (ctx) => {
  //       const target = makeObservable({ c: [{ id: 1 }], d: [{ idx: 2 }] });
  //
  //       assert.equal(target).toEqual({
  //         c: [{ id: 1 }],
  //         d: [{ idx: 2 }],
  //       });
  //
  //       const source = {
  //         c: [{ id: 3 }],
  //         d: [{ idx: 4 }],
  //       };
  //
  //       merge(target, source, {
  //         c: { key: 'id' },
  //         d: { key: 'idx' },
  //       });
  //
  //       assert.equal(target).toEqual({
  //         c: [{ id: 1 }, { id: 3 }],
  //         d: [{ idx: 2 }, { idx: 4 }],
  //       });
  //     });
  //
  //     test(`reconcile merge - merge and add new item using keys`, (ctx) => {
  //       const target = makeObservable({
  //         a: true,
  //         q: [1, 2],
  //         c: [{ id: 1 }],
  //       });
  //
  //       assert.equal(target).toEqual({
  //         a: true,
  //         q: [1, 2],
  //         c: [{ id: 1 }],
  //       });
  //
  //       const source = {
  //         b: false,
  //         q: [6, 8],
  //         c: [
  //           { id: 2, name: '2' },
  //           { id: 1, name: '1' },
  //         ],
  //       };
  //
  //       merge(target, source, { c: { key: 'id' } });
  //
  //       assert.equal(target).toEqual({
  //         a: true,
  //         q: [6, 8],
  //         c: [
  //           { id: 1, name: '1' },
  //           { id: 2, name: '2' },
  //         ],
  //         b: false,
  //       });
  //     });
  //
  //     test(`reconcile merge - deep test `, (ctx) => {
  //       const target = makeObservable({
  //         a: true,
  //         q: [1, 2],
  //         c: [{ id: 1, keepThis: true, d: [1] }],
  //         keepThis: true,
  //       });
  //
  //       assert.equal(target).toEqual({
  //         a: true,
  //         q: [1, 2],
  //         c: [{ id: 1, keepThis: true, d: [1] }],
  //         keepThis: true,
  //       });
  //
  //       const ref = target.c[0].d;
  //
  //       const source = {
  //         b: false,
  //         q: [6, 8],
  //         c: [
  //           { id: 3, name: '3', d: [3] },
  //           { id: 2, name: '2', d: [0] },
  //           { id: 1, name: '1', d: [] },
  //         ],
  //       };
  //
  //       merge(target, source, { c: { key: 'id' } });
  //
  //       assert.equal(target).toEqual({
  //         a: true,
  //         b: false,
  //         q: [6, 8],
  //         c: [
  //           { id: 3, name: '3', d: [3] },
  //           { id: 2, name: '2', d: [0] },
  //           {
  //             id: 1,
  //             name: '1',
  //             keepThis: true,
  //             d: [1],
  //           },
  //         ],
  //         keepThis: true,
  //       });
  //
  //       assert.equal(ref).toBe(target.c[0].d);
  //     });
  //
  //     // using keys replace
  //
  //     test(`reconcile replace - add new item using keys`, (ctx) => {
  //       const target = makeObservable({ c: [{ id: 1 }] });
  //
  //       assert.equal(target).toEqual({
  //         c: [{ id: 1 }],
  //       });
  //
  //       const source = {
  //         c: [{ id: 2 }],
  //       };
  //
  //       replace(target, source, { c: { key: 'id' } });
  //
  //       assert.equal(target).toEqual({
  //         c: [{ id: 2 }],
  //       });
  //     });
  //
  //     test(`reconcile replace - add new item using keys nested`, (ctx) => {
  //       const target = makeObservable({
  //         q: { u: { a: { c: { k: [{ d: [{ id: 1 }] }] } } } },
  //       });
  //
  //       assert.equal(target).toEqual({
  //         q: { u: { a: { c: { k: [{ d: [{ id: 1 }] }] } } } },
  //       });
  //
  //       const source = {
  //         q: { u: { a: { c: { k: [{ d: [{ id: 2 }] }] } } } },
  //       };
  //
  //       replace(target, source, {
  //         q: { u: { a: { c: { k: { d: { key: 'id' } } } } } },
  //       });
  //
  //       assert.equal(target).toEqual({
  //         q: { u: { a: { c: { k: [{ d: [{ id: 2 }] }] } } } },
  //       });
  //     });
  //
  //     test(`reconcile replace - add new item using keys nested and modify`, (ctx) => {
  //       const target = makeObservable({
  //         q: {
  //           u: { a: { c: { k: [{ d: [{ id: 1, name: 'a' }] }] } } },
  //         },
  //       });
  //
  //       assert.equal(target).toEqual({
  //         q: {
  //           u: { a: { c: { k: [{ d: [{ id: 1, name: 'a' }] }] } } },
  //         },
  //       });
  //
  //       const ref = target.q.u.a.c.k[0].d[0];
  //
  //       const source = {
  //         q: {
  //           u: {
  //             a: {
  //               c: {
  //                 k: [{ d: [{ id: 2 }, { id: 1, name: 'b' }] }],
  //               },
  //             },
  //           },
  //         },
  //       };
  //
  //       replace(target, source, {
  //         q: { u: { a: { c: { k: { d: { key: 'id' } } } } } },
  //       });
  //
  //       assert.equal(target).toEqual({
  //         q: {
  //           u: {
  //             a: {
  //               c: {
  //                 k: [{ d: [{ id: 1, name: 'b' }, { id: 2 }] }],
  //               },
  //             },
  //           },
  //         },
  //       });
  //
  //       assert.equal(ref).toBe(target.q.u.a.c.k[0].d[0]);
  //       assert.equal(ref).not.toBe({ id: 1, name: 'b' });
  //       assert.equal(ref).toEqual({ id: 1, name: 'b' });
  //     });
  //
  //     test(`reconcile replace - add 2 new items using keys`, (ctx) => {
  //       const target = makeObservable({ c: [{ id: 1 }], d: [{ idx: 2 }] });
  //
  //       assert.equal(target).toEqual({
  //         c: [{ id: 1 }],
  //         d: [{ idx: 2 }],
  //       });
  //
  //       const source = {
  //         c: [{ id: 3 }],
  //         d: [{ idx: 4 }],
  //       };
  //
  //       replace(target, source, {
  //         c: { key: 'id' },
  //         d: { key: 'idx' },
  //       });
  //
  //       assert.equal(target).toEqual({
  //         c: [{ id: 3 }],
  //         d: [{ idx: 4 }],
  //       });
  //     });
  //     test(`reconcile replace - delete items using keys`, (ctx) => {
  //       const target = makeObservable({ c: [{ id: 1 }], d: [{ idx: 2 }] });
  //
  //       assert.equal(target).toEqual({
  //         c: [{ id: 1 }],
  //         d: [{ idx: 2 }],
  //       });
  //
  //       const source = {
  //         c: [],
  //         d: [],
  //       };
  //
  //       replace(target, source, {
  //         c: { key: 'id' },
  //         d: { key: 'idx' },
  //       });
  //
  //       assert.equal(target).toEqual({
  //         c: [],
  //         d: [],
  //       });
  //     });
  //
  //     test(`reconcile replace - replace and add new item using keys`, (ctx) => {
  //       const target = makeObservable({
  //         a: true,
  //         q: [1, 2],
  //         c: [{ id: 1 }],
  //       });
  //
  //       assert.equal(target).toEqual({
  //         a: true,
  //         q: [1, 2],
  //         c: [{ id: 1 }],
  //       });
  //
  //       const source = {
  //         b: false,
  //         q: [6, 8],
  //         c: [
  //           { id: 2, name: '2' },
  //           { id: 1, name: '1' },
  //         ],
  //       };
  //
  //       replace(target, source, { c: { key: 'id' } });
  //
  //       assert.equal(target).toEqual({
  //         q: [6, 8],
  //         c: [
  //           { id: 1, name: '1' },
  //           { id: 2, name: '2' },
  //         ],
  //         b: false,
  //       });
  //     });
  //
  //     test(`reconcile replace - replace, add and delete, using keys`, (ctx) => {
  //       const target = makeObservable({
  //         a: true,
  //         q: [1, 2],
  //         c: [{ id: 1, shouldDeleteThis: true, d: [1] }],
  //         shouldDeleteThis: true,
  //       });
  //
  //       assert.equal(target).toEqual({
  //         a: true,
  //         q: [1, 2],
  //         c: [{ id: 1, shouldDeleteThis: true, d: [1] }],
  //         shouldDeleteThis: true,
  //       });
  //
  //       const ref = target.c[0].d;
  //
  //       const source = {
  //         b: false,
  //         q: [6, 8],
  //         c: [
  //           { id: 3, name: '3', d: [3] },
  //           { id: 2, name: '2', d: [0] },
  //           { id: 1, name: '1', d: [] },
  //         ],
  //       };
  //
  //       replace(target, source, { c: { key: 'id' } });
  //
  //       assert.equal(target).toEqual({
  //         q: [6, 8],
  //         c: [
  //           { id: 3, name: '3', d: [3] },
  //           { id: 2, name: '2', d: [0] },
  //           { id: 1, name: '1', d: [] },
  //         ],
  //         b: false,
  //       });
  //
  //       assert.equal(ref).toBe(target.c[0].d);
  //     });
  //
  //     // end of tests
  //   });
  // }
  // // benchmark
  //
  // // https://github.com/vobyjs/oby/blob/master/tasks/store.fixtures.js
  // // https://github.com/vobyjs/oby/blob/master/tasks/store.js
  //
  // if (doBenchmark) {
  //   const NOOP = () => {};
  //
  //   const OBJ = () => ({
  //     str: 'string',
  //     null: null,
  //     undefined,
  //     nr: 123,
  //     bigint: 10n,
  //     symbol: Symbol(),
  //     re: /foo/g,
  //     fn() {},
  //     arr: [1, 2, 3, {}],
  //     arrfilled: new Array(10_000).fill(0).map((_, idx) => idx),
  //     /* arrBuf: new ArrayBuffer(12),
  //     arrTyped: new Int8Array(new ArrayBuffer(24)),*/
  //     obj: {
  //       deep: {
  //         deeper: true,
  //       },
  //     },
  //     date: new Date(),
  //     /* map: new Map([
  //     ['1', 1],
  //     ['2', 2],
  //   ]),*/
  //     set: new Set([1, 2, 3]),
  //   });
  //
  //   const OBJ_HUGE = () => ({
  //     arr: new Array(100_000).fill(0).map((_, idx) => idx),
  //     date: new Date(),
  //     /*  map: new Map(
  //     new Array(100_000)
  //       .fill(0)
  //       .map((_, idx) => idx)
  //       .map(nr => [`${nr}`, nr]),
  //   ),
  //   set: new Set(new Array(100_000).fill(0).map((_, idx) => idx)),*/
  //   });
  //
  //   const superTotal = 0;
  //   const benchmark = (title, context, fn) => {
  //     if (!benchmarkTable[title]) {
  //       benchmarkTable[title] = {};
  //       if (!benchmarkTable.total) {
  //         benchmarkTable.total = {
  //           'solid: ': 0,
  //           'oby: ': 0,
  //           'pota: ': 0,
  //         };
  //       }
  //     }
  //     try {
  //       let total = 0;
  //       root((dispose) => {
  //         const ctx = context();
  //         for (let i = 0; i < 3_000; i++) {
  //           total += timing(() => {
  //             fn(ctx);
  //           });
  //         }
  //         dispose();
  //       });
  //       benchmarkTable[title][lib] = total;
  //       benchmarkTable.total[lib] += total;
  //     } catch (e) {
  //       console.log(e);
  //       benchmarkTable[title][lib] = e;
  //     }
  //   };
  //
  //   // get
  //   benchmark(
  //     'access: primitive',
  //     () => {
  //       return makeObservable(OBJ());
  //     },
  //     (ctx) => {
  //       ctx.str;
  //       ctx.nr;
  //       ctx.symbol;
  //     }
  //   );
  //   benchmark(
  //     'access: shallow',
  //     () => {
  //       return makeObservable(OBJ());
  //     },
  //     (ctx) => {
  //       ctx.arr;
  //       ctx.obj;
  //     }
  //   );
  //   benchmark(
  //     'access: deep',
  //     () => {
  //       return makeObservable(OBJ());
  //     },
  //     (ctx) => {
  //       ctx.arr[3].undefined;
  //       ctx.obj.deep.deeper;
  //     }
  //   );
  //
  //   benchmark(
  //     'access: array',
  //     () => {
  //       return makeObservable(OBJ());
  //     },
  //     (ctx) => {
  //       ctx.arr.concat(4);
  //       ctx.arr.entries();
  //       ctx.arr.every(NOOP);
  //       ctx.arr.filter(NOOP);
  //       ctx.arr.find(NOOP);
  //       ctx.arr.findIndex(NOOP);
  //       ctx.arr.forEach(() => {});
  //       ctx.arr.includes(1);
  //       ctx.arr.indexOf(1);
  //       ctx.arr.join();
  //       ctx.arr.keys();
  //       ctx.arr.lastIndexOf(1);
  //       ctx.arr.map(NOOP);
  //       ctx.arr.reduce(() => ({}));
  //       ctx.arr.reduceRight(() => ({}));
  //       ctx.arr.slice();
  //       ctx.arr.some(NOOP);
  //       ctx.arr.toLocaleString();
  //       ctx.arr.toString();
  //       ctx.arr.values();
  //     }
  //   );
  //
  //   benchmark(
  //     'set: object:shallow',
  //     () => {
  //       return makeObservable(OBJ());
  //     },
  //     (ctx) => {
  //       ctx.arr[0] = 1;
  //     }
  //   );
  //
  //   benchmark(
  //     'set: object:deep',
  //     () => {
  //       return makeObservable(OBJ());
  //     },
  //     (ctx) => {
  //       ctx.obj.deep.deeper = true;
  //     }
  //   );
  //
  //   benchmark(
  //     'set: array',
  //     () => {
  //       return makeObservable(OBJ());
  //     },
  //     (ctx) => {
  //       ctx.arr.copyWithin(0, 0, 0);
  //       ctx.arr.push();
  //       ctx.arr.splice(0, 0);
  //     }
  //   );
  //
  //   benchmark(
  //     'set: object:shallow 2',
  //     () => {
  //       return makeObservable(OBJ());
  //     },
  //     (ctx) => {
  //       ctx.arr[0] = 10;
  //       ctx.obj.foo = 10;
  //     }
  //   );
  //   benchmark(
  //     'set: object:deep 2',
  //     () => {
  //       return makeObservable(OBJ());
  //     },
  //     (ctx) => {
  //       ctx.arr[3].undefined = 10;
  //       ctx.obj.deep.deeper = 10;
  //     }
  //   );
  //
  //   /*
  //
  //   benchmark(
  //   'set: array 2',
  //   () => {
  //     return makeObservable(OBJ())
  //   },
  //   ctx => {
  //     ctx.arr.copyWithin(0, 1, 2)
  //     ctx.arr.fill(0)
  //     ctx.arr.pop()
  //     ctx.arr.push(-1, -2, -3)
  //     ctx.arr.reverse()
  //     ctx.arr.shift()
  //     ctx.arr.sort()
  //     ctx.arr.splice(0, 1, 2)
  //     ctx.arr.unshift(5)
  //   },
  // )
  // benchmark(
  //   'mutate array: copyWithin',
  //   () => {
  //     return makeObservable(OBJ())
  //   },
  //   ctx => {
  //     ctx.arrfilled.copyWithin(0, 1, 2)
  //   },
  // )
  //
  // benchmark(
  //   'mutate array: fill',
  //   () => {
  //     return makeObservable(OBJ())
  //   },
  //   ctx => {
  //     ctx.arrfilled.fill(0)
  //   },
  // )
  //
  // benchmark(
  //   'mutate array: pop',
  //   () => {
  //     return makeObservable(OBJ())
  //   },
  //   ctx => {
  //     ctx.arrfilled.pop()
  //   },
  // )
  // benchmark(
  //   'mutate array: push',
  //   () => {
  //     return makeObservable(OBJ())
  //   },
  //   ctx => {
  //     ctx.arrfilled.push()
  //   },
  // )
  // benchmark(
  //   'mutate array: reverse ',
  //   () => {
  //     return makeObservable(OBJ())
  //   },
  //   ctx => {
  //     ctx.arrfilled.reverse()
  //   },
  // )
  // benchmark(
  //   'mutate array: shift ',
  //   () => {
  //     return makeObservable(OBJ())
  //   },
  //   ctx => {
  //     ctx.arrfilled.shift()
  //   },
  // )
  // benchmark(
  //   'mutate array: sort ',
  //   () => {
  //     return makeObservable(OBJ())
  //   },
  //   ctx => {
  //     ctx.arrfilled.sort()
  //   },
  // )
  // benchmark(
  //   'mutate array: splice ',
  //   () => {
  //     return makeObservable(OBJ())
  //   },
  //   ctx => {
  //     ctx.arrfilled.splice(0, 1, 2)
  //   },
  // )
  // benchmark(
  //   'mutate array: unshift ',
  //   () => {
  //     return makeObservable(OBJ())
  //   },
  //   ctx => {
  //     ctx.arrfilled.unshift(5)
  //   },
  // )
  //
  // benchmark(
  //   'delete: object:shallow ',
  //   () => {
  //     return makeObservable(OBJ())
  //   },
  //   ctx => {
  //     delete ctx.arr
  //   },
  // )
  // benchmark(
  //   'delete: object:deep ',
  //   () => {
  //     return makeObservable(OBJ())
  //   },
  //   ctx => {
  //     delete ctx.obj.deep.deeper
  //   },
  // )*/
  //   // create
  //   benchmark(
  //     'create: number',
  //     () => {},
  //     () => {
  //       makeObservable(123);
  //     }
  //   );
  //   benchmark(
  //     'create: object',
  //     () => {},
  //     () => {
  //       makeObservable({});
  //     }
  //   );
  //   benchmark(
  //     'create: array',
  //     () => {},
  //     () => {
  //       makeObservable([]);
  //     }
  //   );
  //   /* benchmark(
  //   'create: small',
  //   () => {},
  //   () => {
  //     makeObservable(OBJ())
  //   },
  // )
  // benchmark(
  //   'create: huge',
  //   () => {},
  //   () => {
  //     makeObservable(OBJ_HUGE())
  //   },
  // )*/
  // }
  //
  // function testValues(ctx, set, get) {
  //   let callsMemo = 0;
  //   const value = memo(() => {
  //     callsMemo += 1;
  //     get();
  //     get();
  //     get();
  //     return get();
  //   });
  //
  //   assert.equal(callsMemo).toBe(0);
  //
  //   set(123);
  //   assert.equal(get()).toBe(123);
  //   assert.equal(value()).toBe(123);
  //   assert.equal(callsMemo).toBe(1);
  //
  //   set(321);
  //   assert.equal(get()).toBe(321);
  //   assert.equal(value()).toBe(321);
  //   assert.equal(callsMemo).toBe(2);
  //
  //   set(undefined);
  //   assert.equal(get()).toBe(undefined);
  //   assert.equal(value()).toBe(undefined);
  //   assert.equal(callsMemo).toBe(3);
  //
  //   set(null);
  //   assert.equal(get()).toBe(null);
  //   assert.equal(value()).toBe(null);
  //   assert.equal(callsMemo).toBe(4);
  //
  //   set(1);
  //   assert.equal(get()).toBe(1);
  //   assert.equal(value()).toBe(1);
  //   assert.equal(callsMemo).toBe(5);
  //
  //   set('');
  //   assert.equal(get()).toBe('');
  //   assert.equal(value()).toBe('');
  //   assert.equal(callsMemo).toBe(6);
  //
  //   set('string');
  //   assert.equal(get()).toBe('string');
  //   assert.equal(value()).toBe('string');
  //   assert.equal(callsMemo).toBe(7);
  //
  //   set([true]);
  //   assert.equal(get()).toEqual([true]);
  //   assert.equal(value()).toEqual([true]);
  //   assert.equal(Array.isArray(get())).toBe(true);
  //   assert.equal(callsMemo).toBe(8);
  //
  //   set({ 0: true });
  //   assert.equal(get()).toEqual({ 0: true });
  //   assert.equal(value()).toEqual({ 0: true });
  //   assert.equal(Array.isArray(get())).toBe(false);
  //   assert.equal(callsMemo).toBe(9);
  //
  //   set([true]);
  //   assert.equal(get()).toEqual([true]);
  //   assert.equal(value()).toEqual([true]);
  //   assert.equal(Array.isArray(get())).toBe(true);
  //   assert.equal(callsMemo).toBe(10);
  //
  //   set({ 0: true });
  //   assert.equal(get()).toEqual({ 0: true });
  //   assert.equal(value()).toEqual({ 0: true });
  //   assert.equal(Array.isArray(get())).toBe(false);
  //   assert.equal(callsMemo).toBe(11);
  //
  //   set(true);
  //   assert.equal(get()).toBe(true);
  //   assert.equal(value()).toBe(true);
  //   assert.equal(callsMemo).toBe(12);
  //
  //   set(false);
  //   assert.equal(get()).toBe(false);
  //   assert.equal(value()).toBe(false);
  //   assert.equal(callsMemo).toBe(13);
  //
  //   set(Infinity);
  //   assert.equal(get()).toBe(Infinity);
  //   assert.equal(value()).toBe(Infinity);
  //   assert.equal(callsMemo).toBe(14);
  //
  //   set(Infinity);
  //   assert.equal(get()).toBe(Infinity);
  //   assert.equal(value()).toBe(Infinity);
  //   assert.equal(callsMemo).toBe(14);
  //
  //   // symbol
  //   const s = Symbol();
  //
  //   set(s);
  //   assert.equal(get()).toBe(s);
  //   assert.equal(value()).toBe(s);
  //   assert.equal(callsMemo).toBe(15);
  //
  //   // bigint
  //   const bn = BigInt('9007199254740991');
  //   set(bn);
  //   assert.equal(get()).toBe(bn);
  //   assert.equal(value()).toBe(bn);
  //   assert.equal(callsMemo).toBe(16);
  //
  //   // built-ins should work and return same value
  //   const p = Promise.resolve();
  //   set(p);
  //   assert.equal(get()).toBe(p);
  //   assert.equal(value()).toBe(p);
  //   assert.equal(callsMemo).toBe(17);
  //
  //   const r = new RegExp('');
  //   set(r);
  //   assert.equal(get()).toBe(r);
  //   assert.equal(value()).toBe(r);
  //   assert.equal(callsMemo).toBe(18);
  //
  //   const d = new Date();
  //   set(d);
  //   assert.equal(get()).toBe(d);
  //   assert.equal(value()).toBe(d);
  //   assert.equal(callsMemo).toBe(19);
  //
  //   set(NaN);
  //   assert.equal(Object.is(get(), NaN)).toBe(true);
  //   assert.equal(Object.is(value(), NaN)).toBe(true);
  //   assert.equal(callsMemo).toBe(20);
  //
  //   set(0);
  //   assert.equal(get()).toBe(0);
  //   assert.equal(value()).toBe(0);
  //   assert.equal(callsMemo).toBe(21);
  //
  //   set(1);
  //   assert.equal(get()).toBe(1);
  //   assert.equal(value()).toBe(1);
  //   assert.equal(callsMemo).toBe(22);
  // }
});

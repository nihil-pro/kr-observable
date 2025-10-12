// @ts-nocheck
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

import { Observable, autorun, makeObservable, transaction, subscribe } from '../index.js';

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
      // @ts-ignore
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
      // @ts-ignore
      source.data.user = 'something else';
    } catch (error) {
      assert.equal(error instanceof Error, true);
    }
  });

  // test(`mutation: function`, () => {
  //   const result = makeObservable({
  //     fn: () => 1,
  //   });
  //
  //   assert.equal(result.fn(), 1);
  //   // @ts-ignore
  //   result.fn = () => 2;
  //   console.log('//////', result)
  //   assert.equal(result.fn(), 2);
  // });

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
  //   assert.equal(r.cat, 'quack');
  //
  //   let calls = 0;
  //   autorun(() => {
  //     calls++;
  //     r.cat;
  //   });
  //   execute();
  //   assert.equal(calls, 1);
  //
  //   r.cat = 'murci';
  //   execute();
  //   assert.equal(r.cat, 'murci');
  //   assert.equal(calls, 2);
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
      get biaca() {
        access++;
        return 2;
      },
    });

    try {
      // @ts-ignore
      result.biaca = 0;
    } catch (error) {
      assert.equal(error instanceof Error, true);
    }

    assert.equal(access, 0);
    assert.equal('a' in result, true);
    assert.equal('biaca' in result, true);
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
    transaction(() => m.increment());
    assert.equal(subscriber.mock.callCount(), 2);
    assert.equal(m.a, 2);
    assert.equal(m.b, 8);

    transaction(() => m.increment());
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
    transaction(() => m.increment());
    assert.equal(m.a, 2);
    assert.equal(m.b, 8);
    assert.equal(subscriber.mock.callCount(), 2);

    transaction(() => m.increment());
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
    transaction(() => m.increment());
    assert.equal(m.a, 2);
    assert.equal(m.b, 8);
    assert.equal(subscriber.mock.callCount(), 2);

    transaction(() => m.increment());
    assert.equal(m.a, 3);
    assert.equal(m.b, 12);
    assert.equal(subscriber.mock.callCount(), 3);
  });

  test(`hasOwnProperty shouldn't throw`, () => {
    let m = makeObservable({ a: { deep: 'test' } });
    m.hasOwnProperty('a');
    m.a.hasOwnProperty('deep');

    m = makeObservable(Object.create(null));
    m.a = { deep: 'test' };
    m.a.hasOwnProperty('deep');
  });

  test(`reacts to hasOwnProperty [solid, oby]`, () => {
    const m = makeObservable({ a: { deep: 'test' }, c: {} });

    let has;

    const subscriber = mock.fn();
    autorun(() => {
      subscriber();
      has = m.hasOwnProperty('b');
    });

    const subscriber2 = mock.fn();
    autorun(() => {
      subscriber2();
      has = m.a.hasOwnProperty('b');
    });

    const subscriber3 = mock.fn();
    autorun(() => {
      subscriber3();
      has = Object.hasOwn(m, 'z');
    });

    assert.equal(subscriber.mock.callCount(), 1);
    assert.equal(subscriber2.mock.callCount(), 1);
    assert.equal(subscriber3.mock.callCount(), 1);
    assert.equal(has, false);

    transaction(() => Reflect.set(m, 'b', 1));

    assert.equal(subscriber.mock.callCount(), 2);
    assert.equal(subscriber2.mock.callCount(), 1);
    assert.equal(subscriber3.mock.callCount(), 1);
    assert.equal(has, true);
    has = false;
    assert.equal(has, false);

    // @ts-ignore
    transaction(() => (m.a.b = 1));

    assert.equal(subscriber.mock.callCount(), 2);
    assert.equal(subscriber2.mock.callCount(), 2);
    assert.equal(subscriber3.mock.callCount(), 1);
    assert.equal(has, true);
    has = false;
    assert.equal(has, false);

    // @ts-ignore
    transaction(() => (m.z = 1));

    assert.equal(subscriber.mock.callCount(), 2);
    assert.equal(subscriber2.mock.callCount(), 2);
    assert.equal(subscriber3.mock.callCount(), 2);
    assert.equal(has, true);
  });

  // modified compared to original, but check that autorun don't subscribe to an observable created inside it
  test(`does not create a dependency in a memo when creating`, () => {
    let o;
    const subscriber = mock.fn();

    autorun(() => {
      subscriber();
      o = makeObservable({ value: 1 });
    });

    assert.equal(subscriber.mock.callCount(), 1);
    transaction(() => (o.value = 2));
    assert.equal(subscriber.mock.callCount(), 1);
  });

  test(`does not create a dependency in a memo when setting a shallow property`, () => {
    const o = makeObservable({ value: 0 });
    const subscriber = mock.fn();

    autorun(() => {
      subscriber();
      o.value = 1;
    });

    assert.equal(subscriber.mock.callCount(), 1);
    transaction(() => (o.value = 2));
    assert.equal(subscriber.mock.callCount(), 1);
  });

  test(`does not create a dependency in a memo when getting a parent property of the one being updated`, (ctx) => {
    const o = makeObservable({ deep: { value: 1 } });
    const subscriber = mock.fn();

    autorun(() => {
      subscriber();
      if (o.deep) ctx.diagnostic('1');
    });

    assert.equal(subscriber.mock.callCount(), 1);
    transaction(() => (o.deep.value = 2));
    assert.equal(subscriber.mock.callCount(), 1);

    transaction(() => (o.deep.value = 3));
    assert.equal(subscriber.mock.callCount(), 1);
  });

  test(`does create a dependency (on the parent) in a memo when setting a deep property`, () => {
    const o = makeObservable({ deep: { value: 1 } });
    const subscriber = mock.fn();

    autorun(() => {
      subscriber();
      o.deep.value = 2;
    });

    assert.equal(subscriber.mock.callCount(), 1);
    transaction(() => (o.deep.value = 3));
    assert.equal(subscriber.mock.callCount(), 1);

    // @ts-ignore
    transaction(() => (o.deep = {}));
    assert.equal(subscriber.mock.callCount(), 2);
  });

  test(`returns unproxied "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "toSource", "toString", "valueOf", properties`, () => {
    const o = makeObservable({});

    const subscriber = mock.fn();

    autorun(() => {
      subscriber();
      console.info(
        o.hasOwnProperty,
        o.isPrototypeOf,
        o.propertyIsEnumerable,
        o.toLocaleString,
        // @ts-ignore
        o.toSource,
        o.toString,
        o.valueOf
      );
    });

    assert.equal(subscriber.mock.callCount(), 1);

    transaction(() => {
      // @ts-ignore
      o.hasOwnProperty = 1;
      // @ts-ignore
      o.isPrototypeOf = 1;
      // @ts-ignore
      o.propertyIsEnumerable = 1;
      // @ts-ignore
      o.toLocaleString = 1;
      // @ts-ignore
      o.toSource = 1;
      // @ts-ignore
      o.toString = 1;
      // @ts-ignore
      o.valueOf = 1;
    });
    // assert.equal(subscriber.mock.callCount(), 1);
  });

  test(`returns the value being set`, () => {
    const o = makeObservable({ value: undefined });

    assert.equal((o.value = 123), 123);
    assert.equal((o.value = undefined), undefined);
    assert.equal((o.value = null), null);
    assert.equal((o.value = ''), '');
    assert.equal((o.value = 'string'), 'string');
    assert.equal((o.value = true), true);
    assert.equal((o.value = false), false);
    assert.equal((o.value = Infinity), Infinity);
    assert.equal((o.value = 0), 0);
    assert.equal(Object.is((o.value = NaN), NaN), true);
    assert.equal((o.value = 1), 1);

    // not applicable for kr-observable, cause it will make those deep observable
    // assert.equal((o.value = [true]), [true]);
    // assert.equal((o.value = { 0: true }), { 0: true });
  });

  test(`supports setting functions`, () => {
    function fn() {
      console.info(1);
    }
    const o = makeObservable({
      value: () => {
        console.info(1);
      },
    });
    o.value = fn;
    assert.equal(o.value.name, 'fn');
  });

  test(`supports wrapping a plain object`, (ctx) => {
    const o = makeObservable({});

    const subscriber = mock.fn();

    autorun(() => {
      subscriber();
      // @ts-ignore
      if (o.value) ctx.diagnostic('yes');
    });
    assert.equal(subscriber.mock.callCount(), 1);
    // @ts-ignore
    transaction(() => (o.value = 2));
    assert.equal(subscriber.mock.callCount(), 2);
  });

  test(`supports wrapping a deep plain object inside a plain object`, (ctx) => {
    const o = makeObservable({ value: {} });
    const subscriber = mock.fn();

    autorun(() => {
      subscriber();
      // @ts-ignore
      ctx.diagnostic(`${o.value.lala}`);
    });
    assert.equal(subscriber.mock.callCount(), 1);
    // @ts-ignore
    transaction(() => (o.value.lala = 3));
    assert.equal(subscriber.mock.callCount(), 2);
    // @ts-ignore
    assert.equal(o.value.lala, 3);
  });

  // conflict with other test
  test.skip(`supports reacting to deleting a shallow property`, (ctx) => {
    const o = makeObservable({ value: 123 });
    const subscriber = mock.fn();

    autorun(() => {
      subscriber();
      ctx.diagnostic(`${o.value}`);
    });

    assert.equal(subscriber.mock.callCount(), 1);
    transaction(() => delete o.value);
    assert.equal(subscriber.mock.callCount(), 2);
    assert.equal('value' in o, false);
    assert.equal(subscriber.mock.callCount(), 2);

    transaction(() => (o.value = undefined));
    assert.equal(subscriber.mock.callCount(), 2);

    // @ts-ignore
    transaction(() => (o.value = true));
    assert.equal(subscriber.mock.callCount(), 3);
  });

  test.skip(`supports not reacting when deleting a shallow property that was undefined`, (ctx) => {
    const o = makeObservable({ value: undefined });
    const subscriber = mock.fn();

    autorun(() => {
      subscriber();
      ctx.diagnostic(`${o.value}`);
    });

    assert.equal(subscriber.mock.callCount(), 1);

    transaction(() => delete o.value);
    assert.equal(subscriber.mock.callCount(), 1);
    assert.equal('value' in o, false);
    assert.equal(subscriber.mock.callCount(), 1);

    transaction(() => (o.value = undefined));
    assert.equal(subscriber.mock.callCount(), 1);

    transaction(() => (o.value = true));
    assert.equal(subscriber.mock.callCount(), 2);
  });

  test.skip(`supports reacting when deleting a shallow property that was null`, (ctx) => {
    const o = makeObservable({ value: null });
    const subscriber = mock.fn();

    autorun(() => {
      subscriber();
      ctx.diagnostic(`${o.value}`);
    });

    assert.equal(subscriber.mock.callCount(), 1);

    transaction(() => delete o.value);
    assert.equal(subscriber.mock.callCount(), 2);

    assert.equal('value' in o, false);
    assert.equal(subscriber.mock.callCount(), 2);

    transaction(() => (o.value = undefined));
    assert.equal(subscriber.mock.callCount(), 2);

    transaction(() => (o.value = true));
    assert.equal(subscriber.mock.callCount(), 3);
  });

  // reacts after deleting and then set to undefined
  test.skip(`supports reacting to deleting a deep property`, (ctx) => {
    const o = makeObservable({ deep: { value: 123 } });
    const subscriber = mock.fn();

    autorun(() => {
      subscriber();
      ctx.diagnostic(`${o.deep.value}`);
    });
    assert.equal(subscriber.mock.callCount(), 1);

    transaction(() => delete o.deep.value);
    assert.equal(subscriber.mock.callCount(), 2);
    assert.equal('value' in o.deep, false);
    assert.equal(subscriber.mock.callCount(), 2);

    transaction(() => (o.deep.value = undefined));
    assert.equal(subscriber.mock.callCount(), 2);

    // @ts-ignore
    transaction(() => (o.deep.value = true));
    assert.equal(subscriber.mock.callCount(), 3);
  });

  test.skip(`supports not reacting when deleting a deep property that was undefined`, (ctx) => {
    const o = makeObservable({ deep: { value: undefined } });
    const subscriber = mock.fn();

    autorun(() => {
      subscriber();
      ctx.diagnostic(`${o.deep.value}`);
    });

    assert.equal(subscriber.mock.callCount(), 1);

    transaction(() => delete o.deep.value);
    assert.equal(subscriber.mock.callCount(), 1);
    assert.equal('value' in o.deep, false);
    assert.equal(subscriber.mock.callCount(), 1);

    transaction(() => (o.deep.value = undefined));
    assert.equal(subscriber.mock.callCount(), 1);

    transaction(() => (o.deep.value = true));
    assert.equal(subscriber.mock.callCount(), 2);
  });

  test(`supports not reacting when setting a primitive property to itself`, (ctx) => {
    const o = makeObservable({ value: 1 });
    const subscriber = mock.fn();

    autorun(() => {
      subscriber();
      ctx.diagnostic(`${o.value}`);
    });

    assert.equal(subscriber.mock.callCount(), 1);

    transaction(() => (o.value = 1));
    assert.equal(subscriber.mock.callCount(), 1);
  });

  test(`supports not reacting when setting a non-primitive property to itself`, (ctx) => {
    const o = makeObservable({ deep: { value: 2 } });
    const subscriber = mock.fn();

    autorun(() => {
      subscriber();
      ctx.diagnostic(`${o.deep.value}`);
    });

    assert.equal(subscriber.mock.callCount(), 1);
    // @ts-ignore
    // eslint-disable-next-line no-self-assign
    transaction(() => (o.deep = o.deep));
    assert.equal(subscriber.mock.callCount(), 1);
  });

  test(`supports not reacting when setting a non-primitive property to itself, when reading all values - object `, (ctx) => {
    const o = makeObservable({ value: {} });
    const subscriber = mock.fn();

    autorun(() => {
      subscriber();
      if (o.value) ctx.diagnostic('yep');
    });

    assert.equal(subscriber.mock.callCount(), 1);
    // @ts-ignore
    // eslint-disable-next-line no-self-assign
    transaction(() => (o.value = o.value));
    assert.equal(subscriber.mock.callCount(), 1);
  });

  test(`supports not reacting when reading the length on a non-array, when reading all values, if the length does not actually change`, (ctx) => {
    const o = makeObservable({ length: 0 });
    const sb = mock.fn();
    autorun(() => {
      sb();
      ctx.diagnostic(`${o.length}`);
    });

    assert.equal(sb.mock.callCount(), 1);
    // eslint-disable-next-line no-self-assign
    transaction(() => (o.length = o.length));
    assert.equal(sb.mock.callCount(), 1);
  });

  // This can be implemented,
  // but it seems that apart from increasing the size of the library and memory consumption, nothing will bring.
  test.skip(`supports reacting to own keys`, (ctx) => {
    const o = makeObservable({ foo: 1, bar: 2, baz: 3 });
    const sb = mock.fn();

    autorun(() => {
      sb();
      ctx.diagnostic(`${Object.keys(o).toString()}`);
    });

    assert.equal(sb.mock.callCount(), 1);

    // @ts-ignore
    transaction(() => (o.qux = 4));
    assert.equal(sb.mock.callCount(), 2);

    transaction(() => {
      o.foo = 2; // already in
      o.bar = 3; // already in
      o.baz = 4; // already in
      // @ts-ignore
      o.qux = 5; // already in toDo since value is changed, kr-observable reacts
    });
    assert.equal(sb.mock.callCount(), 2);

    // @ts-ignore
    transaction(() => (o.qux = 5));
    assert.equal(sb.mock.callCount(), 2);

    // @ts-ignore
    transaction(() => (o.qux = 6));
    assert.equal(sb.mock.callCount(), 2);

    // @ts-ignore
    transaction(() => (o.qux2 = 7));
    assert.equal(sb.mock.callCount(), 3);

    transaction(() => delete o.foo);
    assert.equal(sb.mock.callCount(), 4);
    assert.equal('foo' in o, false);
    assert.equal(sb.mock.callCount(), 4);

    transaction(() => (o.foo = undefined));
    assert.equal(sb.mock.callCount(), 5);
    assert.equal(o.foo, undefined);
    assert.equal('foo' in o, true);

    // @ts-ignore
    transaction(() => (o.foo = true));
    assert.equal(sb.mock.callCount(), 5);
    assert.equal(o.foo, true);
    assert.equal('foo' in o, true);
  });
  // same as previous
  // test(`supports reacting to own keys deep [solid]`, (ctx) => {
  //   const o = makeObservable({ value: { foo: 1, bar: 2, baz: 3 } });
  //
  //   let calls = 0;
  //
  //   autorun(() => {
  //     calls += 1;
  //     Object.keys(o.value);
  //   });
  //   execute();
  //   assert.equal(calls, 1);
  //
  //   o.value.qux = 4;
  //   execute();
  //   assert.equal(calls, 2);
  //
  //   o.value.foo = 2;
  //   o.value.bar = 3;
  //   o.value.baz = 4;
  //   o.value.qux = 5;
  //   execute();
  //   assert.equal(calls, 2);
  //
  //   o.value.qux = 5;
  //   execute();
  //   assert.equal(calls, 2);
  //
  //   o.value.qux2 = 5;
  //   execute();
  //   assert.equal(calls, 3);
  //
  //   delete o.value.foo;
  //   execute();
  //   assert.equal(calls, 4);
  //   assert.equal('foo' in o.value, false);
  //   assert.equal(calls, 4);
  //
  //   o.value.foo = undefined;
  //   execute();
  //   assert.equal(calls, 5);
  //   assert.equal(o.value.foo, undefined);
  //   assert.equal('foo' in o.value, true);
  //
  //   o.value.foo = true;
  //   execute();
  //   assert.equal(calls, 5);
  //   assert.equal(o.value.foo, true);
  //   assert.equal('foo' in o.value, true);
  // });

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

  test(`supports reacting to properties read by a regular function`, () => {
    const o = makeObservable({
      foo: 1,
      bar: 2,
      fn() {
        return this.foo + this.bar;
      },
    });

    const sb = mock.fn();

    autorun(() => {
      sb();
      o.fn();
    });

    assert.equal(sb.mock.callCount(), 1);

    transaction(() => (o.foo = 10));
    assert.equal(sb.mock.callCount(), 2);
    assert.equal(o.fn(), 12);

    transaction(() => (o.bar = 20));
    assert.equal(sb.mock.callCount(), 3);
    assert.equal(o.fn(), 30);
  });

  test(`supports reacting to properties read by a regular function, called via the call method`, () => {
    const o = makeObservable({
      foo: 1,
      bar: 2,
      fn() {
        return this.foo + this.bar;
      },
    });

    let calls = 0;

    autorun(() => {
      calls += 1;
      // eslint-disable-next-line no-useless-call
      o.fn.call(o);
    });
    assert.equal(calls, 1);

    transaction(() => (o.foo = 10));
    assert.equal(calls, 2);
    // eslint-disable-next-line no-useless-call
    assert.equal(o.fn.call(o), 12);

    transaction(() => (o.bar = 20));
    assert.equal(calls, 3);
    // eslint-disable-next-line no-useless-call
    assert.equal(o.fn.call(o), 30);
  });

  test(`supports reacting to properties read by a regular function, called via the apply method`, () => {
    const o = makeObservable({
      foo: 1,
      bar: 2,
      fn() {
        return this.foo + this.bar;
      },
    });

    let calls = 0;

    autorun(() => {
      calls += 1;
      o.fn.apply(o);
    });
    assert.equal(calls, 1);

    transaction(() => (o.foo = 10));
    assert.equal(calls, 2);
    assert.equal(o.fn.apply(o), 12);

    transaction(() => (o.bar = 20));
    assert.equal(calls, 3);
    assert.equal(o.fn.apply(o), 30);
  });

  test(`supports batching implicitly`, (ctx) => {
    const o = makeObservable({ foo: 1, bar: 2 });

    let calls = 0;

    autorun(() => {
      calls += 1;
      ctx.diagnostic(`${o.foo + o.bar}`);
    });

    assert.equal(calls, 1);

    o.foo = 10;
    o.bar = 20;
    assert.equal(o.foo, 10);
    assert.equal(o.bar, 20);
    assert.equal(calls, 2);
  });

  // kr-observable supports it for methods, need to support also this
  test(`supports batching setters automatically`, (ctx) => {
    const o = makeObservable({
      foo: 1,
      bar: 2,
      // eslint-disable-next-line accessor-pairs
      set fn(increment: number) {
        this.foo += increment;
        this.bar += increment;
      },
    });

    let calls = 0;
    autorun(() => {
      calls += 1;
      ctx.diagnostic(`${o.foo + o.bar}`);
    });

    assert.equal(calls, 1);

    transaction(() => (o.fn = 1));
    assert.equal(o.foo, 2);
    assert.equal(o.bar, 3);
    assert.equal(calls, 2);
  });

  test(`supports batching deletions automatically Object.keys`, (ctx) => {
    const o = makeObservable({ foo: 1, bar: 2 });

    let calls = 0;

    autorun(() => {
      calls += 1;
      if (o.foo) {
        ctx.diagnostic(`${'foo' in o} ${Object.keys(o)}`);
      }
    });
    assert.equal(calls, 1);

    transaction(() => delete o.foo);
    assert.equal(calls, 2);
    assert.equal('foo' in o, false);
    assert.equal(calls, 2);

    assert.equal('foo' in o, false);
    assert.equal(calls, 2);
  });

  test(`supports batching deletions automatically no Object.keys`, (ctx) => {
    const o = makeObservable({ foo: 1, bar: 2 });

    let calls = 0;

    autorun(() => {
      calls += 1;
      if (o.foo) {
        ctx.diagnostic(`${'foo' in o}`);
      }
    });
    assert.equal(calls, 1);

    transaction(() => delete o.foo);
    assert.equal(calls, 2);
    assert.equal('foo' in o, false);
    assert.equal(calls, 2);

    assert.equal('foo' in o, false);
    assert.equal(calls, 2);
  });

  test(`supports batching additions automatically Object.keys`, (ctx) => {
    const o = makeObservable({ bar: 2 });

    let calls = 0;

    autorun(() => {
      calls += 1;
      // @ts-ignore
      if (o.foo) {
        ctx.diagnostic(`${'foo' in o} ${Object.keys(o)}`);
      }
    });

    assert.equal(calls, 1);

    // @ts-ignore
    transaction(() => (o.foo = 1));
    assert.equal(calls, 2);
  });

  test(`supports batching additions automatically no Object.keys`, (ctx) => {
    const o = makeObservable({ bar: 2 });

    let calls = 0;

    autorun(() => {
      calls += 1;
      // @ts-ignore
      ctx.diagnostic(`${'foo' in o}, ${o.foo}`);
    });

    assert.equal(calls, 1);

    // @ts-ignore
    transaction(() => (o.foo = 1));
    assert.equal(calls, 2);
  });

  test(`supports batching additions automatically no Object.keys, no reading`, (ctx) => {
    const o = makeObservable({ bar: 2 });

    let calls = 0;

    autorun(() => {
      calls += 1;
      ctx.diagnostic(`${'foo' in o}`);
    });
    assert.equal(calls, 1);

    // @ts-ignore
    transaction(() => (o.foo = 1));
    assert.equal(calls, 2);
  });

  test(`supports batching additions automatically new property `, (ctx) => {
    const o = makeObservable({ bar: 2 });

    let calls = 0;

    autorun(() => {
      calls += 1;
      // @ts-ignore
      ctx.diagnostic(`${o.foo}`);
    });
    assert.equal(calls, 1);

    // @ts-ignore
    transaction(() => (o.foo = 1));
    assert.equal(calls, 2);
  });

  test(`supports reacting to changes on custom classes`, (ctx) => {
    class Foo extends Observable {
      foo = 0;
    }

    class Bar extends Foo {
      bar = 0;
    }

    const foo = new Foo();
    const bar = new Bar();

    let calls = '';

    autorun(() => {
      ctx.diagnostic(`${foo.foo}`);
      calls += 'f';
    });

    autorun(() => {
      ctx.diagnostic(`${bar.bar}`);
      calls += 'b';
    });

    assert.equal(calls, 'fb');

    transaction(() => (foo.foo += 1));
    assert.equal(calls, 'fbf');

    transaction(() => (bar.bar += 1));
    assert.equal(calls, 'fbfb');
  });

  test(`supports reacting to property checks when value is undefined, deleting`, (ctx) => {
    const o = makeObservable({ value: undefined });

    let calls = 0;

    autorun(() => {
      calls += 1;
      ctx.diagnostic(`${'value' in o}`);
    });
    assert.equal(calls, 1);

    transaction(() => delete o.value);
    assert.equal(calls, 2);
    assert.equal('value' in o, false);
    assert.equal(calls, 2);

    transaction(() => {
      try {
        // toDo throws because of Reflect.deleteProperty, is this behaviour correct?
        delete o.value;
      } catch (error) {
        assert.equal(error instanceof Error, true);
      }
    });
    assert.equal(calls, 2);
    assert.equal('value' in o, false);
    assert.equal(calls, 2);
  });

  test(`supports reacting to property checks when value is undefined, deleting deep`, (ctx) => {
    const o = makeObservable({ value: { deep: undefined } });

    let calls = 0;

    autorun(() => {
      calls += 1;
      ctx.diagnostic(`${'deep' in o.value}`);
    });
    assert.equal(calls, 1);

    transaction(() => delete o.value.deep);
    assert.equal(calls, 2);
    assert.equal('deep' in o.value, false);
    assert.equal(calls, 2);

    transaction(() => {
      try {
        // toDo throws because of Reflect.deleteProperty, is this behaviour correct?
        delete o.value.deep;
      } catch (error) {
        assert.equal(error instanceof Error, true);
      }
    });
    assert.equal(calls, 2);
    assert.equal('deep' in o.value, false);
    assert.equal(calls, 2);
  });

  test(`supports reacting to property checks, adding [solid]`, (ctx) => {
    const o = makeObservable({});

    let calls = 0;

    autorun(() => {
      calls += 1;
      ctx.diagnostic(`${'value' in o}`);
    });
    assert.equal(calls, 1);

    // @ts-ignore
    transaction(() => (o.value = undefined));
    assert.equal(calls, 2);

    // @ts-ignore
    transaction(() => (o.value = undefined));
    assert.equal(calls, 2);
  });

  test(`supports reacting to property checks, adding deep`, (ctx) => {
    const o = makeObservable({ value: Object.create(null) });

    let calls = 0;

    autorun(() => {
      calls += 1;
      ctx.diagnostic(`${'deep' in o.value}`);
    });
    assert.equal(calls, 1);

    transaction(() => (o.value.deep = undefined));
    assert.equal(calls, 2);

    transaction(() => (o.value.deep = undefined));
    assert.equal(calls, 2);
  });

  // toDo what is root??
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
  //   autorun(() => {
  //     calls += 1;
  //
  //     o.value;
  //   });
  //   execute();
  //   assert.equal(calls, 1);
  //
  //   o.value = 321;
  //   execute();
  //   assert.equal(calls, 2);
  // });

  test(`does nothing for primitives`, () => {
    const o = makeObservable({ foo: 123 });
    assert.equal(o.foo, 123);

    o.foo = 321;
    assert.equal(o.foo, 321);

    o.foo = undefined;
    assert.equal(o.foo, undefined);

    o.foo = null;
    assert.equal(o.foo, null);

    o.foo = 0;
    assert.equal(o.foo, 0);

    // @ts-ignore
    o.foo = '';
    assert.equal(o.foo, '');

    // @ts-ignore
    o.foo = 'string';
    assert.equal(o.foo, 'string');

    // kr-observable will return proxy
    // o.foo = { 0: true };
    // assert.equal(o.foo).toEqual({ 0: true });

    // kr-observable will return Observable array
    // @ts-ignore
    // o.foo = [true];
    // assert.equal(o.foo, [true]);

    // @ts-ignore
    o.foo = true;
    assert.equal(o.foo, true);

    // @ts-ignore
    o.foo = false;
    assert.equal(o.foo, false);

    o.foo = Infinity;
    assert.equal(o.foo, Infinity);

    o.foo = Infinity;
    assert.equal(o.foo, Infinity);

    o.foo = NaN;
    assert.equal(Object.is(o.foo, NaN), true);

    o.foo = 1;
    assert.equal(o.foo, 1);
  });

  test(`can mutate object returned by getter [oby]`, () => {
    const result = makeObservable({
      get greeting() {
        return { greet: { deep: `hi, quack` } };
      },
      set greeting(val) {
        console.info(1);
      },
    });
    assert.equal(result.greeting.greet.deep, 'hi, quack');

    result.greeting.greet.deep = undefined;
    assert.equal(result.greeting.greet.deep, 'hi, quack');

    const tmp1 = result.greeting;
    assert.equal(tmp1.greet.deep, 'hi, quack');

    const tmp2 = result.greeting.greet;
    assert.equal(tmp2.deep, 'hi, quack');
  });

  // // vue

  test(`object.keys`, () => {
    const original = { foo: 1 };
    const result = makeObservable(original);
    assert.equal(result.foo, 1);
    assert.notEqual(result, original);
    assert.equal('foo' in result, true);
    assert.equal(Object.keys(result).toString(), 'foo');
  });

  test(`observed value should proxy mutations to original (Object)`, () => {
    const original = { foo: 1 };
    const observed = makeObservable(original);
    // set
    // @ts-ignore
    observed.bar = 1;
    // @ts-ignore
    assert.equal(observed.bar, 1);
    // @ts-ignore
    assert.equal(original.bar, 1);

    // delete
    delete observed.foo;
    assert.equal('foo' in observed, false);
    assert.equal('foo' in original, false);
  });

  test(`original value change should reflect in observed value (Object)`, () => {
    // same as before test but the value set is on original rather than observed
    const original = { foo: 1 };
    const observed = makeObservable(original);

    // set
    // @ts-ignore
    original.bar = 1;
    // @ts-ignore
    assert.equal(original.bar, 1);
    // @ts-ignore
    assert.equal(observed.bar, 1);

    // delete
    delete original.foo;
    assert.equal('foo' in original, false);
    assert.equal('foo' in observed, false);
  });

  test(`observing already observed value should return same Proxy`, () => {
    const original = { foo: 1 };
    const observed = makeObservable(original);
    const observed2 = makeObservable(observed);
    assert.equal(observed2, observed);
  });

  // not sure if this is correct behaviour
  test.skip(`observing the same value multiple times should return same Proxy`, () => {
    const original = { foo: 1 };
    const observed = makeObservable(original);
    const observed2 = makeObservable(original);
    assert.equal(observed, observed2);
  });

  test(`mutation on objects using reactive as prototype should trigger`, () => {
    const observed = makeObservable({ foo: 1 });
    const original = Object.create(observed);
    let dummy;
    autorun(() => (dummy = original.foo));
    assert.equal(dummy, 1);

    transaction(() => (observed.foo = 2));
    assert.equal(dummy, 2);
    assert.equal(observed.foo, 2);
    assert.equal(original.foo, 2);

    transaction(() => (original.foo = 3));
    assert.equal(dummy, 3);
    assert.equal(observed.foo, 3);
    assert.equal(original.foo, 3);

    transaction(() => (original.foo = 4));
    assert.equal(dummy, 4);
    assert.equal(observed.foo, 4);
    assert.equal(original.foo, 4);
  });

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
  //       assert.equal(testObj[key].a, 2);
  //       // check the value actually changed
  //       assert.equal(makeObservableObj[key].a, 2);
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
  //     assert.equal(makeObservableObj[key].a, testObj[key].a);
  //     assert.equal('a' in makeObservableObj[key], 'a' in testObj[key]);
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
  //       assert.equal('a' in testObj[key], false);
  //       // check the value actually changed
  //       assert.equal('a' in makeObservableObj[key], false);
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
  //     assert.equal(makeObservableObj[key].a, testObj[key].a);
  //     assert.equal('a' in makeObservableObj[key], 'a' in testObj[key]);
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
  //     assert.equal(makeObservableObj[key].ohai, testObj[key].ohai);
  //     assert.equal('ohai' in makeObservableObj[key], 'ohai' in testObj[key]);
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
  //   assert.equal(obj1 === obj2 && obj2 === obj3 && obj3 === obj4, true);
  // });
  //
  // test(`makeObservable identity nested`, (ctx) => {
  //   const raw = {};
  //   const obj1 = makeObservable({ value: raw });
  //   const obj2 = makeObservable({ value: raw });
  //   const obj3 = makeObservable({ value: obj1 });
  //   const obj4 = makeObservable({ value: obj2 });
  //
  //   assert.equal(obj1.value === obj2.value, true);
  //   assert.equal(obj2.value === obj3.value.value, true);
  //   assert.equal(obj3.value === obj1, true);
  //   assert.equal(obj3.value.value === obj4.value.value, true);
  // });

  // test(`should handle multiple effects`, (ctx) => {
  //   let dummy1;
  //   let dummy2;
  //   const counter = makeObservable({ num: 0 });
  //   const execute1 = memo(() => (dummy1 = counter.num));
  //   const execute2 = memo(() => (dummy2 = counter.num));
  //   execute1(), execute2();
  //
  //   assert.equal(dummy1, 0);
  //   assert.equal(dummy2, 0);
  //   counter.num++;
  //   execute1(), execute2();
  //   assert.equal(dummy1, 1);
  //   assert.equal(dummy2, 1);
  // });

  test(`should observe properties on the prototype chain`, () => {
    let dummy;
    const counter = makeObservable({ num: 0 });
    const parentCounter = makeObservable({ num: 2 });
    Object.setPrototypeOf(counter, parentCounter);
    autorun(() => (dummy = counter.num));

    assert.equal(dummy, 0);

    transaction(() => delete counter.num);
    assert.equal(dummy, 2);

    transaction(() => (parentCounter.num = 4));
    assert.equal(dummy, 4);

    transaction(() => (counter.num = 3));
    assert.equal(dummy, 3);
  });

  test(`should observe has operations on the prototype chain`, () => {
    let dummy;
    const counter = makeObservable({ num: 0 });
    const parentCounter = makeObservable({ num: 2 });
    Object.setPrototypeOf(counter, parentCounter);
    autorun(() => (dummy = 'num' in counter));

    assert.equal(dummy, true);

    transaction(() => delete counter.num);
    assert.equal(dummy, true);

    transaction(() => delete parentCounter.num);
    assert.equal(dummy, false);

    transaction(() => (counter.num = 3));
    assert.equal(dummy, true);
  });

  test(`prototype change `, () => {
    let dummy;
    let parentDummy;
    let hiddenValue;
    const obj = makeObservable({});
    const parent = makeObservable({
      set prop(value) {
        hiddenValue = value;
      },
      get prop() {
        return hiddenValue;
      },
    });
    Object.setPrototypeOf(obj, parent);
    // @ts-ignore
    autorun(() => (dummy = obj.prop));
    autorun(() => (parentDummy = parent.prop));

    assert.equal(dummy, undefined);
    assert.equal(parentDummy, undefined);

    // @ts-ignore
    transaction(() => (obj.prop = 4));
    // @ts-ignore
    assert.equal(obj.prop, 4);
    assert.equal(dummy, 4);

    transaction(() => (parent.prop = 2));
    // @ts-ignore
    assert.equal(obj.prop, 2);
    assert.equal(dummy, 2);
    assert.equal(parentDummy, 2);
    assert.equal(parent.prop, 2);
  });

  test(`should observe function call chains`, () => {
    let dummy;
    const counter = makeObservable({ num: 0 });
    autorun(() => (dummy = getNum()));

    function getNum() {
      return counter.num;
    }

    assert.equal(dummy, 0);

    transaction(() => (counter.num = 2));
    assert.equal(dummy, 2);
  });

  test(`should observe iteration`, () => {
    let dummy;
    const list = makeObservable({ value: 'Hello' });
    autorun(() => (dummy = list.value));

    assert.equal(dummy, 'Hello');

    transaction(() => (list.value += ' World!'));
    assert.equal(dummy, 'Hello World!');

    transaction(() => (list.value = list.value.replace('Hello ', '')));
    assert.equal(dummy, 'World!');
  });

  test.skip(`should observe enumeration`, () => {
    const numbers = makeObservable({ num1: 3 });

    let sum = 0;
    autorun(() => {
      sum = 0;
      // eslint-disable-next-line guard-for-in
      for (const key in numbers) {
        sum += numbers[key];
      }
    });

    assert.equal(sum, 3);

    // @ts-ignore
    transaction(() => (numbers.num2 = 4));
    assert.equal(sum, 7);

    transaction(() => delete numbers.num1);
    assert.equal(sum, 4);
  });

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
  //   assert.equal(calls1, 1);
  //   assert.equal(calls2, 1);
  //
  //   assert.equal(dummy, 'value');
  //   assert.equal(hasDummy, true);
  //
  //   assert.equal(calls1, 1);
  //   assert.equal(calls2, 1);
  //
  //   obj[key] = 'newValue';
  //   execute1(), execute2();
  //
  //   assert.equal(calls1, 2);
  //   assert.equal(calls2, 1);
  //
  //   assert.equal(dummy, 'newValue');
  //   assert.equal(hasDummy, true);
  //
  //   assert.equal(calls1, 2);
  //   assert.equal(calls2, 1);
  //
  //   delete obj[key];
  //   execute1(), execute2();
  //
  //   assert.equal(calls1, 3);
  //   assert.equal(calls2, 2);
  //
  //   assert.equal(dummy, undefined);
  //   assert.equal(hasDummy, false);
  // });

  // somnitelyno, no okay
  test.skip(`should cut the loop`, () => {
    const counter = makeObservable({ num: 0 });
    autorun(() => {
      if (counter.num < 10) {
        counter.num++;
      }
    });
    assert.equal(counter.num, 10);
  });

  // kr-observable doesn't use atoms or signals
  test(`should not be triggered by mutating a property, which is used in an inactive branch`, () => {
    let dummy;
    const obj = makeObservable({ prop: 'value', run: true });

    let calls = 0;
    autorun(() => {
      calls++;
      dummy = obj.run ? obj.prop : 'other';
    });

    assert.equal(dummy, 'value');
    assert.equal(calls, 1);

    transaction(() => (obj.run = false));
    assert.equal(dummy, 'other');
    assert.equal(calls, 2);

    transaction(() => (obj.prop = 'value2'));
    assert.equal(dummy, 'other');
    assert.equal(calls, 2);
  });

  test(`should not run multiple times for a single mutation`, () => {
    let dummy;
    const obj = makeObservable({});
    let calls = 0;
    autorun(() => {
      calls++;
      // eslint-disable-next-line guard-for-in
      for (const key in obj) {
        dummy = obj[key];
      }
      // @ts-ignore
      dummy = obj.prop;
    });

    assert.equal(calls, 1);

    // @ts-ignore
    transaction(() => (obj.prop = 16));

    assert.equal(dummy, 16);
    assert.equal(calls, 2);
  });

  // it will for non-empty objects, no idea why this is needed
  test.skip(`should observe json methods`, () => {
    let dummy = {};
    const obj = makeObservable({});
    autorun(() => {
      dummy = JSON.parse(JSON.stringify(obj));
    });

    // @ts-ignore
    transaction(() => (obj.a = 1));
    // @ts-ignore
    assert.equal(dummy.a, 1);
  });

  // how often can this happen, but for such rare cases, do we want to check all mutations for NaN? That's not wise
  test.skip(`should not be triggered when the value and the old value both are NaN`, (ctx) => {
    const obj = makeObservable({
      foo: NaN,
    });
    let calls = 0;
    autorun(() => {
      calls++;
      ctx.diagnostic(`${obj.foo}`);
    });

    assert.equal(calls, 1);

    transaction(() => (obj.foo = NaN));
    assert.equal(calls, 1);
  });

  // test(`should not be triggered when set with the same proxy [oby]`, (ctx) => {
  //   const obj = makeObservable({ foo: 1 });
  //   const observed = makeObservable({ obj });
  //
  //   let calls = 0;
  //   autorun(() => {
  //     calls++;
  //     observed.obj;
  //   });
  //   execute();
  //   assert.equal(calls, 1);
  //
  //   observed.obj = obj;
  //   execute();
  //   assert.equal(calls, 1);
  // });

  test(`should avoid infinite loops with other effects`, () => {
    const nums = makeObservable({ num1: 0, num2: 1 });

    let calls1 = 0;
    let calls2 = 0;

    autorun(() => {
      calls1++;
      nums.num1 = nums.num2;
    });

    assert.equal(nums.num1, 1);
    assert.equal(nums.num2, 1);

    autorun(() => {
      calls2++;
      nums.num2 = nums.num1;
    });

    assert.equal(nums.num1, 1);
    assert.equal(nums.num2, 1);
    assert.equal(calls1, 1);
    assert.equal(calls2, 1);

    transaction(() => (nums.num2 = 4));

    assert.equal(nums.num1, 4);
    assert.equal(nums.num2, 4);
    assert.equal(calls1, 2);
    assert.equal(calls2, 2);

    transaction(() => (nums.num1 = 10));

    assert.equal(nums.num1, 10);
    assert.equal(nums.num2, 10);
    // this is just implementation specific, but shouldnt run more than 3 times
    assert.equal(calls1, 3);
    assert.equal(calls2, 3);
  });

  // // #1246
  test(`mutation on objects using makeObservable as prototype should trigger`, () => {
    const original = makeObservable({ foo: 1 });

    const user = Object.create(original);

    let dummy;
    autorun(() => (dummy = user.foo));
    assert.equal(dummy, 1);

    transaction(() => (original.foo = 2));
    assert.equal(dummy, 2);

    transaction(() => (user.foo = 3));
    assert.equal(dummy, 3);

    transaction(() => (user.foo = 4));
    assert.equal(dummy, 4);
  });

  // // misc 2
  //
  test(`misc 2: avoids type confusion with inherited properties [oby]`, (ctx) => {
    class Test4 extends Observable {
      a = 13;
      get b() {
        return this.a * 4;
      }
      get myA() {
        return this.a;
      }
      set myA(value) {
        this.a = value;
      }
    }
    class Test3 extends Test4 {}
    class Tests2 extends Test3 {
      a = 1;
    }
    class Test extends Tests2 {}

    const m = new Test();

    let calls = 0;
    autorun(() => {
      ctx.diagnostic(`${m.b}`);
      calls++;
    });

    const increment = () => {
      transaction(() => m.a++);
    };

    // initial
    assert.equal(m.a, 1);
    assert.equal(m.b, 4);
    assert.equal(m.myA, 1);
    assert.equal(calls, 1);

    // incrementing
    increment();
    assert.equal(m.a, 2);
    assert.equal(m.b, 8);
    assert.equal(m.myA, 2);
    assert.equal(calls, 2);

    increment();
    assert.equal(m.a, 3);
    assert.equal(m.b, 12);
    assert.equal(m.myA, 3);
    assert.equal(calls, 3);
  });

  test(`misc 2: doesnt change keys`, () => {
    let result;

    // object
    result = makeObservable({});
    assert.equal(Object.keys(result).length, 0);

    // deep object
    result = makeObservable({ value: {} });
    assert.equal(Object.keys(result.value).length, 0);

    // deep array
    result = makeObservable({ value: [] });
    assert.equal(Object.keys(result.value).length, 0);

    // map
    result = makeObservable({ map: new Map() });
    assert.equal(Object.keys(result.map).length, 0);
  });

  test(`misc 2: proxy invariants`, () => {
    const o = {
      frozen: Object.freeze({}),
    };

    Object.defineProperty(o, 'test', {
      configurable: false,
      writable: false,
      value: { test: 1 },
    });

    // if broken this will crash
    const result = makeObservable(o);

    // @ts-ignore
    assert.equal(result.test, o.test);

    assert.equal(result.frozen, o.frozen);
  });

  test.skip(`misc 2: can mutate child of frozen object 1`, (ctx) => {
    const source = makeObservable(
      Object.freeze({
        user: { name: 'John', last: 'Snow' },
      })
    );

    assert.equal(source.user.name, 'John');
    assert.equal(source.user.last, 'Snow');

    let called = 0;

    autorun(() => {
      ctx.diagnostic(`${source.user.name} ${source.user.last}`);
      called++;
    });
    assert.equal(called, 1);

    transaction(() => (source.user.name = 'quack'));
    assert.equal(called, 2);

    transaction(() => (source.user.last = 'murci'));
    assert.equal(called, 3);

    assert.equal(source.user.name, 'quack');
    assert.equal(source.user.last, 'murci');

    try {
      // @ts-ignore
      source.user = 'something else';
      // assert.equal('frozen value to not be changed', 'frozen value to not be changed');
    } catch (error) {
      assert.equal(error instanceof Error, true);
      // this is expected to fail
    }
  });

  // test(`misc 2: can mutate child of frozen object 2`, (ctx) => {
  //   const source = makeObservable({
  //     data: Object.freeze({
  //       user: { name: 'John', last: 'Snow' },
  //     }),
  //   });
  //
  //   let called = 0;
  //
  //   autorun(() => {
  //     called++;
  //
  //     source.data.user.name;
  //     source.data.user.last;
  //   });
  //   execute();
  //   assert.equal(called, 1);
  //
  //   assert.equal(source.data.user.name, 'John');
  //   assert.equal(source.data.user.last, 'Snow');
  //
  //   source.data.user.name = 'quack';
  //   execute();
  //   assert.equal(called, 2);
  //
  //   source.data.user.last = 'murci';
  //   execute();
  //   assert.equal(called, 3);
  //
  //   assert.equal(source.data.user.name, 'quack');
  //   assert.equal(source.data.user.last, 'murci');
  //
  //   try {
  //     source.data.user = 'something else';
  //     // solid by design modifies frozen objects
  //     if (lib !== 'solid: ') {
  //       assert.equal('frozen value to not be changed', true);
  //     }
  //   } catch (e) {
  //     // this is expected to fail
  //   }
  // });

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
  //   autorun(() => {
  //     called++;
  //
  //     source.data.user.store.name;
  //     source.data.user.store.last;
  //   });
  //   execute();
  //   assert.equal(called, 1);
  //
  //   assert.equal(source.data.user.store.name, 'John');
  //   assert.equal(source.data.user.store.last, 'Snow');
  //
  //   source.data.user.store.name = 'quack';
  //   execute();
  //   assert.equal(called, 2);
  //
  //   source.data.user.store.last = 'murci';
  //   execute();
  //   assert.equal(called, 3);
  //
  //   assert.equal(source.data.user.store.name, 'quack');
  //   assert.equal(source.data.user.store.last, 'murci');
  //
  //   try {
  //     source.data.user = 'something else';
  //     // solid by design modifies frozen objects
  //     if (lib !== 'solid: ') {
  //       assert.equal('frozen value to not be changed', true);
  //     }
  //   } catch (e) {
  //     // this is expected to fail
  //   }
  // });

  test(`prototype walk in the right order`, () => {
    class c extends Observable {
      get value() {
        return 3;
      }
    }

    class b extends c {
      get value() {
        return 1;
      }
    }

    class a extends b {
      get value() {
        console.log('----------', this)
        return 2;
      }
    }

    // eslint-disable-next-line new-cap
    assert.equal(new a().value, 2);

    class d1 extends Observable {
      value = 4;
    }
    class c1 extends d1 {
      // @ts-ignore
      get value() {
        return 3;
      }
    }

    class b1 extends c1 {
      get value() {
        return 1;
      }
    }

    class a1 extends b1 {
      get value() {

        return 2;
      }
    }

    // eslint-disable-next-line new-cap
    assert.equal(new a1().value, 4);
  });
});

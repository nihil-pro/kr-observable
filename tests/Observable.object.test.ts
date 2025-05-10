import { describe, mock, test } from 'node:test';
import assert from 'node:assert';

import { Observable, autorun, makeObservable, transaction } from '../src/index.js';

// see https://github.com/solidjs/solid/issues/2112

describe('Tests from other reactivity systems', () => {
  test("setting to undefined shouldn't delete the property", () => {
    const result = makeObservable({
      name: 'quack',
    });
    assert.equal('name' in result, true);

    result.name = undefined;
    assert.equal('name' in result, true);
    assert.equal(result.name, undefined);

    delete result.name;
    assert.equal('name' in result, false);
    assert.equal(result.name, undefined);
  });

  test("deleting a key that doesn't exists shouldn't triggers reactivity", (ctx) => {
    const result = makeObservable({ a: 'someValue' });

    const subscriber = mock.fn();

    autorun(() => {
      subscriber();
      ctx.diagnostic(`Current keys in autorun: ${Object.keys(result).toString()}`);
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

  test("delete key with undefined value should trigger reactivity with check 'in'", (ctx) => {
    const result = makeObservable({ a: 'value', b: undefined });
    assert.equal('a' in result, true);
    assert.equal('b' in result, true);

    const subscriber = mock.fn();

    autorun(() => {
      const value = 'b' in result;
      subscriber();
      ctx.diagnostic(`autorun: "b" in result: ${value}`);
    });
    assert.equal(subscriber.mock.callCount(), 1);

    delete result.b;
    assert.equal('b' in result, false);
    assert.equal(subscriber.mock.callCount(), 2);
  });

  test('attempting to set a value when its only a getter should not access getter', () => {
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

  test('should not access getters more than it should', () => {
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

    assert.equal(result.b, 2, 'getter value');
    assert.equal(access, 1);

    result.b = 3;

    assert.equal(result.b, 3);
    assert.equal(access, 2, 'getter access');
  });

  test('should not access getters more than it should (2)', () => {
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

    // eslint-disable-next-line no-unused-expressions
    result.b;

    assert.equal('a' in result, true);
    assert.equal('b' in result, false);
    assert.equal(access, 0);

    // @ts-ignore
    result.b = 3;

    assert.equal('a' in result, true);
    assert.equal('b' in result, true);
    assert.equal(result.b, 3, 'getter value');
    assert.equal(access, 0);
  });

  test('problems with getters defined in classes [49]', (ctx) => {
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

      increment() {
        this.a++;
        this.child.f++;
      }
    }

    const m = new A();

    const subscriber1 = mock.fn();
    const subscriber2 = mock.fn();

    autorun(() => {
      const value = m.b;
      subscriber1();
      ctx.diagnostic(`autorun1: m.b: ${value}`);
    });

    autorun(() => {
      const value = m.child.f;
      subscriber2();
      ctx.diagnostic(`autorun2: m.child.b: ${value}`);
    });

    // initial
    assert.equal(m.b, 4);
    assert.equal(m.child.e, 4);
    assert.equal(subscriber1.mock.callCount(), 1);
    assert.equal(subscriber2.mock.callCount(), 1);

    m.increment();
    assert.equal(m.b, 8);
    assert.equal(m.child.e, 8);
    assert.equal(subscriber1.mock.callCount(), 2);
    assert.equal(subscriber2.mock.callCount(), 2);

    m.increment();
    assert.equal(m.b, 12);
    assert.equal(m.child.e, 12);
    assert.equal(subscriber1.mock.callCount(), 3);
    assert.equal(subscriber2.mock.callCount(), 3);

    m.increment();
    assert.equal(m.b, 16);
    assert.equal(m.child.e, 16);
    assert.equal(subscriber1.mock.callCount(), 4);
    assert.equal(subscriber2.mock.callCount(), 4);
  });

  test('read and set inside class [51]', (ctx) => {
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
      const value = m.b;
      subscriber();
      ctx.diagnostic(`autorun: m.b: ${value}`);
    });

    assert.equal(subscriber.mock.callCount(), 1);
    assert.equal(m.a, 1);
    assert.equal(m.b, 4);

    // incrementing
    m.increment();
    assert.equal(subscriber.mock.callCount(), 2);
    assert.equal(m.a, 2);
    assert.equal(m.b, 8);

    m.increment();
    assert.equal(subscriber.mock.callCount(), 3);
    assert.equal(m.a, 3);
    assert.equal(m.b, 12);
  });

  test('read and set inside class [52]', (ctx) => {
    class Test extends Observable {
      a = 1;
      get b() {
        return this.a * 4;
      }

      increment() {
        this.a++;
      }
    }

    class Foo extends Test {}

    const m = new Foo();

    const subscriber = mock.fn();

    autorun(() => {
      const value = m.b;
      subscriber();
      ctx.diagnostic(`autorun: m.b: ${value}`);
    });

    assert.equal(subscriber.mock.callCount(), 1);
    assert.equal(m.a, 1);
    assert.equal(m.b, 4);

    // incrementing
    m.increment();
    assert.equal(subscriber.mock.callCount(), 2);
    assert.equal(m.a, 2);
    assert.equal(m.b, 8);

    m.increment();
    assert.equal(subscriber.mock.callCount(), 3);
    assert.equal(m.a, 3);
    assert.equal(m.b, 12);
  });

  test('should react to hasOwnProperty', (ctx) => {
    const m = makeObservable({ a: { deep: 'test' } });

    let has;
    const subscriber1 = mock.fn();

    autorun(() => {
      has = m.hasOwnProperty('b');
      subscriber1();
      ctx.diagnostic(`autorun1: has: ${has}`);
    });

    assert.equal(has, false);
    // @ts-ignore
    transaction(() => (m.b = 1));
    assert.equal(has, true);

    const subscriber2 = mock.fn();
    autorun(() => {
      has = m.a.hasOwnProperty('b');
      subscriber2();
      ctx.diagnostic(`autorun1: has: ${has}`);
    });

    assert.equal(has, false);
    // @ts-ignore
    transaction(() => (m.a.b = 1));
    assert.equal(has, true);
  });

  test('should not throw when redefining hasOwnProperty', (ctx) => {
    const o = makeObservable({});

    const subscriber1 = mock.fn();

    autorun(() => {
      console.warn(
        o.hasOwnProperty,
        // @ts-ignore
        o.isPrototypeOf,
        o.propertyIsEnumerable,
        o.toLocaleString,
        // @ts-ignore
        o.toSource,
        o.toString,
        o.valueOf
      );
      subscriber1();
      ctx.diagnostic(`autorun`);
    });

    assert.equal(subscriber1.mock.callCount(), 1);

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
    assert.equal(subscriber1.mock.callCount(), 2);
  });
});

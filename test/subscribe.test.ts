import { describe, it, mock } from 'node:test';
import * as assert from 'node:assert/strict';

import { Observable } from '../src/Observable.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Subscribe', async () => {
  class FooSimple extends Observable {
    a = 1;
    b = 1;
  }

  class FooComplex extends Observable {
    name = '';
    age = 42;
    city = 'Moscow';

    setAll() {
      this.city = 'Texas';
      this.age = 52;
      this.name = 'Egor';
      this.city = 'London';
    }

    async setAsynchronously() {
      await delay(1);

      this.name = 'John';
      this.city = 'Rome';

      return true;
    }
  }

  await it('Called sync if some property was read', async () => {
    const foo = new FooSimple();

    const subscriber = mock.fn();
    foo.subscribe(subscriber, new Set(['a', 'b']));

    foo.a = 2;
    foo.b = 2;

    assert.equal(foo.a, 2);
    assert.equal(foo.b, 2);

    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');

    await delay(1);

    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once after delay');

    subscriber.mock.resetCalls();

    foo.a = 2;
    foo.b = 2;

    assert.equal(foo.a, 2);
    assert.equal(foo.b, 2);

    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called if the value is the same');

    await delay(1);

    assert.equal(
      subscriber.mock.callCount(),
      0,
      'Should not be called if the value is the same after delay'
    );

    subscriber.mock.resetCalls();

    foo.a = 3;

    assert.equal(foo.a, 3);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once on next change');

    await delay(1);

    assert.equal(
      subscriber.mock.callCount(),
      1,
      'Should be called once on next change after delay'
    );

    subscriber.mock.resetCalls();

    foo.unsubscribe(subscriber);

    foo.a = 4;

    assert.equal(foo.a, 4);

    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called after unsubscribe');

    await delay(1);

    assert.equal(
      subscriber.mock.callCount(),
      0,
      'Should not be called after unsubscribe after delay'
    );
  });

  await it('Called async if no property was read', async () => {
    const foo = new FooSimple();

    const subscriber = mock.fn();
    foo.subscribe(subscriber, new Set(['a', 'b']));

    foo.a = 2;
    foo.b = 2;

    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called sync');

    await delay(1);

    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once after delay');

    subscriber.mock.resetCalls();

    foo.a = 2;
    foo.b = 2;

    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called if the value is the same');

    await delay(1);

    assert.equal(
      subscriber.mock.callCount(),
      0,
      'Should not be called if the value is the same after delay'
    );

    subscriber.mock.resetCalls();

    foo.a = 3;

    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called on next change sync');

    await delay(1);

    assert.equal(
      subscriber.mock.callCount(),
      1,
      'Should be called once on next change after delay'
    );

    subscriber.mock.resetCalls();

    foo.unsubscribe(subscriber);

    foo.a = 4;

    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called after unsubscribe');

    await delay(1);

    assert.equal(
      subscriber.mock.callCount(),
      0,
      'Should not be called after unsubscribe after delay'
    );
  });

  await it('Called half sync, half async if async changes', async () => {
    const foo = new FooSimple();

    const subscriber = mock.fn();
    foo.subscribe(subscriber, new Set(['a', 'b']));

    await (async () => {
      foo.a = 2;
      foo.b = 2;
    })();

    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once sync');

    await delay(1);

    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once after delay');

    subscriber.mock.resetCalls();

    await (async () => {
      foo.a = 2;
      foo.b = 2;
    })();

    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called if the value is the same');

    await delay(1);

    assert.equal(
      subscriber.mock.callCount(),
      0,
      'Should not be called if the value is the same after delay'
    );

    subscriber.mock.resetCalls();

    await (async () => {
      foo.a = 3;
    })();

    assert.equal(subscriber.mock.callCount(), 1, 'Should not be called once on next change sync');

    await delay(1);

    assert.equal(
      subscriber.mock.callCount(),
      1,
      'Should be called once on next change after delay'
    );

    subscriber.mock.resetCalls();

    foo.unsubscribe(subscriber);

    await (async () => {
      foo.a = 4;
    })();

    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called after unsubscribe');

    await delay(1);

    assert.equal(
      subscriber.mock.callCount(),
      0,
      'Should not be called after unsubscribe after delay'
    );
  });

  await it('subscribe', async () => {
    const foo = new FooComplex();

    const subscriber = mock.fn();
    foo.subscribe(subscriber, new Set(['name', 'city', 'surname']));

    foo.setAll();

    await delay(1);

    assert.equal(
      subscriber.mock.callCount(),
      1,
      'Should be called once per synchronous transaction'
    );

    subscriber.mock.resetCalls();

    foo.age = 62; // We are not subscribed to age

    await delay(1);

    assert.equal(
      subscriber.mock.callCount(),
      0,
      'Should not be called when changing a property that we are not subscribed to'
    );

    subscriber.mock.resetCalls();

    await foo.setAsynchronously();

    await delay(1);

    assert.equal(
      subscriber.mock.callCount(),
      1,
      'Should be called once after promise-based change'
    );

    subscriber.mock.resetCalls();

    const subscriber2 = mock.fn();
    foo.subscribe(subscriber2, new Set(['name', 'city']));

    foo.city = 'Seoul';
    foo.name = 'Choi';

    await delay(1);

    assert.equal(subscriber.mock.callCount(), 1, 'Should be called for subscriber');
    assert.equal(subscriber2.mock.callCount(), 1, 'Should be called for subscriber2');
  });
});

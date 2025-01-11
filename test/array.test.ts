import { describe, it, mock } from 'node:test';
import * as assert from 'node:assert/strict';

import { Observable } from '../src/index.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const TEST_SECOND = true;

describe('Observable Array', async () => {
  class Foo extends Observable {
    array = [];
  }

  await it('Subscribe: should notify when add item by push', async () => {
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.subscribe(subscriber, new Set(['array']));

    foo.array.push(9);

    assert.deepEqual(Array.from(foo.array), [9]);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');

    if (!TEST_SECOND) return;

    // BUG: on second push subscriber is not called

    subscriber.mock.resetCalls();

    foo.array.push(10);
    foo.array.push(11, 12);

    assert.deepEqual(Array.from(foo.array), [9, 10, 11, 12]);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');

    subscriber.mock.resetCalls();

    foo.unsubscribe(subscriber);

    foo.array.push(13);

    assert.deepEqual(Array.from(foo.array), [9, 10, 11, 12, 13]);
    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called when unsubscribed');
  });

  await it('Subscribe: should notify when set item by index', async () => {
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.subscribe(subscriber, new Set(['array']));

    foo.array.set(0, 9);

    assert.deepEqual(Array.from(foo.array), [9]);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');

    if (!TEST_SECOND) return;

    // BUG: on second set subscriber is not called

    subscriber.mock.resetCalls();

    foo.array.set(0, 8);

    assert.deepEqual(Array.from(foo.array), [8]);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');

    subscriber.mock.resetCalls();

    foo.unsubscribe(subscriber);

    foo.array.set(0, 7);

    assert.deepEqual(Array.from(foo.array), [7]);
    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called when unsubscribed');
  });

  await it.skip('Subscribe: should notify when assign item by index', async () => {
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.subscribe(subscriber, new Set(['array']));

    foo.array[0] = 9;

    assert.deepEqual(Array.from(foo.array), [9]);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');

    // BUG: not notified
  });

  await it('Subscribe: should notify on splice', async () => {
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.array = [1, 2, 3];
    foo.subscribe(subscriber, new Set(['array']));

    foo.array.splice(0, 1);

    assert.deepEqual(Array.from(foo.array), [2, 3]);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');

    if (!TEST_SECOND) return;

    // BUG: on second splice subscriber is not called

    subscriber.mock.resetCalls();

    foo.array.splice(0, 1);

    assert.deepEqual(Array.from(foo.array), [3]);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');

    subscriber.mock.resetCalls();

    foo.unsubscribe(subscriber);

    foo.array.splice(0, 1);

    assert.deepEqual(Array.from(foo.array), []);
    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called when unsubscribed');
  });

  await it('Subscribe: should notify on shift', async () => {
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.array = [1, 2, 3, 4, 5];
    foo.subscribe(subscriber, new Set(['array']));

    foo.array.shift();

    await delay(0); // BUG: hack required

    assert.deepEqual(Array.from(foo.array), [2, 3, 4, 5]);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');

    subscriber.mock.resetCalls();

    foo.array.shift();

    assert.deepEqual(Array.from(foo.array), [3, 4, 5]);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');

    subscriber.mock.resetCalls();

    foo.unsubscribe(subscriber);

    foo.array.shift();

    assert.deepEqual(Array.from(foo.array), [4, 5]);
    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called when unsubscribed');
  });

  await it('Subscribe: should notify on pop', async () => {
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.array = [1, 2, 3, 4, 5];
    foo.subscribe(subscriber, new Set(['array']));

    foo.array.pop();

    await delay(0); // BUG: hack required

    assert.deepEqual(Array.from(foo.array), [1, 2, 3, 4]);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');

    subscriber.mock.resetCalls();

    foo.array.pop();

    assert.deepEqual(Array.from(foo.array), [1, 2, 3]);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');

    subscriber.mock.resetCalls();

    foo.unsubscribe(subscriber);

    foo.array.pop();

    assert.deepEqual(Array.from(foo.array), [1, 2]);
    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called when unsubscribed');
  });

  await it('Subscribe: should notify on sort and reverse', async () => {
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.array = [1, 2, 3];
    foo.subscribe(subscriber, new Set(['array']));

    foo.array.sort((a, b) => b - a);

    await delay(0); // BUG: hack required

    assert.deepEqual(Array.from(foo.array), [3, 2, 1]);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');

    subscriber.mock.resetCalls();

    foo.array.reverse();

    assert.deepEqual(Array.from(foo.array), [1, 2, 3]);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');

    subscriber.mock.resetCalls();

    foo.unsubscribe(subscriber);

    foo.array.sort((a, b) => b - a);

    assert.deepEqual(Array.from(foo.array), [3, 2, 1]);
    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called when unsubscribed');
  });

  await it('Listen: should notify when add item by push', async () => {
    // BUG: listen says "true" for value

    // return;

    const foo = new Foo();

    const subscriber = mock.fn();
    foo.listen(subscriber);

    foo.array.push(9);

    assert.deepEqual(Array.from(foo.array), [9]);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');
    assert.deepEqual(
      subscriber.mock.calls[0].arguments,
      ['array', [9]],
      'Should be called with relevant values'
    );

    subscriber.mock.resetCalls();

    foo.array.push(10);
    foo.array.push(11, 12);

    assert.deepEqual(Array.from(foo.array), [9, 10, 11, 12]);
    assert.equal(subscriber.mock.callCount(), 2, 'Should be called twice');
    assert.deepEqual(
      subscriber.mock.calls[0].arguments,
      ['array', [10]],
      'Should be called with relevant values1'
    );
    assert.deepEqual(
      subscriber.mock.calls[1].arguments,
      ['array', [11, 12]],
      'Should be called with relevant values2'
    );

    subscriber.mock.resetCalls();

    foo.unlisten(subscriber);

    foo.array.push(13);

    assert.deepEqual(Array.from(foo.array), [9, 10, 11, 12, 13]);
    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called when unsubscribed');
  });
});

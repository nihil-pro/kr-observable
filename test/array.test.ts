import { describe, it, Mock, mock } from 'node:test';
import * as assert from 'node:assert/strict';

import { Observable } from '../src/index.js';
import { ObservableArray } from '../src/Observable.js';

describe('Observable Array', async () => {
  class Foo extends Observable {
    array = [];
  }

  function checkListenArgs(subscriber: Mock<any>, expectedValues: Array<Array<any>>) {
    assert.equal(
      subscriber.mock.callCount(),
      expectedValues.length,
      `Listener should be called ${expectedValues.length} times`
    );

    expectedValues.forEach((expectedValue, callNumber) => {
      assert.deepEqual(
        subscriber.mock.calls[callNumber].arguments[0],
        'array',
        'Should be called with relevant values'
      );
      assert.deepEqual(
        Array.from(subscriber.mock.calls[callNumber].arguments[1]),
        expectedValue,
        'Should be called with relevant values'
      );
      assert.deepEqual(
        subscriber.mock.calls[callNumber].arguments[1] instanceof ObservableArray,
        true,
        'Array should be ObservableArray'
      );
    });
  }

  // Not implemented in the library
  await it.skip('Subscribe: should notify when assign item by index', async () => {
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.subscribe(subscriber, new Set(['array']));

    foo.array[0] = 9;

    assert.deepEqual(Array.from(foo.array), [9]);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');

    // BUG: not notified
  });

  await it('Subscribe: should notify when add item by push', async () => {
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.subscribe(subscriber, new Set(['array']));

    foo.array.push(9);

    assert.deepEqual(Array.from(foo.array), [9]);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');

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

    subscriber.mock.resetCalls();

    foo.array.set(0, 7);
    foo.array.set(0, 8);

    assert.deepEqual(Array.from(foo.array), [8]);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');

    subscriber.mock.resetCalls();

    foo.unsubscribe(subscriber);

    foo.array.set(0, 7);

    assert.deepEqual(Array.from(foo.array), [7]);
    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called when unsubscribed');
  });

  await it('Subscribe: should notify on splice', async () => {
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.array = [1, 2, 3, 4, 5];
    foo.subscribe(subscriber, new Set(['array']));

    foo.array.splice(0, 1);

    assert.deepEqual(Array.from(foo.array), [2, 3, 4, 5]);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');

    subscriber.mock.resetCalls();

    foo.array.splice(0, 1);
    foo.array.splice(0, 1);

    assert.deepEqual(Array.from(foo.array), [4, 5]);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');

    subscriber.mock.resetCalls();

    foo.unsubscribe(subscriber);

    foo.array.splice(0, 1);

    assert.deepEqual(Array.from(foo.array), [5]);
    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called when unsubscribed');
  });

  await it('Subscribe: should notify on shift', async () => {
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.array = [1, 2, 3, 4, 5];
    foo.subscribe(subscriber, new Set(['array']));

    foo.array.shift();

    assert.deepEqual(Array.from(foo.array), [2, 3, 4, 5]);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');

    subscriber.mock.resetCalls();

    foo.array.shift();
    foo.array.shift();

    assert.deepEqual(Array.from(foo.array), [4, 5]);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');

    subscriber.mock.resetCalls();

    foo.unsubscribe(subscriber);

    foo.array.shift();

    assert.deepEqual(Array.from(foo.array), [5]);
    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called when unsubscribed');
  });

  await it('Subscribe: should notify on pop', async () => {
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.array = [1, 2, 3, 4, 5];
    foo.subscribe(subscriber, new Set(['array']));

    foo.array.pop();

    assert.deepEqual(Array.from(foo.array), [1, 2, 3, 4]);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');

    subscriber.mock.resetCalls();

    foo.array.pop();
    foo.array.pop();

    assert.deepEqual(Array.from(foo.array), [1, 2]);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');

    subscriber.mock.resetCalls();

    foo.unsubscribe(subscriber);

    foo.array.pop();

    assert.deepEqual(Array.from(foo.array), [1]);
    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called when unsubscribed');
  });

  await it('Subscribe: should notify on sort and reverse', async () => {
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.array = [1, 2, 3];
    foo.subscribe(subscriber, new Set(['array']));

    foo.array.sort((a, b) => b - a);

    assert.deepEqual(Array.from(foo.array), [3, 2, 1]);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');

    subscriber.mock.resetCalls();

    foo.array.reverse();
    foo.array.reverse();
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
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.listen(subscriber);

    foo.array.push(9);

    assert.deepEqual(Array.from(foo.array), [9]);

    // BUG: array should be ObservableArray
    checkListenArgs(subscriber, [[9]]);

    subscriber.mock.resetCalls();

    foo.array.push(10);
    foo.array.push(11, 12);

    assert.deepEqual(Array.from(foo.array), [9, 10, 11, 12]);

    checkListenArgs(subscriber, [
      [9, 10, 11, 12],
      [9, 10, 11, 12],
    ]);

    subscriber.mock.resetCalls();

    foo.unlisten(subscriber);

    foo.array.push(13);

    assert.deepEqual(Array.from(foo.array), [9, 10, 11, 12, 13]);
    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called when unsubscribed');
  });

  await it.skip('Listen: should notify when set item by index', async () => {
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.listen(subscriber);

    foo.array.set(0, 9);

    assert.deepEqual(Array.from(foo.array), [9]);

    // BUG: should be full array value instead of the changed element
    checkListenArgs(subscriber, [[9]]);

    subscriber.mock.resetCalls();

    foo.array.set(0, 7);
    foo.array.set(0, 8);

    assert.deepEqual(Array.from(foo.array), [8]);

    // BUG: should be full array value instead of the changed element
    checkListenArgs(subscriber, [[8], [8]]);

    subscriber.mock.resetCalls();

    foo.unlisten(subscriber);

    foo.array.set(0, 7);

    assert.deepEqual(Array.from(foo.array), [7]);
    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called when unsubscribed');
  });

  await it('Listen: should notify on splice', async () => {
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.array = [1, 2, 3, 4, 5];
    foo.listen(subscriber);

    foo.array.splice(0, 1);

    assert.deepEqual(Array.from(foo.array), [2, 3, 4, 5]);

    checkListenArgs(subscriber, [[2, 3, 4, 5]]);

    subscriber.mock.resetCalls();

    foo.array.splice(0, 1);
    foo.array.splice(0, 1);

    assert.deepEqual(Array.from(foo.array), [4, 5]);

    checkListenArgs(subscriber, [
      [4, 5],
      [4, 5],
    ]);

    subscriber.mock.resetCalls();

    foo.unlisten(subscriber);

    foo.array.splice(0, 1);

    assert.deepEqual(Array.from(foo.array), [5]);
    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called when unsubscribed');
  });

  await it('Listen: should notify on shift', async () => {
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.array = [1, 2, 3, 4, 5];
    foo.listen(subscriber);

    foo.array.shift();

    assert.deepEqual(Array.from(foo.array), [2, 3, 4, 5]);

    checkListenArgs(subscriber, [[2, 3, 4, 5]]);

    subscriber.mock.resetCalls();

    foo.array.shift();
    foo.array.shift();

    assert.deepEqual(Array.from(foo.array), [4, 5]);

    checkListenArgs(subscriber, [
      [4, 5],
      [4, 5],
    ]);

    subscriber.mock.resetCalls();

    foo.unlisten(subscriber);

    foo.array.shift();

    assert.deepEqual(Array.from(foo.array), [5]);
    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called when unsubscribed');
  });

  await it('Listen: should notify on pop', async () => {
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.array = [1, 2, 3, 4, 5];
    foo.listen(subscriber);

    foo.array.pop();

    assert.deepEqual(Array.from(foo.array), [1, 2, 3, 4]);

    checkListenArgs(subscriber, [[1, 2, 3, 4]]);

    subscriber.mock.resetCalls();

    foo.array.pop();
    foo.array.pop();

    assert.deepEqual(Array.from(foo.array), [1, 2]);

    checkListenArgs(subscriber, [
      [1, 2],
      [1, 2],
    ]);

    subscriber.mock.resetCalls();

    foo.unlisten(subscriber);

    foo.array.pop();

    assert.deepEqual(Array.from(foo.array), [1]);
    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called when unsubscribed');
  });

  await it('Listen: should notify on sort and reverse', async () => {
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.array = [1, 2, 3];
    foo.listen(subscriber);

    foo.array.sort((a, b) => b - a);

    assert.deepEqual(Array.from(foo.array), [3, 2, 1]);

    checkListenArgs(subscriber, [[3, 2, 1]]);

    subscriber.mock.resetCalls();

    foo.array.reverse();
    foo.array.reverse();
    foo.array.reverse();

    assert.deepEqual(Array.from(foo.array), [1, 2, 3]);

    checkListenArgs(subscriber, [
      [1, 2, 3],
      [1, 2, 3],
      [1, 2, 3],
    ]);

    subscriber.mock.resetCalls();

    foo.unlisten(subscriber);

    foo.array.sort((a, b) => b - a);

    assert.deepEqual(Array.from(foo.array), [3, 2, 1]);
    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called when unsubscribed');
  });
});

import { describe, it, mock } from 'node:test';
import * as assert from 'node:assert/strict';

import { Observable } from '../src/Observable.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const DEF_DELAY = 0;

describe('Listen', async () => {
  class Foo extends Observable {
    a = 1;
    b = 1;
    c = 1;
  }

  await it('Called sync if some property was read', async () => {
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.listen(subscriber);

    foo.a = 2;

    assert.equal(foo.a, 2);

    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');
    assert.deepEqual(
      subscriber.mock.calls[0].arguments,
      ['a', 2],
      'Should be called with relevant values'
    );

    await delay(DEF_DELAY);

    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once after delay');
    assert.deepEqual(
      subscriber.mock.calls[0].arguments,
      ['a', 2],
      'Should be called with relevant values after delay'
    );

    subscriber.mock.resetCalls();

    foo.a = 2;

    assert.equal(foo.a, 2);

    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called if the value is the same');

    await delay(DEF_DELAY);

    assert.equal(
      subscriber.mock.callCount(),
      0,
      'Should not be called if the value is the same after delay'
    );

    subscriber.mock.resetCalls();

    foo.a = 1;
    foo.b = 2;

    assert.equal(foo.a, 1);
    assert.equal(foo.b, 2);

    assert.equal(subscriber.mock.callCount(), 2, 'Should be called twice');
    assert.deepEqual(
      subscriber.mock.calls[0].arguments,
      ['a', 1],
      'Should be called with relevant values'
    );
    assert.deepEqual(
      subscriber.mock.calls[1].arguments,
      ['b', 2],
      'Should be called with relevant values'
    );

    await delay(DEF_DELAY);

    assert.equal(subscriber.mock.callCount(), 2, 'Should be called once after delay');
    assert.deepEqual(
      subscriber.mock.calls[0].arguments,
      ['a', 1],
      'Should be called with relevant values after delay'
    );
    assert.deepEqual(
      subscriber.mock.calls[1].arguments,
      ['b', 2],
      'Should be called with relevant values after delay'
    );

    subscriber.mock.resetCalls();

    foo.a = 3;

    assert.equal(foo.a, 3);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once on next change');
    assert.deepEqual(
      subscriber.mock.calls[0].arguments,
      ['a', 3],
      'Should be called on next change with relevant values'
    );

    await delay(DEF_DELAY);

    assert.equal(
      subscriber.mock.callCount(),
      1,
      'Should be called once on next change after delay'
    );
    assert.deepEqual(
      subscriber.mock.calls[0].arguments,
      ['a', 3],
      'Should be called on next change with relevant values after delay'
    );

    subscriber.mock.resetCalls();

    foo.unlisten(subscriber);

    foo.a = 4;

    assert.equal(foo.a, 4);

    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called after unsubscribe');

    await delay(DEF_DELAY);

    assert.equal(
      subscriber.mock.callCount(),
      0,
      'Should not be called after unsubscribe after delay'
    );
  });

  await it('Called sync if no property was read', async () => {
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.listen(subscriber);

    foo.a = 2;

    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');
    assert.deepEqual(
      subscriber.mock.calls[0].arguments,
      ['a', 2],
      'Should be called with relevant values'
    );

    await delay(DEF_DELAY);

    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once after delay');
    assert.deepEqual(
      subscriber.mock.calls[0].arguments,
      ['a', 2],
      'Should be called with relevant values after delay'
    );

    subscriber.mock.resetCalls();

    foo.a = 2;

    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called if the value is the same');

    await delay(DEF_DELAY);

    assert.equal(
      subscriber.mock.callCount(),
      0,
      'Should not be called if the value is the same after delay'
    );

    subscriber.mock.resetCalls();

    foo.a = 1;
    foo.b = 2;

    assert.equal(subscriber.mock.callCount(), 2, 'Should be called twice');
    assert.deepEqual(
      subscriber.mock.calls[0].arguments,
      ['a', 1],
      'Should be called with relevant values'
    );
    assert.deepEqual(
      subscriber.mock.calls[1].arguments,
      ['b', 2],
      'Should be called with relevant values'
    );

    await delay(DEF_DELAY);

    assert.equal(subscriber.mock.callCount(), 2, 'Should be called once after delay');
    assert.deepEqual(
      subscriber.mock.calls[0].arguments,
      ['a', 1],
      'Should be called with relevant values after delay'
    );
    assert.deepEqual(
      subscriber.mock.calls[1].arguments,
      ['b', 2],
      'Should be called with relevant values after delay'
    );

    subscriber.mock.resetCalls();

    foo.a = 3;

    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once on next change');
    assert.deepEqual(
      subscriber.mock.calls[0].arguments,
      ['a', 3],
      'Should be called on next change with relevant values'
    );

    await delay(DEF_DELAY);

    assert.equal(
      subscriber.mock.callCount(),
      1,
      'Should be called once on next change after delay'
    );
    assert.deepEqual(
      subscriber.mock.calls[0].arguments,
      ['a', 3],
      'Should be called on next change with relevant values after delay'
    );

    subscriber.mock.resetCalls();

    foo.unlisten(subscriber);

    foo.a = 4;

    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called after unsubscribe');

    await delay(DEF_DELAY);

    assert.equal(
      subscriber.mock.callCount(),
      0,
      'Should not be called after unsubscribe after delay'
    );
  });

  await it('Called sync if async changes', async () => {
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.listen(subscriber);

    await (async () => {
      foo.a = 2;
    })();

    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');
    assert.deepEqual(
      subscriber.mock.calls[0].arguments,
      ['a', 2],
      'Should be called with relevant values'
    );

    await delay(DEF_DELAY);

    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once after delay');
    assert.deepEqual(
      subscriber.mock.calls[0].arguments,
      ['a', 2],
      'Should be called with relevant values after delay'
    );

    subscriber.mock.resetCalls();

    await (async () => {
      foo.a = 2;
    })();

    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called if the value is the same');

    await delay(DEF_DELAY);

    assert.equal(
      subscriber.mock.callCount(),
      0,
      'Should not be called if the value is the same after delay'
    );

    subscriber.mock.resetCalls();

    await (async () => {
      foo.a = 1;
      foo.b = 2;
    })();

    assert.equal(subscriber.mock.callCount(), 2, 'Should be called twice');
    assert.deepEqual(
      subscriber.mock.calls[0].arguments,
      ['a', 1],
      'Should be called with relevant values'
    );
    assert.deepEqual(
      subscriber.mock.calls[1].arguments,
      ['b', 2],
      'Should be called with relevant values'
    );

    await delay(DEF_DELAY);

    assert.equal(subscriber.mock.callCount(), 2, 'Should be called once after delay');
    assert.deepEqual(
      subscriber.mock.calls[0].arguments,
      ['a', 1],
      'Should be called with relevant values after delay'
    );
    assert.deepEqual(
      subscriber.mock.calls[1].arguments,
      ['b', 2],
      'Should be called with relevant values after delay'
    );

    subscriber.mock.resetCalls();

    await (async () => {
      foo.a = 3;
    })();

    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once on next change');
    assert.deepEqual(
      subscriber.mock.calls[0].arguments,
      ['a', 3],
      'Should be called on next change with relevant values'
    );

    await delay(DEF_DELAY);

    assert.equal(
      subscriber.mock.callCount(),
      1,
      'Should be called once on next change after delay'
    );
    assert.deepEqual(
      subscriber.mock.calls[0].arguments,
      ['a', 3],
      'Should be called on next change with relevant values after delay'
    );

    subscriber.mock.resetCalls();

    foo.unlisten(subscriber);

    await (async () => {
      foo.a = 4;
    })();

    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called after unsubscribe');

    await delay(DEF_DELAY);

    assert.equal(
      subscriber.mock.callCount(),
      0,
      'Should not be called after unsubscribe after delay'
    );
  });

  await it('Multiple', async () => {
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.listen(subscriber);

    const subscriber2 = mock.fn();
    foo.listen(subscriber2);

    foo.a = 3;

    assert.equal(subscriber.mock.callCount(), 1, 'Should be called for subscriber');
    assert.deepEqual(
      subscriber.mock.calls[0].arguments,
      ['a', 3],
      'Should be called with relevant values'
    );
    assert.equal(subscriber2.mock.callCount(), 1, 'Should be called for subscriber2');
    assert.deepEqual(
      subscriber2.mock.calls[0].arguments,
      ['a', 3],
      'Should be called with relevant values'
    );
  });
});

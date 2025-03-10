import { describe, it, mock } from 'node:test';
import * as assert from 'node:assert/strict';

import { Observable } from '../src/Observable.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const DEF_DELAY = 0;

describe('Subscribe', async () => {
  class Foo extends Observable {
    a = 1;
    b = 1;
    c = 1;
  }

  await it('Called sync if some property was read', async () => {
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.subscribe(subscriber, new Set(['a', 'b']));

    foo.a = 2;
    foo.b = 2;

    assert.equal(foo.a, 2);
    assert.equal(foo.b, 2);

    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');

    await delay(DEF_DELAY);

    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once after delay');

    subscriber.mock.resetCalls();

    foo.a = 2;
    foo.b = 2;

    assert.equal(foo.a, 2);
    assert.equal(foo.b, 2);

    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called if the value is the same');

    await delay(DEF_DELAY);

    assert.equal(
      subscriber.mock.callCount(),
      0,
      'Should not be called if the value is the same after delay'
    );

    subscriber.mock.resetCalls();

    foo.c = 2; // We are not subscribed to this

    assert.equal(foo.c, 2);

    assert.equal(
      subscriber.mock.callCount(),
      0,
      'Should not be called sync when changed unsubscribed'
    );

    await delay(DEF_DELAY);

    assert.equal(
      subscriber.mock.callCount(),
      0,
      'Should not be called when changed unsubscribed after delay'
    );

    subscriber.mock.resetCalls();

    foo.a = 3;

    assert.equal(foo.a, 3);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once on next change');

    await delay(DEF_DELAY);

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

    await delay(DEF_DELAY);

    assert.equal(
      subscriber.mock.callCount(),
      0,
      'Should not be called after unsubscribe after delay'
    );
  });

  await it('Called async if no property was read', async () => {
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.subscribe(subscriber, new Set(['a', 'b']));

    foo.a = 2;
    foo.b = 2;

    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called sync');

    await delay(DEF_DELAY);

    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once after delay');

    subscriber.mock.resetCalls();

    foo.a = 2;
    foo.b = 2;

    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called if the value is the same');

    await delay(DEF_DELAY);

    assert.equal(
      subscriber.mock.callCount(),
      0,
      'Should not be called if the value is the same after delay'
    );

    subscriber.mock.resetCalls();

    foo.c = 2; // We are not subscribed to this

    assert.equal(
      subscriber.mock.callCount(),
      0,
      'Should not be called sync when changed unsubscribed'
    );

    await delay(DEF_DELAY);

    assert.equal(
      subscriber.mock.callCount(),
      0,
      'Should not be called when changed unsubscribed after delay'
    );

    subscriber.mock.resetCalls();

    foo.a = 3;

    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called on next change sync');

    await delay(DEF_DELAY);

    assert.equal(
      subscriber.mock.callCount(),
      1,
      'Should be called once on next change after delay'
    );

    subscriber.mock.resetCalls();

    foo.unsubscribe(subscriber);

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
    foo.subscribe(subscriber, new Set(['a', 'b']));

    await (async () => {
      foo.a = 2;
      foo.b = 2;
    })();

    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once sync');

    await delay(DEF_DELAY);

    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once after delay');

    subscriber.mock.resetCalls();

    await (async () => {
      foo.a = 2;
      foo.b = 2;
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
      foo.c = 2; // We are not subscribed to this
    })();

    assert.equal(
      subscriber.mock.callCount(),
      0,
      'Should not be called sync when changed unsubscribed'
    );

    await delay(DEF_DELAY);

    assert.equal(
      subscriber.mock.callCount(),
      0,
      'Should not be called when changed unsubscribed after delay'
    );

    subscriber.mock.resetCalls();

    await (async () => {
      foo.a = 3;
    })();

    assert.equal(subscriber.mock.callCount(), 1, 'Should not be called once on next change sync');

    await delay(DEF_DELAY);

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
    foo.subscribe(subscriber, new Set(['a', 'b']));

    const subscriber2 = mock.fn();
    foo.subscribe(subscriber2, new Set(['a']));

    foo.a = 3;

    await delay(DEF_DELAY);

    assert.equal(subscriber.mock.callCount(), 1, 'Should be called for subscriber');
    assert.equal(subscriber2.mock.callCount(), 1, 'Should be called for subscriber2');
  });
});

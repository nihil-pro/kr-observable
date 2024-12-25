import { describe, it, mock } from 'node:test';
import * as assert from 'node:assert/strict';

import { Observable } from '../src/Observable.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Observable', async () => {
  await it('Should pass "instanceof" check', async () => {
    class Foo extends Observable {}
    const foo = new Foo();

    assert.equal(foo instanceof Observable, true);
    assert.equal(foo instanceof Foo, true);
  });
});

describe.skip('Observable Map', async () => {
  class WithMap extends Observable {
    map = new Map<string, string>();
  }

  const firstKey = 'firstKey';
  const secondKey = 'secondKey';

  const withMap = new WithMap();

  await it('Should notify when Map changes', async () => {
    const onSizeChange = mock.fn();
    withMap.subscribe(onSizeChange, new Set(['map']));

    withMap.map.set('hello', 'world');
    await delay(10);

    withMap.map.set('hello', 'javascript'); // adding new value to the existed key
    await delay(10);
    // expected behaviour
    // the size doesn't change, but the map in fact is
    // because map can be used like this [...map.values()].map(...)
    assert.equal(onSizeChange.mock.callCount(), 2);

    withMap.map.clear();
    await delay(10);
    assert.equal(onSizeChange.mock.callCount(), 3);

    withMap.map = new Map();
    await delay(10);
    assert.equal(onSizeChange.mock.callCount(), 4);
  });

  await it('Should notify when specific item is added, changed or removed', async () => {
    const onFirstKeyChange = mock.fn();
    withMap.subscribe(onFirstKeyChange, new Set(['map.firstKey']));

    withMap.map.set(firstKey, firstKey);
    await delay(10);
    assert.equal(onFirstKeyChange.mock.callCount(), 1);

    withMap.map.set(firstKey, 'blah blah blah');
    await delay(10);
    // adding new item to map doesn't trigger subscriber,
    assert.equal(onFirstKeyChange.mock.callCount(), 2);

    withMap.map.delete(firstKey);
    await delay(10);
    assert.equal(onFirstKeyChange.mock.callCount(), 3);
    withMap.unsubscribe(onFirstKeyChange);
  });

  await it('Should not notify when other items were changed', async () => {
    const onFirstKeyChange = mock.fn();
    withMap.subscribe(onFirstKeyChange, new Set(['map.firstKey']));

    withMap.map.set(firstKey, 'some value');
    await delay(10);
    assert.equal(onFirstKeyChange.mock.callCount(), 1);

    withMap.map.set(secondKey, 'blah blah blah');
    await delay(10);
    // adding new item to map doesn't trigger subscriber,
    assert.equal(onFirstKeyChange.mock.callCount(), 1);
  });
});

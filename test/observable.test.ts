import { describe, it, mock } from 'node:test';
import * as assert from 'node:assert/strict';

import { Observable, makeObservable } from '../src/Observable.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Observable', async () => {
  await it('Should pass "instanceof" check', async () => {
    class Foo extends Observable {}
    const foo = new Foo();

    assert.equal(foo instanceof Observable, true);
    assert.equal(foo instanceof Foo, true);
  });

  await it('Should notify sync', async () => {
    class Foo extends Observable {
      a = 1;
    }
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.subscribe(subscriber, new Set(['a']));

    foo.a = 2;

    assert.equal(foo.a, 2);
    assert.equal(subscriber.mock.callCount(), 1);
    assert.equal(
      [...subscriber.mock.calls[0].arguments[0]].every((x) => new Set(['a']).has(x)),
      true
    );
  });

  await it.skip('subscribe', async () => {
    class Foo extends Observable {
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
        this.name = 'John';
        this.city = 'Rome';

        return true;
      }
    }
    const foo = new Foo();

    const subscriber = mock.fn();
    foo.subscribe(subscriber, new Set(['name', 'city', 'surname']));

    foo.setAll();
    assert.equal(
      subscriber.mock.callCount(),
      1,
      'Should be called once per synchronous transaction'
    );

    subscriber.mock.resetCalls();
    foo.age = 62; // We are not subscribed to age
    assert.equal(
      subscriber.mock.callCount(),
      0,
      'Should not be called when changing a property that we are not subscribed to'
    );

    subscriber.mock.resetCalls();
    await foo.setAsynchronously();
    assert.equal(
      subscriber.mock.callCount(),
      2,
      'Should be called twice when transaction was interrupted by Promise'
    );

    subscriber.mock.resetCalls();
    await foo.setAsynchronously();
    assert.equal(
      subscriber.mock.callCount(),
      0,
      'Should not be called when properties were changed with same values'
    );

    subscriber.mock.resetCalls();

    const subscriber2 = mock.fn();
    foo.subscribe(subscriber2, new Set(['name', 'city']));

    foo.city = 'Seoul';
    foo.name = 'Choi';
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called for each subscriber');
    assert.equal(subscriber2.mock.callCount(), 1, 'Should be called for each subscriber 2');
    foo.unsubscribe(subscriber2);

    subscriber.mock.resetCalls();
    foo.unsubscribe(subscriber);
    foo.city = 'Beijing';
    foo.name = 'Chan';
    // await delay(10)
    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called after unsubscribe');
  });

  // await it.skip('listen', async () => {
  //   const listener = mock.fn();
  //   foo.listen(listener);
  //   foo.setAll();
  //
  //   assert.equal(listener.mock.callCount(), 4, 'Should be called on each change');
  //
  //   listener.mock.resetCalls();
  //   foo.unlisten(listener);
  //   foo.setAll();
  //   assert.equal(listener.mock.callCount(), 0, 'Should not be called after unlisten');
  // });
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

describe('Observable plain object', async () => {
  const foo = makeObservable({
    name: '',
    age: 42,
    city: 'Moscow',

    setAll() {
      this.city = 'Texas';
      this.age = 52;
      this.name = 'Egor';
      this.city = 'London';
    },

    async setAsynchronously() {
      this.name = 'John';
      await delay(100);
      this.city = 'Rome';
      return true;
    },
  });

  await it('subscribe', async () => {
    const subscriber = mock.fn();

    foo.subscribe(subscriber, new Set(['name', 'city', 'surname']));
    foo.setAll();

    await delay(10);
    assert.equal(
      subscriber.mock.callCount(),
      1,
      'Should be called once per synchronous transaction'
    );

    subscriber.mock.resetCalls();
    foo.age = 62; // We are not subscribed to age
    assert.equal(
      subscriber.mock.callCount(),
      0,
      'Should not be called when changing a property that we are not subscribed to'
    );

    subscriber.mock.resetCalls();
    await foo.setAsynchronously();
    await delay(10);
    assert.equal(
      subscriber.mock.callCount(),
      2,
      'Should be called twice when transaction was interrupted by Promise'
    );

    subscriber.mock.resetCalls();
    await foo.setAsynchronously();
    await delay(10);
    assert.equal(
      subscriber.mock.callCount(),
      0,
      'Should not be called when properties were changed with same values'
    );

    subscriber.mock.resetCalls();

    const subscriber2 = mock.fn();
    foo.subscribe(subscriber2, new Set(['name', 'city']));

    foo.city = 'Seoul';
    foo.name = 'Choi';

    await delay(10);
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called for each subscriber');
    assert.equal(subscriber2.mock.callCount(), 1, 'Should be called for each subscriber 2');

    foo.unsubscribe(subscriber2);

    subscriber.mock.resetCalls();
    foo.unsubscribe(subscriber);
    foo.city = 'Beijing';
    foo.name = 'Chan';
    await delay(10);
    assert.equal(subscriber.mock.callCount(), 0, 'Should not be called after unsubscribe');
  });

  await it('listen', async () => {
    const listener = mock.fn();
    foo.listen(listener);
    foo.setAll();

    assert.equal(listener.mock.callCount(), 4, 'Should be called on each change');

    listener.mock.resetCalls();
    foo.unlisten(listener);
    foo.setAll();
    assert.equal(listener.mock.callCount(), 0, 'Should not be called after unlisten');
  });
});

describe('Observable Array', async () => {
  await it('Should notify when add item by push', async () => {
    class WithArray extends Observable {
      array = [];
    }
    const withArray = new WithArray();
    const onSizeChange = mock.fn();
    withArray.subscribe(onSizeChange, new Set(['array']));
    await delay(10);
    withArray.array.push(9);
    withArray.array.push(10);
    withArray.array.push(11, 12, 13);
    await delay(2);
    assert.equal(onSizeChange.mock.callCount(), 1);
    withArray.array = [];
  });

  await it('Should notify when set item by index', async () => {
    class WithArray extends Observable {
      array: any[] = [];
    }
    const withArray = new WithArray();
    const onSizeChange = mock.fn();
    withArray.subscribe(onSizeChange, new Set(['array']));

    withArray.array.set(0, { foo: 'bar' });
    await delay(2);

    assert.equal(onSizeChange.mock.callCount(), 1);
    onSizeChange.mock.resetCalls();
    withArray.unsubscribe(onSizeChange);
    withArray.array = [];
  });

  await it('Should notify on splice', async () => {
    class WithArray extends Observable {
      array = [];
    }
    const withArray = new WithArray();
    const onSizeChange = mock.fn();
    withArray.array = [1, 2, 3];
    withArray.subscribe(onSizeChange, new Set(['array']));

    withArray.array.splice(0, 2);
    await delay(10);

    assert.equal(onSizeChange.mock.callCount(), 1);
    onSizeChange.mock.resetCalls();
    withArray.unsubscribe(onSizeChange);
    withArray.array = [];
  });

  await it('Should notify on shift and pop', async () => {
    class WithArray extends Observable {
      array = [];
    }
    const withArray = new WithArray();
    const onSizeChange = mock.fn();
    withArray.array = [1, 2, 3];
    withArray.subscribe(onSizeChange, new Set(['array']));

    withArray.array.shift();
    await delay(10);
    assert.equal(onSizeChange.mock.callCount(), 1);

    withArray.array.pop();
    await delay(10);
    assert.equal(onSizeChange.mock.callCount(), 2);
    onSizeChange.mock.resetCalls();
    withArray.unsubscribe(onSizeChange);
    withArray.array = [];
  });

  await it('Should notify on sort and reverse', async () => {
    class WithArray extends Observable {
      array = [];
    }
    const withArray = new WithArray();
    const onSizeChange = mock.fn();
    withArray.array = [1, 2, 3];
    withArray.subscribe(onSizeChange, new Set(['array']));

    withArray.array.sort((a, b) => b - a);
    await delay(10);
    assert.equal(onSizeChange.mock.callCount(), 1);

    withArray.array.reverse();
    await delay(10);
    assert.equal(onSizeChange.mock.callCount(), 2);
    withArray.unsubscribe(onSizeChange);
    withArray.array = [];
  });
});

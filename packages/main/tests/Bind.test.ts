import { describe, mock, test } from 'node:test';
import assert from 'node:assert';

import { makeObservable, Observable, subscribe, listen, transaction } from '../index.js';

describe('Bind tests', () => {
  test('should has correct receiver when access adm trap', () => {
    const observable = makeObservable({
      a: 1,
      b: 1,
      c: 0,
      change() {
        this.c = this.a + this.b;
      },
    });

    const subscriber = mock.fn();
    const listener = mock.fn();
    const sbDisposer = subscribe(observable, subscriber, new Set(['c']));
    const lsDisposer = listen(observable, listener);
    observable.change();
    assert.equal(observable.c, 2);
    assert.equal(listener.mock.callCount(), 1, 'Should be called once');
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');
    sbDisposer();
    lsDisposer();
    observable.c = 5;
    assert.equal(listener.mock.callCount(), 1, 'Should be called once');
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');
  });

  test('should has correct receiver when use arrow functions', () => {
    class Foo extends Observable {
      a = 1;
      b = 1;
      c = 0;
      change() {
        this.c = this.a + this.b;
      }
      change2 = () => {
        this.c = 10;
      };
      // eslint-disable-next-line func-names
      change3 = function () {
        this.a = 5;
      };
    }
    const observable = new Foo();

    const subscriber = mock.fn();
    const listener = mock.fn();
    subscribe(observable, subscriber, new Set(['c']));
    listen(observable, listener);
    transaction(observable.change);
    assert.equal(observable.c, 2);
    assert.equal(listener.mock.callCount(), 1, 'Should be called once');
    assert.equal(subscriber.mock.callCount(), 1, 'Should be called once');
    transaction(observable.change2);
    assert.equal(observable.c, 10);
    assert.equal(listener.mock.callCount(), 2, 'Should be called twice');
    assert.equal(subscriber.mock.callCount(), 2, 'Should be called twice');
    transaction(observable.change3);
    assert.equal(observable.a, 5);
    assert.equal(listener.mock.callCount(), 3, 'Should be called three times');
  });
});

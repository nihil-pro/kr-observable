import { describe, test, mock } from 'node:test';
import assert from 'node:assert';

import { Observable, autorun } from '../index.js';

describe('Inheritance', () => {
  test('Should inherit static "ignore" property', (ctx) => {
    class Foo extends Observable {
      static ignore = new Set(['id']);
    }

    class Bar extends Foo {
      id = 1;
      name = 'bar';

      update() {
        this.id += 1;
        this.name = 'baz';
      }
    }

    const state = new Bar()

    let first = mock.fn();
    let second = mock.fn();

    autorun(() => {
      ctx.diagnostic(`${state.id}`);
      first()
    })

    autorun(() => {
      ctx.diagnostic(`${state.name}`)
      second()
    })

    assert.equal(first.mock.callCount(), 1);
    assert.equal(second.mock.callCount(), 1);

    state.update();

    assert.equal(first.mock.callCount(), 1);
    assert.equal(second.mock.callCount(), 2);
  })

  test('Should overwrite static "ignore" property', (ctx) => {
    class Foo extends Observable {
      static ignore = new Set(['id']);
    }

    class Bar extends Foo {
      static ignore = new Set(['name']);
      id = 1;
      name = 'bar';

      update() {
        this.id += 1;
        this.name = 'baz';
      }
    }

    const state = new Bar()

    let first = mock.fn();
    let second = mock.fn();

    autorun(() => {
      ctx.diagnostic(`${state.id}`);
      first()
    })

    autorun(() => {
      ctx.diagnostic(`${state.name}`)
      second()
    })

    assert.equal(first.mock.callCount(), 1);
    assert.equal(second.mock.callCount(), 1);

    state.update();

    assert.equal(first.mock.callCount(), 2);
    assert.equal(second.mock.callCount(), 1);
  })
})
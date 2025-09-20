import { mock, test } from 'node:test';
import { Observable } from '../src/Observable';
import { autorun } from '../src/api';
import assert from 'node:assert';

test('sync-sync', async (ctx) => {
  class State extends Observable {
    a: any[] = [];
    b = 0;

    async up() {
      console.log('start up')
      await new Promise((resolve) => setTimeout(resolve, 200));
      state.a.push(Math.random())
      if (state.a.length > 0) {
        state.b += 1;
        ctx.diagnostic('b changed')
      }
      console.log('end up')
    }
  }
  const state = new State();
  const subscriber = mock.fn();



  let bVal: any

  autorun(() => {
    ctx.diagnostic('autorun 1')
    bVal = state.b;
    ctx.diagnostic(`${bVal}|${state.a.length}`);
    subscriber();
  })


  await state.up()
  // state.a.push(Math.random());
  // if (state.a.push(Math.random()) > 0) {
  //   state.b += 1;
  //   ctx.diagnostic('b changed')
  // }
  ctx.diagnostic('asserts')
  assert.equal(bVal, 1);
  assert.equal(subscriber.mock.callCount(), 2);
})
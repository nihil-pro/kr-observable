import { describe, test } from 'node:test'
import expect from 'node:assert';
import { Observable, TransactionExecutor } from '../Observable';

// Observable notify subscribers in setTimeout. It takes some time, that's why we need delay in tests
const delay = (ms: number) => new Promise((resolve) => setTimeout(() => resolve(true), ms));

class User extends Observable {
  name = 'username';
  surname = 'surname';
}

class State extends Observable {
  user: null | User = null
  loading = true
}

const state = new State();

function work() {
  if (state.loading) { return }
  if (!state.loading && !state.user) { return; }
  return `${state.user.name}`
}

let read: Map<Observable, Set<string | symbol>> | null
let changed: boolean | undefined
let reads: Array<Map<Observable, Set<string | symbol>> | null> = []
function rerender() {
  const res = global[TransactionExecutor]?.transaction(work)
  reads.push(res.read)
  read = res.read
  changed = res.changed
}

describe('Observable transactions', () => {
  test('Should return one observable after execute work', async (ctx) => {
    const res = global[TransactionExecutor]?.transaction(work)
    read = res.read
    expect.equal(read.size, 1)
  })

  test('Should return two observable after changing loading state', async (ctx) => {
    const subscriber = ctx.mock.fn(rerender)
    read.forEach((keys, observable) => observable.subscribe(subscriber, keys))
    state.loading = false
    state.user = new User()
    await delay(10) // it took some time
    expect.equal(read.size, 2)
    expect.equal(subscriber.mock.callCount(), 1)
  })

  test('Should return the same read ref for same work', async (ctx) => {
    state.loading = false
    state.user = new User()
    await delay(10) // it took some time
    state.loading = true
    state.user = new User()
    await delay(10) // it took some time
    const unique = new Set()
    reads.forEach(read => unique.add(read))
    expect.equal(unique.size, 1)
  })

  test('Should return changed = true', async (ctx) => {
    state.loading = false
    state.user = new User()
    await delay(10) // it took some time
    expect.equal(changed, true)
  })

  test('Should return changed = false', async (ctx) => {
    state.loading = false
    await delay(10) // it took some time
    state.loading = true
    await delay(10)
    expect.equal(changed, false)
  })
})

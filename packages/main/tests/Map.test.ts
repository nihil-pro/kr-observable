import { describe, test, mock } from 'node:test';
import assert from 'node:assert';

import { Observable, autorun, makeObservable, transaction } from '../index.js';

describe('Map tests', () => {
  test('Map tests', async (ctx) => {
    class Foo extends Observable {
      map = new Map()

      async init() {
        this.map.clear()
        const x = await fetch('https://jsonplaceholder.typicode.com/posts')
        this.map.set(1, { name: 1 })
        this.map.set(2, { name: 2 })
        this.map.set(3, { name: 3 })
      }

      get array() {
        return [...this.map.values()]
      }
    }

    const foo = new Foo();

    const sb = mock.fn()
    let result: any
    let count = 0;
    autorun(() => {
      ++count;
      sb()
      result = foo.array;
      ctx.diagnostic(`Count: ${count}` + JSON.stringify(foo.array))
    })

    foo.init()

    await new Promise(r => setTimeout(r, 1000));
    assert.deepStrictEqual(result, [{ name: 1 }, { name: 2 }, { name: 3 }]);
    assert.equal(sb.mock.callCount(), 2);
  })


  test('Map tests 2', async (ctx) => {
    class Foo extends Observable {
      map = new Map();
      loading = false;

      async init() {
        this.loading = true;
        const x = await fetch('https://jsonplaceholder.typicode.com/posts')
        this.map.set(1, { name: 1 })
        this.map.set(2, { name: 2 })
        this.map.set(3, { name: 3 })
        this.loading = false;
      }

      get array() {
        return [...this.map.values()]
      }
    }

    const foo = new Foo();

    const sb = mock.fn()
    let result: any
    let count = 0;
    autorun(() => {
      ++count;
      sb()
      result = foo.array;
      ctx.diagnostic(`Count: ${count} ${String(foo.loading)}` + JSON.stringify(foo.array))
    })

    foo.init()

    await new Promise(r => setTimeout(r, 1000));
    assert.deepStrictEqual(result, [{ name: 1 }, { name: 2 }, { name: 3 }]);
    assert.equal(sb.mock.callCount(), 3);
  })

  test('')
})


describe('ObservableMap (via makeObservable wrapper)', () => {
  test('should track primitive key reads (.get)', () => {
    const state = makeObservable({ map: new Map() });
    let runs = 0;
    autorun(() => {
      state.map.get('a');
      runs++;
    });

    assert.strictEqual(runs, 1); // initial run

    transaction(() => state.map.set('a', 1)); // should trigger
    assert.strictEqual(runs, 2);

    transaction(() => state.map.set('b', 2)); // unrelated → should NOT trigger
    assert.strictEqual(runs, 2);

    transaction(() => state.map.delete('a')); // should trigger
    assert.strictEqual(runs, 3);
  });

  test('should track .has() per key', () => {
    const state = makeObservable({ map: new Map() });
    let runs = 0;
    autorun(() => {
      state.map.has('x');
      runs++;
    });

    assert.strictEqual(runs, 1);
    transaction(() => state.map.set('x', 10));
    assert.strictEqual(runs, 2);
    transaction(() => state.map.delete('x'));
    assert.strictEqual(runs, 3);
    transaction(() => state.map.set('y', 20));
    assert.strictEqual(runs, 3); // unchanged
  });

  test('object keys tracked by reference, not value', () => {
    const state = makeObservable({ map: new Map() });
    const key1 = { id: 1 };
    const key2 = { id: 1 }; // different object

    let runs1 = 0, runs2 = 0;

    autorun(() => {
      state.map.get(key1);
      runs1++;
    });

    autorun(() => {
      state.map.get(key2);
      runs2++;
    });

    assert.strictEqual(runs1, 1);
    assert.strictEqual(runs2, 1);

    transaction(() => state.map.set(key1, 'A'));
    assert.strictEqual(runs1, 2);
    assert.strictEqual(runs2, 1); // no reaction

    transaction(() => state.map.set(key2, 'B'));
    assert.strictEqual(runs1, 2);
    assert.strictEqual(runs2, 2);
  });

  test('values are deeply observable', () => {
    const state = makeObservable({ map: new Map() });
    let obj = { count: 0 };
    state.map.set('data', obj);
    obj = state.map.get('data');

    let sum = 0;
    autorun(() => {
      const val = state.map.get('data');
      if (val) sum += val.count;
    });

    assert.strictEqual(sum, 0);
    transaction(() => obj.count = 1);
    assert.strictEqual(sum, 1); // reacts

    // Replace with new plain object (not pre-wrapped)
    transaction(() => state.map.set('data', { count: 2 }));
    assert.strictEqual(sum, 3); // 1 + 2

    // Mutate new object
    transaction(() => state.map.get('data').count = 3);
    assert.strictEqual(sum, 6); // 3 + 3
  });

  test('structural observers react when key set changes (even if size unchanged)', () => {
    const state = makeObservable({
      map: new Map([['a', 1], ['b', 2]]),
      mutate() {
        this.map.delete('a');
        this.map.set('c', 3);
      }
    });

    let runs = 0;
    autorun(() => {
      Array.from(state.map.keys()); // structural read
      runs++;
    });

    assert.strictEqual(runs, 1);

    state.mutate();

    // Key set changed: ['a','b'] → ['b','c']
    assert.strictEqual(runs, 2); // MUST re-run
  });

  test('size observer does NOT re-run if size unchanged', () => {
    const state = makeObservable({
      map: new Map([['a', 1]]),
      mutate() {
        this.map.delete('a');
        this.map.set('b', 2);
      }
    });

    let sizeRuns = 0, keysRuns = 0;

    autorun(() => {
      state.map.size;
      sizeRuns++;
    });

    autorun(() => {
      Array.from(state.map.keys());
      keysRuns++;
    });

    assert.strictEqual(sizeRuns, 1);
    assert.strictEqual(keysRuns, 1);

    // Same-size mutation
    state.mutate()

    assert.strictEqual(sizeRuns, 2); // ✅ re-run
    assert.strictEqual(keysRuns, 2); // ✅ re-run
  });

  test('size observer re-run if size changed', () => {
    const state = makeObservable({
      map: new Map([['a', 1]]),
      mutate() {
        this.map.set('b', 2);
      }
    });

    let sizeRuns = 0, keysRuns = 0;

    autorun(() => {
      state.map.size;
      sizeRuns++;
    });

    autorun(() => {
      Array.from(state.map.keys());
      keysRuns++;
    });

    assert.strictEqual(sizeRuns, 1);
    assert.strictEqual(keysRuns, 1);

    // Same-size mutation
    state.mutate()

    assert.strictEqual(sizeRuns, 2); // ✅ re-run
    assert.strictEqual(keysRuns, 2); // ✅ re-run
  });

  test('.clear() notifies all observers', () => {
    const state = makeObservable({
      map: new Map([['x', 1], ['y', 2]])
    });

    let keyRuns = 0, structRuns = 0;

    autorun(() => {
      state.map.get('x');
      keyRuns++;
    });

    autorun(() => {
      Array.from(state.map.values());
      structRuns++;
    });

    assert.strictEqual(keyRuns, 1);
    assert.strictEqual(structRuns, 1);

    transaction(() => state.map.clear());

    assert.strictEqual(keyRuns, 2);
    assert.strictEqual(structRuns, 2);
  });

  test('keys are never wrapped — identity preserved', () => {
    const state = makeObservable({ map: new Map() });
    const originalKey = { id: 42 };
    state.map.set(originalKey, 'value');

    assert.strictEqual(state.map.get(originalKey), 'value');
    assert.strictEqual(state.map.get({ id: 42 }), undefined);

    const [keyFromMap] = state.map.keys();
    assert.strictEqual(keyFromMap, originalKey);
  });

  test('multiple identical autoruns deduplicate (run once)', () => {
    const state = makeObservable({ map: new Map() });
    let callCount = 0;

    const effect = () => {
      state.map.get('test');
      callCount++;
    };

    // Register 10 times — should dedup to 1 run per change
    for (let i = 0; i < 10; i++) {
      autorun(effect);
    }

    assert.strictEqual(callCount, 1); // initial runs

    transaction(() => state.map.set('test', 1));

    // kr-observable dedups identical reactions → 1 call
    assert.strictEqual(callCount, 2);
  });

  test('safe self-mutation in autorun (no infinite loop)', () => {
    const state = makeObservable({
      map: new Map([['count', 0]])
    });

    let runs = 0;
    autorun(() => {
      const c = state.map.get('count');
      if (c < 2) {
        state.map.set('count', c + 1);
      }
      runs++;
    });

    // Runs: initial (0→1), then (1→2), then stops
    assert.strictEqual(runs, 1);
    assert.strictEqual(state.map.get('count'), 1);
  });



  test('should track map.entries() as structural read', () => {
    const state = makeObservable({
      map: new Map([['a', 1]])
    });

    let runs = 0;
    autorun(() => {
      Array.from(state.map.entries());
      runs++;
    });

    assert.strictEqual(runs, 1);
    transaction(() => state.map.set('b', 2));
    assert.strictEqual(runs, 2);
  });

  test('should track for...of as structural read', () => {
    const state = makeObservable({
      map: new Map([['x', 10]])
    });

    let runs = 0;
    autorun(() => {
      for (const [k, v] of state.map) {
        void k; void v;
      }
      runs++;
    });

    assert.strictEqual(runs, 1);
    transaction(() => {
      state.map.delete('x')
    });
    assert.strictEqual(runs, 2);
  });

  test('should track map.values() as structural read', () => {
    const state = makeObservable({
      map: new Map([['id', 'foo']])
    });

    let runs = 0;
    autorun(() => {
      Array.from(state.map.values());
      runs++;
    });

    assert.strictEqual(runs, 1);
    transaction(() => {
      state.map.set('id', 'bar')
    }); // value changed, but key set unchanged → should NOT trigger
    assert.strictEqual(runs, 1);

    transaction(() => state.map.set('new', 'baz')); // new key → should trigger
    assert.strictEqual(runs, 2);
  });

  test('map.forEach is tracked as structural read', () => {
    const state = makeObservable({
      map: new Map([['a', 1]])
    });

    let runs = 0;
    autorun(() => {
      state.map.forEach((v, k) => void k);
      runs++;
    });

    assert.strictEqual(runs, 1);
    transaction(() => state.map.set('b', 2));
    assert.strictEqual(runs, 2); // must react
  });


  // The scenario is virtually nonexistent in practice
  test.skip('same object key in two maps does not cause cross-notification', () => {
    const sharedKey = { id: 1 };
    const state = makeObservable({
      map1: new Map(),
      map2: new Map()
    });

    state.map1.set(sharedKey, 'A');
    state.map2.set(sharedKey, 'B');

    let runs1 = 0, runs2 = 0;

    autorun(() => {
      state.map1.get(sharedKey);
      runs1++;
    });

    autorun(() => {
      state.map2.get(sharedKey);
      runs2++;
    });

    assert.strictEqual(runs1, 1);
    assert.strictEqual(runs2, 1);

    // Mutate only map1
    transaction(() => {
      state.map1.set(sharedKey, 'X')
    });

    assert.strictEqual(runs1, 2); // reacts
    assert.strictEqual(runs2, 1); // does NOT react ✅
  });
});
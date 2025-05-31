import { describe } from 'node:test';

describe('Map', () => {
  // // map
  //
  // if (supportsMap) {
  //   // vue
  //
  //   test(`Map: instanceof`, (ctx) => {
  //     const original = new Map();
  //     const observed = makeObservable(original);
  //     const observed2 = makeObservable({ value: original });
  //     const observed3 = makeObservable([original]);
  //
  //     assert.equal(original instanceof Map, true);
  //     assert.equal(observed instanceof Map, true);
  //     assert.equal(observed2.value instanceof Map, true);
  //     assert.equal(observed3[0] instanceof Map, true);
  //
  //     assert.equal(isProxy(original)).toBe(false);
  //     assert.equal(isProxy(observed)).toBe(true);
  //     assert.equal(isProxy(observed2.value)).toBe(true);
  //     assert.equal(isProxy(observed3[0])).toBe(true);
  //   });
  //
  //   test(`Map: should observe mutations`, (ctx) => {
  //     let dummy;
  //     const map = makeObservable(new Map());
  //     autorun(() => {
  //       dummy = map.get('key');
  //     });
  //     execute();
  //
  //     assert.equal(dummy, undefined);
  //     map.set('key', 'value');
  //     execute();
  //
  //     assert.equal(dummy, 'value');
  //     map.set('key', 'value2');
  //     execute();
  //
  //     assert.equal(dummy, 'value2');
  //     map.delete('key');
  //     execute();
  //
  //     assert.equal(dummy, undefined);
  //   });
  //
  //   test(`Map: should observe mutations with observed value as key`, (ctx) => {
  //     let dummy;
  //     const key = makeObservable({});
  //     const value = makeObservable({});
  //     const map = makeObservable(new Map());
  //     autorun(() => {
  //       dummy = map.get(key);
  //     });
  //     execute();
  //
  //     assert.equal(dummy, undefined);
  //     map.set(key, value);
  //     execute();
  //
  //     assert.equal(dummy, value);
  //     map.delete(key);
  //     execute();
  //
  //     assert.equal(dummy, undefined);
  //   });
  //
  //   test(`Map: should observe size mutations`, (ctx) => {
  //     let dummy;
  //     const map = makeObservable(new Map());
  //     autorun(() => (dummy = map.size));
  //     execute();
  //
  //     assert.equal(dummy, 0);
  //
  //     map.set('key1', 'value');
  //     execute();
  //
  //     map.set('key2', 'value2');
  //     execute();
  //     assert.equal(dummy, 2);
  //
  //     map.delete('key1');
  //     execute();
  //     assert.equal(dummy, 1);
  //
  //     map.clear();
  //     execute();
  //     assert.equal(dummy, 0);
  //   });
  //
  //   test(`Map: should observe for of iteration`, (ctx) => {
  //     let dummy;
  //     const map = makeObservable(new Map());
  //     autorun(() => {
  //       dummy = 0;
  //       for (const [key, num] of map) {
  //         key;
  //         dummy += num;
  //       }
  //     });
  //     execute();
  //
  //     assert.equal(dummy, 0);
  //     map.set('key1', 3);
  //     execute();
  //
  //     assert.equal(dummy, 3);
  //     map.set('key2', 2);
  //     execute();
  //
  //     assert.equal(dummy, 5);
  //
  //     // iteration should track mutation of existing entries (#709)
  //     map.set('key1', 4);
  //     execute();
  //     assert.equal(dummy, 6);
  //
  //     map.delete('key1');
  //     execute();
  //     assert.equal(dummy, 2);
  //
  //     map.clear();
  //     execute();
  //     assert.equal(dummy, 0);
  //   });
  //
  //   test(`Map: should observe forEach iteration`, (ctx) => {
  //     let dummy;
  //     const map = makeObservable(new Map());
  //     autorun(() => {
  //       dummy = 0;
  //       map.forEach((num) => (dummy += num));
  //     });
  //     execute();
  //
  //     assert.equal(dummy, 0);
  //     map.set('key1', 3);
  //     execute();
  //
  //     assert.equal(dummy, 3);
  //     map.set('key2', 2);
  //     execute();
  //
  //     assert.equal(dummy, 5);
  //     // iteration should track mutation of existing entries (#709)
  //     map.set('key1', 4);
  //     execute();
  //
  //     assert.equal(dummy, 6);
  //     map.delete('key1');
  //     execute();
  //
  //     assert.equal(dummy, 2);
  //     map.clear();
  //     execute();
  //
  //     assert.equal(dummy, 0);
  //   });
  //
  //   test(`Map: should observe keys iteration`, (ctx) => {
  //     let dummy;
  //     const map = makeObservable(new Map());
  //     autorun(() => {
  //       dummy = 0;
  //       for (const key of map.keys()) {
  //         dummy += key;
  //       }
  //     });
  //     execute();
  //
  //     assert.equal(dummy, 0);
  //     map.set(3, 3);
  //     execute();
  //
  //     assert.equal(dummy, 3);
  //     map.set(2, 2);
  //     execute();
  //
  //     assert.equal(dummy, 5);
  //     map.delete(3);
  //     execute();
  //
  //     assert.equal(dummy, 2);
  //     map.clear();
  //     execute();
  //
  //     assert.equal(dummy, 0);
  //   });
  //
  //   test(`Map: should observe values iteration`, (ctx) => {
  //     let dummy;
  //     const map = makeObservable(new Map());
  //     autorun(() => {
  //       dummy = 0;
  //       for (const num of map.values()) {
  //         dummy += num;
  //       }
  //     });
  //     execute();
  //     assert.equal(dummy, 0);
  //
  //     map.set('key1', 3);
  //     execute();
  //     assert.equal(dummy, 3);
  //
  //     map.set('key2', 2);
  //     execute();
  //     assert.equal(dummy, 5);
  //
  //     // iteration should track mutation of existing entries (#709)
  //     map.set('key1', 4);
  //     execute();
  //     assert.equal(dummy, 6);
  //
  //     map.delete('key1');
  //     execute();
  //     assert.equal(dummy, 2);
  //
  //     map.clear();
  //     execute();
  //     assert.equal(dummy, 0);
  //   });
  //
  //   test(`Map: should observe entries iteration`, (ctx) => {
  //     let dummy;
  //     let dummy2;
  //     const map = makeObservable(new Map());
  //     autorun(() => {
  //       dummy = '';
  //       dummy2 = 0;
  //       for (const [key, num] of map.entries()) {
  //         dummy += key;
  //         dummy2 += num;
  //       }
  //     });
  //     execute();
  //
  //     assert.equal(dummy, '');
  //     assert.equal(dummy2, 0);
  //     map.set('key1', 3);
  //     execute();
  //
  //     assert.equal(dummy, 'key1');
  //     assert.equal(dummy2, 3);
  //     map.set('key2', 2);
  //     execute();
  //
  //     assert.equal(dummy, 'key1key2');
  //     assert.equal(dummy2, 5);
  //     // iteration should track mutation of existing entries (#709)
  //     map.set('key1', 4);
  //     execute();
  //
  //     assert.equal(dummy, 'key1key2');
  //     assert.equal(dummy2, 6);
  //     map.delete('key1');
  //     execute();
  //
  //     assert.equal(dummy, 'key2');
  //     assert.equal(dummy2, 2);
  //     map.clear();
  //     execute();
  //
  //     assert.equal(dummy, '');
  //     assert.equal(dummy2, 0);
  //   });
  //
  //   test(`Map: should be triggered by clearing`, (ctx) => {
  //     let dummy;
  //     const map = makeObservable(new Map());
  //     autorun(() => (dummy = map.get('key')));
  //
  //     assert.equal(dummy, undefined);
  //     map.set('key', 3);
  //     execute();
  //
  //     assert.equal(dummy, 3);
  //     map.clear();
  //     execute();
  //
  //     assert.equal(dummy, undefined);
  //   });
  //
  //   test(`Map: should observe custom property mutations`, (ctx) => {
  //     let dummy;
  //     const map = makeObservable(new Map());
  //     autorun(() => (dummy = map.customProp));
  //     execute();
  //
  //     assert.equal(dummy, undefined);
  //     map.customProp = 'Hello World';
  //     execute();
  //
  //     assert.equal(dummy, 'Hello World');
  //   });
  //
  //   test(`Map: should not observe non value changing mutations`, (ctx) => {
  //     let dummy;
  //     const map = makeObservable(new Map());
  //     let calls = 0;
  //     autorun(() => {
  //       calls++;
  //       dummy = map.get('key');
  //     });
  //     execute();
  //
  //     assert.equal(dummy, undefined);
  //     assert.equal(calls, 1);
  //
  //     map.set('key', undefined);
  //     execute();
  //     assert.equal(dummy, undefined);
  //     assert.equal(calls, 1);
  //
  //     map.set('key', 'value');
  //     execute();
  //     assert.equal(dummy, 'value');
  //     assert.equal(calls, 2);
  //
  //     map.set('key', 'value');
  //     execute();
  //     assert.equal(dummy, 'value');
  //     assert.equal(calls, 2);
  //
  //     map.set('key', undefined);
  //     execute();
  //     assert.equal(dummy, undefined);
  //     assert.equal(calls, 3);
  //
  //     map.delete('key');
  //     execute();
  //     assert.equal(dummy, undefined);
  //     assert.equal(calls, 3);
  //
  //     map.delete('key');
  //     execute();
  //     assert.equal(dummy, undefined);
  //     assert.equal(calls, 3);
  //
  //     map.clear();
  //     execute();
  //     assert.equal(dummy, undefined);
  //     assert.equal(calls, 3);
  //   });
  //
  //   test(`Map: should not pollute original Map with Proxies`, (ctx) => {
  //     const map = new Map();
  //     const observed = makeObservable(map);
  //     const original = {};
  //     const value = makeObservable(original);
  //     observed.set('key', value);
  //     assert.equal(map.get('key')).toBe(value);
  //     assert.equal(map.get('key')).not.toBe(original);
  //   });
  //
  //   test(`Map: should return observable versions of contained values`, (ctx) => {
  //     const observed = makeObservable(new Map());
  //     const value = {};
  //     observed.set('key', value);
  //     const wrapped = observed.get('key');
  //     assert.equal(wrapped).not.toBe(value);
  //   });
  //
  //   test(`Map: should observed nested data`, (ctx) => {
  //     const observed = makeObservable(new Map());
  //     observed.set('key', { a: 1 });
  //     let dummy;
  //     autorun(() => {
  //       dummy = observed.get('key').a;
  //     });
  //     execute();
  //
  //     observed.get('key').a = 2;
  //     assert.equal(dummy, 2);
  //   });
  //
  //   test(`Map: should observe nested values in iterations (forEach)`, (ctx) => {
  //     const map = makeObservable(new Map([[1, { foo: 1 }]]));
  //     let dummy;
  //     autorun(() => {
  //       dummy = 0;
  //       map.forEach((value) => {
  //         dummy += value.foo;
  //       });
  //     });
  //     execute();
  //
  //     assert.equal(dummy, 1);
  //     map.get(1).foo++;
  //     assert.equal(dummy, 2);
  //   });
  //
  //   test(`Map: should observe nested values in iterations (values)`, (ctx) => {
  //     const map = makeObservable(new Map([[1, { foo: 1 }]]));
  //     let dummy;
  //     autorun(() => {
  //       dummy = 0;
  //       for (const value of map.values()) {
  //         dummy += value.foo;
  //       }
  //     });
  //     execute();
  //
  //     assert.equal(dummy, 1);
  //     map.get(1).foo++;
  //     assert.equal(dummy, 2);
  //   });
  //
  //   test(`Map: should observe nested values in iterations (entries)`, (ctx) => {
  //     const key = {};
  //     const map = makeObservable(new Map([[key, { foo: 1 }]]));
  //     let dummy;
  //     autorun(() => {
  //       dummy = 0;
  //       for (const [key, value] of map.entries()) {
  //         key;
  //
  //         dummy += value.foo;
  //       }
  //     });
  //     execute();
  //
  //     assert.equal(dummy, 1);
  //     map.get(key).foo++;
  //     assert.equal(dummy, 2);
  //   });
  //
  //   test(`Map: should observe nested values in iterations (for...of)`, (ctx) => {
  //     const key = {};
  //     const map = makeObservable(new Map([[key, { foo: 1 }]]));
  //     let dummy;
  //     autorun(() => {
  //       dummy = 0;
  //       for (const [key, value] of map) {
  //         key;
  //
  //         dummy += value.foo;
  //       }
  //     });
  //     execute();
  //
  //     assert.equal(dummy, 1);
  //     map.get(key).foo++;
  //     assert.equal(dummy, 2);
  //   });
  //
  //   test(`${
  //     lib
  //   }Map: should not be trigger when the value and the old value both are NaN`, (ctx) => {
  //     const map = makeObservable(new Map([['foo', NaN]]));
  //     let calls = 0;
  //     autorun(() => {
  //       calls++;
  //       map.get('foo');
  //     });
  //     execute();
  //
  //     map.set('foo', NaN);
  //     execute();
  //
  //     assert.equal(calls, 1);
  //   });
  //
  //   test(`Map: should work with reactive keys in raw map`, (ctx) => {
  //     const raw = new Map();
  //     const key = makeObservable({});
  //     raw.set(key, 1);
  //     const map = makeObservable(raw);
  //
  //     assert.equal(map.has(key)).toBe(true);
  //     assert.equal(map.get(key)).toBe(1);
  //
  //     assert.equal(map.delete(key)).toBe(true);
  //     assert.equal(map.has(key)).toBe(false);
  //     assert.equal(map.get(key)).toBe(undefined);
  //   });
  //
  //   test(`Map: should track set of makeObservable keys in raw map`, (ctx) => {
  //     const raw = new Map();
  //     const key = makeObservable({});
  //     raw.set(key, 1);
  //     const map = makeObservable(raw);
  //
  //     let dummy;
  //     autorun(() => {
  //       dummy = map.get(key);
  //     });
  //     execute();
  //
  //     assert.equal(dummy, 1);
  //
  //     map.set(key, 2);
  //     execute();
  //
  //     assert.equal(dummy, 2);
  //   });
  //
  //   test(`Map: should track deletion of reactive keys in raw map`, (ctx) => {
  //     const raw = new Map();
  //     const key = makeObservable({});
  //     raw.set(key, 1);
  //     const map = makeObservable(raw);
  //
  //     let dummy;
  //     autorun(() => {
  //       dummy = map.has(key);
  //     });
  //     execute();
  //
  //     assert.equal(dummy, true);
  //
  //     map.delete(key);
  //     execute();
  //
  //     assert.equal(dummy, false);
  //   });
  //
  //   // #877
  //   test(`Map: should not trigger key iteration when setting existing keys `, (ctx) => {
  //     const map = makeObservable(new Map());
  //
  //     let calls = 0;
  //     autorun(() => {
  //       calls++;
  //       const keys = [];
  //       for (const key of map.keys()) {
  //         keys.push(key);
  //       }
  //     });
  //     execute();
  //     assert.equal(calls, 1);
  //
  //     map.set('a', 0);
  //     execute();
  //     assert.equal(calls, 2);
  //
  //     map.set('b', 0);
  //     execute();
  //     assert.equal(calls, 3);
  //
  //     // keys didn't change, should not trigger
  //     map.set('b', 1);
  //     execute();
  //
  //     assert.equal(calls, 3);
  //   });
  //
  //   test(`Map: should return proxy from Map.set call `, (ctx) => {
  //     const map = makeObservable(new Map());
  //     const result = map.set('a', 'a');
  //     assert.equal(result, map);
  //   });
  //
  //   test(`Map: observing subtypes of IterableCollections(Map, Set)`, (ctx) => {
  //     // subtypes of Map
  //     class CustomMap extends Map {}
  //     const cmap = makeObservable(new CustomMap());
  //
  //     assert.equal(cmap instanceof Map, true);
  //
  //     const val = {};
  //     cmap.set('key', val);
  //     assert.equal(isProxy(cmap.get('key'))).toBe(true);
  //     assert.equal(cmap.get('key')).not.toBe(val);
  //   });
  //
  //   test(`Map: observing subtypes of IterableCollections(Map, Set) deep`, (ctx) => {
  //     // subtypes of Map
  //     class CustomMap extends Map {}
  //     const cmap = makeObservable({ value: new CustomMap() });
  //
  //     assert.equal(cmap.value instanceof Map, true);
  //
  //     const val = {};
  //     cmap.value.set('key', val);
  //     assert.equal(isProxy(cmap.value.get('key'))).toBe(true);
  //     assert.equal(cmap.value.get('key')).not.toBe(val);
  //   });
  //
  //   test(`Map: should work with observed value as key`, (ctx) => {
  //     const key = makeObservable({});
  //     const m = makeObservable(new Map());
  //     m.set(key, 1);
  //     const roM = m;
  //
  //     let calls = 0;
  //     autorun(() => {
  //       calls++;
  //       roM.get(key);
  //     });
  //     execute();
  //
  //     assert.equal(calls, 1);
  //     m.set(key, 1);
  //     execute();
  //
  //     assert.equal(calls, 1);
  //     m.set(key, 2);
  //     execute();
  //
  //     assert.equal(calls, 2);
  //   });
  //
  //   // solid-primitives
  //
  //   test(`Map: behaves like a Map`, (ctx) => {
  //     const obj1 = {};
  //     const obj2 = {};
  //
  //     const map = makeObservable(
  //       new Map([
  //         [obj1, 123],
  //         [1, 'foo'],
  //       ])
  //     );
  //
  //     assert.equal(map.has(obj1)).toBe(true);
  //     assert.equal(map.has(1)).toBe(true);
  //     assert.equal(map.has(2)).toBe(false);
  //
  //     assert.equal(map.get(obj1)).toBe(123);
  //     assert.equal(map.get(1)).toBe('foo');
  //
  //     map.set(obj2, 'bar');
  //     assert.equal(map.get(obj2)).toBe('bar');
  //     map.set(obj1, 'change');
  //     assert.equal(map.get(obj1)).toBe('change');
  //
  //     assert.equal(map.delete(obj2)).toBe(true);
  //     assert.equal(map.has(obj2)).toBe(false);
  //
  //     assert.equal(map.size, 2);
  //     map.clear();
  //     assert.equal(map.size, 0);
  //
  //     assert.equal(map instanceof Map, true);
  //   });
  //
  //   test(`Map: has() is reactive`, (ctx) => {
  //     const map = makeObservable(
  //       new Map([
  //         [1, {}],
  //         [1, {}],
  //         [2, {}],
  //         [3, {}],
  //       ])
  //     );
  //
  //     const captured = [];
  //     autorun(() => {
  //       captured.push(map.has(2));
  //     });
  //     execute();
  //
  //     assert.equal(captured).toEqual([true]);
  //
  //     map.set(4, {});
  //     assert.equal(captured).toEqual([true]);
  //
  //     map.delete(4);
  //     assert.equal(captured).toEqual([true]);
  //
  //     map.delete(2);
  //     assert.equal(captured).toEqual([true, false]);
  //
  //     map.set(2, {});
  //     assert.equal(captured).toEqual([true, false, true]);
  //
  //     map.clear();
  //     assert.equal(captured).toEqual([true, false, true, false]);
  //   });
  //
  //   test(`Map: get() is reactive`, (ctx) => {
  //     const obj1 = {};
  //     const obj2 = {};
  //     const obj3 = {};
  //     const obj4 = {};
  //
  //     const map = makeObservable(
  //       new Map([
  //         [1, obj1],
  //         [1, obj2],
  //         [2, obj3],
  //         [3, obj4],
  //       ])
  //     );
  //
  //     let calls = 0;
  //     let dummy;
  //     autorun(() => {
  //       calls++;
  //       dummy = map.get(2);
  //     });
  //     execute();
  //
  //     map.set(4, {});
  //     assert.equal(calls, 1);
  //
  //     map.delete(4);
  //     assert.equal(calls, 1);
  //
  //     map.delete(2);
  //     assert.equal(dummy, undefined);
  //     assert.equal(calls, 2);
  //
  //     map.set(2, obj4);
  //     assert.equal(dummy, makeObservable(obj4));
  //
  //     map.set(2, obj4);
  //     assert.equal(calls, 3);
  //
  //     map.clear();
  //     assert.equal(dummy, undefined);
  //     assert.equal(calls, 4);
  //   });
  //
  //   test(`Map: spread values is reactive`, (ctx) => {
  //     const map = makeObservable(
  //       new Map([
  //         [1, 'a'],
  //         [1, 'b'],
  //         [2, 'c'],
  //         [3, 'd'],
  //       ])
  //     );
  //
  //     const captured = [];
  //
  //     autorun(() => captured.push([...map.values()]));
  //     execute();
  //
  //     assert.equal(captured.length, 1);
  //     assert.equal(captured[0]).toEqual(['b', 'c', 'd']);
  //
  //     map.set(4, 'e');
  //     assert.equal(captured.length, 2);
  //     assert.equal(captured[1]).toEqual(['b', 'c', 'd', 'e']);
  //
  //     map.set(4, 'e');
  //     assert.equal(captured.length, 2);
  //
  //     map.delete(4);
  //     assert.equal(captured.length, 3);
  //     assert.equal(captured[2]).toEqual(['b', 'c', 'd']);
  //
  //     map.delete(2);
  //     assert.equal(captured.length, 4);
  //     assert.equal(captured[3]).toEqual(['b', 'd']);
  //
  //     map.delete(2);
  //     assert.equal(captured.length, 4);
  //
  //     map.set(2, 'a');
  //     assert.equal(captured.length, 5);
  //     assert.equal(captured[4]).toEqual(['b', 'd', 'a']);
  //
  //     map.set(2, 'b');
  //     assert.equal(captured.length, 6);
  //     assert.equal(captured[5]).toEqual(['b', 'd', 'b']);
  //
  //     map.clear();
  //     assert.equal(captured.length, 7);
  //     assert.equal(captured[6]).toEqual([]);
  //   });
  //
  //   test(`Map: .size is reactive`, (ctx) => {
  //     const map = makeObservable(
  //       new Map([
  //         [1, {}],
  //         [1, {}],
  //         [2, {}],
  //         [3, {}],
  //       ])
  //     );
  //
  //     const captured = [];
  //     autorun(() => {
  //       captured.push(map.size);
  //     });
  //     execute();
  //
  //     assert.equal(captured.length, 1);
  //     assert.equal(captured[0], 3);
  //
  //     map.set(4, {});
  //     assert.equal(captured.length, 2);
  //     assert.equal(captured[1], 4);
  //
  //     map.delete(4);
  //     assert.equal(captured.length, 3);
  //     assert.equal(captured[2], 3);
  //
  //     map.delete(2);
  //     assert.equal(captured.length, 4);
  //     assert.equal(captured[3], 2);
  //
  //     map.delete(2);
  //     assert.equal(captured.length, 4);
  //
  //     map.set(2, {});
  //     assert.equal(captured.length, 5);
  //     assert.equal(captured[4], 3);
  //
  //     map.set(2, {});
  //     assert.equal(captured.length, 5);
  //
  //     map.clear();
  //     assert.equal(captured.length, 6);
  //     assert.equal(captured[5], 0);
  //   });
  //
  //   test(`Map: .keys() is reactive`, (ctx) => {
  //     const map = makeObservable(
  //       new Map([
  //         [1, 'a'],
  //         [2, 'b'],
  //         [3, 'c'],
  //         [4, 'd'],
  //       ])
  //     );
  //
  //     const captured = [];
  //
  //     autorun(() => {
  //       const run = [];
  //       for (const key of map.keys()) {
  //         run.push(key);
  //         if (key === 3) break; // don't iterate over all keys
  //       }
  //       captured.push(run);
  //     });
  //     execute();
  //
  //     assert.equal(captured.length, 1);
  //     assert.equal(captured[0]).toEqual([1, 2, 3]);
  //
  //     map.set(1);
  //     assert.equal(captured.length, 1);
  //
  //     map.set(5);
  //     assert.equal(captured.length, 1);
  //
  //     map.delete(1);
  //     assert.equal(captured.length, 2);
  //     assert.equal(captured[1]).toEqual([2, 3]);
  //   });
  //
  //   test(`Map: .values() is reactive`, (ctx) => {
  //     const map = makeObservable(
  //       new Map([
  //         [1, 'a'],
  //         [2, 'b'],
  //         [3, 'c'],
  //         [4, 'd'],
  //       ])
  //     );
  //
  //     const captured = [];
  //
  //     autorun(() => {
  //       const run = [];
  //       let i = 0;
  //       for (const v of map.values()) {
  //         run.push(v);
  //         if (i === 2) break; // don't iterate over all keys
  //         i += 1;
  //       }
  //       captured.push(run);
  //     });
  //     execute();
  //
  //     assert.equal(captured.length, 1);
  //     assert.equal(captured[0]).toEqual(['a', 'b', 'c']);
  //
  //     map.set(1, 'e');
  //     assert.equal(captured.length, 2);
  //     assert.equal(captured[1]).toEqual(['e', 'b', 'c']);
  //
  //     map.set(4, 'f');
  //     assert.equal(captured.length, 2);
  //
  //     map.delete(4);
  //     assert.equal(captured.length, 2);
  //
  //     map.delete(1);
  //     assert.equal(captured.length, 3);
  //     assert.equal(captured[2]).toEqual(['b', 'c']);
  //   });
  //
  //   test(`Map: .entries() is reactive`, (ctx) => {
  //     const map = makeObservable(
  //       new Map([
  //         [1, 'a'],
  //         [2, 'b'],
  //         [3, 'c'],
  //         [4, 'd'],
  //       ])
  //     );
  //
  //     const captured = [];
  //
  //     autorun(() => {
  //       const run = [];
  //       let i = 0;
  //       for (const e of map.entries()) {
  //         run.push(e);
  //         if (i === 2) break; // don't iterate over all keys
  //         i += 1;
  //       }
  //       captured.push(run);
  //     });
  //     execute();
  //
  //     assert.equal(captured.length, 1);
  //     assert.equal(captured[0]).toEqual([
  //       [1, 'a'],
  //       [2, 'b'],
  //       [3, 'c'],
  //     ]);
  //
  //     map.set(1, 'e');
  //     assert.equal(captured.length, 2);
  //     assert.equal(captured[1]).toEqual([
  //       [1, 'e'],
  //       [2, 'b'],
  //       [3, 'c'],
  //     ]);
  //
  //     map.set(4, 'f');
  //     assert.equal(captured.length, 2);
  //
  //     map.delete(4);
  //     assert.equal(captured.length, 2);
  //
  //     map.delete(1);
  //     assert.equal(captured.length, 3);
  //     assert.equal(captured[2]).toEqual([
  //       [2, 'b'],
  //       [3, 'c'],
  //     ]);
  //   });
  //
  //   test(`Map: .forEach() is reactive`, (ctx) => {
  //     const map = makeObservable(
  //       new Map([
  //         [1, 'a'],
  //         [2, 'b'],
  //         [3, 'c'],
  //         [4, 'd'],
  //       ])
  //     );
  //
  //     const captured = [];
  //
  //     autorun(() => {
  //       const run = [];
  //       map.forEach((v, k) => {
  //         run.push([k, v]);
  //       });
  //       captured.push(run);
  //     });
  //     execute();
  //
  //     assert.equal(captured.length, 1);
  //     assert.equal(captured[0]).toEqual([
  //       [1, 'a'],
  //       [2, 'b'],
  //       [3, 'c'],
  //       [4, 'd'],
  //     ]);
  //
  //     map.set(1, 'e');
  //     assert.equal(captured.length, 2);
  //     assert.equal(captured[1]).toEqual([
  //       [1, 'e'],
  //       [2, 'b'],
  //       [3, 'c'],
  //       [4, 'd'],
  //     ]);
  //
  //     map.delete(4);
  //     assert.equal(captured.length, 3);
  //     assert.equal(captured[2]).toEqual([
  //       [1, 'e'],
  //       [2, 'b'],
  //       [3, 'c'],
  //     ]);
  //   });
  // }
});

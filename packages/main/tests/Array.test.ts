import { describe, test } from 'node:test';
import assert from 'node:assert';

import { autorun, makeObservable, Observable, transaction } from '../index.js';

describe('Array ', () => {
  // /** ARRAY */
  test(`array: functions nested`, () => {
    const list = makeObservable({ data: [0, 1, 2] });
    const filtered = list.data.filter((i) => i % 2);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0], 1);
  });

  test(`array: equality: isArray`, () => {
    const source = [];
    const result = makeObservable({ arr: source });
    assert.equal(Array.isArray(result.arr), true);
  });

  test(`array: mutation: array property`, () => {
    const source = [{ cat: 'quack' }];
    const result = makeObservable({ arr: source });

    assert.equal(source[0].cat, 'quack');
    assert.equal(result.arr[0].cat, 'quack');

    result.arr[0].cat = 'murci';
    assert.equal(source[0].cat, 'murci');
    assert.equal(result.arr[0].cat, 'murci');
  });

  test(`array: mutation: array todos`, () => {
    const todos = makeObservable({
      arr: [
        { id: 1, title: 'quack', done: true },
        { id: 2, title: 'murci', done: false },
      ],
    }).arr;

    assert.equal(todos[1].done, false);
    // @ts-ignore
    todos[1].done = Infinity;
    assert.equal(todos[1].done, Infinity);

    assert.equal(todos.length, 2);
    todos.push({ id: 3, title: 'mishu', done: false });
    assert.equal(todos.length, 3);

    assert.equal(todos[1].done, Infinity);
    assert.equal(Array.isArray(todos), true);
    assert.equal(todos[0].title, 'quack');
    assert.equal(todos[1].title, 'murci');
    assert.equal(todos[2].title, 'mishu');
  });

  test(`array: mutation: array batch`, () => {
    const result = makeObservable({ arr: [1, 2, 3] }).arr;
    transaction(() => {
      assert.equal(result.length, 3);
      const move = result.splice(1, 1);
      assert.equal(result.length, 2);
      result.splice(0, 0, ...move);
      assert.equal(result.length, 3);
      // assert.equal(result).toEqual([2, 1, 3]);
      result.push(4);
      assert.equal(result.length, 4);
      // assert.equal(result).toEqual([2, 1, 3, 4]);
    });
    assert.equal(result.length, 4);
    assert.equal(result.pop(), 4);
    assert.equal(result.length, 3);
    // assert.equal(result).toEqual([2, 1, 3]);
  });

  test(`array: getters: array`, () => {
    const result = makeObservable({
      arr: [
        {
          cat: 'quack',
          get greeting() {
            return `hi, ${this.cat}`;
          },
        },
      ],
    }).arr;
    assert.equal(result[0].greeting, 'hi, quack');

    result[0].cat = 'mishu';
    assert.equal(result[0].greeting, 'hi, mishu');
  });

  test(`array: getter/setters: class in array`, () => {
    class Cat extends Observable {
      #name = 'quack';
      get name() {
        return this.#name;
      }
      set name(value) {
        this.#name = value;
      }
      get greeting() {
        return `hi, ${this.#name}`;
      }
    }
    const result = makeObservable({ arr: [new Cat()] }).arr;
    assert.equal(result[0].greeting, 'hi, quack');

    result[0].name = 'mishu';
    assert.equal(result[0].greeting, 'hi, mishu');
  });

  test(`array: supports wrapping a deep array inside a plain object`, (ctx) => {
    const o = makeObservable({ value: [] });

    let calls = 0;

    autorun(() => {
      calls += 1;
      ctx.diagnostic(`${o.value[0]}`);
    });
    assert.equal(calls, 1);

    transaction(() => o.value.set(0, 3));
    assert.equal(calls, 2);
    assert.equal(o.value[0], 3);
  });

  // maybe need not only set, but also get?
  test.skip(`array: supports wrapping a deep array inside an array`, (ctx) => {
    const o = makeObservable({ arr: [[]] }).arr;

    let calls = 0;

    autorun(() => {
      calls += 1;
      ctx.diagnostic(`${o[0][0]}`);
    });
    assert.equal(calls, 1);

    transaction(() => o[0].set(0, 3));
    assert.equal(calls, 2);
    assert.equal(o[0][0], 3);
  });

  test(`array: supports wrapping a deep plain object inside an array`, (ctx) => {
    const o = makeObservable({ arr: [{}] }).arr;

    let calls = 0;

    autorun(() => {
      calls += 1;
      // @ts-ignore
      ctx.diagnostic(`${o[0].lala}`);
    });
    assert.equal(calls, 1);

    // @ts-ignore
    transaction(() => (o[0].lala = 3));
    assert.equal(calls, 2);
    // @ts-ignore
    assert.equal(o[0].lala, 3);
  });

  test.skip(`array: supports not reacting when reading the length on a array, when reading all values, if the length does not actually change`, (ctx) => {
    const o = makeObservable({ value: [0] });

    let calls = 0;

    autorun(() => {
      calls += 1;
      ctx.diagnostic(`${o.value.length}`);
    });
    assert.equal(calls, 1);
    assert.equal(o.value.length, 1);

    transaction(() => o.value.splice(0, 1, 1));
    assert.equal(calls, 1);
  });

  //
  // test(`array: slice test`, (ctx) => {
  //   [
  //     ['ant', 'bison', 'camel', 'duck', 'elephant'],
  //     makeObservable(['ant', 'bison', 'camel', 'duck', 'elephant']),
  //   ].forEach((array) => {
  //     assert.equal(array.slice(2)).toEqual(['camel', 'duck', 'elephant']);
  //     assert.equal(array.slice(2, 4)).toEqual(['camel', 'duck']);
  //     assert.equal(array.slice(1, 5)).toEqual(['bison', 'camel', 'duck', 'elephant']);
  //     assert.equal(array.slice(-2)).toEqual(['duck', 'elephant']);
  //     assert.equal(array.slice(2, -1)).toEqual(['camel', 'duck']);
  //     assert.equal(array.slice()).toEqual(['ant', 'bison', 'camel', 'duck', 'elephant']);
  //
  //     assert.equal(array.slice(-400, 600)).toEqual(['ant', 'bison', 'camel', 'duck', 'elephant']);
  //
  //     assert.equal(array.slice(-400, -44)).toEqual([]);
  //     assert.equal(array.slice(-44, -400)).toEqual([]);
  //     assert.equal(array.slice(2, -400)).toEqual([]);
  //     assert.equal(array.slice(2, -3)).toEqual([]);
  //   });
  // });

  test(`array: sliced test [solid, oby]`, (ctx) => {
    const original = [{ foo: 1 }];
    const result = makeObservable({ arr: original }).arr;
    const clone = result.slice();
    assert.equal(clone[0], result[0]);
    assert.equal(clone[0], original[0]);
    assert.notEqual(clone, result);

    let calls = 0;
    autorun(() => {
      calls++;
      ctx.diagnostic(`${clone[0].foo}`);
    });
    assert.equal(calls, 1);
    assert.equal(clone[0].foo, 1);

    transaction(() => (clone[0].foo = 2));
    assert.equal(clone[0].foo, 2);
    assert.equal(result[0].foo, 2);
    assert.equal(original[0].foo, 2);
    assert.equal(calls, 2);
  });

  // test(`array: makeObservable identity nested`, (ctx) => {
  //   const raw = [];
  //   const obj1 = makeObservable({ value: raw });
  //   const obj2 = makeObservable({ value: raw });
  //   const obj3 = makeObservable({ value: obj1 });
  //   const obj4 = makeObservable({ value: obj2 });
  //
  //   assert.equal(obj1.value === obj2.value, true);
  //   assert.equal(obj2.value === obj3.value.value, true);
  //   assert.equal(obj3.value === obj1, true);
  //   assert.equal(obj3.value.value === obj4.value.value, true);
  // });

  // test(`array: reading length and pusing doesnt loop`, (ctx) => {
  //   const result = makeObservable([]);
  //
  //   let read = 0;
  //   autorun(() => {
  //     read++;
  //     if (read < 100) {
  //       result.length;
  //       result.push(Date.now());
  //       result.length;
  //     }
  //     return read;
  //   });
  //   execute();
  //   assert.equal(read, 100);
  // });

  test(`array: pushing in two separated effects doesnt loop`, () => {
    const result = makeObservable({ arr: [0] }).arr;

    autorun(() => {
      result.push(1);
    });

    autorun(() => {
      result.push(2);
    });

    assert.equal(result.length, 3);
  });

  test.skip(`array: track: array functions`, (ctx) => {
    const result = makeObservable({ arr: [{ username: 'lala' }] });

    let called = 0;
    autorun(() => {
      console.warn(result);
      ctx.diagnostic(`${result.arr[0]?.username}`);
      called++;
    });

    assert.equal(result.arr[0].username, 'lala');
    assert.equal(called, 1);

    transaction(() => (result.arr[0].username = 'lala2'));
    assert.equal(result.arr[0].username, 'lala2');
    assert.equal(called, 2);

    // setting to same value
    transaction(() => (result.arr[0].username = 'lala2'));
    assert.equal(result.arr[0].username, 'lala2');
    assert.equal(called, 2);

    transaction(() => result.arr.pop());
    assert.equal(called, 3);
    assert.equal(result.arr.length, 0);

    transaction(() => result.arr.push({ username: 'lala2' }));
    assert.equal(called, 4);

    transaction(() => result.arr.push({ username: 'lala3' }));
    assert.equal(called, 4);

    transaction(() => result.arr.push({ username: 'lala4' }));
    assert.equal(called, 4);

    transaction(() => (result.arr[0].username = 'lala5'));
    assert.equal(called, 5);
  });

  // test(`array: track: array functions read vs write`, (ctx) => {
  //   const result = makeObservable([1]);
  //
  //   let called = 0;
  //   autorun(() => {
  //     JSON.stringify(result);
  //     called++;
  //   });
  //   execute();
  //
  //   assert.equal(result[0], 1);
  //   assert.equal(called, 1);
  //
  //   result.filter((i) => i % 2);
  //   execute();
  //   assert.equal(called, 1);
  //
  //   result.filter((i) => i % 2);
  //   execute();
  //   assert.equal(called, 1);
  //
  //   result.push(2);
  //   execute();
  //   assert.equal(called, 2);
  // });

  // test(`array: track: array functions read`, (ctx) => {
  //   const result = makeObservable([1]);
  //
  //   let called = 0;
  //   autorun(() => {
  //     result.filter((i) => i % 2);
  //     called++;
  //   });
  //   execute();
  //   assert.equal(result[0], 1);
  //   assert.equal(called, 1);
  //
  //   result.push(2);
  //   execute();
  //   assert.equal(called, 2);
  //
  //   result.push(3);
  //   execute();
  //   assert.equal(called, 3);
  //
  //   result.push(4);
  //   execute();
  //   assert.equal(called, 4);
  // });

  // test(`${
  //   lib
  // }array: supports not reacting when setting a non-primitive property to itself, when reading all values`, (ctx) => {
  //   const o = makeObservable([0]);
  //
  //   let calls = 0;
  //
  //   autorun(() => {
  //     calls += 1;
  //     o[0];
  //   });
  //   execute();
  //   assert.equal(calls, 1);
  //
  //   o[0] = o[0];
  //   execute();
  //   assert.equal(calls, 1);
  //
  //   testValues(
  //     expect,
  //     (v) => {
  //       o[0] = v;
  //     },
  //     () => o[0]
  //   );
  // });

  test(`array: supports reacting when array length changes`, (ctx) => {
    const o = makeObservable({ value: [0] });

    let calls = 0;

    autorun(() => {
      calls += 1;
      ctx.diagnostic(`${o.value.length}`);
    });
    assert.equal(calls, 1);
    assert.equal(o.value.length, 1);

    transaction(() => o.value.pop());
    assert.equal(calls, 2);
    assert.equal(o.value.length, 0);
  });

  // test(`array: supports reacting when array length is set explicity`, (ctx) => {
  //   const o = makeObservable({ value: [0] });
  //
  //   let calls = 0;
  //
  //   autorun(() => {
  //     calls += 1;
  //     o.value.length;
  //   });
  //   execute();
  //   assert.equal(calls, 1);
  //   assert.equal(o.value.length, 1);
  //
  //   o.value.length = 0;
  //   execute();
  //   assert.equal(calls, 2);
  //   assert.equal(o.value.length, 0);
  // });

  // test(`${
  //   lib
  // }array: supports reacting when array length is set explicity while reading value`, (ctx) => {
  //   const o = makeObservable({ value: [0, 2] });
  //
  //   let calls = 0;
  //
  //   autorun(() => {
  //     calls += 1;
  //     o.value[0];
  //     o.value[1];
  //   });
  //   execute();
  //   assert.equal(calls, 1);
  //   assert.equal(o.value.length, 2);
  //
  //   o.value.length = 0;
  //   execute();
  //   assert.equal(calls, 2);
  //   assert.equal(o.value.length, 0);
  //   assert.equal(o.value[0], undefined);
  // });

  test(`array: supports not reacting when array reading function is called `, (ctx) => {
    const o = makeObservable({ value: [0, 1] });

    let calls = 0;

    autorun(() => {
      calls += 1;
      ctx.diagnostic(`${o.value} ${o.value[0]}`);
    });

    assert.equal(calls, 1);
    assert.equal(o.value.length, 2);

    // eslint-disable-next-line array-callback-return
    o.value.filter(() => {
      void 0;
    });

    assert.equal(calls, 1);
    assert.equal(o.value.length, 2);
  });

  // test(`array: supports not reacting when array writing function is called `, (ctx) => {
  //   const o = makeObservable({ value: [0, 1] });
  //
  //   let calls = 0;
  //
  //   autorun(() => {
  //     calls += 1;
  //     o.value[0];
  //   });
  //   execute();
  //   assert.equal(calls, 1);
  //   assert.equal(o.value.length, 2);
  //
  //   o.value.push(2);
  //   execute();
  //
  //   assert.equal(calls, 1);
  //   assert.equal(o.value.length, 3);
  // });

  test(`array: supports reacting to changes in deep arrays`, (ctx) => {
    const o = makeObservable({ value: [1, 2] });

    let calls = 0;

    autorun(() => {
      calls += 1;
      ctx.diagnostic(`${o.value.length}`);
    });
    assert.equal(calls, 1);

    transaction(() => o.value.pop());
    assert.equal(calls, 2);

    transaction(() => o.value.pop());
    assert.equal(calls, 3);

    transaction(() => o.value.push(1));
    assert.equal(calls, 4);
  });

  // test(`array: supports reacting to changes at a specific index in deep arrays`, (ctx) => {
  //   const o = makeObservable({ value: [1, 2] });
  //
  //   let calls = 0;
  //
  //   autorun(() => {
  //     calls += 1;
  //     o.value[0];
  //   });
  //   execute();
  //   assert.equal(calls, 1);
  //
  //   o.value.pop();
  //   execute();
  //   assert.equal(calls, 1);
  //
  //   o.value.push(10);
  //   execute();
  //   assert.equal(calls, 1);
  //
  //   o.value[0] = 123;
  //   execute();
  //   assert.equal(calls, 2);
  //
  //   o.value.unshift(1);
  //   execute();
  //   assert.equal(calls, 3);
  //
  //   o.value.unshift(1);
  //   execute();
  //   assert.equal(calls, 3);
  //
  //   o.value.unshift(2);
  //   execute();
  //   assert.equal(calls, 4);
  // });

  // test(`array: supports batching array methods automatically`, (ctx) => {
  //   const o = makeObservable({ value: [1, 2, 3] });
  //
  //   let calls = 0;
  //
  //   autorun(() => {
  //     calls += 1;
  //     o.value.forEach(() => {});
  //   });
  //   execute();
  //   assert.equal(calls, 1);
  //
  //   o.value.forEach((value, index) => {
  //     // console.log(o.value)
  //     o.value[index] = value * 2;
  //   });
  //   execute();
  //   assert.equal(calls, 2);
  // });

  test(`array: identity methods should be reactive`, () => {
    const obj = {};
    const arr = makeObservable({ arr: [obj, {}] });

    const search = arr.arr[0];

    let index = -1;
    autorun(() => {
      index = arr.arr.indexOf(search);
    });
    assert.equal(index, 0);

    transaction(() => arr.arr.reverse());
    assert.equal(index, 1);
  });

  test(`array: delete on Array should not trigger length dependency`, (ctx) => {
    const arr = makeObservable({ arr: [1, 2, 3] });

    let calls = 0;
    autorun(() => {
      calls++;
      ctx.diagnostic(`${arr.arr.length}`);
    });
    assert.equal(calls, 1);

    transaction(() => delete arr.arr[1]);
    assert.equal(calls, 1);
  });

  // test(`array: shift on Array should trigger dependency once`, (ctx) => {
  //   const arr = makeObservable([1, 2, 3]);
  //
  //   let calls = 0;
  //   autorun(() => {
  //     calls++;
  //     for (let i = 0; i < arr.length; i++) {
  //       arr[i];
  //     }
  //   });
  //   execute();
  //   assert.equal(calls, 1);
  //
  //   arr.shift();
  //   execute();
  //   assert.equal(calls, 2);
  // });

  // // #6018
  test(`array: edge case: avoid trigger effect in deleteProperty when array length-decrease mutation methods called`, () => {
    const arr = makeObservable({ arr: [1] });

    let calls = 0;
    autorun(() => {
      calls++;
      if (arr.arr.length > 0) {
        arr.arr.slice();
      }
    });
    assert.equal(calls, 1);

    transaction(() => arr.arr.splice(0));
    assert.equal(calls, 2);
  });

  // test(`${
  //   lib
  // }array: add existing index on Array should not trigger length dependency`, (ctx) => {
  //   const array = new Array(3);
  //   const observed = makeObservable(array);
  //   let calls = 0;
  //   autorun(() => {
  //     calls++;
  //     observed.length;
  //   });
  //   execute();
  //   assert.equal(calls, 1);
  //
  //   observed[1] = 1;
  //   execute();
  //   assert.equal(calls, 1);
  // });

  // test(`${
  //   lib
  // }array: add non-integer prop on Array should not trigger length dependency`, (ctx) => {
  //   const array = new Array(3);
  //   const observed = makeObservable(array);
  //   let calls = 0;
  //   autorun(() => {
  //     calls++;
  //     observed.length;
  //   });
  //   execute();
  //   assert.equal(calls, 1);
  //
  //   observed.x = 'x';
  //   execute();
  //   assert.equal(calls, 1);
  //
  //   observed[-1] = 'x';
  //   execute();
  //   assert.equal(calls, 1);
  //
  //   observed[NaN] = 'x';
  //   execute();
  //   assert.equal(calls, 1);
  // });

  // // #2427
  test(`array: track length on for ... in iteration`, () => {
    const array = makeObservable({ arr: [1] });
    let length = '';
    autorun(() => {
      length = '';
      // eslint-disable-next-line guard-for-in
      for (const key in array.arr) {
        length += key;
      }
    });
    assert.equal(length, '0');

    transaction(() => array.arr.push(1));
    assert.equal(length, '01');
  });

  // // #9742
  test(`array: mutation on user proxy of reactive Array`, () => {
    const array = makeObservable({ arr: [] });
    const proxy = new Proxy(array.arr, {});
    proxy.push(1);
    assert.equal(array.arr.length, 1);
    assert.equal(proxy.length, 1);
  });

  test(`array: should observe iteration`, () => {
    let dummy;
    const list = makeObservable({ arr: ['Hello'] });
    autorun(() => {
      dummy = list.arr.join(' ')
    });
    assert.equal(dummy, 'Hello');

    transaction(() => list.arr.push('World!'));
    assert.equal(dummy, 'Hello World!');

    transaction(() => list.arr.shift());
    assert.equal(dummy, 'World!');
  });

  test(`array: should observe implicit array length changes`, () => {
    let dummy;
    const list = makeObservable({ arr: ['Hello'] });
    autorun(() => {
      dummy = list.arr.join(' ')
    });

    assert.equal(dummy, 'Hello');

    transaction(() => list.arr.set(1, 'World!'));
    assert.equal(dummy, 'Hello World!');

    transaction(() => list.arr.set(3, 'Hello!'));
    assert.equal(dummy, 'Hello World!  Hello!');
  });

  test(`array: should observe sparse array mutations`, () => {
    let dummy;
    const list = makeObservable({ arr: [] });
    list.arr.set(1, 'World!');
    autorun(() => {
      dummy = list.arr.join(' ')
    });
    assert.equal(dummy, ' World!');

    transaction(() => list.arr.set(0, 'Hello'));
    assert.equal(dummy, 'Hello World!');

    transaction(() => list.arr.pop());
    assert.equal(dummy, 'Hello');
  });

  // test(`array: should not observe well-known symbol keyed properties`, (ctx) => {
  //   const key = Symbol.isConcatSpreadable;
  //   let dummy;
  //   const array = makeObservable([]);
  //   autorun(() => (dummy = array[key]));
  //   execute();
  //
  //   assert.equal(array[key], undefined);
  //   assert.equal(dummy, undefined);
  //
  //   array[key] = true;
  //   execute();
  //   assert.equal(array[key], true);
  //   assert.equal(dummy, true);
  // });
  //
  // test(`${
  //   lib
  // }array: should support manipulating an array while observing symbol keyed properties`, (ctx) => {
  //   const key = Symbol();
  //   let dummy;
  //   const array = makeObservable([1, 2, 3]);
  //   autorun(() => (dummy = array[key]));
  //   execute();
  //
  //   assert.equal(dummy, undefined);
  //
  //   array.pop();
  //   execute();
  //
  //   array.shift();
  //   execute();
  //
  //   array.splice(0, 1);
  //   execute();
  //
  //   assert.equal(dummy, undefined);
  //
  //   array[key] = 'value';
  //   execute();
  //
  //   array.length = 0;
  //   execute();
  //   assert.equal(dummy, 'value');
  // });

  // test(`array: should trigger all effects when array length is set to 0`, (ctx) => {
  //   const observed = makeObservable([1]);
  //
  //   let length;
  //   const execute1 = memo(() => {
  //     length = observed.length;
  //   });
  //   execute1();
  //
  //   let a;
  //   const execute2 = memo(() => {
  //     a = observed[0];
  //   });
  //   execute2();
  //
  //   assert.equal(length, 1);
  //   assert.equal(a, 1);
  //   // console.log(observed)
  //
  //   observed[1] = 2;
  //   execute1(), execute2();
  //
  //   // console.log(observed)
  //   assert.equal(observed[1], 2);
  //   assert.equal(observed.length, 2);
  //   assert.equal(length, 2);
  //
  //   observed.unshift(3);
  //   execute1(), execute2();
  //   assert.equal(length, 3);
  //   assert.equal(a, 3);
  //
  //   observed.length = 0;
  //   execute1(), execute2();
  //   assert.equal(length, 0);
  //   assert.equal(a, undefined);
  // });

  // test(`array: iterator references`, (ctx) => {
  //   const item = { a: 1 };
  //
  //   const obj = makeObservable([item, item]);
  //
  //   let count = 0;
  //   let calls = 0;
  //   autorun(() => {
  //     calls++;
  //     for (const key in obj) {
  //       count += obj.includes(obj[key]) ? 1 : 0;
  //     }
  //     assert.equal(count, 2);
  //
  //     for (const key in obj) {
  //       count += obj.indexOf(obj[key]) !== -1 ? 1 : 0;
  //     }
  //     assert.equal(count, 4);
  //
  //     for (const item of obj) {
  //       count += obj.includes(item) ? 1 : 0;
  //     }
  //     assert.equal(count, 6);
  //
  //     for (const item of obj) {
  //       count += obj.indexOf(item) !== -1 ? 1 : 0;
  //     }
  //     assert.equal(count, 8);
  //
  //     for (const item of obj.values()) {
  //       count += obj.includes(item) ? 1 : 0;
  //     }
  //     assert.equal(count, 10);
  //
  //     for (const item of obj.values()) {
  //       count += obj.indexOf(item) !== -1 ? 1 : 0;
  //     }
  //     assert.equal(count, 12);
  //
  //     for (const [k, item] of obj.entries()) {
  //       count += obj.includes(item) ? 1 : 0;
  //     }
  //     assert.equal(count, 14);
  //
  //     for (const [k, item] of obj.entries()) {
  //       count += obj.indexOf(item) !== -1 ? 1 : 0;
  //     }
  //     assert.equal(count, 16);
  //   });
  //   execute();
  //
  //   assert.equal(calls, 1);
  //
  //   assert.equal(count, 16);
  //
  //   assert.equal(calls, 1);
  // });

  // test(`${
  //   lib
  // }array: should avoid infinite recursive loops when use Array.prototype.push/unshift/pop/shift [solid, oby]`, (ctx) => {
  //   ['push', 'unshift'].forEach((key) => {
  //     const arr = makeObservable([]);
  //     let calls1 = 0;
  //     let calls2 = 0;
  //     const execute1 = memo(() => {
  //       calls1++;
  //       arr[key](1);
  //     });
  //     execute1();
  //     const execute2 = memo(() => {
  //       calls2++;
  //       arr[key](2);
  //     });
  //     execute2();
  //     assert.equal(arr.length, 2);
  //     assert.equal(calls1, 1);
  //     assert.equal(calls2, 1);
  //   });
  //   ['pop', 'shift'].forEach((key) => {
  //     const arr = makeObservable([1, 2, 3, 4]);
  //     let calls1 = 0;
  //     let calls2 = 0;
  //     const execute1 = memo(() => {
  //       calls1++;
  //       arr[key]();
  //     });
  //     execute1();
  //     const execute2 = memo(() => {
  //       calls2++;
  //       arr[key]();
  //     });
  //     execute2();
  //     assert.equal(arr.length, 2);
  //     assert.equal(calls1, 1);
  //     assert.equal(calls2, 1);
  //   });
  // });

  // /* vue array instrumentation https://github.com/vuejs/core/pull/9511/files */

  // test(`array: vue array instrumentation: iterator`, (ctx) => {
  //   const shallow = makeObservable([1, 2, 3, 4]);
  //   let result = memo(() => {
  //     let sum = 0;
  //     for (const x of shallow) {
  //       sum += x ** 2;
  //     }
  //     return sum;
  //   });
  //   assert.equal(result()).toBe(30);
  //
  //   shallow[2] = 0;
  //   assert.equal(result()).toBe(21);
  //
  //   const deep = makeObservable([{ val: 1 }, { val: 2 }]);
  //   result = memo(() => {
  //     let sum = 0;
  //     for (const x of deep) {
  //       sum += x.val ** 2;
  //     }
  //     return sum;
  //   });
  //   assert.equal(result()).toBe(5);
  //
  //   deep[1].val = 3;
  //   assert.equal(result()).toBe(10);
  // });

  // test(`array: vue array instrumentation: concat`, (ctx) => {
  //   batch(() => {
  //     const a1 = makeObservable([1, { val: 2 }]);
  //     const a2 = makeObservable([{ val: 3 }]);
  //     const a3 = [4, 5];
  //
  //     const result = memo(() => a1.concat(a2, a3));
  //     assert.equal(result()).toEqual([1, { val: 2 }, { val: 3 }, 4, 5]);
  //     assert.equal(isProxy(result()[1])).toBe(true);
  //     assert.equal(isProxy(result()[2])).toBe(true);
  //
  //     a1.shift();
  //     assert.equal(result()).toEqual([{ val: 2 }, { val: 3 }, 4, 5]);
  //
  //     a2.pop();
  //     assert.equal(result()).toEqual([{ val: 2 }, 4, 5]);
  //
  //     // a3 is not reactive, so this wont trigger a memo refresh
  //     a3.pop();
  //     assert.equal(result()).toEqual([{ val: 2 }, 4, 5]);
  //   });
  // });

  // test(`array: vue array instrumentation: entries`, (ctx) => {
  //   const shallow = makeObservable([0, 1]);
  //   const result1 = memo(() => Array.from(shallow.entries()));
  //   assert.equal(result1()).toEqual([
  //     [0, 0],
  //     [1, 1],
  //   ]);
  //
  //   shallow[1] = 10;
  //   assert.equal(result1()).toEqual([
  //     [0, 0],
  //     [1, 10],
  //   ]);
  //
  //   const deep = makeObservable([{ val: 0 }, { val: 1 }]);
  //   const result2 = memo(() => Array.from(deep.entries()));
  //   assert.equal(result2()).toEqual([
  //     [0, { val: 0 }],
  //     [1, { val: 1 }],
  //   ]);
  //   assert.equal(isProxy(result2()[0][1])).toBe(true);
  //
  //   deep.pop();
  //   assert.equal(Array.from(result2())).toEqual([[0, { val: 0 }]]);
  // });

  // test(`array: vue array instrumentation: every`, (ctx) => {
  //   const shallow = makeObservable([1, 2, 5]);
  //   let result = memo(() => shallow.every((x) => x < 5));
  //   assert.equal(result()).toBe(false);
  //
  //   shallow.pop();
  //   assert.equal(result()).toBe(true);
  //
  //   const deep = makeObservable([{ val: 1 }, { val: 5 }]);
  //   result = memo(() => deep.every((x) => x.val < 5));
  //   assert.equal(result()).toBe(false);
  //
  //   deep[1].val = 2;
  //   assert.equal(result()).toBe(true);
  // });

  // test(`array: vue array instrumentation: filter`, (ctx) => {
  //   const shallow = makeObservable([1, 2, 3, 4]);
  //   const result1 = memo(() => shallow.filter((x) => x < 3));
  //   assert.equal(result1()).toEqual([1, 2]);
  //
  //   shallow[2] = 0;
  //   assert.equal(result1()).toEqual([1, 2, 0]);
  //
  //   const deep = makeObservable([{ val: 1 }, { val: 2 }]);
  //   const result2 = memo(() => deep.filter((x) => x.val < 2));
  //   assert.equal(result2()).toEqual([{ val: 1 }]);
  //   assert.equal(isProxy(result2()[0])).toBe(true);
  //
  //   deep[1].val = 0;
  //   assert.equal(result2()).toEqual([{ val: 1 }, { val: 0 }]);
  // });

  // test(`array: vue array instrumentation: find and co.`, (ctx) => {
  //   const _reactive = makeObservable([{ val: 1 }, { val: 2 }]);
  //
  //   let find = memo(() => _reactive.find((x) => x.val === 2));
  //   // @ts-expect-error tests are not limited to es2016
  //   let findLast = memo(() => _reactive.findLast((x) => x.val === 2));
  //   let findIndex = memo(() => _reactive.findIndex((x) => x.val === 2));
  //   let findLastIndex = memo(() =>
  //     // @ts-expect-error tests are not limited to es2016
  //     _reactive.findLastIndex((x) => x.val === 2)
  //   );
  //
  //   assert.equal(find()).toBe(_reactive[1]);
  //   assert.equal(isProxy(find())).toBe(true);
  //   assert.equal(findLast()).toBe(_reactive[1]);
  //   assert.equal(isProxy(findLast())).toBe(true);
  //   assert.equal(findIndex()).toBe(1);
  //   assert.equal(findLastIndex()).toBe(1);
  //
  //   _reactive[1].val = 0;
  //
  //   assert.equal(find()).not.toBe(_reactive[1]);
  //   assert.equal(findLast()).not.toBe(_reactive[1]);
  //   assert.equal(findIndex()).toBe(-1);
  //   assert.equal(findLastIndex()).toBe(-1);
  //
  //   _reactive.pop();
  //
  //   assert.equal(find()).toBe(undefined);
  //   assert.equal(findLast()).toBe(undefined);
  //   assert.equal(findIndex()).toBe(-1);
  //   assert.equal(findLastIndex()).toBe(-1);
  //
  //   const deep = makeObservable([{ val: 1 }, { val: 2 }]);
  //   find = memo(() => deep.find((x) => x.val === 2));
  //   // @ts-expect-error tests are not limited to es2016
  //   findLast = memo(() => deep.findLast((x) => x.val === 2));
  //   findIndex = memo(() => deep.findIndex((x) => x.val === 2));
  //   // @ts-expect-error tests are not limited to es2016
  //   findLastIndex = memo(() => deep.findLastIndex((x) => x.val === 2));
  //
  //   assert.equal(find()).toBe(deep[1]);
  //   assert.equal(isProxy(find())).toBe(true);
  //   assert.equal(findLast()).toBe(deep[1]);
  //   assert.equal(isProxy(findLast())).toBe(true);
  //   assert.equal(findIndex()).toBe(1);
  //   assert.equal(findLastIndex()).toBe(1);
  //
  //   deep[1].val = 0;
  //
  //   assert.equal(find()).toBe(undefined);
  //   assert.equal(findLast()).toBe(undefined);
  //   assert.equal(findIndex()).toBe(-1);
  //   assert.equal(findLastIndex()).toBe(-1);
  // });

  // test(`array: vue array instrumentation: forEach`, (ctx) => {
  //   const shallow = makeObservable([1, 2, 3, 4]);
  //   let result = memo(() => {
  //     let sum = 0;
  //     shallow.forEach((x) => (sum += x ** 2));
  //     return sum;
  //   });
  //   assert.equal(result()).toBe(30);
  //
  //   shallow[2] = 0;
  //   assert.equal(result()).toBe(21);
  //
  //   const deep = makeObservable([{ val: 1 }, { val: 2 }]);
  //   result = memo(() => {
  //     let sum = 0;
  //     deep.forEach((x) => (sum += x.val ** 2));
  //     return sum;
  //   });
  //   assert.equal(result()).toBe(5);
  //
  //   deep[1].val = 3;
  //   assert.equal(result()).toBe(10);
  // });

  // test(`array: vue array instrumentation: join`, (ctx) => {
  //   function toString() {
  //     return this.val;
  //   }
  //   const shallow = makeObservable([
  //     { val: 1, toString },
  //     { val: 2, toString },
  //   ]);
  //   let result = memo(() => shallow.join('+'));
  //   assert.equal(result()).toBe('1+2');
  //
  //   shallow[1].val = 23;
  //   assert.equal(result()).toBe('1+23');
  //
  //   shallow.pop();
  //   assert.equal(result()).toBe('1');
  //
  //   const deep = makeObservable([
  //     { val: 1, toString },
  //     { val: 2, toString },
  //   ]);
  //   result = memo(() => deep.join());
  //   assert.equal(result()).toBe('1,2');
  //
  //   deep[1].val = 23;
  //   assert.equal(result()).toBe('1,23');
  // });

  // test(`array: vue array instrumentation: map`, (ctx) => {
  //   // uno
  //   const shallow = makeObservable([1, 2, 3, 4]);
  //   let result = memo(() => {
  //     return shallow.map((x) => x ** 2);
  //   });
  //   assert.equal(result()).toEqual([1, 4, 9, 16]);
  //
  //   shallow[2] = 0;
  //
  //   assert.equal(result()).toEqual([1, 4, 0, 16]);
  //
  //   // uno + empty
  //   const shallow2 = makeObservable([]);
  //   const result2 = memo(() => {
  //     return shallow2.map((x) => x ** 2);
  //   });
  //   assert.equal(result2()).toEqual([]);
  //
  //   shallow2[0] = 1;
  //   shallow2[1] = 2;
  //
  //   assert.equal(result2()).toEqual([1, 4]);
  //
  //   // dos
  //
  //   const deep = makeObservable([{ val: 1 }, { val: 2 }]);
  //   result = memo(() => deep.map((x) => x.val ** 2));
  //   assert.equal(result()).toEqual([1, 4]);
  //
  //   deep[1].val = 3;
  //   assert.equal(result()).toEqual([1, 9]);
  // });

  // test(`array: vue array instrumentation: reduce left and right`, (ctx) => {
  //   function toString() {
  //     return `${this.val}-`;
  //   }
  //   const reactive = makeObservable([
  //     { val: 1, toString },
  //     { val: 2, toString },
  //   ]);
  //
  //   assert.equal(reactive.reduce((acc, x) => String(acc) + x.val, undefined)).toBe('undefined12');
  //
  //   let left = memo(() => reactive.reduce((acc, x) => String(acc) + x.val));
  //   let right = memo(() => reactive.reduceRight((acc, x) => String(acc) + x.val));
  //   assert.equal(left()).toBe('1-2');
  //   assert.equal(right()).toBe('2-1');
  //
  //   reactive[1].val = 23;
  //   assert.equal(left()).toBe('1-23');
  //   assert.equal(right()).toBe('23-1');
  //
  //   reactive.pop();
  //   assert.equal(left()).toBe(reactive[0]);
  //   assert.equal(right()).toBe(reactive[0]);
  //
  //   const deep = makeObservable([{ val: 1 }, { val: 2 }]);
  //   left = memo(() => deep.reduce((acc, x) => acc + x.val, '0'));
  //   right = memo(() => deep.reduceRight((acc, x) => acc + x.val, '3'));
  //   assert.equal(left()).toBe('012');
  //   assert.equal(right()).toBe('321');
  //
  //   deep[1].val = 23;
  //   assert.equal(left()).toBe('0123');
  //   assert.equal(right()).toBe('3231');
  // });

  // test(`array: vue array instrumentation: some`, (ctx) => {
  //   const shallow = makeObservable([1, 2, 5]);
  //   let result = memo(() => shallow.some((x) => x > 4));
  //   assert.equal(result()).toBe(true);
  //
  //   shallow.pop();
  //   assert.equal(result()).toBe(false);
  //
  //   const deep = makeObservable([{ val: 1 }, { val: 5 }]);
  //   result = memo(() => deep.some((x) => x.val > 4));
  //   assert.equal(result()).toBe(true);
  //
  //   deep[1].val = 2;
  //   assert.equal(result()).toBe(false);
  // });

  // // Node 20+
  // test(`array: vue array instrumentation: toReversed`, (ctx) => {
  //   const array = makeObservable([1, { val: 2 }]);
  //   const result = memo(() => array.toReversed());
  //   assert.equal(array).not.toBe(result());
  //   assert.equal(result()).toEqual([{ val: 2 }, 1]);
  //   assert.equal(isProxy(result()[0])).toBe(true);
  //   assert.equal(result()[0]).toEqual({ val: 2 });
  //
  //   // modify original array, doesnt modify copied array
  //   // but the memo should rerun yielding 2,1
  //   array.splice(1, 1, 2);
  //
  //   assert.equal(array).toEqual([1, 2]);
  //   assert.equal(result()).toEqual([2, 1]);
  // });

  // // Node 20+
  // test(`array: vue array instrumentation: toSorted`, (ctx) => {
  //   // No comparer
  //
  //   assert.equal(makeObservable([2, 1, 3]).toSorted()).toEqual([1, 2, 3]);
  //
  //   const r = makeObservable([{ val: 2 }, { val: 1 }, { val: 3 }]);
  //   let result;
  //
  //   result = memo(() => r.toSorted((a, b) => a.val - b.val));
  //   assert.equal(result().map((x) => x.val)).toEqual([1, 2, 3]);
  //   assert.equal(isProxy(result()[0])).toBe(true);
  //
  //   r[0].val = 4;
  //   assert.equal(result().map((x) => x.val)).toEqual([1, 3, 4]);
  //
  //   r.pop();
  //   assert.equal(result().map((x) => x.val)).toEqual([1, 4]);
  //
  //   const deep = makeObservable([{ val: 2 }, { val: 1 }, { val: 3 }]);
  //
  //   result = memo(() => deep.toSorted((a, b) => a.val - b.val));
  //   assert.equal(result().map((x) => x.val)).toEqual([1, 2, 3]);
  //   assert.equal(isProxy(result()[0])).toBe(true);
  //
  //   deep[0].val = 4;
  //   assert.equal(result().map((x) => x.val)).toEqual([1, 3, 4]);
  // });

  // // Node 20+

  // test(`array: vue array instrumentation: toSpliced`, (ctx) => {
  //   const array = makeObservable([1, 2, 3]);
  //   assert.equal(array).toEqual([1, 2, 3]);
  //
  //   const result = memo(() => array.toSpliced(1, 1, -2));
  //   assert.equal(result()).toEqual([1, -2, 3]);
  //
  //   assert.equal(array).toEqual([1, 2, 3]);
  //
  //   array[0] = 0;
  //   assert.equal(array).toEqual([0, 2, 3]);
  //
  //   assert.equal(result()).toEqual([0, -2, 3]);
  //
  //   assert.equal(array).toEqual([0, 2, 3]);
  // });

  // test(`array: vue array instrumentation: values`, (ctx) => {
  //   const reactive = makeObservable([{ val: 1 }, { val: 2 }]);
  //   const result = memo(() => Array.from(reactive.values()));
  //   assert.equal(result()).toEqual([{ val: 1 }, { val: 2 }]);
  //   assert.equal(isProxy(result()[0])).toBe(true);
  //
  //   reactive.pop();
  //   assert.equal(result()).toEqual([{ val: 1 }]);
  //
  //   const deep = makeObservable([{ val: 1 }, { val: 2 }]);
  //   const firstItem = Array.from(deep.values())[0];
  //   assert.equal(isProxy(firstItem)).toBe(true);
  // });
});

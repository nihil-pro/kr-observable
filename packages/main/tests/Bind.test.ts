import { describe, mock, test } from 'node:test';
import assert from 'node:assert';

import { makeObservable, Observable } from '../index.js';


describe.skip('Bind [extends Observable]',() => {
  test('bound methods maintain correct `this` for prototype methods', async () => {

    const counter = mock.fn()

    class Test extends Observable {
      field = 1
      method() {
        return this;
      }

      method2() {
        counter()
        assert.equal(this.field, 1)
      }
    }

    const test = new Test();
    const { method, method2 } = test
    assert.equal(test, method())
    queueMicrotask(test.method2);
    setTimeout(method2);
    new Promise(resolve => setTimeout(resolve, 100)).then(method2)
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.equal(counter.mock.callCount(), 3)
  })

  test('bound methods maintain correct `this` through inheritance chains', async () => {
    const counter = mock.fn()

    class Test extends Observable {
      field = 1;
      method() {
        return this;
      }

      method2() {
        counter()
        assert.equal(this.field, 1)
      }
    }

    class Test2 extends Test {}

    const test = new Test2();
    const { method, method2 } = test
    assert.equal(test, method())

    queueMicrotask(method2);
    setTimeout(method2);
    new Promise(resolve => setTimeout(resolve, 100)).then(test.method2)
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.equal(counter.mock.callCount(), 3)

    class Test3 extends Observable {
      method() {
        return this;
      }
    }

    class Test4 extends Test3 {
      field = 1;
    }

    const counter2 = mock.fn()
    class Test5 extends Test4 {
      method2() {
        counter2()
        assert.equal(this.field, 1)
      }
    }

    const test5 = new Test5();
    assert.equal(test5, test5.method())

    queueMicrotask(test5.method2);
    setTimeout(test5.method2);
    new Promise(resolve => setTimeout(resolve, 100)).then(test5.method2)
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.equal(counter2.mock.callCount(), 3)
  })

  test('fields with arrow functions maintain correct `this`', async () => {

    const counter = mock.fn()

    class Test extends Observable {
      field = 1
      method = () => {
        return this;
      }

      method2 = () => {
        counter()
        assert.equal(this.field, 1)
      }
    }

    const test = new Test();
    const { method, method2 } = test
    assert.equal(test, method())
    queueMicrotask(method2);
    setTimeout(method2);
    new Promise(resolve => setTimeout(resolve, 100)).then(method2)
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.equal(counter.mock.callCount(), 3)
  })

  test('fields with functions maintain correct `this`', async () => {

    const counter = mock.fn()

    class Test extends Observable {
      field = 1
      method = function() {
        return this;
      }

      method2 = function() {
        counter()
        assert.equal(this.field, 1)
      }
    }

    const test = new Test();
    const { method, method2 } = test
    assert.equal(test, method())
    queueMicrotask(test.method2);
    setTimeout(method2);
    new Promise(resolve => setTimeout(resolve, 100)).then(method2)
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.equal(counter.mock.callCount(), 3)
  })

  test('bound methods can access private fields [#private]', () => {
    class Test extends Observable {
      #private = 1;
      read() {
        return this.#private;
      }
      update() {
        this.#private += 1;
      }
    }

    const test = new Test();
    assert.equal(test.read(), 1);
    test.update()
    assert.equal(test.read(), 2);

    class Test2 extends Observable {
      #private = 1;
      read() {
        return this.#private;
      }
      update() {
        this.#private += 1;
      }
    }

    class Test3 extends Test2 {
      chainRead() {
        return super.read()
      }

      chainRead2() {
        return this.read()
      }

      chainUpdate() {
        super.update()
      }

      chainUpdate2() {
        this.update()
      }
    }

    const test3 = new Test3();
    assert.equal(test3.chainRead(), 1);
    assert.equal(test3.chainRead2(), 1);

    test3.chainUpdate()
    assert.equal(test3.chainRead(), 2);
    assert.equal(test3.chainRead2(), 2);

    test3.chainUpdate2()
    assert.equal(test3.chainRead(), 3);
    assert.equal(test3.chainRead2(), 3);
  })

  test('bound methods can access private accessors [get/set #property]', () => {
    class Test extends Observable {
      #count = 1;

      get #private() {
        return this.#count
      }

      set #private(value: any) {
        this.#count = value;
      };

      read() {
        return this.#private;
      }
      update() {
        this.#private += 1;
      }
    }

    const test = new Test();
    assert.equal(test.read(), 1);
    test.update()
    assert.equal(test.read(), 2);

    class Test2 extends Observable {
      #count = 1;

      get #private() {
        return this.#count
      }

      set #private(value: any) {
        this.#count = value;
      };

      read() {
        return this.#private;
      }
      update() {
        this.#private += 1;
      }
    }

    class Test3 extends Test2 {
      chainRead() {
        return super.read()
      }

      chainRead2() {
        return this.read()
      }

      chainUpdate() {
        super.update()
      }

      chainUpdate2() {
        this.update()
      }
    }

    const test3 = new Test3();
    assert.equal(test3.chainRead(), 1);
    assert.equal(test3.chainRead2(), 1);

    test3.chainUpdate()
    assert.equal(test3.chainRead(), 2);
    assert.equal(test3.chainRead2(), 2);

    test3.chainUpdate2()
    assert.equal(test3.chainRead(), 3);
    assert.equal(test3.chainRead2(), 3);
  })

  test('accessors can access private fields [#private]', () => {
    class Test extends Observable {
      #private = 1;

      get private() {
        return this.#private;
      }

      set private(value: any) {
        this.#private = value;
      }
    }

    const test = new Test();
    assert.equal(test.private, 1);
    test.private = 2;
    assert.equal(test.private, 2)
  })

  test('accessors can access private accessors [get/set #property]', () => {
    class Test extends Observable {
      #count = 1;

      get #private() {
        return this.#count
      }

      set #private(value: any) {
        this.#count = value;
      };

      get private() {
        return this.#private;
      }

      set private(value: any) {
        this.#private = value;
      }
    }

    const test = new Test();
    assert.equal(test.private, 1);
    test.private = 2;
    assert.equal(test.private, 2)


    class Test2 extends Observable {
      #count = 1;

      get #private() {
        return this.#count
      }

      set #private(value: any) {
        this.#count = value;
      };

      get private() {
        return this.#private;
      }

      set private(value: any) {
        this.#private = value;
      }
    }
    class Test3 extends Test2 {}
    const test3 = new Test3();
    assert.equal(test3.private, 1);
    test3.private = 2;
    assert.equal(test3.private, 2)
  })

  test('functions reassigned to a field maintain correct `this`', () => {
    class Test extends Observable {
      field = 1;
    }
    const test = new Test();
    // @ts-ignore
    test.method = function() {
      assert.equal(this.field, 1)
    }

    // @ts-ignore
    const { method } = test
    method()

    class Test2 extends Observable {
      #field = 1;

      constructor() {
        super();
        // @ts-ignore
        this.method = function() {
          assert.equal(this.#field, 1)
        }

        // @ts-ignore
        this.method2 = () => {
          assert.equal(this.#field, 1)
        }
      }
    }
    const test2 = new Test2();
    // @ts-ignore
    const { method2, method: m2 } = test2
    m2()

    // @ts-ignore
    method2()
  })

  test('methods defined after instantiation maintain correct `this`', () => {
    class Test extends Observable {
      field = 1
      constructor() {
        super();
        Object.defineProperty(this, 'method', {
          value: function () {
            assert.equal(this.field, 1)
          },
          configurable: true
        })
      }
    }

    const test = new Test()
    // @ts-ignore
    test.method()

    class Test2 extends Observable {
      field = 1
    }

    const test2 = new Test2()

    Object.defineProperty(test2, 'method', {
      value: function () {
        assert.equal(this.field, 1)
      },
      configurable: true
    })

    // @ts-ignore
    const { method } = test2;
    method()
  })
})

describe('Bind [makeObservable]', () => {
  test.skip('bound methods maintain correct `this` [Method Definition]', async () => {
    const counter = mock.fn()
    const test = makeObservable({
      field: 1,
      method() {
        return this;
      },
      method2() {
        counter()
        assert.equal(this.field, 1)
      }
    });
    const { method, method2 } = test
    assert.equal(test, method())
    queueMicrotask(test.method2);
    setTimeout(method2);
    new Promise(resolve => setTimeout(resolve, 100)).then(method2)
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.equal(counter.mock.callCount(), 3)
  })

  test.skip('bound methods maintain correct `this` [Function Expression Property]', async () => {
    const counter = mock.fn()
    const test = makeObservable({
      field: 1,
      method: function() {
        return this;
      },
      method2: function() {
        counter()
        assert.equal(this.field, 1)
      }
    });
    const { method, method2 } = test
    assert.equal(test, method())
    queueMicrotask(test.method2);
    setTimeout(method2);
    new Promise(resolve => setTimeout(resolve, 100)).then(method2)
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.equal(counter.mock.callCount(), 3)
  })

  test('x', () => {
    const state = makeObservable({
      arr: [1, 2, 3],
      up() {
        const nw = this.arr.concat([4,5,6])
        console.log(nw)
        this.arr = nw;
      }
    })

    state.up()
  })
})

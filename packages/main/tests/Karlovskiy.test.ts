import { test } from 'node:test';
import assert from 'node:assert';

import { Observable, autorun, transaction } from '../index.js';

test('Karlovskiy reactivity test', async (ctx) => {
  const toBe = [8369, 4188, 8364, 8372, 4191, 8369, 4188];
  const res: number[] = [];
  const numbers: number[] = Array.from({ length: 5 }, (_, i) => i);

  let diagnostic = false;
  let text = '';
  const fib = (n: number) => (n < 2 ? 1 : fib(n - 1) + fib(n - 2));
  const hard = (n: number, l: string) => {
    if (diagnostic) {
      text += l;
    }
    return n + fib(18);
  };

  class Foo extends Observable {
    A = 0;
    B = 0;
    get C() {
      return (this.A % 2) + (this.B % 2);
    }
    get D() {
      return numbers.map((i) => ({ x: i + (this.A % 2) - (this.B % 2) }));
    }
    get E() {
      return hard(this.C + this.A + this.D[0].x, 'E');
    }
    get F() {
      return hard(this.D[2].x || this.B, 'F');
    }
    get G() {
      return this.C + (this.C || this.E % 2) + this.D[4].x + this.F;
    }

    change1() {
      this.B = 1;
      this.A = 1;
    }

    change2() {
      this.A = 2;
      this.B = 2;
    }
  }

  const foo = new Foo();

  autorun(() => {
    res.push(hard(foo.G, 'H'));
  });

  autorun(() => {
    res.push(foo.G);
  });

  autorun(() => {
    res.push(hard(foo.F, 'J'));
  });

  diagnostic = true;
  transaction(foo.change1);
  ctx.diagnostic(`First round: ${text}`); // H
  assert.equal(text, 'H');
  text = '';
  console.log('-------------- Second')
  transaction(foo.change2);
  ctx.diagnostic(`Second round: ${text}`); // EH
  assert.equal(text, 'EH');
  assert.equal(res.toString(), toBe.toString());
});

test.skip('Karlovskiy reactivity test inversed', async (ctx) => {
  const toBe = [8369, 4188, 8364, 8372, 4191, 8369, 4188];
  const res: number[] = [];
  const numbers: number[] = Array.from({ length: 5 }, (_, i) => i);

  let diagnostic = false;
  let text = '';
  const fib = (n: number) => (n < 2 ? 1 : fib(n - 1) + fib(n - 2));
  const hard = (n: number, l: string) => {
    if (diagnostic) {
      text += l;
    }
    return n + fib(18);
  };

  class Foo extends Observable {
    A = 0;
    B = 0;
    get C() {
      return (this.A % 2) + (this.B % 2);
    }
    get D() {
      return numbers.map((i) => ({ x: i + (this.A % 2) - (this.B % 2) }));
    }
    get E() {
      return hard(this.C + this.A + this.D[0].x, 'E');
    }
    get F() {
      return hard(this.D[2].x || this.B, 'F');
    }
    get G() {
      return this.C + (this.C || this.E % 2) + this.D[4].x + this.F;
    }

    change1() {
      this.A = 1;
      this.B = 1;
    }

    change2() {
      this.B = 2;
      this.A = 2;
    }
  }

  const foo = new Foo();

  autorun(() => {
    res.push(hard(foo.G, 'H'));
  });

  autorun(() => {
    res.push(foo.G);
  });

  autorun(() => {
    res.push(hard(foo.F, 'J'));
  });

  diagnostic = true;
  transaction(foo.change1);
  ctx.diagnostic(`First round: ${text}`); // H
  assert.equal(text, 'H');
  text = '';
  console.log('call change 2')
  transaction(foo.change2);
  ctx.diagnostic(`Second round: ${text}`); // EH
  assert.equal(text, 'EH');
  assert.equal(res.toString(), toBe.toString());
});


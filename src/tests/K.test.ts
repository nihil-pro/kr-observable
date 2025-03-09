import { describe, test } from 'node:test';
import assert from 'node:assert';

import { Observable, autorun } from '../index.js';

function delay() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), 10);
  });
}

describe('K', () => {
  test('', async (ctx) => {
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

    foo.A = 1;
    foo.B = 1;
    await delay();
    ctx.diagnostic(`First round: ${text}`);
    text = '';
    foo.A = 2;
    foo.B = 2;
    await delay();
    ctx.diagnostic(`Second round: ${text}`);
    assert.equal(res.toString(), toBe.toString());
  });
});

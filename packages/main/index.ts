export * from './src/Observable.js';
export * from './src/api.js';
export { executor } from './src/global.this.js';

declare global {
  interface Array<T> {
    set(i: number, v: T): void;
  }
}

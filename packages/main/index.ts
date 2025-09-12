export { Observable, makeObservable } from './src/Observable.js';
export { subscribe, listen, transaction, autorun, untracked } from './src/api.js';
export { executor } from './src/global.this.js';

declare global {
  interface Array<T> {
    set(i: number, v: T): void;
  }
}

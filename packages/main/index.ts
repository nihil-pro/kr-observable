export * from './src/global.js';
export * from './src/Observable.js';
export * from './src/api.js';
export type { Runnable, ObservableAdmin } from './src/types.js'

declare global {
  interface Array<T> {
    set(i: number, v: T): void;
  }
}

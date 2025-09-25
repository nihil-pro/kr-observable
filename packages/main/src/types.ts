import { ObservableAdm } from './Observable.adm.js';

export type Admin = ObservableAdm;
export type Property = string | symbol;
export type Subscriber = (changes?: Set<string | symbol>) => void;
export type Listener = (property: string | symbol, value: any) => void;
export type Disposer = () => void

export interface ObservedRunnable {
  run: Function;
  subscriber: Subscriber;
  disposed: boolean;
  debug: boolean;
  computed?: boolean
  active?: boolean
}

export type Structure = Map<any, any> | Set<any> | Array<any>;

/** Holds relationship between the *structure and the *structure owner object.
 * structure = ObservableArray, ObservableMap or ObservableSet */
export interface StructureMeta {
  key: string;
  adm: ObservableAdm;
}

import { Admin } from './Admin.js';

/** Low-level API */
export type ObservableAdmin = Admin;
export type Property = string | symbol;
export type Subscriber = (changes?: Set<string | symbol>) => void;
export type Listener = (property: string | symbol, value: any) => void;
export type Disposer = () => void

/** Low-level API */
export interface Runnable {
  run: Function;
  subscriber: Subscriber;
  disposed: boolean;
  debug: boolean;
  computed?: boolean
  active?: boolean
  deps?: Set<Set<Runnable>>
  read?: Set<Admin>;
}

export type Structure = Map<any, any> | Set<any> | Array<any>;

export type ObservableFactory = <T>(prop: Property, value: T, adm: Admin) => T

/** Holds relationship between the *structure and the *structure owner object.
 * structure = ObservableArray, ObservableMap or ObservableSet */
export interface StructureMeta {
  key: string;
  adm: ObservableAdmin;
  factory?: ObservableFactory;
}

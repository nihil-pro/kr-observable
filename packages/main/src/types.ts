import { Admin } from './Admin.js';

/** Low-level API */
export type ObservableAdmin = Admin;
export type Property = string | symbol;
export type Subscriber = (changes?: Set<Property>) => void;
export type Listener = (property: Property, value: any) => void;
export type Disposer = () => void

/** Low-level API */
export interface Runnable {
  run: Function;
  subscriber: Subscriber;
  debug: boolean;
  computed?: boolean
  active?: boolean
  deps?: Set<Set<Runnable>>
  read?: Set<Admin>;
}

export type Structure = Map<any, any> | Set<any> | Array<any>;

export type ObservableFactory = <T>(prop: Property, value: T, adm: Admin, receiver: Object) => T

/** Holds relationship between the *structure and the *structure owner object.
 * structure = ObservableArray, ObservableMap or ObservableSet */
export interface StructureMeta {
  key: string;
  adm: ObservableAdmin;
  factory?: ObservableFactory;
}

export interface StatefulHandler {
  adm: ObservableAdmin
  receiver: Object
  types: Record<Property, number>
}

export interface Factory {
  types: {
    READONLY: number,
    ACCESSOR: number,
    WRITABLE: number,
  }
  value<T>(property: Property, value: T, handler: StatefulHandler): T
  descriptor(property: Property, value: PropertyDescriptor, handler: StatefulHandler): PropertyDescriptor
}
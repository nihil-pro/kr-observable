import { Admin } from './Admin.js';

/** Low-level API */
export type ObservableAdmin = Admin;
export type Property = string | symbol;
export type Subscriber = (changes?: Set<Property>) => void;
export type Listener = (property: Property, value: any) => void;
export type Disposer = () => void
export type Setter = (value: any) => void;

/** Low-level API */
export interface Runnable {
  run: Function;
  subscriber: Subscriber;
  debug: boolean;
  computed?: boolean
  active?: boolean
  deps?: Set<Set<Runnable>>
  read?: Set<Admin>;
  /** Is changed only by notifier */
  runId?: number
}

export type Structure = Map<any, any> | Set<any> | Array<any>;

export type ObservableFactory = <T>(prop: Property, value: T, handler: StatefulHandler) => T

/** Holds relationship between the *structure and the *structure owner object.
 * structure = ObservableArray, ObservableMap or ObservableSet */
export interface StructureMeta {
  key: string;
  handler?: StatefulHandler;
  factory?: <T>(property: Property, value: T, handler: StatefulHandler) => T;
  adm: ObservableAdmin
}

export interface StatefulHandler {
  adm: ObservableAdmin
  receiver: Object
  types: Record<Property, number | undefined>;
}

export interface Factory {
  object<T>(property: Property, value: T, handler: StatefulHandler): T
  descriptor(property: Property, value: PropertyDescriptor, handler: StatefulHandler): PropertyDescriptor
}
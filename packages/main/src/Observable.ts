import { Admin } from './Admin.js';
import { Computed } from './Computed.js';
import { ProxyHandler } from './Proxy.handler.js';
import { ActionHandler } from './Action.handler.js';
import { ObservableSet } from './Observable.set.js';
import { ObservableMap } from './Observable.map.js';
import { ObservableArray } from './Observable.array.js';
import { Property, StatefulHandler } from './types.js';
import { Global } from './global.js';
import { Utils } from './Utils.js'

function setDefaultTypes(types: Object, ignore?: Set<Property>, shallow?: Set<Property>) {
  ignore?.forEach(key => types[key] = Utils.IGNORED);
  shallow?.forEach(key => types[key] = Utils.SHALLOW);
  return types;
}

class Factory {

  /** Convert data property descriptor value to observable (if needed),
   * and accessor property getter to Computed (if needed).
   *
   * Also sets the internal property type in the handler and ensures proper binding.
   */
  static descriptor(property: Property, descriptor: PropertyDescriptor, handler: StatefulHandler) {
    // Ignored and shallow properties are set in constructor when extending Observable,
    // and before looping through properties in makeObservable.
    // Skip those properties here to avoid overwriting types.
    if (!(property in handler.types)) {
      if ('value' in descriptor) {
        // This is a data property
        if (descriptor.writable) {
          handler.types[property] = Utils.WRITABLE;
        } else {
          // Non-writable data properties are treated as accessors
          // This is an acceptable side effect for proper reactive behavior
          handler.types[property] = Utils.ACCESSOR;
        }
      } else {
        // This is an accessor property (getter/setter)
        handler.types[property] = Utils.ACCESSOR;
      }
    }

    // Bind accessors to the proxy to maintain correct `this` context
    // This ensures private properties (#private) work correctly within accessors
    if (descriptor.get) descriptor.get = descriptor.get.bind(handler.receiver);
    if (descriptor.set) descriptor.set = descriptor.set.bind(handler.receiver);

    // Early return for ignored properties (no reactive behavior)
    if (handler.types[property] === Utils.IGNORED) return descriptor;

    if (handler.types[property] === Utils.ACCESSOR) {
      // Accessor properties: convert to Computed if they have a getter
      // Note: accessors can have only a setter, so we check for getter here
      if (descriptor.get) {
        // Computed returns a PropertyDescriptor-like object
        descriptor = new Computed(property, descriptor, handler);
      }
    } else {
      // Data properties: convert object values to observables
      if (!Utils.isPrimitive(descriptor.value)) {
        descriptor.value = Factory.object(property, descriptor.value, handler);
      }
    }

    return descriptor;
  }

  /** Converts non-primitive values to their observable counterparts:
   * - Map to ObservableMap
   * - Set to ObservableSet
   * - Array to ObservableArray
   * - Plain objects ({} or Object.create(null)) to Observable
   *
   * Any other values, including already observable objects, are returned as-is.
   */
  static object<T>(property: Property, value: T, handler: StatefulHandler): T {
    // already observable
    if (Utils.getAdm(value)) return value;

    if (handler.types[property] === Utils.IGNORED) return value;

    // Shallow copy of ObservableArray, ObservableMap or ObservableSet
    // TODO
    // All tests passes, but it looks like a problem.
    // Like we can skip convert this collection to observable counterpart when is needed.
    // It was added because Autocomplete of Material UI, infinitely and recursively,
    // recreates observables
    if (value['meta']?.key === '') return value;

    // Plain object with or without prototype
    if (Utils.isPlainObject(value)) {
      // @ts-ignore
      return makeObservable(value);
    }

    // Method that should be bounded
    if (typeof value === 'function') {
      // @ts-ignore
      return new Proxy(value, new ActionHandler(handler.receiver));
    }

    const isShallow = handler.types[property] === Utils.SHALLOW;
    const meta = {
      key: property.toString(),
      handler,
      adm: handler.adm,
      factory: isShallow ? undefined : Factory.object
    }

    if (value instanceof Array) {
      if (!isShallow) {
        for (let i = 0; i < value.length; i++) {
          if (!Utils.isPrimitive(value[i])) {
            value[i] = Factory.object(property, value[i], handler);
          }
        }
      }
      Object.setPrototypeOf(value, ObservableArray.prototype);
      Global.meta.set(value, meta);
      return value;
    }

    if (value instanceof Map) {
      // not sure, maybe if map is not empty,
      // we should also convert Map values to observables
      Object.setPrototypeOf(value, ObservableMap.prototype);
      Global.meta.set(value, meta);
      return value;
    }

    if (value instanceof Set) {
      // Set values are never automatically convert to observables
      Object.setPrototypeOf(value, ObservableSet.prototype);
      Global.meta.set(value, meta);
      return value;
    }

    return value;
  }
}

/**
 * @example
 * class Foo extends Observable {
 *
 * }
 * @interface Observable
 * */
export class Observable {
  declare static ignore: Set<Property>;
  declare static shallow: Set<Property>;
  constructor() {
    const ctor = new.target;
    const adm = new Admin(ctor.name);
    const handler = new ProxyHandler(adm, Factory);
    const proxy = new Proxy(this, handler);
    handler.receiver = proxy;
    setDefaultTypes(handler.types, ctor.ignore, ctor.shallow);

    const chain: any[] = []
    let current = ctor.prototype;
    while (current !== Observable.prototype) {
      chain.push(current)
      current = Object.getPrototypeOf(current);
    }

    // will loop over prototype chain,
    // and shouldn't redefine inherited and overwritten by current target – methods and getters/setters
    const skip = new Set<Property>(['constructor']);

    for (const proto of chain) {
      for (const key of Reflect.ownKeys(proto)) {
        if (skip.has(key)) continue;
        skip.add(key);
        const desc = Reflect.getOwnPropertyDescriptor(proto, key);
        Object.defineProperty(this, key, Factory.descriptor(key, desc, handler));
      }
    }
    return proxy;
  }
}

const error = new TypeError('Invalid argument. Only plain objects are allowed');

/** Only plain object are allowed
 * @example makeObservable({ foo: 'bar' }) */
export function makeObservable<T extends object>(
  value: T,
  ignore?: Set<Property>,
  shallow?: Set<Property>,
): T {
  if (Utils.isPrimitive(value)) throw error;
  if (!Utils.isPlainObject(value)) throw error;
  if (Utils.getAdm(value)) return value;

  const adm = new Admin('');

  const handler = new ProxyHandler(adm, Factory);
  const proxy = new Proxy<T>(value, handler);
  handler.receiver = proxy;
  setDefaultTypes(handler.types, ignore, shallow);

  // eslint-disable-next-line guard-for-in
  for (const key in value) {
    const descriptor = Factory.descriptor(key, Object.getOwnPropertyDescriptor(value, key), handler);
    if (descriptor.writable) {
      value[key] = descriptor.value;
    } else {
      Object.defineProperty(value, key, descriptor);
    }
  }
  return proxy;
}
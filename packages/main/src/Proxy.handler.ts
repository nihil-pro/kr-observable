import { Admin } from './Admin.js';
import { Computed } from './Computed.js';
import { ActionHandler } from './Action.handler.js';
import { Property, ObservableFactory } from './types.js';
import { $adm, executor, lib } from './global.js';

const NO_ACTION = new Set<Property>(Object.getOwnPropertyNames(Object.prototype));

export class ProxyHandler {
  static propertyType(descriptor: PropertyDescriptor) {
    // normal property
    if (descriptor.writable) return 2;
    // setter
    if (descriptor.set) return 1;
    // readonly
    return 0;
  }
  adm: Admin;
  fns: Record<Property, Function> = Object.create(null);
  descriptors: Record<Property, number> = Object.create(null);
  receiver: Object;
  factory: ObservableFactory;

  constructor(adm: Admin, factory: ObservableFactory) {
    this.adm = adm;
    this.factory = factory;
  }

  batch(property: Property) {
    lib.executor.report(this.adm, property);
    if (lib.action) return;
    if (this.adm.changes.has(property)) {
      this.adm.batch(true);
    }
  }

  get(target: object, property: Property, receiver: object) {
    if (property === $adm) return this.adm;
    const value = Reflect.get(target, property, receiver);
    if (typeof value === 'function') {
      // Return the original value for non-proxied methods
      if (NO_ACTION.has(property)) return value;

      // Create, cache, and return new proxy
      return this.fns[property] || (this.fns[property] = new Proxy(value, new ActionHandler(receiver)));
    }
    this.batch(property);
    return value;
  }


  set(target: object, property: Property, newValue: any) {
    let type = this.descriptors[property];
    if (type == null) {
      type = this.descriptors[property] = 2; // writable
      this.report(property, newValue);
    }
    if (type == 0) return false;
    if (type == 1) return Reflect.set(target, property, newValue, this.receiver);
    let result = true;
    const prevValue = target[property];
    if (prevValue !== newValue) {
      const value = this.factory(property, newValue, this.adm);
      result = Reflect.set(target, property, value);
      delete this.fns[property];
      this.report(property, newValue);
    }
    return result;
  }

  defineProperty(target: object, property: Property, desc: PropertyDescriptor) {
    let $desc = desc;
    this.descriptors[property] = ProxyHandler.propertyType(desc);
    if (desc.writable) $desc.value = this.factory(property, desc.value, this.adm);
    else if (desc.configurable) {
      $desc = new Computed(property, desc, this.adm, this.receiver);
    }
    return Reflect.defineProperty(target, property, $desc);
  }

  deleteProperty(target: object, property: Property): boolean {
    if (!(property in target)) return false;
    delete this.fns[property];
    delete this.descriptors[property];
    const res = Reflect.deleteProperty(target, property);
    this.report(property, undefined);
    return res;
  }

  setPrototypeOf(target: object, proto: any) {
    const protoAdm = proto[$adm];
    if (protoAdm) Object.assign(protoAdm, this.adm);
    return Reflect.setPrototypeOf(target, proto);
  }

  has(target: object, property: Property) {
    this.batch(property);
    return property in target;
  }

  getOwnPropertyDescriptor(target: object, property: Property) {
    this.batch(property);
    return Reflect.getOwnPropertyDescriptor(target, property);
  }

  report(property: Property, value: any) {
    executor.report(this.adm, property, true);
    this.adm.report(property, value);
  }
}
import { Property, Factory, ObservableAdmin } from './types.js';
import { $adm, executor, lib } from './global.js';

export class ProxyHandler {
  adm: ObservableAdmin;
  types: Record<Property, number> = {};
  receiver: Object;
  #factory: Factory;

  constructor(adm: ObservableAdmin, factory: Factory) {
    this.adm = adm;
    this.#factory = factory;
  }

  #report(property: Property, value: any) {
    // if property was changed during effect execution, this will remove it from deps
    executor.report(this.adm, property, true);
    this.adm.report(property, value);
  }

  #batch(property: Property) {
    executor.report(this.adm, property);
    if (lib.action) return;
    // This is needed for uncontrolled flow.
    // If property was changed, then subscribers will be notified before next tick
    // but if this property was accessed before that, we should notify subscribers before return
    if (this.adm.changes.has(property)) this.adm.batch(true);
  }

  get(target: object, property: Property) {
    if (property === $adm) return this.adm;
    this.#batch(property);
    return target[property];
  }

  set(target: object, property: Property, newValue: any) {
    if (this.types[property] === this.#factory.types.ACCESSOR) {
      return Reflect.set(target, property, newValue);
    }

    if (target[property] !== newValue) {
      this.#report(property, newValue);
    } else {
      if (newValue === undefined && !(property in target)) {
        this.#report(property, newValue);
      }
    }
    target[property] = this.#factory.value(property, newValue, this);
    return true;
  }

  defineProperty(target: object, property: Property, desc: PropertyDescriptor) {
    return Reflect.defineProperty(target, property, this.#factory.descriptor(property, desc, this));
  }

  deleteProperty(target: object, property: Property): boolean {
    if (!(property in target)) return false;
    delete this.types[property];
    const res = Reflect.deleteProperty(target, property);
    this.#report(property, undefined);
    return res;
  }

  setPrototypeOf(target: object, proto: any) {
    const protoAdm = proto[$adm];
    if (protoAdm) Object.assign(protoAdm, this.adm);
    return Reflect.setPrototypeOf(target, proto);
  }

  has(target: object, property: Property) {
    this.#batch(property);
    return property in target;
  }

  getOwnPropertyDescriptor(target: object, property: Property) {
    this.#batch(property);
    return Reflect.getOwnPropertyDescriptor(target, property);
  }
}
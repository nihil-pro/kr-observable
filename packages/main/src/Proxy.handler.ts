import { Utils } from './Utils.js'
import { Property, Factory, ObservableAdmin } from './types.js';
import { Global } from './global.js';

const executor = Global.executor;

export class ProxyHandler {
  adm: ObservableAdmin;
  types: Record<Property, number | undefined> = {};
  receiver: Object;
  factory: Factory;

  constructor(adm: ObservableAdmin, factory: Factory) {
    this.adm = adm;
    this.factory = factory;
  }

  #report(property: Property, value: any) {
    // if property was changed during effect execution, this will remove it from deps.
    // It allows to avoid infinite reactions loop
    executor.report(this.adm, property, true);
    this.adm.report(property, value);
  }

  #batch(property: Property) {
    if (this.types[property] !== Utils.IGNORED) {
      executor.report(this.adm, property);
    }
    if (Global.action) return;
    if (!this.adm.changes.size) return;
    if (this.adm.changes.has(property)) {
      this.adm.batch(true);
    }
  }

  get(target: object, property: Property) {
    if (property === Utils.AdmKey) return this.adm;
    this.#batch(property);
    return target[property];
  }

  set(target: object, property: Property, value: any) {
    /// Handle dynamically added properties (object.prop = value)
    if (!(property in this.types)) {
      // New properties are writable by default
      this.types[property] = Utils.WRITABLE;
      // Report the change for new properties even if value is undefined,
      // since the property itself is being added
      this.#report(property, value);
    }

    if (this.types[property] === Utils.ACCESSOR) {
      // Non-writable data property or accessor
      // If is non-writable, then Reflect.set will return false
      // If is accessor, Reflect.set will call original setter
      // If property is Computed (with setter), then `set` will be handled by computed,
      // otherwise, original setter will change a data property behind it
      return Reflect.set(target, property, value);
    }

    // Only report changes if value actually changed
    if (target[property] !== value) {
      this.#report(property, value);
    }

    if (Utils.isPrimitive(value)) {
      target[property] = value;
    } else {
      // maybe convert to observable
      target[property] = this.factory.object(property, value, this);
    }
    return true;
  }

  defineProperty(target: object, property: Property, desc: PropertyDescriptor) {
    return Reflect.defineProperty(target, property, this.factory.descriptor(property, desc, this));
  }

  deleteProperty(target: object, property: Property): boolean {
    if (!(property in target)) return false;
    const res = Reflect.deleteProperty(target, property);
    this.#report(property, undefined);
    return res;
  }

  setPrototypeOf(target: object, proto: any) {
    const adm = Utils.getAdm(proto);
    if (adm) Object.assign(adm, this.adm);
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
import { lib } from './global.js';
import { Admin } from './Admin.js';

export class ObservableSet<T> extends Set<T> {
  get meta() {
    return lib.meta.get(this) || Admin.meta;
  }

  report<U>(result: U) {
    this.meta.adm.report(this.meta.key, this);
    return result;
  }

  add(value: T) {
    return this.report(super.add(value));
  }

  delete(value: T) {
    return this.report(super.delete(value));
  }

  clear() {
    super.clear()
    return this.report(undefined);
  }
}
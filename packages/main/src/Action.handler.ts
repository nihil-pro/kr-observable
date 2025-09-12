import { ObservableAdm } from './Observable.adm.js';
import { lib } from './global.this.js';

/** Proxy handler for observable objects methods */
export class ActionHandler {
  receiver: Object;
  adm: ObservableAdm;

  constructor(receiver: Object, adm: ObservableAdm) {
    this.receiver = receiver;
    this.adm = adm;
  }

  apply(target: Function, _: any, argArray: any[]) {
    if (lib.action) return target.apply(this.receiver, argArray);
    lib.action = true;
    this.adm.state = 0;
    const result = target.apply(this.receiver, argArray);
    const thenable= result instanceof Promise;
    if (thenable) result.then(this.batch);
    this.adm.state = 1;
    this.batch();
    lib.action = thenable;
    return result;
  }

  batch() {
    lib.queue.forEach(ObservableAdm.batch);
    lib.queue.clear();
    lib.action = false;
  }
}

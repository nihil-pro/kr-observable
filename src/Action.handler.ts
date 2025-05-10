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
    this.adm.state = 0;
    lib.action = true;
    const result = target.apply(this.receiver, argArray);
    this.adm.state = 1;
    lib.action = false;
    lib.queue.forEach((adm) => adm.batch(true));
    lib.queue.clear();
    lib.notifier.clear();
    return result;
  }
}

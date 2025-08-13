import { ObservableAdm } from './Observable.adm.js';
import { lib } from './global.this.js';

/** Proxy handler for observable objects methods */
export class ActionHandler {
  receiver: Object;
  adm: ObservableAdm;
  isAsync: boolean

  constructor(receiver: Object, adm: ObservableAdm, isAsync: boolean) {
    this.receiver = receiver;
    this.adm = adm;
    this.isAsync = isAsync;
  }

  apply(target: Function, _: any, argArray: any[]) {
    if (lib.action) return target.apply(this.receiver, argArray);
    this.adm.state = 0;
    lib.action = true;
    const result = target.apply(this.receiver, argArray);
    if (this.isAsync) result?.then(this.batch);
    this.adm.state = 1;
    this.batch();
    lib.action = Boolean(this.isAsync);
    return result;
  }

  batch(result?: any) {
    lib.queue.forEach((adm) => adm.batch());
    lib.queue.clear();
    lib.action = false;
    return result;
  }
}

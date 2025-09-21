import { ObservableAdm } from './Observable.adm.js';
import { lib } from './global.this.js';

/** Proxy handler for observable objects methods */
export class ActionHandler {
  receiver: Object;

  constructor(receiver: Object) {
    this.receiver = receiver;
  }

  apply(target: Function, _: any, argArray: any[]) {
    if (lib.action) return target.apply(this.receiver, argArray);
    lib.action = true;
    try {
      let result = target.apply(this.receiver, argArray);
      const thenable = result instanceof Promise;

      if (thenable) {
        result = result
          .then(
            (r: any) => {
              this.batch();
              return r
            },
            (e: unknown) => {
              this.batch();
              throw e;
            }
          );
      }
      this.batch();
      lib.action = thenable;
      return result;
    } catch (e) {
      this.batch();
      throw e;
    }
  }

  batch() {
    lib.queue.forEach(ObservableAdm.batch);
    lib.queue.clear();
    lib.action = false;
  }
}

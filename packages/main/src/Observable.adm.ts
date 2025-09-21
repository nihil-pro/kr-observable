import { Listener, ObservedRunnable, Property } from './types.js';
import { lib } from './global.this.js';

/** Observable companion object */
export class ObservableAdm {
  /** A set of keys that should be totally ignored */
  ignore: Set<Property>;

  /** A set of keys that should be observed shallow */
  shallow: Set<Property>;

  /** Name of original object. For classes this will be the class name */
  owner: string;

  /** Relationship between a property and reactions that depend on it. */
  deps: Map<Property, Set<ObservedRunnable>> = new Map();

  /** Set of listeners. */
  listeners: Set<Listener> | undefined;

  /** Properties that have been changed during this tick */
  changes: Set<Property> = new Set();

  /** A reference to the list of reactions that depends on changed property we are loop now */
  current: Set<ObservedRunnable> | null = null;

  constructor(owner: string, ignore: Set<Property>, shallow: Set<Property>) {
    this.owner = owner;
    this.ignore = ignore;
    this.shallow = shallow;
  }

  /** Any mutations should invoke this to notify about changes */
  report(property: Property, value: any) {
    this.changes.add(property);
    // @ts-ignore
    this.listeners?.forEach((cb) => cb(property, value || undefined, this));
  }

  /** Invokes reactions
   * When a property is changed, the changer should:
   * – If there is no active action, then enqueue call to a microtask
   * – Otherwise, push changed adm to the queue
   *
   * When a property is read (accessed), the getter should:
   * – If there is an active action, then avoid invoke this
   * – Otherwise, it should check that accessed property is in changes list,
   *   and if that is true, then invoke this
   * */
  batch() {
    if (this.changes.size === 0) return;

    // During the loop we'll remove properties from changes list,
    // but we have to pass changes to listeners, that's why we need a copy
    const changes = new Set(this.changes);

    // Can't loop over changes list, as this will lead to an inconsistent state
    // We have to loop over reactions in order they were created
    this.deps.forEach((subs, key) => {
      if (subs.size === 0) return;
      // if key is in changes list, loop over it dependents
      if (this.changes.delete(key)) {
        this.current = subs;
        subs.forEach(sub => {
          if (sub.disposed) {
            subs.delete(sub);
          } else {
            lib.notifier.notify(sub, changes);
          }
        });
        this.current = null;
      }
    });
  }

  static batch(adm: ObservableAdm) {
    adm.batch()
  }

  removeRunnable(runnable: ObservedRunnable) {
    this.deps.forEach(list => list.delete(runnable))
  }
}

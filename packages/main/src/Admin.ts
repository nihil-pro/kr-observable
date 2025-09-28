import { Listener, Runnable, Property, StructureMeta } from './types.js';
import { lib, emptySet } from './global.js';


/** Observable companion object */
export class Admin {
  static meta: StructureMeta = { key: '', adm: new Admin('', emptySet, emptySet) }

  /** A set of keys that should be totally ignored */
  ignore: Set<Property>;

  /** A set of keys that should be observed shallow */
  shallow: Set<Property>;

  /** Name of original object. For classes this will be the class name */
  owner: string;

  /** Relationship between a property and reactions that depend on it. */
  deps: Map<Property, Set<Runnable>> = new Map();

  /** Set of listeners. */
  listeners: Set<Listener> | undefined;

  /** Properties that have been changed during this tick */
  changes: Set<Property> = new Set();

  /** A reference to the list of reactions that depends on changed property we are loop now */
  current: Set<Runnable> | null | undefined = null;

  /** Allows to enqueue microtask once for changes made at the same time */
  #queued = false;

  constructor(owner: string, ignore: Set<Property>, shallow: Set<Property>) {
    this.owner = owner;
    this.ignore = ignore;
    this.shallow = shallow;
  }

  /** Any mutations should invoke this to notify about changes */
  report(property: Property, value: any) {
    this.changes.add(property);
    this.listeners?.forEach(cb => cb(property, value));
    if (lib.action) {
      lib.queue.add(this);
    } else {
      if (!this.#queued) {
        this.#queued = true;
        queueMicrotask(() => {
          this.batch();
          this.#queued = false;
        });
      }
    }
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
  batch(flag = false) {
    if (this.changes.size === 0) return;
    // During the loop we'll remove properties from changes list,
    // but we have to pass changes to listeners, that's why we need a copy
    const changes = new Set(this.changes);

    // this is for uncontrolled flow,
    // for example, when changes were made after await.
    let unused: Set<Property> | undefined;

    this.changes.forEach(key => {
      this.changes.delete(key);
      if (!(this.current = this.deps.get(key))) return;
      for (const sub of this.current) {
        // this is also for uncontrolled flow. Example:
        // We have a computed that depend on property b,
        // somewhere after await (i.e. uncontrolled flow) we change b,
        // and then (almost immediately, in the same tick) we read b.
        // This will start batch, and we'll invoke reactions,
        // but if reaction depend on both computed and b,
        // then we deffer it's execution until computed will be re-evaluated
        if (flag && sub.computed) {
          if (!unused) unused = new Set<Property>();
          return unused.add(key);
        }
        if (sub.disposed) return this.current.delete(sub);
        // Means that runnable is currently in stack.
        // This can happen, for example, when an autorun is executing,
        // but an observable which it depends on, will trigger subscriber during execution.
        if (sub.active) return;
        lib.notifier.notify(sub, changes);
      }
      this.current = null;
    })
    if (unused) this.changes = unused;

    // Currently all tests passes, which means that even when loop over changes,
    // we invoke reactions in order they were added, due to subscriptions mechanism.
    // If nothing will break in real apps, then code bellow will be removed.

    // Can't loop over changes list, as this will lead to an inconsistent state
    // We have to loop over reactions in order they were created
    // this.deps.forEach((subs, key) => {
    //   if (subs.size === 0) return;
    //   // if key is in changes list, loop over it dependents
    //   if (this.changes.delete(key)) {
    //     this.current = subs;
    //     for (const sub of subs) {
    //       if (flag && sub.computed) {
    //         return this.changes.add(key);
    //       }
    //       if (sub.disposed) return subs.delete(sub);
    //       if (sub.active) return;
    //       lib.notifier.notify(sub, changes);
    //     }
    //     this.current = null;
    //   }
    // });
  }

  static batch(adm: Admin) {
    adm.batch()
  }

  removeRunnable(runnable: Runnable) {
    this.deps.forEach(list => list.delete(runnable))
  }

  get untrack() {
    return lib.untracked;
  }
}

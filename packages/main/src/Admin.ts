import { Listener, Runnable, Property, StructureMeta } from './types.js';
import { lib, emptySet } from './global.js';

const queue = lib.queue;

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

  subscribe(property: Property, runnable: Runnable) {
    if (lib.untracked) return;
    if (this.ignore.has(property)) return;
    let list = this.deps.get(property);
    if (!list) {
      list = new Set<Runnable>([runnable]);
      this.deps.set(property, list);
      return list;
    }
    if (!list.has(runnable)) {
      return list.add(runnable);
    }
  }

  /** Any mutations should invoke this to notify about changes */
  report(property: Property, value: any) {
    this.changes.add(property);
    this.listeners?.forEach(cb => cb(property, value));
    if (lib.action) {
      queue.add(this);
    } else if (!this.#queued) {
      this.#queued = true;
      queueMicrotask(() => {
        this.batch();
        this.#queued = false;
      });
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

    for (const change of this.changes) {
      this.changes.delete(change);
      this.current = this.deps.get(change);
      this.current?.forEach(sub => {
        if (flag && sub.computed) {
          if (!unused) unused = new Set();
          return unused.add(change);
        }
        if (sub.active) return;
        lib.notifier.notify(sub, changes);
      });
      this.current = null;
    }

    if (unused) this.changes = unused;
  }

  static batch(adm: Admin) {
    adm.batch()
  }

  removeRunnable(runnable: Runnable) {
    this.deps.forEach(list => list.delete(runnable))
  }
}

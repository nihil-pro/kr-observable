import { Listener, Runnable, Property, StructureMeta } from './types.js';
import { Global } from './global.js';

const queue = Global.queue;
const notifier = Global.notifier;

export class Admin {
  /** Used by shallow collections (Observable Array, Map, Set)
   * @see Global */
  static meta: StructureMeta = { key: '', adm: new Admin('') }

  /** Name of original object. For classes this will be the class name */
  owner: string;

  /** Relationship between a property and reactions that depend on it. */
  deps: Map<Property, Set<Runnable>> = new Map;

  /** Set of listeners. */
  listeners: Set<Listener> | undefined;

  /** Properties that have been changed after last batch */
  changes: Set<Property> = new Set;

  /** A reference to the list of reactions that depends on changed property we are looping through now */
  current: Set<Runnable> | null | undefined = null;

  /** Allows to enqueue microtask once for changes made at the same time */
  queued = false;

  constructor(owner: string) {
    this.owner = owner;
  }

  /** Add reaction to the property subscribers list */
  subscribe(property: Property, runnable: Runnable) {
    let list = this.deps.get(property);
    if (!list) {
      list = new Set;
      this.deps.set(property, list);
    }

    if (!list.has(runnable)) {
      list.add(runnable);
      // The main bottleneck due to circular references,
      // but is necessary, and in fact is much faster than doubly linked list.
      // Currently, I didn't find a better way.
      // It works like a back-pointer. We just put the list itself to runnable deps,
      // and runnable can easily unsubscribe (remove itself) from property dependencies.
      if (!runnable.deps?.has(list)) {
        runnable.deps?.add(list)
      }
    }
  }

  /** Remove reaction from the property subscribers list */
  unsubscribe(property: Property, runnable: Runnable) {
    this.deps.get(property)?.delete(runnable);
  }

  /** Any mutations should invoke this to notify about changes */
  report(property: Property, value: any) {
    // Invoke registered listeners
    this.listeners?.forEach(cb => cb(property, value));

    // Early return if property isn't observed
    if (!this.deps.has(property)) return;

    // Add property to changes
    this.changes.add(property);

    // If there is an active action, register self to global queue,
    // action handler will invoke registered admins before return
    if (Global.action) {
      queue.add(this);
    } else {
      // We are in uncontrolled flow (property was changed outside of action)
      // Early return if this.batch was already enqueued
      if (this.queued) return;
      // Mark as queued
      this.queued = true;
      // Enqueue this.batch
      // It will be invoked before next tick, or earlier,
      // if someone accesses this property through proxy before microtask executes
      queueMicrotask(this.enqueueBatch);
    }
  }

  /** Microtask callback that processes batch and resets queued flag */
  enqueueBatch = () => {
    this.batch();
    this.queued = false;
  }

  /**
   * Invokes reactions for changed properties
   *
   * When a property is changed, the changer should:
   * – If there is no active action, then enqueue call to a microtask
   * – Otherwise, push changed admin to the queue
   *
   * When a property is read (accessed), the getter should:
   * – If there is an active action, then avoid invoking this
   * – Otherwise, it should check that accessed property is in changes list,
   *   and if that is true, then invoke this
   */
  batch(flag = false) {
    if (this.changes.size === 0) return;

    const changes = this.changes;

    // This is required since changes can be made in different order,
    // but we have to notify subscribers in the order they were registered
    if (changes.size > 1) {
      const copy = new Set<Property>();
      for (const key of this.deps.keys()) {
        if (changes.has(key)) copy.add(key);
      }
      this.changes = copy;
    }

    for (const change of this.changes) {
      // Remove change immediately to ensure nested `batch` calls
      // won't invoke subscriber accidentally
      this.changes.delete(change);

      // Hold subscribers of changed property.
      // This is used by computed properties in cases when:
      // 1) We have a Reaction that depends on both data property and computed property;
      // 2) Changed property subscriptions look like: prop => Reaction, Computed
      // 3) During loop below will invoke Reaction before Computed,
      //    but since Reaction also depends on Computed, it will access it.
      // 4) When Computed property is read by Reaction it will check its presence in this list,
      //    and invalidate itself.
      this.current = this.deps.get(change);
      for (const sub of this.current) {
        // Since a Reaction can be in subscription lists of different changed properties,
        // we check if it was already notified during this tick.
        if (sub.runId !== notifier.runId) {
          // Rare, but sometimes changes may happen during reaction execution (in React, for example)
          // So we just ignore it at this time
          if (sub.active) {
            return;
          }

          // Rare case!
          // We are in an async uncontrolled flow.
          // For more info see the update method in Akimov.test.ts
          if (flag && sub.computed) {
            return this.changes.add(change);
          }

          notifier.notify(sub, changes);
        }
      }

      this.current = null;
    }
  }

  /**
   * Invoke admin batch method
   * @see transaction
   * @see ActionHandler
   */
  static batch(adm: Admin) {
    // Used by transaction API and ActionHandler
    adm.batch();
  }
}
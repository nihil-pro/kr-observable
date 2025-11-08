import { Admin } from './Admin.js';
import { Global } from './global.js';

/**
 * Proxy handler for observable objects methods that wraps function calls in actions
 * Ensures reactive updates are batched properly for synchronous and asynchronous operations
 */
export class ActionHandler {
  /** Reference to the original proxy object */
  ctx: Object;

  /**
   * @param {Object} receiver - Original proxy instance
   * We have to use it as context, otherwise we won't be able to access private properties (#private)
   */
  constructor(receiver: Object) {
    this.ctx = receiver;
  }

  /** Intercepts function calls and wraps them in action context */
  apply(target: Function, _: any, args: any[]) {

    // If we're already in an action context, just execute the function normally
    if (Global.action) return target.apply(this.ctx, args);

    // Start action context to batch reactive updates
    Global.action = true;

    try {
      // Execute the function with the proxy as `this` context
      let result = target.apply(this.ctx, args);

      /**
       * Since action can be an async function, we have to flush just after synchronous phase,
       * and then again, to process changes that were made after async phase.
       * Simple example:
       * @example
       * async getData() {
       *   // sync phase. We should notify subscriber, and show a loader, for example
       *   this.loading = true;
       *
       *   // async phase started. In fact, due to how Promises work, our action is done here.
       *   const data = await fetch()
       *
       *   // end of async context. Changes below are made outside the action!
       *   this.data = data;
       *   this.loading = false;
       * }
       * */
      const thenable = result instanceof Promise;

      if (thenable) {
        result = result.then(ActionHandler.resolve, ActionHandler.reject);
      }

      // Flush changes made during synchronous execution
      ActionHandler.flush();

      // Special handling: if it's an async function, keep action context active
      // until the returned promise resolves
      Global.action = thenable;
      return result;
    } catch (e) {
      // Ensure cleanup even if synchronous execution fails
      ActionHandler.reject(e);
    }
  }

  /**
   * Flushes all pending reactive updates from the global queue
   * Processes all admins that accumulated changes during action execution
   */
  static flush() {
    // Process all admins that have changes batched during action execution
    Global.queue.forEach(Admin.batch);
    Global.queue.clear();

    // Reset action context
    Global.action = false;
  }

  /** Flush changes made after async resolution (success case) */
  static resolve(result: any) {
    ActionHandler.flush();
    return result;
  }

  /** Flush changes made after async resolution (error case)
   * Re-throw to maintain promise rejection behavior
   * */
  static reject(error: unknown) {
    ActionHandler.flush();
    throw error;
  }
}
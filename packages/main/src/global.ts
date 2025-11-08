import { Executor } from './Executor.js';
import { Notifier } from './Notifier.js';
import { Structure, StructureMeta, ObservableAdmin } from './types.js';

/**
 * Since the library can be used in environments with multiple module instances,
 * such as micro-frontends (Webpack Module Federation, Single-SPA, etc.),
 * build systems with multiple entry points, or complex bundling configurations,
 * we cannot rely on module-level singletons.
 *
 * Fields in this class must be true singletons shared across all library instances
 * to maintain consistent reactive state and prevent memory leaks.
 */
class GlobalState {
  /**
   * Unused right now, and not sure if we should have this API.
   * Was added temporarily for DKazakov Router.
   */
  static untracked = false;

  /**
   * A global flag which indicates that an action is executing right now.
   * Used to batch reactive updates during action execution.
   */
  static action = false;

  /**
   * During actions executions, all admins that have changes are added to this list,
   * and processed at the end of action to batch reactive updates.
   */
  static queue: Set<ObservableAdmin> = new Set;

  /**
   * Used by collections: Observable Array, Map and Set.
   * Since we don't use Proxy for collections,
   * this allows to get related Admin from collection itself.
   * @see Factory in Observable.ts
   */
  static meta: WeakMap<Structure, StructureMeta> = new WeakMap;

  /** Executor singleton - manages runnable execution and dependency tracking */
  static executor = Executor;

  /** Notifier singleton - handles reactive notifications and batching */
  static notifier = Notifier;
}

// Use a unique symbol to avoid global namespace collisions
const LibName = Symbol.for('kr-observable');

declare global {
  var globalThis: {
    [LibName]: typeof GlobalState;
  };
}

// globalThis is supported by all modern runtimes.
// For older runtimes, the library should be processed by something like babel,
// which can polyfill the globalThis to self or window.
if (!globalThis[LibName]) {
  // Seal the object to prevent accidental modifications to the global state
  globalThis[LibName] = Object.seal(GlobalState);
}

/**
 * Global singleton instance that ensures consistent state across:
 * - Multiple module instances in complex build systems
 * - Micro-frontend architectures (Module Federation, Single-SPA, etc.)
 * - Hot module reloading scenarios
 * - Multiple entry points in bundlers
 */
export const Global = globalThis[LibName] as typeof GlobalState;
export const executor = Global.executor;
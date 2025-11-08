import { enableExternalSource } from "solid-js";
import { executor, Runnable } from "kr-observable";

export const enableObservable = (debug = false) => {
  enableExternalSource((fn, trigger) => {
    let currentArg: any;

    // Get the component name from the function for debug purposes
    const componentName = fn.name || 'AnonymousComponent';
    let rss: any & Runnable;
    rss = {
      run: () => fn(currentArg),
      debug: false,
      runId: undefined,
      subscriber: (changes?: Set<string | symbol>) => {
        if (debug) {
          console.info(`[${componentName}] will update. Changes:`, changes);
        }
        trigger(); // Notify SolidJS to re-render
      }
    };

    return {
      track: (x: any) => {
        currentArg = x;

        const result = executor.execute(rss);

        if (debug) {
          const read: Record<string, Set<string | symbol>> = {};
          rss?.read.forEach((adm) => {
            adm.deps.forEach((list, key) => {
              if (list.has(rss)) {
                let keys = read[adm.owner];
                if (!keys) {
                  keys = new Set();
                  read[adm.owner] = keys;
                }
                keys.add(key);
              }
            });
          });
          console.info(`[${componentName}] was rendered. Read: `, read);
        }

        return result;
      },

      dispose: () => {
        executor.dispose(rss);
        if (debug) {
          console.info(`[${componentName}] was disposed`);
        }
      }
    };
  });
};
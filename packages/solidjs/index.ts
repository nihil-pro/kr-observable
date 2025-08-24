import { enableExternalSource } from "solid-js";
import { executor } from "kr-observable";

export const enableObservable = (debug = false) => {
  enableExternalSource((fn, trigger) => {
    let currentArg: any;

    // Get the component name from the function for debug purposes
    const componentName = fn.name || 'AnonymousComponent';

    const rss = {
      run: () => fn(currentArg),
      debug: false,
      version: 1,
      disposed: false,
      // For debug purposes, we need these properties
      ...(debug && {
        rc: fn,
        debug: true,
        version: 1,
        subscriber(changes?: Set<string | symbol>) {
          if (debug) {
            const result = executor.get(this);
            if (result) {
              const rcDepsChanges = new Set();
              changes?.forEach((change) => {
                result.read.forEach(adm => {
                  if (adm.deps.has(change)) rcDepsChanges.add(change);
                });
              });
              console.info(`[${componentName}] will update. Changes:`, rcDepsChanges);
            } else {
              console.info(`[${componentName}] will update. Changes:`, changes);
            }
          }
          trigger(); // Notify SolidJS to re-render
        }
      })
    };

    return {
      track: (x: any) => {
        currentArg = x;

        const TR = executor.execute(rss);

        if (debug && TR.read) {
          const read: Record<string, Set<string | symbol>> = {};
          TR.read.forEach((adm) => {
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

        return TR.result;
      },

      dispose: () => {
        executor.dispose(rss);
        rss.disposed = true;
        if (debug) {
          console.info(`[${componentName}] was disposed`);
        }
      }
    };
  });
};
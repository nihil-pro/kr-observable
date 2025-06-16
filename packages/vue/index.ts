import { defineComponent, h, Plugin } from 'vue';
import { executor } from 'kr-observable';

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}

/** @example
 * <template>
 *   <Observer>
 *     {{ state.data }}
 *   </Observer>
 * </template>
 * */
export const Observer = defineComponent({
  data: () => ({
    version: 1,
    dispose: () => executor.dispose(this),
    run: noop,
    subscriber: noop,
    render: noop,
    disposed: false,
  }),
  beforeMount() {
    this.run = this.$slots?.default;
    this.subscriber = () => ++this.version;
    this.render = () => executor.execute(this)?.result;
  },
  render() {
    return h(this.render, { ObservableKey: this.version });
  },
  unmounted() {
    this.dispose();
  },
});

/** @example
 * const app = createApp(App);
 * app.use(ObserverPlugin);
 * app.mount('#app');
 *  */
export const ObserverPlugin: Plugin = {
  install: (app) => {
    app.component('Observer', Observer);
  },
};

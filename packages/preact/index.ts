import { executor, Runnable } from 'kr-observable';
import { VNode, Component } from 'preact';

function shallowDiffers(a: Object, b: Object) {
  for (let i in a) if (!(i in b)) return true;
  for (let i in b) if (a[i] !== b[i]) return true;
  return false;
}

export function observer<P>(
  rc: ((props: P) => VNode<any>),
  debug = false
) {
  // This work in Preact and Preact/compat because it doesn't throw when a hook is called
  // inside a class component
  return class extends Component<P, any> implements Runnable {
    run = rc
    debug = debug;
    active = false;
    deps?: Set<Set<Runnable>>;
    runId = 1;

    shouldComponentUpdate(nextProps: any) {
      return shallowDiffers(this.props, nextProps);
    }

    componentWillUnmount() {
      executor.dispose(this)
    }

    subscriber() {
      this.forceUpdate();
    }

    render(props: Object) {
      return executor.execute(this, props);
    }
  };
}

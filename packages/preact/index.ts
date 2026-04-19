import { executor, ObservableAdmin, Runnable } from 'kr-observable';
import { VNode, Component } from 'preact';

function shallowDiffers(a: Object, b: Object) {
  for (let i in a) if (!(i in b)) return true;
  for (let i in b) if (a[i] !== b[i]) return true;
  return false;
}

export function observer<P>(
  rc: (props: P) => VNode<any>,
  debug: boolean
): VNode<any>;

export function observer<T extends new (...args: any[]) => Component<any, any>>(
  rc: T,
  debug?: boolean
): T;

export function observer<P>(
  rc:
    | ((props: P) => VNode<any>)
    | (new (...args: any[]) => Component<any, any>),
  debug = false
): any {

  // class component,
  // can either be Component or PureComponent from "preact/compat" subpackage
  // to check with instanceof we need to import PureComponent from /compat,
  // which may include it into bundle, but we want to avoid this.
  // That why we check it in this way
  if (typeof rc.prototype.render === 'function') {
    const ClassComponent = rc as new (...args: any[]) => Component<any, any>;

    // @ts-ignore
    return class extends ClassComponent implements Runnable {
      active = false;
      debug = debug;
      read?: Set<ObservableAdmin>;
      deps?: Set<Set<Runnable>>
      runId = 1;
      run: Function;
      subscriber: (changes?: Set<string | symbol>) => void;

      constructor(props: any, state: any) {
        super(props, state);
        this.run = this.render;
        this.render = () => executor.execute(this, this.props)
        this.subscriber = () => this.forceUpdate();

        // PureComponent has defined shouldComponentUpdate, Component didn't
        if (typeof rc.prototype.shouldComponentUpdate !== 'function') {
          this.shouldComponentUpdate = nextProps => shallowDiffers(this.props, nextProps);
        }
      }
    }
  }


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

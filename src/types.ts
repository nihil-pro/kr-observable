export type Subscriber = (changes?: Set<string | symbol>) => void | Promise<void>;
export type Listener = (property: string | symbol, value: any) => void | Promise<void>;

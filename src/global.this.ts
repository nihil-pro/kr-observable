export function getGlobal(): Window {
  if (typeof globalThis !== 'undefined') {
    return globalThis as unknown as Window;
  }
  if (typeof window !== 'undefined') {
    return window;
  }
  if (typeof global !== 'undefined') {
    return global as unknown as Window;
  }
  if (typeof self !== 'undefined') {
    return self;
  }
  return {} as unknown as Window;
}

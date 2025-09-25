export function comparator(a: any, b: any) {
  if (a == null || b == null) return Object.is(a, b);
  const A = a.valueOf();
  const B = b.valueOf();
  if (typeof A === 'object') {
    if (typeof B !== 'object') return false;
    const keys = Object.keys(A);
    if (keys.length !== Object.keys(B).length) return false;
    for (const key of keys) {
      if (!comparator(A[key], B[key])) return false;
    }
    return true;
  }
  return Object.is(a, b) ;
}

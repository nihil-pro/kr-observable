// Subpackage code goes here
import { autorun } from 'kr-observable';
export const foo = {
  get bar() {
    console.warn('autorun', autorun);
    return 1;
  },
};

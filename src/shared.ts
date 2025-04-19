import { Property } from './types.js';

export const $adm = Symbol.for('$adm');
export const emptySet = Object.freeze(new Set()) as Set<Property>;

import { describe, it } from 'node:test';
import assert from 'node:assert';

import * as exportContent from '../../../dist/esm/index.js';

void describe('Test import esm', async () => {
  await it('success', () => {
    assert.deepEqual(
      Object.keys(exportContent).sort((a, b) => a.localeCompare(b)),
      ['autorun', 'makeObservable', 'Observable', 'observer']
    );
    assert.deepEqual(typeof exportContent.Observable, 'function');
    assert.deepEqual(typeof exportContent.makeObservable, 'function');
    assert.deepEqual(typeof exportContent.observer, 'function');
    assert.deepEqual(typeof exportContent.autorun, 'function');
  });
});

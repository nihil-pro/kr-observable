const { describe, it } = require('node:test');
const assert = require('node:assert');

const exportContent = require('../../../dist/cjs/index.js');

void describe('Test import cjs', async () => {
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

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCatalogue } from '../../scripts/i18n/check.mjs';
test('all sixteen saved catalogs cover the current owned material and display UI', () => {
  const {errors} = checkCatalogue();
  assert.deepEqual(errors,[]);
});

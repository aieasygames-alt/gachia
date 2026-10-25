import assert from 'node:assert/strict';
import test from 'node:test';
import { validateRepairOrigin } from './backlog-repairs-smoke.mjs';

test('repair smoke only accepts reviewed owners and exact local Worker origins', () => {
  for (const app of ['web', 'game-genshin', 'game-nte']) assert.equal(validateRepairOrigin(app, 'http://127.0.0.1:1234').origin, 'http://127.0.0.1:1234');
  for (const app of ['router', 'game-lvmeng', '', undefined]) assert.throws(() => validateRepairOrigin(app, 'http://127.0.0.1:1234'));
  for (const origin of ['https://gachia.com', 'http://127.0.0.1', 'http://localhost:1234', 'http://127.0.0.1:1234/', 'http://a:b@127.0.0.1:1234', 'http://127.0.0.1:1234?q=x', 'http://127.0.0.1:1234/#x']) assert.throws(() => validateRepairOrigin('web', origin));
});

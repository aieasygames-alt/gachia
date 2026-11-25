import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getPayload } from '../../tools/payload-cms/node_modules/payload/dist/index.js';
import config from '../../tools/payload-cms/payload.config.ts';
import { migrations } from '../../tools/payload-cms/migrations/index.ts';
import { parseStarRailUpdate } from '../../packages/data/cms/starrail-updates.ts';
const payload = await getPayload({ config });
try {
 await payload.db.migrate({ migrations });
 const actual = await payload.find({ collection:'game-updates', draft:false, overrideAccess:false, limit:151 });
 const before = JSON.parse(fs.readFileSync(new URL('./cms-before.json',import.meta.url))).docs;
 const sorted = rows => rows.map(parseStarRailUpdate).sort((a,b)=>a.slug.localeCompare(b.slug));
 assert.deepEqual(sorted(actual.docs), sorted(before));
 console.log(JSON.stringify({status:'passed', schema:'two_nullable_character_columns', recordsUnchanged:actual.docs.length}));
} finally { await payload.destroy(); }

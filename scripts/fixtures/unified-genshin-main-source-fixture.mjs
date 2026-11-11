import assert from 'node:assert/strict';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { artifactFiles } from '../desktop-publish.mjs';
import { digest } from '../desktop-release-assets.mjs';
import { readUnifiedGenshinMainSourceSpec } from '../unified-genshin-main-source.mjs';
import { genshinMainFixture } from './unified-genshin-main-fixture.mjs';
import { sourceFixtureJSON as json, unifiedSourceFixture } from './unified-source-fixture.mjs';

// Synthetic five-owner/115-source inventory, followed by the real four-version
// completion reader. No cloud, CI, installed CMS or historical root is faked as
// verified production qualification by this local protocol fixture.
export async function genshinMainSourceFixture(t, { completionFault, beforeRead } = {}) {
  const s = await unifiedSourceFixture(t, { originalMain: true });
  s.spec.baseline.bindings['gachia-game-genshin'] = [];
  const source = s.spec.sources.find(row => row.sourcePath === 'packages/data/games/fixture-0/raw-characters.json');
  source.sourcePath = 'packages/data/games/genshin/raw-characters.json';
  s.spec.pairs[s.spec.pairs.indexOf('fixture-0/raw-characters.json')] = 'genshin/raw-characters.json';
  source.text = json([{ id: 'fixture', name: 'Previous zh' }]); source.sha256 = digest(source.text);
  const oldJSON = join(s.spec.owners.main.directory, 'assets/data/genshin/raw-characters.json');
  writeFileSync(oldJSON, source.text);
  s.spec.sources.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
  s.spec.owners.main.artifactSHA256 = digest(json(artifactFiles(s.spec.owners.main.directory)));
  const recovery = structuredClone(s.spec.sources), candidate = structuredClone(recovery);
  const changed = candidate.find(row => row.sourcePath === source.sourcePath);
  changed.text = json([{ id: 'fixture', name: 'Approved zh' }]); changed.sha256 = digest(changed.text);
  const candidateArtifacts = {};
  const f = await genshinMainFixture(t, { fault: completionFault, baseline: s.spec.baseline, mainSources: { recovery, candidate },
    captureArtifact: ({ owner, role, rows, rawBodies }) => {
      if (role !== 'candidate') return 'a'.repeat(64);
      const directory = join(s.root, `${owner}-candidate`);
      cpSync(s.spec.owners[owner].directory, directory, { recursive: true });
      writeFileSync(join(directory, 'worker.js'), `unbundled candidate ${owner}`);
      for (const [index, reference] of rows.entries()) {
        if (!reference.path.startsWith('/data/') && !reference.path.endsWith('.js')) continue;
        const file = join(directory, 'assets', reference.path); mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, rawBodies[index]);
      }
      candidateArtifacts[owner] = { directory, artifactSHA256: digest(json(artifactFiles(directory))) };
      return candidateArtifacts[owner].artifactSHA256;
    } });
  if (completionFault) return { ...s, pair: f, candidateArtifacts };
  assert.ifError(f.failure);
  const input = { completed: f.input, priorOwners: s.spec.owners, candidateArtifacts, sealedSources: candidate, pairs: s.spec.pairs, planSHA256: s.spec.planSHA256 };
  await beforeRead?.(input, f);
  const projected = await readUnifiedGenshinMainSourceSpec(input);
  const current = f.current, versions = Object.fromEntries(Object.values(projected.spec.owners).map(row => [row.service, row.version]));
  const calls = [], request = async (url, options) => {
    assert.equal(options.method, 'GET'); calls.push(new URL(url).pathname);
    const path = new URL(url).pathname, owner = f.input.publicReferences.genshin.some(row => row.path === path) ? 'genshin' : 'main';
    const rows = f.input.publicReferences[owner], index = rows.findIndex(row => row.path === path); assert(index >= 0);
    return new Response(readFileSync(join(f.directory, 'public', owner, `${index}.body`)), { status: rows[index].status, headers: rows[index].headers });
  };
  return { root: s.root, save: s.save, spec: projected.spec, projected, input, pair: f, current, versions, request, calls, recovery,
    reader: { snapshot: async () => structuredClone(current), version: async (service, id) => {
      assert.equal(versions[service].id, id); return structuredClone(versions[service]);
    } } };
}

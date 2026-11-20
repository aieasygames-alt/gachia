import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import { gunzipSync } from 'node:zlib';

const repo = resolve(import.meta.dirname, '..');
const report = resolve(repo, 'reports/genshin-media-skills-2026-11-20-r138');
const manifest = JSON.parse(readFileSync(resolve(report, 'media-manifest.json')));
const fixture = JSON.parse(gunzipSync(readFileSync(resolve(repo, 'services/content-cms/reviews/2026-11-20-genshin-completion-r137.json.gz'))));
const require = createRequire(resolve(repo, 'apps/web/package.json'));
const sharp = createRequire(require.resolve('next'))('sharp');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('both canonical images bind the exact avatar ID and API icon, including Ororon/Olorun naming', () => {
  assert.deepEqual(manifest.entries.map(row => [row.localId, row.avatarId, row.sourceIcon]), [
    ['mualani', 10000102, 'UI_AvatarIcon_Mualani'], ['ororon', 10000105, 'UI_AvatarIcon_Olorun'],
  ]);
  for (const entry of manifest.entries) {
    const proof = fixture.evidence.find(row => row.sourcePath === entry.profile.sourcePath);
    assert.equal(sha(proof.text), entry.profile.sha256);
    const avatar = JSON.parse(proof.text).data;
    assert.equal(avatar.id, entry.avatarId); assert.equal(avatar.icon, entry.sourceIcon);
    assert.equal(entry.source.url, `https://gi.yatta.moe/assets/UI/${avatar.icon}.png`);
    assert.equal(entry.url, `https://img.gachia.com/images/genshin/characters/${entry.localId}.webp`);
    assert.equal(entry.ownerPath, `apps/game-genshin/public/images/genshin/characters/${entry.localId}.webp`);
    assert.deepEqual(entry.object, { bucket: 'gachia-images', key: `images/genshin/characters/${entry.localId}.webp` });
  }
});

test('owner assets are bounded WebP files with identical visible source pixels and alpha', async () => {
  const visible = rgba => {
    for (let i = 0; i < rgba.length; i += 4) if (rgba[i + 3] === 0) rgba.fill(0, i, i + 3);
    return rgba;
  };
  for (const entry of manifest.entries) {
    const source = readFileSync(resolve(report, entry.source.path));
    const bytes = readFileSync(resolve(repo, entry.ownerPath));
    assert.equal(sha(source), entry.source.sha256);
    assert.equal(sha(bytes), entry.sha256); assert.equal(bytes.length, entry.bytes);
    assert(bytes.length < 512 * 1024);
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.format, 'webp'); assert.equal(metadata.width, 256); assert.equal(metadata.height, 256);
    assert.equal(metadata.hasAlpha, true);
    assert.equal(sha(visible(await sharp(source).ensureAlpha().raw().toBuffer())),
      sha(visible(await sharp(bytes).ensureAlpha().raw().toBuffer())));
  }
});

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';

const webRequire = createRequire(resolve(import.meta.dirname, '../apps/web/package.json'));
const nextRequire = createRequire(webRequire.resolve('next'));
const sharp = nextRequire('sharp');

test('updated native image toolchain converts synthetic pixels without external files', async () => {
  assert.equal(sharp.versions.sharp, '0.35.5');
  for (const format of ['png', 'webp', 'avif']) {
    const bytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#abcdef' } })
      .toFormat(format).toBuffer();
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.width, 2);
    assert.equal(metadata.height, 2);
    assert.equal(metadata.format, format === 'avif' ? 'heif' : format);
  }
});

test('updated SVG rasterizer handles a bounded synthetic image', async () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="red"/></svg>');
  const result = await sharp(svg).png().toBuffer();
  assert.equal((await sharp(result).metadata()).format, 'png');
});

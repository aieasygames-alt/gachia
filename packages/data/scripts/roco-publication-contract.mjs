import { createHash } from 'node:crypto';
import { readFile, lstat, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

export const ROCO_WITHDRAWAL_RECORD = 'packages/data/roco-publication-resolution.json';
export const ROCO_WITHDRAWAL_ARCHIVE = 'reports/content-integrity/archive/s2-14';
export const ROCO_WITHDRAWN_IMAGES = ['meewee', 'sparka', 'cerulla'];
export const ROCO_RETAINED_CN_IMAGE_PATHS = {
  meewee: 'images/roco-cn/characters/miaomiao.webp',
  sparka: 'images/roco-cn/characters/huohua.webp',
  cerulla: 'images/roco-cn/characters/shuilanlan.webp',
};
const PREVIOUS_HOLDS = {
  'roco/raw-characters.json': 'c726ca7b9fdfab0274fbc4e2689bac07908cbc662020204f157fd567beb537fe',
  'roco/raw-guides.json': '0b2ca41b4e51ea1f6e5b100dca9531795e2962c140d474a0d5de980a75263268',
};
const IDS = ['meewee', 'sparka', 'cerulla', 'blazehound', 'catapawn', 'dustler'];
const ARCHIVE_BYTES = Object.fromEntries(Object.entries({
  'characters.json': 'ba451271d0371cb350460af6f6a30df57a371447604fe1625540c7c0a5b7f595',
  'guides.json': 'd49d85d0c8d8fe51d67d868eafff2503902383698c9f3e32f15feca6c2f74aa2',
  'ledger.json': 'e94af7cff042b90ce25068aa67424e7920e73eac43cdefa43789c8f5eaa98f47',
  'images/meewee.webp': 'eca6eae6d536f2c4f07aeebb5a325531bacfdd7098a232589a693e28eb3ebae6',
  'images/sparka.webp': '137a05e63db6ae59d2083e41eaa3979526b78bec25e0b3a762aa2522e7971110',
  'images/cerulla.webp': '31269f4400c90ff1d976593a833e9ea339e382ef2315474f8e2f11757bfd205c',
}).map(([path, hash]) => [`${ROCO_WITHDRAWAL_ARCHIVE}/${path}`, hash]));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

async function regularFile(root, path) {
  // Evidence must be a real internal file, not a link back into a public root.
  const parts = path.split('/');
  for (let i = 1; i <= parts.length; i++) {
    if ((await lstat(resolve(root, ...parts.slice(0, i)))).isSymbolicLink()) throw Error(`Linked withdrawal evidence: ${path}`);
  }
  if (!(await lstat(resolve(root, path))).isFile()) throw Error(`Invalid withdrawal evidence: ${path}`);
  const bytes = await readFile(resolve(root, path));
  if (ARCHIVE_BYTES[path] && sha(bytes) !== ARCHIVE_BYTES[path]) throw Error(`Withdrawal evidence bytes changed: ${path}`);
  return bytes;
}

export async function checkRocoPublication(root, { ledger, documents, semanticHash }) {
  if (!ledger.pairs.some(path => Object.hasOwn(PREVIOUS_HOLDS, path))) return null;
  const record = JSON.parse(await regularFile(root, ROCO_WITHDRAWAL_RECORD));
  if (record.schemaVersion !== 1 || record.decision !== 'withdrawn_not_verified' ||
      record.reviewDocument !== 'plans/multi-game-s2-14-production-candidate-2026-10-24.md' ||
      !Array.isArray(record.resolutions) || record.resolutions.length !== 2) throw Error('Invalid Roco withdrawal resolution');
  if (!(await regularFile(root, record.reviewDocument)).toString().trim()) throw Error('Empty withdrawal review');
  const previousLedger = JSON.parse(await regularFile(root, `${ROCO_WITHDRAWAL_ARCHIVE}/ledger.json`));
  const resolved = new Set();
  for (const item of record.resolutions) {
    const expectedHash = PREVIOUS_HOLDS[item.path];
    const archivePath = `${ROCO_WITHDRAWAL_ARCHIVE}/${item.path === 'roco/raw-characters.json' ? 'characters' : 'guides'}.json`;
    if (!expectedHash || resolved.has(item.path) || !ledger.pairs.includes(item.path) || item.previousHoldSha256 !== expectedHash ||
        item.archive !== archivePath || !/^[a-f0-9]{64}$/.test(item.activeSha256) ||
        ledger.holds?.some(row => row.path === item.path) || ledger.pending.some(row => row.path === item.path)) throw Error('Invalid or conflicting Roco withdrawal resolution');
    const archived = JSON.parse(await regularFile(root, archivePath));
    if (semanticHash(archived) !== expectedHash || !previousLedger.holds?.some(row => row.path === item.path && row.sourceSha256 === expectedHash && row.mirrorSha256 === expectedHash)) throw Error(`Withdrawal archive changed: ${item.path}`);
    for (const directory of ['packages/data/games', 'apps/web/public/data']) {
      if (semanticHash(documents.get(`${directory}/${item.path}`)) !== item.activeSha256) throw Error(`Withdrawn content changed without review: ${item.path}`);
    }
    resolved.add(item.path);
  }
  const characters = documents.get('packages/data/games/roco/raw-characters.json');
  if (JSON.stringify(characters?.map(row => row.id)) !== JSON.stringify(IDS) || characters.some(row =>
    JSON.stringify(Object.keys(row).sort()) !== '["contentReview","id"]' ||
    JSON.stringify(Object.keys(row.contentReview ?? {}).sort()) !== '["reviewedAt","status"]' ||
    row.contentReview.status !== 'needs_verification' || row.contentReview.reviewedAt !== '2026-10-24')) throw Error('Roco legacy records must contain only URL IDs and review status');
  const guides = documents.get('packages/data/games/roco/raw-guides.json');
  const oldGuides = JSON.parse(await regularFile(root, `${ROCO_WITHDRAWAL_ARCHIVE}/guides.json`));
  if (JSON.stringify(guides?.map(row => row.id)) !== JSON.stringify(oldGuides.map(row => row.id)) ||
      guides.length !== 30 || guides.filter(row => row.contentReview?.kind === 'editorial_proposal_archive').length !== 17 ||
      guides.some(row => row.contentReview?.status !== 'needs_verification' || !row.content || !row.contentEn || !row.contentJa ||
        row.updatedAt !== oldGuides.find(old => old.id === row.id)?.updatedAt)) throw Error('Roco correction/archive publication scope changed');
  if (!Array.isArray(record.assets) || record.assets.length !== 3) throw Error('Missing withdrawn asset evidence');
  for (const id of ROCO_WITHDRAWN_IMAGES) {
    const path = `images/roco/characters/${id}.webp`;
    const asset = record.assets.find(row => row.path === path);
    if (asset?.archive !== `${ROCO_WITHDRAWAL_ARCHIVE}/images/${id}.webp` ||
        sha(await regularFile(root, asset.archive)) !== asset.sha256) throw Error(`Invalid withdrawn image evidence: ${path}`);
    try { await lstat(resolve(root, 'apps/web/public', path)); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    throw Error(`Withdrawn image restored to public: ${path}`);
  }
  const imageDirectory = resolve(root, 'apps/web/public/images/roco/characters');
  try {
    if ((await readdir(imageDirectory)).length) throw Error('Unreviewed Roco character assets in public');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  // The same bytes predate this withdrawal in the independent CN namespace.
  // Preserve those exact paths, but reject renamed global/evidence aliases.
  const publicRoot = resolve(root, 'apps/web/public');
  let files = [];
  try { files = await readdir(publicRoot, { recursive: true, withFileTypes: true }); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const entry of files) {
    if (entry.isSymbolicLink()) throw Error('Linked public withdrawal asset is not supported');
    if (!entry.isFile()) continue;
    const path = resolve(entry.parentPath, entry.name);
    const digest = sha(await readFile(path));
    const image = record.assets.find(row => row.sha256 === digest);
    if (image) {
      const id = image.path.split('/').at(-1).replace('.webp', '');
      if (path !== resolve(publicRoot, ROCO_RETAINED_CN_IMAGE_PATHS[id])) throw Error('Withdrawn image published under another path');
    }
  }
  return { decision: record.decision, resolved: [...resolved], officialFactsApproved: false, archivedImages: 3 };
}

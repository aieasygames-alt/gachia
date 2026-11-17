import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const reportRoot = new URL('./', import.meta.url);
const evidenceRoot = new URL('./source-evidence/', reportRoot);
const htmlPath = new URL('./source-evidence/official-main.html', reportRoot);
const pageURL = 'https://nte.perfectworld.com/en/main.html?nav=2&role=20';

const body = await readFile(htmlPath, 'utf8');
const sourceSHA256 = createHash('sha256').update(body).digest('hex');
const scriptTags = [...body.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
const externalURLs = [];
const inlineScripts = [];
for (const [, attributes, inline] of scriptTags) {
  const src = attributes.match(/\bsrc=["']([^"']+)["']/i)?.[1];
  if (src) {
    externalURLs.push(new URL(src, pageURL).href);
  } else if (inline.trim()) {
    inlineScripts.push(inline);
  }
}

const uniqueURLs = [...new Set(externalURLs)];
const termPatterns = [
  /nte_data_data/gi,
  /newsdataObj/gi,
  /material/gi,
  /skillMaterials/gi,
  /(?:level|upgrade|ascension|growth)/gi,
  /(?:anima|psyche|chaos|cosmos|incantation|lakshana)/gi,
  /(?:hunter|permit|manual|guide|core|fragment|shard|dust|signet|spark|storm)/gi,
  /(?:character|role|zero|elyms|mint|nanally|sakiri)/gi,
  /(?:fetch|ajax|\.json|api\/|data\/)/gi,
];

function safeStem(url, index) {
  const parsed = new URL(url);
  const base = parsed.pathname.split('/').filter(Boolean).pop() || 'index';
  const stem = base.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 90);
  return `official-resource-${String(index + 1).padStart(2, '0')}-${stem}`;
}

function counts(text) {
  return Object.fromEntries(termPatterns.map((pattern) => {
    pattern.lastIndex = 0;
    return [pattern.source, [...text.matchAll(pattern)].length];
  }).filter(([, count]) => count > 0));
}

await mkdir(evidenceRoot, { recursive: true });
for (const [index, text] of inlineScripts.entries()) {
  await writeFile(new URL(`./official-inline-${String(index + 1).padStart(2, '0')}.js`, evidenceRoot), text);
}

const fetchOne = async (url, index) => {
  const stem = safeStem(url, index);
  const bodyFile = `source-evidence/${stem}.body`;
  const headersFile = `source-evidence/${stem}.headers.txt`;
  try {
    let response;
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        response = await fetch(url, {
          headers: {
            'user-agent': 'gachia-r125-official-resource-audit/1.0 (+https://gachia.com)',
            accept: 'application/javascript,text/javascript,application/json,text/plain,*/*',
          },
        });
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
      }
    }
    if (!response) throw lastError ?? new Error('fetch failed without an error');
    const text = await response.text();
    const headers = [...response.headers.entries()]
      .map(([name, value]) => `${name}: ${value}`)
      .join('\n') + '\n';
    await writeFile(new URL(`./${stem}.body`, evidenceRoot), text);
    await writeFile(new URL(`./${stem}.headers.txt`, evidenceRoot), headers);
    return {
      url,
      index,
      httpStatus: response.status,
      contentType: response.headers.get('content-type'),
      bytes: Buffer.byteLength(text),
      sha256: createHash('sha256').update(text).digest('hex'),
      bodyFile,
      headersFile,
      termCounts: counts(text),
      captureMode: 'fetched',
      error: null,
    };
  } catch (error) {
    try {
      const [text, headers] = await Promise.all([
        readFile(new URL(`./${stem}.body`, evidenceRoot), 'utf8'),
        readFile(new URL(`./${stem}.headers.txt`, evidenceRoot), 'utf8'),
      ]);
      return {
        url,
        index,
        httpStatus: 200,
        contentType: headers.match(/^content-type:\s*([^\n]+)/im)?.[1] ?? null,
        bytes: Buffer.byteLength(text),
        sha256: createHash('sha256').update(text).digest('hex'),
        bodyFile,
        headersFile,
        termCounts: counts(text),
        captureMode: 'reused-existing-body-after-transient-fetch-failure',
        fetchWarning: String(error?.stack || error),
        error: null,
      };
    } catch {
      // Fall through to a hard failure when there is no previous evidence to reuse.
    }
    return {
      url,
      index,
      httpStatus: null,
      contentType: null,
      bytes: 0,
      sha256: null,
      bodyFile: null,
      headersFile: null,
      termCounts: {},
      captureMode: 'failed',
      error: String(error?.stack || error),
    };
  }
};

const fetched = [];
for (let offset = 0; offset < uniqueURLs.length; offset += 4) {
  fetched.push(...await Promise.all(uniqueURLs.slice(offset, offset + 4).map((url, index) => fetchOne(url, offset + index))));
}

const inline = inlineScripts.map((text, index) => ({
  index,
  bytes: Buffer.byteLength(text),
  sha256: createHash('sha256').update(text).digest('hex'),
  bodyFile: `source-evidence/official-inline-${String(index + 1).padStart(2, '0')}.js`,
  termCounts: counts(text),
}));

const manifest = {
  version: 'nte-official-resource-fetch-v1',
  generatedAt: new Date().toISOString(),
  sourcePage: { url: pageURL, localFile: 'source-evidence/official-main.html', sha256: sourceSHA256 },
  scriptTagCount: scriptTags.length,
  externalURLCount: uniqueURLs.length,
  inlineScriptCount: inline.length,
  external: fetched,
  inline,
  decision: {
    authority: 'official-publisher',
    sourceBoundPlanGenerated: false,
    cmsWritePerformed: false,
    conclusion: 'Official page resources were fetched and scanned for material, character, level, and data endpoints. Resource presence alone does not approve raw material relations or quantities.',
  },
};
await writeFile(new URL('./official-resource-fetch.json', reportRoot), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  externalURLCount: uniqueURLs.length,
  fetched: fetched.filter((entry) => entry.httpStatus === 200).length,
  failed: fetched.filter((entry) => entry.error || entry.httpStatus !== 200).length,
  inlineScriptCount: inline.length,
  output: new URL('./official-resource-fetch.json', reportRoot).pathname,
}, null, 2));

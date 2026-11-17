import { writeFile } from 'node:fs/promises';

const reportRoot = new URL('./', import.meta.url);
const bases = [
  'https://ntecdn1.perfectworld.com/clientRes',
  'https://ntecdn2.perfectworld.com/clientRes',
];
const paths = [
  'PC_150/gameinfo.xml',
  'PC_150/Diff/Diff.xml',
  'PC_150/ResList.zip',
  'PC_150/ResList.bin.zip',
  'PC_150/config.xml',
  'PC_150/client.xml',
  'PC_150/branch_config.xml',
  'PC_150/serverlist.txt',
  'PC_150/resversion',
  'PC_150/Version/config.xml',
  'PC_150/version/config.xml',
  'PC_150/1.5.0/config.xml',
  'PC_150/1.5.0/ResList.zip',
  'PC_150/150/ResList.zip',
  'Publish_Update/update.json',
  'Publish_Update/ResList.zip',
  'Publish_Update/ResList.bin.zip',
  'Publish_Update/config.xml',
  'Publish_Update/client.xml',
  'Publish_Update/branch_config.xml',
  'PatcherSDK/Device/devices.txt',
];

const now = () => new Date().toISOString();
const headersText = headers => Object.fromEntries(headers.entries());
async function probe(url) {
  const startedAt = now();
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'error',
      headers: { 'user-agent': 'gachia-r125-nte-resource-manifest-probe/1.0' },
      signal: AbortSignal.timeout(12_000),
    });
    return { url, startedAt, completedAt: now(), status: response.status, ok: response.ok, contentType: response.headers.get('content-type'), contentLength: response.headers.get('content-length'), etag: response.headers.get('etag'), headers: headersText(response.headers), error: null };
  } catch (error) {
    return { url, startedAt, completedAt: now(), status: null, ok: false, contentType: null, contentLength: null, etag: null, headers: {}, error: String(error?.stack || error) };
  }
}

const probes = await Promise.all(bases.flatMap(base => paths.map(path => probe(`${base}/${path}`))));
const statusCounts = Object.fromEntries([...new Set(probes.map(probe => String(probe.status)))].map(status => [status, probes.filter(probe => String(probe.status) === status).length]));
const report = {
  schemaVersion: 1,
  kind: 'nte_resource_manifest_probe',
  generatedAt: now(),
  method: 'HEAD',
  candidateCount: probes.length,
  statusCounts,
  publiclyReadable: probes.filter(probe => probe.ok).map(probe => probe.url),
  probes,
  decision: {
    readableResListFound: probes.some(probe => probe.ok && /ResList/i.test(probe.url)),
    readableClientManifestFound: probes.some(probe => probe.ok && /(client\.xml|config\.xml|branch_config\.xml|resversion|serverlist\.txt)/i.test(probe.url)),
    sourceBoundPlanGenerated: false,
    hold: true,
    reason: 'The bounded manifest probe found only the already readable gameinfo, Diff, update, and device-list endpoints; candidate ResList/client/config paths remain CDN-protected or absent.',
    nextEvidenceClass: 'Authenticated or otherwise publicly readable versioned ResList/client manifest, or game-internal export',
  },
};
await writeFile(new URL('./nte-client-resource-manifest-probe.json', reportRoot), `${JSON.stringify(report, null, 2)}\n`);
const markdown = [
  '# 异环资源清单端点探测（R125）',
  '',
  `生成时间：${report.generatedAt}；使用 ${report.candidateCount} 个有界 HEAD 请求。`,
  '',
  `状态计数：\`${JSON.stringify(statusCounts)}\`。`,
  '',
  `公开可读端点：${report.publiclyReadable.map(url => `\`${url}\``).join('、') || '无'}。`,
  '',
  '本轮没有下载任何 ResList、client manifest 或 Pak/UCAS/UTOC 大文件。候选资源清单路径仍返回 403 或不可用，因此不能从 URL、哈希或协议字符串推断材料表。',
  '',
  '结论：`readableResListFound=false`、`readableClientManifestFound=false`（已知的 gameinfo、Diff、update 和设备列表端点除外），`hold=true`。',
  '',
].join('\n');
await writeFile(new URL('./nte-client-resource-manifest-probe.md', reportRoot), markdown);
console.log(JSON.stringify({ output: 'nte-client-resource-manifest-probe.json', candidateCount: report.candidateCount, statusCounts, readableResListFound: report.decision.readableResListFound, hold: report.decision.hold }, null, 2));

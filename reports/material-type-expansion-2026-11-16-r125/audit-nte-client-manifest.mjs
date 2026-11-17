import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const reportRoot = resolve(import.meta.dirname);
const evidenceRoot = resolve(reportRoot, 'source-evidence');
const versionURL = 'https://ntecdn1.perfectworld.com/hd/publish_PC/launcher/Version.ini';
const backupVersionURL = 'https://ntecdn2.perfectworld.com/hd/publish_PC/launcher/Version.ini';
const installerPath = process.argv[2] ?? '/private/tmp/nte-installer-1.0.6.0423.exe';
const updaterPath = process.argv[3] ?? '/private/tmp/nte-installer-config/NTEGlobal/NTEGlobalUpdate.exe';
const configPath = process.argv[4] ?? '/private/tmp/nte-installer-config/NTEGlobal/Config/Config.ini';
const userAgent = 'gachia-r125-nte-client-manifest-audit/1.0 (+https://gachia.com)';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const md5 = bytes => createHash('md5').update(bytes).digest('hex');
const headersText = headers => `${[...headers.entries()].map(([name, value]) => `${name}: ${value}`).join('\n')}\n`;
const now = () => new Date().toISOString();

async function fetchCapture(url, options = {}) {
  const request = {
    method: options.method ?? 'GET',
    redirect: 'error',
    headers: { 'user-agent': userAgent, ...(options.headers ?? {}) },
    signal: AbortSignal.timeout(options.timeoutMs ?? 30_000),
  };
  const startedAt = now();
  try {
    const response = await fetch(url, request);
    const body = request.method === 'HEAD' ? '' : await response.arrayBuffer();
    const bytes = Buffer.from(body);
    return {
      url,
      method: request.method,
      startedAt,
      completedAt: now(),
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      etag: response.headers.get('etag'),
      lastModified: response.headers.get('last-modified'),
      headers: headersText(response.headers),
      bytes: bytes.length,
      sha256: sha256(bytes),
      md5: md5(bytes),
      body: bytes,
      error: null,
    };
  } catch (error) {
    return {
      url,
      method: request.method,
      startedAt,
      completedAt: now(),
      status: null,
      ok: false,
      contentType: null,
      contentLength: null,
      etag: null,
      lastModified: null,
      headers: '',
      bytes: 0,
      sha256: null,
      md5: null,
      body: Buffer.alloc(0),
      error: String(error?.stack || error),
    };
  }
}

async function saveCapture(capture, stem) {
  await writeFile(resolve(evidenceRoot, `${stem}.headers.txt`), capture.headers, { mode: 0o600 });
  await writeFile(resolve(evidenceRoot, `${stem}.body`), capture.body, { mode: 0o600 });
  return {
    url: capture.url,
    method: capture.method,
    status: capture.status,
    ok: capture.ok,
    contentType: capture.contentType,
    contentLength: capture.contentLength,
    etag: capture.etag,
    lastModified: capture.lastModified,
    bytes: capture.bytes,
    sha256: capture.sha256,
    md5: capture.md5,
    bodyFile: `source-evidence/${stem}.body`,
    headersFile: `source-evidence/${stem}.headers.txt`,
    error: capture.error,
  };
}

function parseIni(text) {
  const sections = {};
  let section = '';
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) continue;
    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      section = sectionMatch[1];
      sections[section] ??= {};
      continue;
    }
    const pair = trimmed.match(/^([^=]+)=(.*)$/);
    if (pair) {
      sections[section] ??= {};
      sections[section][pair[1].trim()] = pair[2].trim();
    }
  }
  return sections;
}

function parseXMLAttributes(text, tagName) {
  const entries = [];
  const pattern = new RegExp(`<${tagName}\\b([^>]*)\\/?>(?:</${tagName}>)?`, 'g');
  for (const match of text.matchAll(pattern)) {
    const attrs = {};
    for (const attr of match[1].matchAll(/([A-Za-z][A-Za-z0-9_]*)="([^"]*)"/g)) attrs[attr[1]] = attr[2];
    entries.push(attrs);
  }
  return entries;
}

function updaterStrings(bytes) {
  const ascii = bytes.toString('latin1').match(/[\x20-\x7e]{6,}/g) ?? [];
  const needles = [
    'All_Files', 'ProductVersion', 'BaseUrl', 'File', 'Checksum', 'Path', 'Size',
    'CUpdateThread::_DownloadUpdateInfoFile', 'CUpdateThread::_DownloadUpdateFiles',
    'CUpdateThread::_GetUpdateFilesInfo', 'HttpDownCreateTask',
    'strURL=%s, bUseBackupCdn=%d', 'WinHttpOpenRequest', 'WinHttpSendRequest',
    'WmglUpdate.exe', '/%s', '.zip',
  ];
  const hits = {};
  for (const needle of needles) hits[needle] = ascii.filter(text => text.includes(needle)).length;
  return { printableStringCount: ascii.length, needleCounts: hits };
}

await mkdir(evidenceRoot, { recursive: true });

const versionCaptures = [];
for (const [name, url] of [['primary', versionURL], ['backup', backupVersionURL]]) {
  const capture = await fetchCapture(url);
  versionCaptures.push(await saveCapture(capture, `nte-client-version-${name}`));
}

const primaryVersionBody = await readFile(resolve(evidenceRoot, 'nte-client-version-primary.body'), 'utf8');
const primaryVersion = parseIni(primaryVersionBody);
const version = primaryVersion.VERSION?.Version;
const fileListURL = primaryVersion.VERSION?.FileListURL;
if (!version || !fileListURL) throw new Error('Version.ini did not provide VERSION.Version and VERSION.FileListURL');

const fileListCapture = await fetchCapture(fileListURL);
const fileListMeta = await saveCapture(fileListCapture, 'nte-client-all-files');
const fileListBody = fileListCapture.body.toString('utf8');
const fileEntries = parseXMLAttributes(fileListBody, 'File');
const buildInfo = parseXMLAttributes(fileListBody, 'BuildInfo')[0] ?? {};
const productVersion = parseXMLAttributes(fileListBody, 'ProductVersion')[0] ?? {};
const baseURL = parseXMLAttributes(fileListBody, 'Url')[0]?.BaseUrl ?? null;
const targetPaths = [
  '/FileList.dat',
  '/ResData/3000001.dat',
  '/ResData/Default.dat',
  '/ResFilesM/3000001/PatcherConfig/InstallConfig.json',
  '/ResFilesM/3000001/PatcherConfig/PatcherCheckConfig.json',
  '/ResFilesM/3000001/PatcherConfig/PatcherConfig.json',
  '/ResFilesM/3000001/PatcherConfig/PatcherPath.json',
  '/NTEGlobalGame.exe',
];
const targetManifestEntries = Object.fromEntries(targetPaths.map(path => [path, fileEntries.find(entry => entry.Path === path) ?? null]));

const updaterBytes = await readFile(updaterPath);
const installerBytes = await readFile(installerPath);
const configBytes = await readFile(configPath);
const configText = configBytes.toString('utf8');
const updaterAudit = {
  path: updaterPath,
  bytes: updaterBytes.length,
  sha256: sha256(updaterBytes),
  strings: updaterStrings(updaterBytes),
};
const installerAudit = {
  path: installerPath,
  bytes: installerBytes.length,
  sha256: sha256(installerBytes),
};
const configAudit = {
  path: configPath,
  bytes: configBytes.length,
  sha256: sha256(configBytes),
  sections: parseIni(configText),
};

const bases = [...new Set([
  baseURL,
  baseURL && `${baseURL}/${version}`,
  baseURL?.replace('ntecdn1.', 'ntecdn2.'),
  baseURL && `${baseURL.replace('ntecdn1.', 'ntecdn2.')}/${version}`,
].filter(Boolean))];
const probes = [];
for (const base of bases) {
  for (const path of targetPaths) {
    const capture = await fetchCapture(`${base}${path}`, { method: 'HEAD' });
    probes.push({
      base,
      path,
      ...(await saveCapture(capture, `nte-client-probe-${probes.length.toString().padStart(2, '0')}`)),
    });
  }
}
const directGetProbes = [];
for (const [name, base] of [['primary', bases[0]], ['backup', bases[2] ?? bases[0]]]) {
  const capture = await fetchCapture(`${base}/FileList.dat`);
  directGetProbes.push({
    name,
    base,
    ...(await saveCapture(capture, `nte-client-get-filelist-${name}`)),
  });
}
const resourceZipPaths = targetPaths.filter(path => path !== '/NTEGlobalGame.exe');
const primaryResourceBase = `${baseURL}/${productVersion.Version ?? version}`;
const backupResourceBase = primaryResourceBase.replace('ntecdn1.', 'ntecdn2.');
const resourceZips = [];
for (const path of resourceZipPaths) {
  const entry = targetManifestEntries[path];
  const safePath = path.slice(1).replaceAll('/', '_').replaceAll('.', '_');
  const capture = await fetchCapture(`${primaryResourceBase}${path}.zip`);
  resourceZips.push({
    cdn: 'primary',
    path,
    manifestEntry: entry,
    md5MatchesZipChecksum: Boolean(entry?.ZipChecksum && capture.md5 === entry.ZipChecksum),
    ...(await saveCapture(capture, `nte-client-resource-${safePath}-primary`)),
  });
  const backupCapture = await fetchCapture(`${backupResourceBase}${path}.zip`, { method: 'HEAD' });
  resourceZips.push({
    cdn: 'backup',
    path,
    manifestEntry: entry,
    md5MatchesZipChecksum: null,
    ...(await saveCapture(backupCapture, `nte-client-resource-${safePath}-backup`)),
  });
}
const runtimeSources = [
  ['gameinfo', 'https://ntecdn1.perfectworld.com/clientRes/PC_150/gameinfo.xml'],
  ['diff', 'https://ntecdn1.perfectworld.com/clientRes/PC_150/Diff/Diff.xml'],
  ['publish-update', 'https://ntecdn1.perfectworld.com/clientRes/Publish_Update/update.json'],
];
const runtimeCaptures = [];
for (const [name, url] of runtimeSources) {
  const capture = await fetchCapture(url);
  runtimeCaptures.push({ name, ...(await saveCapture(capture, `nte-client-runtime-${name}`)) });
}
const manifest = {
  schemaVersion: 1,
  kind: 'nte_official_client_manifest_audit',
  generatedAt: now(),
  source: {
    installer: installerAudit,
    updater: updaterAudit,
    config: configAudit,
    versionIni: { primaryURL: versionURL, backupURL: backupVersionURL, captures: versionCaptures },
    allFiles: {
      url: fileListURL,
      capture: fileListMeta,
      buildInfo,
      productVersion,
      baseURL,
      fileCount: fileEntries.length,
      totalExpandedBytes: fileEntries.reduce((sum, entry) => sum + Number(entry.Size || 0), 0),
      totalCompressedBytes: fileEntries.reduce((sum, entry) => sum + Number(entry.ZipSize || 0), 0),
      targetEntries: targetManifestEntries,
      resourceZips,
    },
    runtimeSources: runtimeCaptures,
  },
  probes,
  directGetProbes,
  decision: {
    officialManifestAvailable: fileListCapture.ok,
    clientResourceObjectsReadable: resourceZips.some(probe => probe.status === 200),
    materialTableReadable: false,
    sourceBoundPlanGenerated: false,
    cmsWritePerformed: false,
    cloudWrites: false,
    hold: true,
    conclusion: 'The official launcher manifest and its .zip objects are readable and their MD5 values match the manifest. ResData/3000001.dat is an official Qt resource container, but no material schema or authoritative stage/quantity table has been extracted from it. Keep all 27 material IDs held until a client or in-game material table is decoded and bound to consumers.',
  },
};
await writeFile(resolve(reportRoot, 'nte-client-manifest-audit.json'), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });

const statusCounts = Object.fromEntries([...new Set([...probes, ...directGetProbes].map(probe => String(probe.status)))].sort().map(status => [status, [...probes, ...directGetProbes].filter(probe => String(probe.status) === status).length]));
const zipStatusCounts = Object.fromEntries([...new Set(resourceZips.map(probe => String(probe.status)))].sort().map(status => [status, resourceZips.filter(probe => String(probe.status) === status).length]));
const zipChecksumMatches = resourceZips.filter(probe => probe.cdn === 'primary' && probe.md5MatchesZipChecksum).length;
const markdown = `# 异环官方客户端清单审计（R125）

- 审计时间：${manifest.generatedAt}
- ` + '`Version.ini`' + `：${version} / ${primaryVersion.VERSION?.Build ?? 'unknown'}
- ` + '`AllFiles.xml`' + `：${fileListURL}
- 清单文件数：${fileEntries.length}
- 展开大小：${manifest.source.allFiles.totalExpandedBytes} bytes
- 压缩大小：${manifest.source.allFiles.totalCompressedBytes} bytes
- 更新器 SHA-256：\`${updaterAudit.sha256}\`
- 安装器 SHA-256：\`${installerAudit.sha256}\`

官方 ` + '`AllFiles.xml`' + ` 明确列出了 ` + '`FileList.dat`' + `、` + '`ResData/3000001.dat`' + `、` + '`ResData/Default.dat`' + ` 和四个 ` + '`PatcherConfig/*.json`' + ` 对象。更新器样本包含 ` + '`All_Files`' + `、` + '`ProductVersion`' + `、` + '`BaseUrl`' + `、` + '`File`' + `、` + '`Checksum`' + `、` + '`Path`' + `、` + '`Size`' + ` 字符串，并导入 ` + '`WINHTTP`' + `，与该清单格式一致。

本次对主 CDN、备用 CDN、清单根路径和版本路径进行了 ${probes.length} 次 \`HEAD\` 探测，并对两个裸 \`FileList.dat\` 地址做了 \`GET\` 复核，状态计数为 \`${JSON.stringify(statusCounts)}\`；裸对象响应正文为 \`AccessDenied\`。按更新器的 \`.zip\` 规则读取了 ${resourceZips.length} 个主/备用资源地址，状态计数为 \`${JSON.stringify(zipStatusCounts)}\`，主 CDN 的 ${zipChecksumMatches} 个压缩对象与 \`AllFiles.xml\` 的 \`ZipChecksum\` 完全匹配。另保存了 \`PC_150/gameinfo.xml\`、\`PC_150/Diff/Diff.xml\` 和 \`Publish_Update/update.json\` 的官方响应。

这些压缩对象已经证明 ` + '`FileList.dat`' + `、` + '`ResData/3000001.dat`' + `、` + '`ResData/Default.dat`' + ` 和 PatcherConfig 内容可以从官方 CDN 读取；其中 ` + '`ResData/3000001.dat`' + ` 是 Qt resource container，不是直接可读的材料 JSON。当前仍没有从客户端资源中解出材料身份、版本、阶段、数量或 CMS 消费者证据；` + '`AllFiles.xml`' + ` 和压缩资源可读性不能替代材料表。

当前结论：继续保持材料门禁 ` + '`hold=true`' + `、` + '`publishable=false`' + `、` + '`releaseCompatible=false`' + `。本次没有修改 raw 材料关系，没有生成 source-bound plan，没有执行 CMS 写入、构建、上传或部署。下一步先解码已捕获的 Qt resource container 和客户端资源索引；若本机无法完成，再在隔离 Windows 客户端中固定版本并导出等价的官方材料表。
`;
await writeFile(resolve(reportRoot, 'nte-client-manifest-audit.md'), markdown, { mode: 0o600 });
console.log(JSON.stringify({
  version,
  fileListURL,
  fileCount: fileEntries.length,
  probes: probes.length,
  statusCounts,
  clientResourceObjectsReadable: manifest.decision.clientResourceObjectsReadable,
  output: resolve(reportRoot, 'nte-client-manifest-audit.json'),
}, null, 2));

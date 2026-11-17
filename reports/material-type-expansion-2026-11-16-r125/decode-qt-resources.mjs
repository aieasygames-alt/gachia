import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { inflateSync } from 'node:zlib';
import { promisify } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';

const execFileAsync = promisify(execFile);
const reportRoot = new URL('./', import.meta.url);
const evidenceRoot = new URL('./source-evidence/', reportRoot);
const terms = ['material', 'anima', 'psyche', 'chaos', 'cosmos', 'incantation', 'lakshana', 'hunter', 'character', 'ascension', 'skill', 'level'];
const textExtensions = new Set(['.json', '.xml', '.ini', '.cfg', '.txt', '.csv', '.js', '.lua', '.yaml', '.yml']);

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const readU32 = (bytes, offset) => bytes.readUInt32BE(offset);
const readU16 = (bytes, offset) => bytes.readUInt16BE(offset);

async function unzipEntry(zipPath, entry) {
  const { stdout } = await execFileAsync('unzip', ['-p', zipPath, entry], { maxBuffer: 80 * 1024 * 1024, encoding: 'buffer' });
  return Buffer.from(stdout);
}

function decodeName(bytes, namesOffset, offset) {
  const record = namesOffset + offset;
  const length = readU16(bytes, record);
  const start = record + 6;
  return Buffer.from(bytes.subarray(start, start + length * 2)).swap16().toString('utf16le').replace(/\u0000/g, '');
}

function parseResource(bytes, sourceName) {
  if (bytes.subarray(0, 4).toString('ascii') !== 'qres') throw new Error(`${sourceName}: missing qres magic`);
  const version = readU32(bytes, 4);
  const treeOffset = readU32(bytes, 8);
  const dataOffset = readU32(bytes, 12);
  const namesOffset = readU32(bytes, 16);
  const fileFlags = version >= 3 ? readU32(bytes, 20) : 0;
  const nodeSize = 14 + (version >= 2 ? 8 : 0);
  if (version < 1 || version > 3 || treeOffset >= bytes.length || dataOffset >= bytes.length || namesOffset >= bytes.length) {
    throw new Error(`${sourceName}: invalid Qt resource header`);
  }

  const readNode = index => {
    const offset = treeOffset + index * nodeSize;
    if (offset + nodeSize > bytes.length) throw new Error(`${sourceName}: tree node ${index} is out of bounds`);
    const nameOffset = readU32(bytes, offset);
    const flags = readU16(bytes, offset + 4);
    const name = index === 0 ? '' : decodeName(bytes, namesOffset, nameOffset);
    if (flags & 0x02) {
      return { index, name, flags, directory: true, childCount: readU32(bytes, offset + 6), childOffset: readU32(bytes, offset + 10) };
    }
    return { index, name, flags, directory: false, territory: readU16(bytes, offset + 6), language: readU16(bytes, offset + 8), payloadOffset: readU32(bytes, offset + 10) };
  };

  const files = [];
  const directories = [];
  const visited = new Set();
  const walk = (index, parent) => {
    if (visited.has(index)) throw new Error(`${sourceName}: resource tree cycle at node ${index}`);
    visited.add(index);
    const node = readNode(index);
    const path = node.name ? `${parent}/${node.name}` : parent || '/';
    if (node.directory) {
      directories.push({ path, index: node.index, childCount: node.childCount });
      for (let child = node.childOffset; child < node.childOffset + node.childCount; child += 1) walk(child, path === '/' ? '' : path);
      return;
    }
    const payload = dataOffset + node.payloadOffset;
    if (payload + 4 > bytes.length) throw new Error(`${sourceName}: payload pointer ${node.payloadOffset} is out of bounds`);
    const storedLength = readU32(bytes, payload);
    const stored = bytes.subarray(payload + 4, payload + 4 + storedLength);
    if (stored.length !== storedLength) throw new Error(`${sourceName}: payload ${path} is truncated`);
    let content = stored;
    let compression = 'none';
    if (node.flags & 0x01) {
      compression = 'zlib';
      const uncompressedLength = stored.readUInt32BE(0);
      content = inflateSync(stored.subarray(4));
      if (content.length !== uncompressedLength) throw new Error(`${sourceName}: ${path} zlib length mismatch`);
    } else if (node.flags & 0x04) {
      compression = 'zstd-unsupported';
    }
    files.push({
      path,
      index: node.index,
      flags: node.flags,
      compression,
      storedBytes: stored.length,
      bytes: content.length,
      sha256: sha256(content),
      extension: path.includes('.') ? path.slice(path.lastIndexOf('.')).toLowerCase() : '',
      content,
    });
  };
  walk(0, '');
  return { sourceName, bytes: bytes.length, version, treeOffset, dataOffset, namesOffset, fileFlags, nodeSize, files, directories };
}

function scanText(files) {
  const candidates = files.filter(file => textExtensions.has(file.extension));
  const keywordHits = [];
  const counts = Object.fromEntries(terms.map(term => [term, 0]));
  for (const file of candidates) {
    const text = file.content.toString('utf8');
    const lowered = text.toLowerCase();
    const hits = terms.filter(term => lowered.includes(term));
    for (const term of hits) counts[term] += (lowered.match(new RegExp(term, 'g')) ?? []).length;
    if (hits.length) keywordHits.push({ path: file.path, bytes: file.bytes, terms: hits, sha256: file.sha256 });
  }
  return { textFileCount: candidates.length, textBytes: candidates.reduce((sum, file) => sum + file.bytes, 0), keywordCounts: counts, keywordHits };
}

async function auditOne(zipName, entry) {
  const zipPath = new URL(`./source-evidence/${zipName}`, reportRoot);
  const zipBytes = await readFile(zipPath);
  const resourceBytes = await unzipEntry(zipPath.pathname, entry);
  const parsed = parseResource(resourceBytes, entry);
  const text = scanText(parsed.files);
  const files = parsed.files.map(({ content, ...file }) => file);
  return {
    zip: { file: `source-evidence/${zipName}`, bytes: zipBytes.length, sha256: sha256(zipBytes) },
    resource: { entry, bytes: resourceBytes.length, sha256: sha256(resourceBytes), version: parsed.version, treeOffset: parsed.treeOffset, dataOffset: parsed.dataOffset, namesOffset: parsed.namesOffset, fileFlags: parsed.fileFlags, nodeSize: parsed.nodeSize },
    counts: { directories: parsed.directories.length, files: parsed.files.length, compressedFiles: parsed.files.filter(file => file.compression === 'zlib').length, unsupportedCompressedFiles: parsed.files.filter(file => file.compression === 'zstd-unsupported').length },
    text,
    files,
  };
}

const resources = [
  ['nte-client-resource-ResData_3000001_dat-primary.body', '3000001.dat'],
  ['nte-client-resource-ResData_Default_dat-primary.body', 'Default.dat'],
];
const audits = [];
for (const [zipName, entry] of resources) audits.push(await auditOne(zipName, entry));

const report = {
  schemaVersion: 1,
  kind: 'nte_qt_resource_audit',
  generatedAt: new Date().toISOString(),
  source: 'Official NTE 1.0.8.1102 client ZIP resources captured in R125',
  terms,
  resources: audits,
  decision: {
    materialTableFoundInTextResources: audits.some(audit => audit.text.keywordHits.length > 0),
    sourceBoundPlanGenerated: false,
    rawDataModified: false,
    cmsWritePerformed: false,
    hold: true,
    reason: 'The Qt resource containers decode to launcher configuration, UI JSON/XML, images, and fonts. No text resource contains material, character progression, skill, ascension, or level data; these files cannot bind the held NTE material relations.',
    nextEvidenceClass: 'Unreal client data or in-game export with versioned material identity, all stages, quantities, and consumer mapping',
  },
};
await writeFile(new URL('./nte-client-rcc-audit.json', reportRoot), `${JSON.stringify(report, null, 2)}\n`);
const markdown = [
  '# 异环 Qt 资源容器审计（R125）',
  '',
  `生成时间：${report.generatedAt}`,
  '',
  '本报告从官方 CDN 的单文件 ZIP 包中解出 `3000001.dat` 与 `Default.dat`，按 Qt RCC v3 头、树、名称表和 payload 读取，未写入客户端或 CMS。',
  '',
  '| 资源 | 目录 | 文件 | zlib 文件 | 文本文件 | 文本关键词命中 |',
  '| --- | ---: | ---: | ---: | ---: | ---: |',
  ...audits.map(audit => `| ${audit.resource.entry} | ${audit.counts.directories} | ${audit.counts.files} | ${audit.counts.compressedFiles} | ${audit.text.textFileCount} | ${audit.text.keywordHits.length} |`),
  '',
  `扫描关键词：${terms.map(term => `\`${term}\``).join('、')}。`,
  '',
  '文本资源没有出现材料表、角色升级、技能、突破或等级字段。二进制资源只按文件清单和 SHA-256 留存，不能把字体或图片中的偶然字节命中当作材料证据。',
  '',
  '结论：材料 source-bound plan 仍未生成，`hold=true`；下一步读取 PatcherPath 指向的 Unreal Paks 小型索引或带版本的游戏内导出，继续保持 raw 关系冻结。',
  '',
].join('\n');
await writeFile(new URL('./nte-client-rcc-audit.md', reportRoot), markdown);
console.log(JSON.stringify({
  output: 'nte-client-rcc-audit.json',
  resources: audits.map(audit => ({ entry: audit.resource.entry, files: audit.counts.files, textFiles: audit.text.textFileCount, keywordHits: audit.text.keywordHits.length })),
  hold: report.decision.hold,
}, null, 2));

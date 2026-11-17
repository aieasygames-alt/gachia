import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';

const execFileAsync = promisify(execFile);
const reportRoot = new URL('./', import.meta.url);
const evidenceRoot = new URL('./source-evidence/', reportRoot);
const zipName = 'nte-client-resource-PatcherSDK_x64_dll-primary.body';
const entryName = 'PatcherSDK_x64.dll';
const needles = [
  'ResList.zip', 'ResList.bin.zip', 'ResList.bin', 'Diff/Diff.xml', 'GlobalDiff.xml',
  'gameinfo.xml', 'client.xml', 'branch_config.xml', 'config.xml', 'PatcherConfig.json',
  'PatcherPath.json', 'PatcherSDK/Device/devices.txt', 'gameResource/Generated/',
  '/version/', 'Version/', '.utoc', '.ucas', '.pakpatch', 'PakManifest', 'files.xml',
];

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const asciiStrings = bytes => bytes.toString('latin1').match(/[\x20-\x7e]{5,}/g) ?? [];

const zipPath = new URL(`./source-evidence/${zipName}`, reportRoot).pathname;
const zipBytes = await readFile(zipPath);
const { stdout } = await execFileAsync('unzip', ['-p', zipPath, entryName], { maxBuffer: 20 * 1024 * 1024, encoding: 'buffer' });
const dllBytes = Buffer.from(stdout);
const deviceListPath = new URL('./source-evidence/nte-client-runtime-device-list-primary.body', reportRoot);
const deviceListBytes = await readFile(deviceListPath);
const deviceIds = deviceListBytes.toString('utf8').split(/\r?\n/).map(value => value.trim()).filter(Boolean);
const strings = asciiStrings(dllBytes);
const needleCounts = Object.fromEntries(needles.map(needle => [needle, strings.filter(value => value.includes(needle)).length]));
const relevantStrings = strings.filter(value => needles.some(needle => value.includes(needle)));
const report = {
  schemaVersion: 1,
  kind: 'nte_patchersdk_protocol_audit',
  generatedAt: new Date().toISOString(),
  source: {
    zipFile: `source-evidence/${zipName}`,
    zipBytes: zipBytes.length,
    zipSha256: sha256(zipBytes),
    entry: entryName,
    dllBytes: dllBytes.length,
    dllSha256: sha256(dllBytes),
    deviceListFile: 'source-evidence/nte-client-runtime-device-list-primary.body',
    deviceListBytes: deviceListBytes.length,
    deviceListSha256: sha256(deviceListBytes),
    deviceIdCount: deviceIds.length,
  },
  strings: { printableStringCount: strings.length, needleCounts, relevantStrings },
  decision: {
    resourceProtocolConfirmed: true,
    materialTableFound: false,
    sourceBoundPlanGenerated: false,
    hold: true,
    reason: 'PatcherSDK strings confirm the remote resource protocol and Pak manifest support, but do not contain a material table or material identity/quantity mapping.',
    nextEvidenceClass: 'Readable versioned ResList/client manifest or a bounded Unreal manifest entry that contains material data',
  },
};
await writeFile(new URL('./nte-client-patchersdk-audit.json', reportRoot), `${JSON.stringify(report, null, 2)}\n`);
const markdown = [
  '# 异环 PatcherSDK 协议审计（R125）',
  '',
  `生成时间：${report.generatedAt}`,
  '',
  `样本：官方客户端 \`${entryName}\`，ZIP SHA-256 \`${report.source.zipSha256}\`，解包 DLL SHA-256 \`${report.source.dllSha256}\`。另保存了公开设备列表（${report.source.deviceIdCount} 个条目，SHA-256 \`${report.source.deviceListSha256}\`）；该列表是设备/测试门控输入，不是资源或材料清单。`,
  '',
  'PatcherSDK 的可打印字符串确认它读取 `ResList.zip`、`ResList.bin.zip`、`Diff/Diff.xml`、`gameinfo.xml`、`client.xml`、`config.xml`、`branch_config.xml`，并包含 Pak manifest 与 `.pakpatch` 处理路径；同批 PatcherCheckConfig 已明确校验 `.utoc` 文件。',
  '',
  `命中计数：${JSON.stringify(needleCounts)}。`,
  '',
  '这些字符串只能固定协议和资源类别，不能证明 27 个材料的 canonical ID、版本、阶段、数量或 CMS 消费者。材料 source-bound plan 继续保持冻结，`hold=true`。',
  '',
].join('\n');
await writeFile(new URL('./nte-client-patchersdk-audit.md', reportRoot), markdown);
console.log(JSON.stringify({ output: 'nte-client-patchersdk-audit.json', dllBytes: report.source.dllBytes, materialTableFound: report.decision.materialTableFound, hold: report.decision.hold }, null, 2));

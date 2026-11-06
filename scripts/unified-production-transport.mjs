import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { desktopCloudSnapshot } from './desktop-cloud-release.mjs';
import { assertUploadedVersion, assertUploadMetadata, multipartModule } from './desktop-cloud-transport.mjs';
import { digest } from './desktop-release-assets.mjs';
import { isolatedEnvironment } from './desktop-publish.mjs';
import { verifyUnifiedTool, unifiedRuntimeConfig, unifiedTransportTarget } from './unified-cloud-module.mjs';
import { captureUnifiedUploadedModule, readUnifiedVersion, revalidateUnifiedUploadedModule } from './unified-version-identity.mjs';
import { exactUnifiedPreviewOrigin, recheckUnifiedPreview, unifiedPreviewReferences, verifyUnifiedVersionPreview } from './unified-version-preview.mjs';

const ACCOUNT = 'e6472b6c6172a3ac1e1596ef100543ae';
const save = (file, value) => {
  const text = JSON.stringify(value, null, 2) + '\n'; writeFileSync(file, text, { flag: 'wx', mode: 0o600 }); return digest(text);
};

// Synchronous evidence traversal can outlive a server's keepalive timeout.
// Use independent GET connections, without retrying any request or write.
export async function unifiedProductionRead(input, options) {
  assert.equal(options?.method, 'GET', 'Production reader cannot write');
  const headers = new Headers(options.headers); headers.set('connection', 'close');
  try { return await fetch(input, { ...options, headers }); }
  catch (cause) {
    const target = new URL(input);
    throw new Error(`Production read failed: ${target.origin}${target.pathname}`, { cause });
  }
}

export function unifiedUploadArguments(config, environment, outfile) {
  assert(typeof environment === 'string');
  return ['versions', 'upload', '--no-bundle', '--config', config, '--env', environment, '--outfile', outfile];
}

export function unifiedUploadResponse(output, service) {
  const matches = [...output.matchAll(/Worker Version ID:\s*([a-f0-9-]{36})/g)];
  assert.equal(matches.length, 1, 'Unknown upload result; reconcile, never retry');
  const versionId = matches[0][1];
  assert(output.includes(`Version Preview URL: ${exactUnifiedPreviewOrigin(service, versionId)}`), 'Missing exact unified preview URL');
  return { versionId };
}

// Internal fixed adapter. Only the desktop production wrapper supplies verified
// evidence; the CLI cannot replace fetch, verification, or any write operation.
export function unifiedProductionTransport({ evidence, token, directory }) {
  assert(typeof token === 'string' && token.length > 0, 'Cloudflare credential required');
  const { transport, baseline, build } = evidence;
  const rowFor = ({ owner, role, service, row }) => {
    assert(['candidate', 'recovery'].includes(role) && evidence.scope.uploadOwners.includes(owner));
    const expected = evidence.value.owners[owner][role]; assert.equal(service, evidence.value.owners[owner].service); assert.deepEqual(row, expected);
    return { sealed: transport.receipt.owners[owner][role], path: join(transport.directory, owner, role),
      target: unifiedTransportTarget(owner, readFileSync(join(build, 'source/apps', owner === 'main' ? 'web' : `game-${owner}`, 'wrangler.jsonc'), 'utf8')) };
  };
  const readVersion = (service, versionId) => readUnifiedVersion({ service, versionId, token, request: unifiedProductionRead });
  const context = (role, row) => ({ role, transportPin: evidence.value.transportPin, configPin: row.configPin });
  const proofDirectory = (owner, role) => join(directory, `${role}-${owner}`);
  return {
    snapshot: () => desktopCloudSnapshot(token, unifiedProductionRead, { allowSplit: true }),
    upload: async args => {
      const { sealed, path, target } = rowFor(args), tool = transport.receipt.tool;
      verifyUnifiedTool(tool);
      const configPath = join(path, 'upload.json'), raw = readFileSync(configPath);
      assert.equal(digest(raw), sealed.uploadConfigPin);
      assert.equal(digest(readFileSync(join(path, 'module/worker.js'))), sealed.moduleSHA256);
      const outputDir = proofDirectory(args.owner, args.role); mkdirSync(outputDir, { mode: 0o700 });
      const home = join(outputDir, 'home'); mkdirSync(home, { mode: 0o700 });
      const outfile = join(outputDir, 'uploaded.multipart'), log = join(outputDir, 'upload.log');
      const command = unifiedUploadArguments(configPath, target.environment, outfile);
      save(join(outputDir, 'invocation.json'), { executable: process.execPath, args: command, credentials: true, trafficMutation: false });
      let output;
      try {
        output = execFileSync(process.execPath, [tool.bin, ...command], { cwd: outputDir,
          env: isolatedEnvironment(home, { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: ACCOUNT,
            WRANGLER_HIDE_BANNER: 'true', WRANGLER_SEND_ERROR_REPORTS: 'false' }),
          timeout: 300000, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
        writeFileSync(log, output, { flag: 'wx', mode: 0o600 });
      } catch (error) {
        writeFileSync(log, Buffer.concat([error.stdout ?? Buffer.alloc(0), error.stderr ?? Buffer.alloc(0)]), { flag: 'wx', mode: 0o600 });
        throw Error(`Unified upload stopped; no retry. See ${log}`);
      }
      return unifiedUploadResponse(output.toString(), args.service);
    },
    inspect: async args => {
      const { path, target } = rowFor(args), outputDir = proofDirectory(args.owner, args.role);
      const outfile = join(outputDir, 'uploaded.multipart'), form = await multipartModule(readFileSync(outfile));
      assert.equal(form.moduleSHA256, args.row.moduleSHA256);
      assertUploadMetadata(form.metadata, unifiedRuntimeConfig(target));
      const version = await readVersion(args.service, args.versionId);
      assertUploadedVersion(version, args.versionId, unifiedRuntimeConfig(target), baseline.bindings[args.service]);
      const moduleProof = await captureUnifiedUploadedModule({ service: args.service, versionId: args.versionId,
        moduleSHA256: args.row.moduleSHA256, context: context(args.role, args.row), directory: join(outputDir, 'module'),
        uploadPath: outfile, uploadLogPath: join(outputDir, 'upload.log'), expectedVersion: version, readVersion,
        readContent: (service, versionId) => readUnifiedVersion({ service, versionId, token, binary: true, request: unifiedProductionRead }) });
      const versionPin = save(join(outputDir, 'version.json'), version);
      assert.equal(digest(readFileSync(join(path, 'upload.json'))), args.row.configPin);
      return { moduleSHA256: form.moduleSHA256, moduleProof, versionPin };
    },
    preview: async args => {
      const { path, sealed } = rowFor(args), http = join(path, 'http');
      const raw = readFileSync(join(http, 'references.json')); assert.equal(digest(raw), sealed.referencesPin);
      const references = unifiedPreviewReferences(JSON.parse(raw), (row, index) => {
        assert.equal(row.bodyFile, `${index}.body`); return readFileSync(join(http, row.bodyFile));
      });
      const output = join(proofDirectory(args.owner, args.role), 'http');
      const proof = await verifyUnifiedVersionPreview({ service: args.service, versionId: args.versionId, references, directory: output });
      recheckUnifiedPreview(output, proof.evidenceSHA256, { service: args.service, versionId: args.versionId, references });
      return proof;
    },
    revalidate: async args => {
      rowFor(args);
      await revalidateUnifiedUploadedModule({ proof: args.inspected.moduleProof, service: args.service, versionId: args.versionId,
        moduleSHA256: args.row.moduleSHA256, context: context(args.role, args.row), readVersion });
    },
  };
}

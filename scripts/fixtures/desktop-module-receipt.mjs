import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { digest } from '../desktop-release-assets.mjs';
import { captureUploadedModule } from '../desktop-version-provenance.mjs';
import { exactPreviewOrigin } from '../desktop-version-preview.mjs';

export async function moduleReceipt({ directory, service, version, code, bytes, role = 'candidate', releaseKey, configSHA256 }) {
  const path = join(directory, 'outbound.multipart'); writeFileSync(path, bytes);
  const uploadLogPath = join(directory, 'upload.log');
  writeFileSync(uploadLogPath, `Worker Version ID: ${version.id}\nVersion Preview URL: ${exactPreviewOrigin(service, version.id)}\n`);
  return captureUploadedModule({ service, versionId: version.id, moduleSHA256: digest(code), context: { role, releaseKey, configSHA256 },
    directory: join(directory, 'module-proof'), uploadPath: path, uploadLogPath, readVersion: async () => structuredClone(version),
    readContent: async () => ({ archive: bytes, etag: `"${version.resources.script.etag}"` }) });
}

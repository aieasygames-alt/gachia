import { lstatSync, realpathSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { readBoundedFile } from './bounded-file.mjs';

// Deliberately never opens ~/.docker/config.json or TLS material, or executes CLI.
export function discoverMacRuntime({ home = homedir(), platform = process.platform } = {}) {
  const report = { version: 'mac-runtime-discovery-v1', checkedAt: new Date().toISOString(), platform,
    scope: 'fixed_paths_and_context_meta_only', applications: [], executables: [], contexts: [], issues: [],
    daemonConnected: false, runtimeVerified: false, capabilities: { install: false, connect: false, execute: false, publish: false },
    notCovered: ['Other install locations or runtimes', 'Code signatures, versions, license suitability and executable trust',
      'Active context, daemon/socket identity, VM startup and path mapping', 'Isolation or resource enforcement'] };
  if (platform !== 'darwin') { report.status = 'unsupported_platform'; return report; }
  function probe(path, kind) {
    try {
      const stat = lstatSync(path);
      return { path, status: 'candidate_present', symlink: stat.isSymbolicLink(),
        expectedType: kind === 'app' ? stat.isDirectory() : stat.isFile() || stat.isSymbolicLink(), verified: false };
    } catch (error) { return { path, status: error.code === 'ENOENT' ? 'not_found_at_path' : 'unreadable', verified: false }; }
  }
  for (const path of ['/Applications/Docker.app', join(home, 'Applications/Docker.app')]) report.applications.push(probe(path, 'app'));
  for (const path of ['/usr/local/bin/docker', '/opt/homebrew/bin/docker', '/Applications/Docker.app/Contents/Resources/bin/docker',
    join(home, '.docker/bin/docker')]) report.executables.push(probe(path, 'cli'));
  const directory = join(home, '.docker/contexts/meta');
  try {
    if (realpathSync(directory) !== directory || !lstatSync(directory).isDirectory()) throw new Error('unsafe_context_directory');
    const names = readdirSync(directory).sort();
    if (names.length > 32) report.issues.push('context_inventory_truncated');
    for (const name of names.slice(0, 32)) {
      if (!/^[a-f0-9]{64}$/.test(name)) { report.issues.push('unsupported_context_entry'); continue; }
      const parent = join(directory, name); const path = join(parent, 'meta.json');
      try {
        if (realpathSync(parent) !== parent || realpathSync(path) !== path) throw new Error('unsafe_context_path');
        const before = lstatSync(path);
        if (!before.isFile() || before.size > 16384 || before.nlink !== 1) throw new Error('context_file_budget_or_type');
        const bytes = readBoundedFile(path, 16384); const after = lstatSync(path);
        if (before.dev !== after.dev || before.ino !== after.ino || after.nlink !== 1) throw new Error('context_changed');
        const data = JSON.parse(bytes.toString('utf8')); const endpoint = data?.Endpoints?.docker?.Host;
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('invalid_context_mapping');
        // Return classifications only: remote URLs and arbitrary context names may contain secrets.
        const expectedSocket = `unix://${join(home, '.docker/run/docker.sock')}`;
        report.contexts.push({ id: name, nameClass: data.Name === 'desktop-linux' ? 'desktop-linux' : 'other_redacted',
          endpointClass: endpoint === expectedSocket ? 'user_desktop_socket_candidate' : endpoint === 'unix:///var/run/docker.sock' ? 'system_socket_candidate' : 'unsupported_redacted',
          verified: false });
      } catch { report.issues.push('context_metadata_rejected'); }
    }
  } catch (error) { report.issues.push(error.code === 'ENOENT' ? 'context_metadata_not_found' : 'context_metadata_unreadable_or_unsafe'); }
  report.status = report.applications.some((item) => item.status === 'candidate_present') || report.executables.some((item) => item.status === 'candidate_present')
    ? 'candidates_unverified' : 'not_found_in_fixed_scope';
  return report;
}

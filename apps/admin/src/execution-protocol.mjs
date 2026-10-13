import { createHash } from 'node:crypto';

export const targetExecutionBudget = Object.freeze({ memoryMiB: 2048, cpus: 2, pids: 128, tempMiB: 1024, lifetimeMs: 600000 });

// Placeholders deliberately cannot be submitted to a runtime as a launch command.
export function executionLaunchProtocol() {
  const protocol = { version: 'isolated-launch-protocol-v1', status: 'specification_only',
    targetBudget: { ...targetExecutionBudget }, effectiveLimits: null,
    profiles: {
      docker_linux_system: { parameterTemplate: ['create', '--pull=never', '--read-only', '--user=10001:10001',
        '--cap-drop=ALL', '--security-opt=no-new-privileges', '--memory=2048m', '--memory-swap=2048m',
        '--cpus=2', '--pids-limit=128', '--ulimit=core=0:0', '--log-driver=none', '--network=none',
        '--tmpfs=/tmp:rw,noexec,nosuid,nodev,size=1073741824,mode=1777',
        '--mount=type=bind,src=<VERIFIED_FROZEN_SOURCE>,dst=/workspace,readonly',
        '--workdir=/workspace/apps/web', '--env=NODE_ENV=production', '--env=HOME=/tmp',
        '--entrypoint=/usr/local/bin/node', '<VERIFIED_PLATFORM_IMAGE_DIGEST>',
        '/workspace/apps/web/node_modules/next/dist/bin/next', 'start', '--hostname', '0.0.0.0', '--port', '3000'],
        supportedNow: false, purpose: 'offline_probe_template_not_browser_preview' },
      podman_linux_system: { parameterTemplate: null, supportedNow: false,
        reason: 'Docker flags are not assumed equivalent; backend/version-specific budgets and mount semantics require validation' },
    },
    inputRequirements: ['Current accepted review and material/plan/lock bindings',
      'Trusted platform-specific immutable image and prebuilt application with Linux dependency artifacts',
      'Frozen copy in private verified staging, ordinary files only; runtime socket, database, Git and home never mounted',
      'Workspace node_modules must come from verified Linux artifacts, not host installation',
      'Explicit independent authorization and active owner/attempt lease',
      'Bind source resolution and daemon-side path ownership must be verified immediately before creation'],
    settingsComparison: { version: 'runtime-settings-comparison-v1', backend: 'docker_only', resultMeaning: 'metadata_claims_not_enforcement',
      stagingPathProfile: '/run/gachia-staging/<uuid>', sourceTrustVerified: false, missingFields: 'reject',
      parserOverallStatus: 'blocked_unless_identity_and_settings_claims_match_still_unverified' },
    lifecycle: ['Persist launch intent before create', 'Create only; persist full returned instance identity before start',
      'Inspect actual settings and identity; mismatch or uncertain output retains slot for reconciliation',
      'Start only after verified policy and independent authorization; no automatic fallback',
      'Trusted controller enforces 600000ms deadline across restart; no CLI flag alone guarantees lifetime',
      'Stop and reinspect exact instance plus descendants/mount/network cleanup before trusted release'],
    unresolved: ['Network none is only an offline probe; no port publishing or browser access is specified',
      'Browser preview needs a separately verified internal-network/loopback proxy topology',
      'Read-only root plus /tmp does not provision writable .next/cache; prebuilt image/cache design remains pending',
      'Single tmpfs target budget is not a total disk quota; runtime metadata, logs and writable mounts require separate bounds',
      'Cgroup memory/swap/CPU/PID enforcement, non-root permissions and default seccomp require actual inspection and stress tests',
      'Daemon/executable trust, Docker/Podman versions, Mac VM integration and private staging are unverified',
      'No actual authorization gate, runner, artifact preparer, hard deadline or verified stop/release adapter exists'],
    capabilities: { generateCommand: false, create: false, start: false, prepare: false, execute: false, stop: false, release: false, publish: false } };
  return { ...protocol, digest: createHash('sha256').update(JSON.stringify(protocol)).digest('hex') };
}

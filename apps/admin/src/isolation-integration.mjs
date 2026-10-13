import { createHash } from 'node:crypto';

export function isolationIntegrationReport({ platform = process.platform } = {}) {
  const report = { version: 'isolation-integration-v1', status: 'blocked_not_integrated', platform,
    productUsage: 'local_service_browser_ui',
    runtimeProposal: platform === 'darwin' ? { candidate: 'docker_desktop', decision: 'deferred_by_current_project_policy',
      installed: 'not_checked', daemon: 'not_connected',
      rationale: 'Existing Docker inspect/profile work can be reused after version and VM-specific verification; not an endorsement of effective isolation',
      prerequisites: ['Confirm runtime product and applicable license terms', 'Authorize installation separately if needed',
        'Authorize bounded read-only discovery of executable, context metadata and local daemon endpoint',
        'Pin daemon identity, version, architecture and VM path mapping; Linux system socket profile cannot be reused on Mac',
        'No automatic context switching, VM startup, image pulling or workload execution'] }
      : { candidate: 'unselected', decision: 'awaiting_user_confirmation', installed: 'not_checked', daemon: 'not_connected', prerequisites: ['Select and authorize a version-specific local runtime'] },
    stages: [
      { id: 'source', implemented: 'freeze_and_static_metadata', remaining: ['Complete input closure', 'Immutable storage and concurrent path-race protection'] },
      { id: 'linux_artifacts', implemented: 'identity_plan_manifest_and_local_byte_primitive', remaining: ['Trusted Linux preparation and provenance', 'pnpm link materialization', 'Actual native/build verification'] },
      { id: 'staging', implemented: 'mount_contract_only', remaining: ['Trusted composer', 'Private daemon-side path mapping and ownership', 'Writable Next cache design'] },
      { id: 'control_plane', implemented: 'lease_attempt_state_machine_and_simulated_inspection', remaining: ['Authorization gate', 'Verified runtime adapter', 'Revision fencing and actual deadline', 'Verified stop/reconciliation release'] },
      { id: 'runtime', implemented: 'parameters_parsers_and_settings_fixture_checks', remaining: ['Executable/config/daemon trust', 'Bounded real read-only runner', 'Mac profile and actual settings verification'] },
      { id: 'isolation', implemented: 'target_budgets_and_test_matrix', remaining: ['File/network/privilege/resource stress tests', 'Restart/uncertain outcome recovery', 'Browser network topology'] },
    ],
    orderedNextSteps: [
      { id: 'runtime_decision', type: 'deferred_future_decision', action: 'Runtime integration is deferred; only if resumed, confirm product, license and discovery scope separately. Do not install implicitly' },
      { id: 'readonly_discovery', type: 'separate_authorization', action: 'Inspect only approved executable/context metadata; if unavailable report missing, never auto-install/start' },
      { id: 'mac_profile', type: 'implementation', action: 'Implement pinned Mac daemon profile and bounded read-only runner; verify against actual version without workload mutation' },
      { id: 'trusted_artifacts', type: 'separate_authorization', action: 'Prepare reviewed Linux artifacts and private staging; scripts/network/downloads require explicit approved scope' },
      { id: 'isolation_acceptance', type: 'separate_authorization', action: 'Run dedicated sentinel workloads and lifecycle tests before any preview capability is enabled' },
    ],
    forbiddenImplicitActions: ['Install runtime', 'Start VM/daemon', 'Switch context', 'Pull images', 'Prepare dependencies', 'Create/start/stop containers', 'Release reconciliation slots'],
    capabilities: { discover: false, install: false, connect: false, prepare: false, execute: false, stop: false, release: false, publish: false },
    evidenceMeaning: 'Implementation inventory, not runtime discovery, actual artifact evidence or human approval' };
  return { ...report, digest: createHash('sha256').update(JSON.stringify(report)).digest('hex') };
}

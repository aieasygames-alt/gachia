import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Routing and content releases have different blast radii. This inventory is
// deliberately not an executable recipe or a claim about current cloud state.
export const PRODUCTION_TARGETS = Object.freeze(Object.fromEntries(Object.entries({
  main: { app: 'apps/web', service: 'gachia', environment: '', kind: 'content',
    workflow: '.github/workflows/deploy.yml', path: 'desktop_only_sealed_promotion_pending' },
  genshin: { app: 'apps/game-genshin', service: 'gachia-game-genshin', environment: '', kind: 'content', path: 'sealed_version_promotion' },
  nte: { app: 'apps/game-nte', service: 'gachia-game-nte', environment: '', kind: 'content', path: 'sealed_version_promotion' },
  'azur-promilia': { app: 'apps/game-azur-promilia', service: 'gachia-game-azur-promilia', environment: '', kind: 'content', path: 'sealed_version_promotion' },
  lvmeng: { app: 'apps/game-lvmeng', service: 'gachia-game-lvmeng', environment: 'production', kind: 'content', path: 'sealed_version_promotion' },
  router: { app: 'apps/router', service: 'gachia-router', environment: '', kind: 'routing', path: 'separate_routing_review' },
}).map(([key, value]) => [key, Object.freeze(value)])));

function validateTargets(targets) {
  if (!Array.isArray(targets) || !targets.length || targets.length > 6 ||
      targets.some(target => typeof target !== 'string' || !Object.hasOwn(PRODUCTION_TARGETS, target)) ||
      new Set(targets).size !== targets.length) {
    throw new Error('Explicit unique --targets required: main,genshin,nte,azur-promilia,lvmeng or router; no default/all target');
  }
  if (targets.includes('router') && targets.length !== 1) throw new Error('Router requires a separate routing release; never mix it with content targets');
}

export function parseProductionArguments(args) {
  if (args.length !== 3 || !['plan', 'deploy', 'upload', 'promote', 'rollback'].includes(args[0]) || args[1] !== '--targets') {
    throw new Error('Usage: production-release.mjs plan|deploy|upload|promote|rollback --targets <explicit,owners>; no passthrough flags');
  }
  const targets = args[2].split(',');
  validateTargets(targets);
  return { action: args[0], targets };
}

export function productionPlan(targets) {
  validateTargets(targets);
  return {
    schemaVersion: 1, status: 'policy_plan_not_execution_authorization', ready: false, atomic: false,
    cloudState: 'not_observed', sourceValidation: 'not_performed',
    ownershipContract: 'packages/core/route-ownership.json', crossOwnerValidationRequired: true,
    effects: { build: false, upload: false, promote: false, rollback: false, router: false },
    targets: targets.map(target => ({ target, ...PRODUCTION_TARGETS[target],
      status: 'blocked_pending_reviewed_local_executor',
      currentVersion: null, candidateVersion: null, rollbackVersion: null,
    })),
    excludedServices: Object.entries(PRODUCTION_TARGETS).filter(([target]) => !targets.includes(target)).map(([, value]) => value.service),
    requiredEvidencePerTarget: [
      'clean_pushed_source_and_reviewed_runtime', 'sealed_artifact_and_external_digest_pin',
      'fresh_current_deployment_and_previous_asset_provenance', 'local_runtime_and_old_new_asset_compatibility',
      'target_specific_remote_acceptance', 'explicit_promotion_approval_and_fresh_control_plane_recheck',
      'production_acceptance_and_cross_owner_regression',
    ],
    invariants: [
      'No Worker creation, renaming, binding, route, domain or service-tag changes by content releases',
      'Lvmeng production uses explicit production env; its default preview config names the live service',
      'Content publication is initiated and executed on the installed desktop; CI is verification-only',
      'Dedicated games promote the accepted version UUID without rebuilding; Main retains sealed-artifact and prior-asset safety requirements',
      'Each target needs its own evidence; one owner success is not whole-site or batch success',
      'Game prefixes are not whole-game ownership: Main fallback pages, APIs and shared images stay in cross-owner acceptance',
      'Stop on partial failure, reconcile actual cloud state, never retry or roll back automatically',
      'No implicit staging creation, Router deployment or production writes from this command',
    ],
    instructions: 'See docs/production-release-entrypoints.md. This plan does not inspect files, receipts, approval, credentials or cloud state.',
  };
}

export function rejectProductionMutation(target, action) {
  validateTargets([target]);
  const guidance = target === 'main'
    ? 'Cloud publication is disabled. Prepare content in the installed desktop CMS; the reviewed local promotion executor is not yet available. Source, previous-asset, preview and rollback gates remain mandatory.'
    : target === 'router'
      ? 'Router changes require a separate reviewed routing release; old Genshin cutover workflows are retired.'
      : 'Dedicated games require a reviewed sealed-artifact version upload/acceptance/promotion executor. Generic build-and-deploy is retired; local receipts or confirmation strings cannot unlock it.';
  throw new Error(`Production blocked: ${target}/${action}. ${guidance} Start with pnpm release:production plan --targets ${target}.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { action, targets } = parseProductionArguments(process.argv.slice(2));
    if (action !== 'plan') rejectProductionMutation(targets[0], action);
    console.log(JSON.stringify(productionPlan(targets), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

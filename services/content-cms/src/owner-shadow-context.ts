import type { ShadowRelease } from './shadow-release'
export type OwnerShadowContext = { owner: string; releaseKey: string; scopes: string[]; shadowOnly: true; publishable: false }

/** Pins one request to a verified release; callers must pass this context to every reader. */
export function createOwnerShadowContext(release: ShadowRelease, owner: string): OwnerShadowContext {
  if (!owner || !release.scopes.includes(owner)) throw new Error('Owner is not covered by release')
  return { owner, releaseKey: release.releaseKey, scopes: [...release.scopes], shadowOnly: true, publishable: false }
}

export function assertOwnerShadowContext(context: OwnerShadowContext, owner: string, releaseKey: string) {
  if (context.owner !== owner || context.releaseKey !== releaseKey || context.shadowOnly !== true || context.publishable !== false) throw new Error('Owner shadow context mismatch')
}

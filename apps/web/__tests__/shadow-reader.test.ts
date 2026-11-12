import { describe, it, expect } from 'vitest';
import { shadowLocalEnabled } from '../../../packages/core/shadow-local-gate';
import { getRouteOwner } from '../../../packages/core/route-ownership';
describe('Main shadow boundary', () => {
  it('requires explicit Main and local gate, rejects production hosts', () => {
    const env = { CONTENT_SHADOW_LOCAL_ONLY: '1', MAIN_SHADOW_READER: '1' };
    expect(shadowLocalEnabled('main', '127.0.0.1:3333', env)).toBe(true);
    expect(shadowLocalEnabled('main', 'gachia.com', env)).toBe(false);
    expect(shadowLocalEnabled('main', '127.0.0.1:3333', { ...env, MAIN_SHADOW_READER: '0' })).toBe(false);
  });
  it('keeps NTE item details with the character and item list owner', () => {
    expect(getRouteOwner('/zh/nte/items/ore')).toBe('nte');
    expect(getRouteOwner('/zh/nte/characters/index')).toBe('nte');
    expect(getRouteOwner('/zh/nte/items')).toBe('nte');
  });
});

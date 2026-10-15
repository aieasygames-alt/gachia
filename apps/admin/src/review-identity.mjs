import { FactError } from './facts.mjs';

// Identity is self-reported audit metadata, not authentication or a permission grant.
export function validateReviewIdentity(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new FactError('Invalid review identity input');
  const reviewerType = input.reviewerType === undefined ? 'unspecified' : input.reviewerType;
  if (!['human', 'agent', 'unspecified'].includes(reviewerType)) throw new FactError('Invalid reviewerType');
  const basis = input.authorizationBasis === undefined ? '' : input.authorizationBasis;
  if (typeof basis !== 'string' || basis.length > 2000 || (reviewerType === 'agent' && !basis.trim())) {
    throw new FactError('代理审核必须记录授权依据（非发布批准）');
  }
  return { reviewerType, authorizationBasis: basis.trim(), identityAssurance: 'self_reported' };
}

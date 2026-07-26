export function isRedeemCodeActive(
  code: Pick<{ status: string; expiresAt: string }, 'status' | 'expiresAt'>,
  now = new Date(),
): boolean {
  if (code.status !== 'active') return false;
  if (!code.expiresAt || code.expiresAt === 'permanent') return true;
  return new Date(`${code.expiresAt}T23:59:59Z`) >= now;
}

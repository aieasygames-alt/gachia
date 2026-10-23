export function isRedeemCodeActive(
  code: { status: string; expiresAt: string },
  now = new Date(),
): boolean {
  if (code.status !== 'active') return false;
  if (!code.expiresAt || code.expiresAt === 'permanent') return true;
  const expiry = new Date(code.expiresAt.includes('T') ? code.expiresAt : `${code.expiresAt}T23:59:59.999Z`);
  return expiry >= now;
}

export function isRedeemCodeActive(
  code: Pick<{ status: string; expiresAt: string }, 'status' | 'expiresAt'>,
  now = new Date(),
): boolean {
  if (code.status !== 'active') return false;
  if (!code.expiresAt || code.expiresAt === 'permanent') return true;
  const expiresAt = code.expiresAt.includes('T')
    ? new Date(code.expiresAt)
    : new Date(`${code.expiresAt}T23:59:59Z`);

  return expiresAt >= now;
}

export function isLoopbackHost(host: string | null): boolean {
  return !!host && /^(127\.0\.0\.1|localhost|\[::1\])(?::[0-9]{1,5})?$/.test(host);
}

export function shadowLocalEnabled(owner: 'genshin' | 'nte' | 'main', host: string | null, env: Record<string, string | undefined> = process.env): boolean {
  return env.CONTENT_SHADOW_LOCAL_ONLY === '1' && env[`${owner.toUpperCase()}_SHADOW_READER`] === '1' && isLoopbackHost(host);
}

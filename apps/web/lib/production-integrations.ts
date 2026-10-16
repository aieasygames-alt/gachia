// Use the browser's exact origin, not build-time URLs shared by staging builds.
export function allowProductionIntegrations(mode: string | undefined, origin: string): boolean {
  return mode === 'production' && origin === 'https://gachia.com';
}

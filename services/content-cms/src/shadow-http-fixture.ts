import { readFile } from 'node:fs/promises'

const headers = { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow' }

export async function shadowFixtureResponse(request: Request, kind: 'release' | 'snapshot', key: string) {
  // Keep this transport inside the CMS build root; it must not resolve site dependencies.
  const host = request.headers.get('host') ?? ''
  if (process.env.CMS_LOCAL_ONLY !== '1' || process.env.CMS_SHADOW_READER !== '1' || !/^(127\.0\.0\.1|localhost|\[::1\])(?::[0-9]{1,5})?$/.test(host)) {
    return Response.json({ error: 'not found' }, { status: 404, headers })
  }
  if (!/^[a-f0-9]{64}$/.test(key)) return Response.json({ error: 'not found' }, { status: 404, headers })
  try {
    const path = process.env.SHADOW_FIXTURE_PATH ?? '../../reports/shadow-fixture-2026-10-31.json'
    // Runtime-only disposable fixture, deliberately not bundled as a public artifact.
    const bytes = await readFile(/*turbopackIgnore: true*/ path)
    if (bytes.length > 32 * 1024 * 1024) throw new Error('Oversized fixture')
    const data = JSON.parse(bytes.toString('utf8'))
    const value = kind === 'release' ? (data.release?.releaseKey === key ? data.release : null) : data.snapshots?.[key]
    if (!value) return Response.json({ error: 'not found' }, { status: 404, headers })
    return Response.json(value, { headers: { ...headers, 'x-shadow-only': 'true' } })
  } catch {
    return Response.json({ error: 'shadow fixture unavailable' }, { status: 503, headers })
  }
}

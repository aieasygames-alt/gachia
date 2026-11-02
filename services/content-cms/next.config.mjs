import { withPayload } from '@payloadcms/next/withPayload'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
export default withPayload({ poweredByHeader: false, turbopack: { root }, outputFileTracingRoot: root,
  typescript: { tsconfigPath: process.env.CMS_EDITOR_BUILD === '1' ? 'tsconfig.editor.json' : 'tsconfig.json' },
  async headers() { return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }] },
})

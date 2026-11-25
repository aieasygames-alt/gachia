import { withPayload } from '@payloadcms/next/withPayload';
import { fileURLToPath } from 'node:url';

// The CMS is a separate Node application; the website keeps its own Next version.
export default withPayload({ poweredByHeader: false, outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)) });

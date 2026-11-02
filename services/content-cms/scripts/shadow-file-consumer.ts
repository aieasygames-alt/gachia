import { shadowArtifactFiles } from '../src/shadow-artifact-files'
import { loadShadowConsumer } from '../src/shadow-consumer'

if (process.env.CMS_LOCAL_ONLY !== '1' || process.argv.length !== 4) throw new Error('Local shadow consumer requires root and explicit context JSON')
const [root, text] = process.argv.slice(2)
if (Buffer.byteLength(text) > 65536) throw new Error('Oversized context')
const files = await shadowArtifactFiles(root)
const consumer = await loadShadowConsumer(JSON.parse(text), files.read)
const index = consumer.index()
const documents = index.entries.map(({ path }) => ({ document: consumer.document(path), metadata: consumer.metadata(path) }))
console.log(JSON.stringify({ pid: process.pid, owner: consumer.owner, index, documents, publishable: false }))

import { assertStructuredEdit, structuredEditableLeaves, type JSONValue } from '../../src/unified-content'

// Synthetic values are only used in disposable test databases, never published to the website.
export function editProbe(value: JSONValue) {
  const leaf = structuredEditableLeaves(value)[0]
  if (!leaf) return null
  const replacement = typeof leaf.value === 'string' ? (leaf.value === 'CMS-TEST-ONLY' ? 'CMS-TEST-ONLY-2' : 'CMS-TEST-ONLY')
    : typeof leaf.value === 'boolean' ? !leaf.value : leaf.value === 0 ? 1 : 0
  let edited = structuredClone(value)
  if (!leaf.pointer) edited = replacement
  else {
    const keys = leaf.pointer.slice(1).split('/').map(key => key.replaceAll('~1', '/').replaceAll('~0', '~'))
    let parent = edited as Record<string, JSONValue>
    for (const key of keys.slice(0, -1)) parent = parent[key] as Record<string, JSONValue>
    parent[keys.at(-1)!] = replacement
  }
  assertStructuredEdit(value, edited)
  return edited
}

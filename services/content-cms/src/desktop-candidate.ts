import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export async function writeDesktopCandidate(directory: string, content: string, manifest: object) {
  const manifestText = JSON.stringify(manifest, null, 2) + '\n'
  try {
    await mkdir(directory, { mode: 0o700 })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    // Reuse only a complete byte-identical candidate; never repair or overwrite evidence.
    const [existingContent, existingManifest] = await Promise.all([
      readFile(path.join(directory, 'raw-guides.json'), 'utf8'),
      readFile(path.join(directory, 'manifest.json'), 'utf8'),
    ])
    if (existingContent !== content || existingManifest !== manifestText) throw new Error('Existing candidate differs; refusing to overwrite')
    return
  }
  await writeFile(path.join(directory, 'raw-guides.json'), content, { flag: 'wx', mode: 0o600 })
  await writeFile(path.join(directory, 'manifest.json'), manifestText, { flag: 'wx', mode: 0o600 })
}

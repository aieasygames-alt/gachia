export type ConflictPreview = { field: string; baseText: string; currentText: string; incomingText: string }

// Display hints only. The write path must still verify the proposal and current draft.
export function conflictOptions(value: unknown, allowed: string[]): ConflictPreview[] {
  if (!Array.isArray(value)) throw new Error('Invalid comparison response')
  const seen = new Set<string>()
  const conflicts: ConflictPreview[] = []
  for (const row of value) {
    if (!row || typeof row.field !== 'string' || !allowed.includes(row.field) || seen.has(row.field)
      || !['unchanged', 'editor-only', 'source-only', 'converged', 'conflict'].includes(row.status)) throw new Error('Invalid comparison response')
    seen.add(row.field)
    if (row.status !== 'conflict') continue
    if (['baseText', 'currentText', 'incomingText'].some(key => typeof row[key] !== 'string')) throw new Error('Invalid conflict preview')
    conflicts.push({ field: row.field, baseText: row.baseText, currentText: row.currentText, incomingText: row.incomingText })
  }
  return conflicts
}

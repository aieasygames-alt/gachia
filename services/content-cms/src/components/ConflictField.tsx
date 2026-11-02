'use client'

import { SelectField, useField, useFormFields } from '@payloadcms/ui'
import { useEffect, useState, type ComponentProps } from 'react'
import { conflictOptions, type ConflictPreview } from '../conflict-options'

export function ConflictField(props: ComponentProps<typeof SelectField>) {
  const proposal = useFormFields(([fields]) => fields.proposal?.value)
  const id = typeof proposal === 'object' && proposal !== null && 'id' in proposal ? proposal.id : proposal
  const key = typeof id === 'number' || typeof id === 'string' ? String(id) : ''
  const { value, setValue } = useField<string>({ path: props.path })
  const [loaded, setLoaded] = useState<{ key: string; rows: ConflictPreview[]; error: boolean }>()
  const allowed = props.field.options.map(option => typeof option === 'string' ? option : option.value)
  const allowedKey = JSON.stringify(allowed)
  useEffect(() => {
    if (props.readOnly || !/^[1-9]\d*$/.test(key)) return
    const controller = new AbortController()
    void (async () => {
      try {
        const response = await fetch(`/api/draft-merge-proposals/${encodeURIComponent(key)}?depth=0`, { credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
        if (!response.ok) throw new Error('Comparison unavailable')
        const data = await response.json()
        const rows = conflictOptions(data.comparison, JSON.parse(allowedKey))
        if (!controller.signal.aborted) setLoaded({ key, rows, error: false })
      } catch {
        if (!controller.signal.aborted) setLoaded({ key, rows: [], error: true })
      }
    })()
    return () => controller.abort()
  }, [key, allowedKey, props.readOnly])
  const ready = loaded?.key === key && !loaded.error
  const rows = ready ? loaded.rows : []
  useEffect(() => {
    if (!props.readOnly && value && (!ready || !rows.some(row => row.field === value))) setValue(null)
  }, [key, ready, value, rows, props.readOnly, setValue])
  if (props.readOnly) return <SelectField {...props} />
  const selected = rows.find(row => row.field === value)
  return <div>
    <SelectField {...props} readOnly={!ready || rows.length === 0} field={{ ...props.field, options: rows.map(row => row.field) }} />
    <p role="status">{!key ? 'Select a proposal first.' : loaded?.key === key && loaded.error ? 'Unable to load comparison. Reselect the proposal or reload; saving still requires server validation.' : !ready ? 'Loading conflict fields...' : !rows.length ? 'No conflict fields. Remove this choice row.' : `${rows.length} conflict field(s). Choose each exactly once; saving rechecks the latest draft.`}</p>
    {selected && <dl style={{ margin: '0 0 24px', padding: 16, background: 'var(--theme-elevation-50)', overflowWrap: 'anywhere' }}>
      {([['Base', selected.baseText], ['Current (editor)', selected.currentText], ['Incoming (source)', selected.incomingText]] as const).map(([label, text]) => <div key={label}><dt><strong>{label}</strong></dt><dd style={{ margin: '4px 0 12px', whiteSpace: 'pre-wrap', maxHeight: 160, overflow: 'auto' }}>{text}</dd></div>)}
    </dl>}
  </div>
}

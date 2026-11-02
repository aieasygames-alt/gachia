export type ShadowReaderGate = { enabled: boolean; publicTrafficChanged: false; reason: 'opt-in' | 'disabled' }

/** Shadow readers are opt-in only; production traffic is never changed by this gate. */
export function shadowReaderGate(value: string | undefined): ShadowReaderGate {
  return value === '1' || value === 'true'
    ? { enabled: true, publicTrafficChanged: false, reason: 'opt-in' }
    : { enabled: false, publicTrafficChanged: false, reason: 'disabled' }
}

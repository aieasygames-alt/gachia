export function desktopRequestAllowed(headers: Headers) {
  if (headers.get('host') !== '127.0.0.1:3100') return false
  const origin = headers.get('origin')
  if (origin && origin !== 'http://127.0.0.1:3100') return false
  return headers.get('sec-fetch-site') !== 'cross-site'
}

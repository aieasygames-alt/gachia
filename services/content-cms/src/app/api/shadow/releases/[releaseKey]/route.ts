import { shadowFixtureResponse } from '../../../../../shadow-http-fixture'

export async function GET(request: Request, context: { params: Promise<{ releaseKey: string }> }) {
  const { releaseKey } = await context.params
  return shadowFixtureResponse(request, 'release', releaseKey)
}

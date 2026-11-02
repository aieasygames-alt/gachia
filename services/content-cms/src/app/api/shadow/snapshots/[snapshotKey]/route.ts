import { shadowFixtureResponse } from '../../../../../shadow-http-fixture'

export async function GET(request: Request, context: { params: Promise<{ snapshotKey: string }> }) {
  const { snapshotKey } = await context.params
  return shadowFixtureResponse(request, 'snapshot', snapshotKey)
}

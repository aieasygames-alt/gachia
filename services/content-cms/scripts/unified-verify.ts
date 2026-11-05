import assert from 'node:assert/strict'
import { verifyUnifiedOwnerBuild } from '../src/unified-owner-build'

const args = process.argv.slice(2)
assert(args.length === 4 && args[0] === '--directory' && args[2] === '--pin',
  'Usage: unified-verify.ts --directory FROZEN_DIRECTORY --pin BUILD_SHA256')
const result = verifyUnifiedOwnerBuild(args[1], args[3])
console.log(JSON.stringify({ directory: result.directory, buildPin: result.buildPin,
  owners: Object.keys(result.receipt.owners), preview: result.receipt.preview,
  status: 'all_local_evidence_reverified', productionReady: false, cloudWrites: false }))

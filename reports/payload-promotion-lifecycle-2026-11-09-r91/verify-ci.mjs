import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const runID = Number(process.argv[2]); assert(Number.isSafeInteger(runID) && runID > 0);
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const api = suffix => JSON.parse(execFileSync('gh', ['api', `repos/aieasygames-alt/gachia/actions/runs/${runID}${suffix}`],
  { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
const run = api(''), jobs = api('/jobs?per_page=100');
assert.equal(run.repository.full_name, 'aieasygames-alt/gachia');
assert.equal(run.head_sha, commit); assert.equal(run.head_branch, 'codex/payload-unified-maintenance');
assert.equal(run.path, '.github/workflows/payload-verify.yml'); assert.equal(run.status, 'completed'); assert.equal(run.conclusion, 'success');
assert.equal(jobs.total_count, 1); assert.equal(jobs.jobs[0].conclusion, 'success');
for (const name of ['Verify CMS types without deployment credentials', 'Test isolated CMS', 'Verify current content inventory and Router contracts',
  'Test release tooling without deployment credentials', 'Test public Web and Data consumers', 'Typecheck public consumers without builds',
  'Test documentation and verification scope gates']) assert(jobs.jobs[0].steps.some(step => step.name === name && step.conclusion === 'success'), name);
const result = { runID, commit, status: 'full_exact_ci_passed', url: run.html_url, runAttempt: run.run_attempt,
  steps: jobs.jobs[0].steps.map(({ name, status, conclusion }) => ({ name, status, conclusion })), cloudWrites: false };
writeFileSync(new URL('exact-ci.json', import.meta.url), JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ runID, commit, status: result.status, url: result.url }));

# Local content workbench

HI3 manual-intake, reviewed-draft and local-preview vertical slices. This is a local
tool, not a public website feature. Implementation status and prioritized remaining
tasks are maintained in `docs/local-game-content-workbench.md` section 16.
Requires Node.js >= 22.18 (built-in SQLite; experimental warning may be printed).

## Manual Tools And Historical Reports

`tests/real-announcement-*.mjs` and `tests/next-*.mjs` are manual developer
tools, not the default unit suite or product acceptance. Some fetch public data,
open/migrate SQLite, write reports/drafts, create worktrees or run page JavaScript.
The plan tools' `--read-only` means no application execution, NOT zero disk writes.
Saved agent authorization is historical metadata, not transferable authorization.

The old `next-snapshot-smoke.mjs` launcher is retired and always refuses execution.
The other three Next browser checks additionally require
`WORKBENCH_CONFIRM_EXISTING_NEXT_CHECK=1` after explicit authorization to check the
existing non-sandboxed local service. This guard is not authentication or isolation.
Do not run them just because a loopback origin is set. Historical reports are not
current draft approval. Retention and candidate exclusions are documented in
`plans/workbench-manual-materials.md`; original tools/reports stay in place.

## Usage Model

The current product is a locally hosted browser workbench: start the Node service
on your Mac and open its authenticated loopback URL in a browser. Project files
and SQLite stay on that machine. It is not a packaged macOS .app, an installer,
or a publicly hosted multi-user service. No double-click launcher is implemented.
Future Linux isolation is for executing previews, not a replacement for the
browser interface. Cross-platform packaging and distribution remain unverified.

## Run

```sh
pnpm install --frozen-lockfile
pnpm --filter @gachia/admin dev
```

Open the authenticated URL printed in the terminal. Keep it private. The service
binds only to `127.0.0.1:4317`; set `WORKBENCH_PORT` to change the port. The bearer
token is passed in the URL fragment, moved to tab session storage, and removed from
the address bar. Restarting rotates the token; reopen the new printed URL.

The intended flow is: manually import an excerpt and source link, inspect the local
content scan, generate an unverified task package, inspect/export its JSON, restart
the server, and verify that evidence and tasks remain. Identical normalized imports
and repeated task-generation requests return the original records.

## Task revisions

Within a task, explicitly select confirmed facts and enter a revision reason.
Each revision has a sequential number, parent reference, immutable fact/review
snapshot, Git commit, content fingerprint, deployment target and SHA-256 digest.
This digest detects accidental changes; it is not a signature or proof of approval.

Only confirmed facts from that task's evidence can be selected. The backend checks
the selected review revisions and expected latest task revision in one transaction.
Request IDs make retries idempotent; reusing a key for different data is rejected.

Any later review of a selected fact permanently invalidates the affected revision,
including reconfirmation. A new explicit revision is required. Unselected facts do
not invalidate it. Reading state and exporting rechecks current fact revisions,
content fingerprint, Git commit, deployment ownership and snapshot digest. Exports
include the current assessment and time; invalid historical revisions remain
downloadable but clearly marked. Offline exports can become stale after download
and must never be trusted without revalidation by a future draft executor.

`current` only means that the selected facts and context still match. It does not
mean all facts are complete, mutually consistent, or independently verified. Dirty
working-directory context and uncovered checks remain explicit. No task revision
grants automatic editing or publication permission.

## Isolated manual drafts

Use the explicit confirmation button on a current revision to create a detached
Git worktree under `.gachia-workbench/workspaces/<id>`. This updates Git worktree
metadata and writes a new checkout, but never copies the dirty working directory,
installs dependencies, executes project code, commits, pushes or publishes. Git
hooks and fsmonitor are disabled for operations; configured checkout filters block
creation because filters can execute commands.

Creation rechecks facts, commit, content and deployment. Relevant source/mirror
files must match the bound commit byte-for-byte; unrelated uncommitted changes are
left intact. If relevant data is uncommitted, review and commit it separately and
create a new task revision. The tool does not commit it for you.

Open the displayed path in your editor for manual drafts. Refresh the workbench
to inspect tracked diffs (including staged changes) and untracked/ignored paths.
Only HI3 `raw-*.json` in source and mirror directories is allowed by this initial
policy. Invalid JSON, symlinks, out-of-scope files, changed HEAD or revoked facts
pause the draft. This is an inspection gate, NOT an OS sandbox: an external editor
can still write files, and the report is not full content/build validation. New
untracked file bodies are not shown in the tracked diff.

One workspace is reserved persistently per revision before creation. Retrying
reconciles its Git registration and HEAD without deleting or overwriting files.
Interrupted or ambiguous operations remain visible as `needs_reconciliation`.
No automatic cleanup exists: do not delete a workspace containing drafts. This
version does not manage Codex app worktree attachments or create new chat threads.

## Boundaries

- Evidence intake fetches no external URLs. Explicit application-preview checks
  fetch only local application routes/indexes. Imported material remains unverified
  until manual field review.
- Source URLs require HTTPS without credentials, query parameters or fragments.
- Discussions remain discussions, not confirmed official facts.
- Field facts bind an exact excerpt and immutable evidence fingerprint. Confirmation
  requires source/scope/value checks, a self-reported reviewer and a reason. This is
  a manual record, not independent identity verification or publication approval.
- Reviews are append-only and revision-checked. A reviewer may confirm, reject or
  return a field to review. Unknown scope/lifecycle blocks confirmation. Existing
  task snapshots never change; the UI warns when facts or reviews have changed.
- Suggestions use literal entity name/ID matches, not AI or semantic analysis.
- Reads HI3 JSON and its public mirrors; records expected routes, not tested routes.
- The initial content scan checks mirrors and translated labels only. Separate
  draft validation and explicitly started application previews cover the additional
  rules below; semantic translation, freshness and production versions remain uncovered.
- Git HEAD and dirty status are read-only context. The dirty checkout is never a
  build or production baseline; content digests describe the scan separately.
- No arbitrary content-edit, shell-execution, AI, external-collector or deployment-
  approval APIs exist. The explicit preview API executes a fixed Next.js command
  only after risk confirmation; this is not an OS sandbox.
- No production credentials or dependencies on the public app or D1 database.
- Local host/origin checks, bearer authentication, JSON-only writes, size/time
  limits, CSP and text-only evidence rendering protect the local surface. This does
  not protect against malicious processes or browser extensions on the same machine.

## Structured draft validation

After manually editing an isolated workspace, run its structured validation button.
The validator reads data only: it does not install packages, run project code,
generate files, build or publish. Reports are persisted and exportable.

Covered rules (HI3 adapter v1):

- JSON arrays, ID format/uniqueness, all source/mirror `raw-*.json` pairs.
- Required nonempty zh/en/ja labels and bodies: character/weapon/AstralOp/stigma
  descriptions; material sources; guide titles, summaries, content and FAQ fields.
- Explicit `characterId(s)`, `weaponId(s)`, `materialId(s)`, `guideId(s)`,
  `astralOpId` and `stigmaSetId` references to existing IDs.
- Safe ordinary data files, 4 MiB per-file limit, current workspace scope and facts.

Unknown dataset kinds or reference fields stay `not_covered`. Name mentions, prose
links, factual correctness, translation accuracy, directories, search, sitemap,
builds, browser behavior and Worker size are not validated. The most successful
result is `partial_pass`, never a publication approval. Empty datasets are not
automatically treated as invalid; deletions require later human diff review.

The report binds tracked diff digest, changed path list and byte digests of all raw
data (including newly added untracked data). Re-reading verifies the input did not
change during validation. Refresh/export recomputes its assessment: edits, scope
changes, HEAD drift or fact invalidation make the old result `stale`. Refresh can be
expensive with many historical reports; this initial version is intended for small
local batches and does not yet impose a report-retention policy.

## Human draft review

Load review material from a current validation report. The packet includes the
baseline commit, revision/fact snapshot, exact file manifest, tracked diff, complete
changed JSON bodies (including untracked additions), deletion markers and the exact
validation coverage. Changed-file bodies are capped at 1 MiB per packet; larger
batches must be split rather than silently truncated. Nothing is executed.

Accept/reject requires a self-reported reviewer, reason, explicit diff/fact checks,
acknowledgement of every uncovered rule, and acknowledgement that no commit or
publish permission is granted. Accepting is blocked for failed validations or empty
drafts; rejection still records what was inspected. Reviewer identity is not an
authenticated multi-user identity.

The backend regenerates the packet on submission and compares its digest. Optimistic
review numbers prevent stale-page overwrites; request keys make retries idempotent.
Reviews are append-only; later decisions supersede earlier ones. Refresh/export
rechecks exact material and current facts, so stale reports, changed files, HEAD or
fact revocations make the record inapplicable. A latest review can match again if
files are restored byte-for-byte; fact revision invalidation remains permanent.
Offline exports may become stale after download and require online revalidation.

Review snapshots contain source excerpts and complete changed JSON bodies. Keep
database backups/exports private; there is no automatic retention purge. This tool
does not merge, commit, push, preview or publish an accepted draft.

## Fixed-template data preview

On a current accepted draft review, explicitly generate a data-only preview. The
workbench renders changed source datasets into zh/en/ja pages using trusted fixed
templates; it does not run Next.js, import workspace modules, install dependencies,
start a project process or make external requests. All source text is HTML-escaped,
and pages have a restrictive CSP and render in an iframe with an empty sandbox.
No token or workspace code is injected into the frame.

This is intentionally not a real-site preview. Server reports check required title
and body fields only and set `browserExecuted: false`; merely opening an iframe
does not record browser acceptance. Real routes, canonical, hydration, assets,
interactions, translation correctness and deletion impact remain `not_covered`.
Automated desktop/mobile tests verify the preview frame renders one H1 and a
nonempty body, but these test results are not attached to user drafts.

Generation is idempotent per accepted review. Limits are 120 pages and 8 MiB total
HTML; exceeding them rejects the operation rather than truncating it. Deleted,
empty and unknown datasets are disclosed and never count as successful preview
coverage. Refresh/export rechecks the bound review and marks previews stale on
file/fact/baseline changes or a superseding decision. Exports contain full rendered
text and require the same privacy handling as evidence and draft review packets.

## Actual application preview (explicit code execution)

A current accepted draft can explicitly start a fixed `node next dev` command on
an automatically selected `127.0.0.1` port. No shell, custom command, dependency
installation, main-checkout dependency linking, build, commit or deployment is
available. Prepare independent dependencies outside the workbench first. The
resolved Next CLI must reside inside the workspace. Root/app `.env` files (except
example/sample/template files) block startup. Child environment variables are an
allowlist; workbench tokens, production credentials and inherited NODE_OPTIONS are
not passed. HOME/TMPDIR point into the workspace's generated `.next` directory.

THIS IS NOT A SECURITY SANDBOX. Executed Next config, application code and dependencies
can read local files and access the network using your user privileges. The env
allowlist and isolated checkout do not prevent that. Only use reviewed trusted code
on a trusted machine. The runtime limit is 10 minutes, concurrency is one, and Node's
heap is limited to 1024 MiB; this is not a total memory/CPU/disk limit. Escaped child
processes cannot be guaranteed to stop. No hard OS resource isolation is implemented.

Application output is discarded rather than storing potentially sensitive logs.
Stop targets only a currently owned process group, with SIGTERM then a 3-second
SIGKILL fallback while the original child is alive. Closing the workbench stops
owned previews. A watchdog rechecks accepted review context every 5 seconds and
stops on drift. After a crash/restart, unfinished records require manual process
and port reconciliation; historical PIDs are never killed or automatically replayed.

Once ready, explicitly run the browser check: it visits the real app's three HI3
homepages, affected directories and ALL added/modified/deleted entities from exact
baseline-to-draft JSON comparisons. Up to 60 unique pages are permitted; exceeding
the budget rejects checking instead of silently sampling. It checks HTTP 200, a title, one nonempty H1, nonempty body, language code,
canonical URL and uncaught page errors. TCP startup has a 30-second budget, and
each navigation a 60-second limit for initial dev compilation; external HTTP requests and `/api/`
requests are blocked in this test browser. Missing Chromium or failed startup is
reported as failure, never success. This is a dev-server partial check, not a
production build or full acceptance: unaffected pages, translation/factual semantics, external
assets, interactions, Worker size and production versions remain uncovered. The
record binds the accepted review digest and displays stale when its context changes.

Directory checks require links for all changed live entities and absence of links
to removed entities. One visible affected link per directory is actually clicked
and its destination/H1 awaited. Deleted detail pages must return 404 under the initial
policy; archival/redirect policies are not yet configurable. Other interactions
(filters, copy, save) remain uncovered. Unknown dataset page mappings and old review
packets lacking baseline bodies are explicitly uncovered; regenerate review packets
for complete entity-diff coverage. Adding baseline bodies changes packet digests, so
older reviews require re-review rather than silently inheriting new coverage.

Ignored generated `.next` and dependency directories are excluded from draft scope
inspection so dev-server caches do not alter the content fingerprint. They are
executable inputs, not reviewed content; this exclusion does not make their contents
trusted. If Next modifies tracked tsconfig or another protected file, the draft is
blocked and the watchdog stops it. Startup uses the default Next dev compiler, not
the main application's package script or arbitrary commands.

### Real Next.js integration evidence

`tests/next-snapshot-smoke.mjs` is an explicit developer-only integration runner.
It accepts a `/private/tmp/gachia-next-smoke.*` snapshot, runs this project's real
Next.js with independent installed dependencies, and stops the process afterward.
It writes `reports/workbench/next-snapshot-smoke.json`, clearly labeled as a developer
test rather than a human-approved draft. No credentials or dirty source are copied.
Snapshot setup and dependency installation are separate terminal actions, never
implicit API operations. The report records the tested baseline commit; it does not
prove that future edits or unrelated user drafts are accepted.

On 2026-10-10, the initial 15-page sample passed. Expanding to all current entities
using a synthetic empty baseline checked 51 real pages and exposed three failed
weapon directories (zh/en/ja): details returned 200 but expected directory links
were missing. A subsequent HI3-only weapon title-link fix was overlaid into the
independent snapshot: all 51 pages and all 12 directory navigation checks then
passed. The report records the overlay and weapon page SHA-256 rather than claiming
the baseline commit alone contains the fix. This developer scenario is not a human-
approved content draft, production build or deployment acceptance.

### Sitemap and search discovery checks

Actual application checks also fetch the local `/sitemap.xml` and, for changed
characters, weapons or materials, the three `/data-manifest/search-{locale}.json`
files. Requests refuse redirects, time out after 30 seconds each and cap each
response at 8 MiB. Only a direct sitemap `urlset` is supported, not sitemap-index
recursion. Checks require affected live URLs in the canonical production URL set
and removed URLs absent. Search checks require exactly one matching live entity
with source-language names and alternate names, or no entry for a deleted entity.
Missing translations fail rather than silently accepting generator fallbacks.

Guides are not in the current search generator and are explicitly `not_covered`.
Index checks alone do not validate search interaction. Actual application checks
add the bounded browser sample described below. Remaining gaps stay visible in
reports; `partial_pass` never grants publish permission.
Fetch errors, stale entries, duplicate entries and incorrect names fail the check.
The workbench does not regenerate or overwrite search indexes automatically.

The 2026-10-10 independent Next.js snapshot run passed all 51 page checks and 78
discovery checks, with no failed checks. Three guides and search UI behavior remain
explicitly uncovered (four entries). Its lifecycle ended `stopped`; the report is
developer evidence, not human draft approval or production acceptance.

### Real search interaction samples

For each changed searchable category (characters, weapons, materials), select the
first non-deleted entity in review order and test its full zh/en/ja names: at most
nine browser scenarios per profile, eighteen total for desktop and mobile. Each
scenario opens the actual header search dialog, types
the source name, requires one visible target link with matching name, clicks it,
then checks the actual navigation response, target path, H1 presence, language and
canonical. The mobile profile uses a separate Chromium context with a 390x844
viewport, touch and mobile emulation, and the same local-only request restrictions.
Both profiles require the accessible search trigger, dialog, input and scrolled
result to fit in the viewport, with no horizontal document overflow while searching.
Uncaught page errors fail the sample. Missing UI, results, translations,
navigation or wrong destination metadata also fail; no index-only fallback counts
as browser success. Review and lifecycle validity are checked between scenarios.

Unselected and deleted entities are listed as uncovered for interaction (their
index consistency is still checked). Ranking quality, partial queries, alternate
names, real-device soft keyboards and guide search remain uncovered. No content,
search component or generated manifest is repaired automatically.

The subsequent independent Next.js snapshot run on 2026-10-10 passed nine actual
search scenarios (one character, weapon and material in each locale), alongside
51 page and 78 discovery checks: 138 passed, zero failed. Ten explicit uncovered
entries remain (six unselected searchable entities, three guides, and the remaining
interaction scope). The result stays `partial_pass` and the process ended `stopped`.

Mobile expansion initially exposed three English failures at 390px: the search
dialog/results overflowed the viewport despite correct navigation. The regression
report is preserved as `reports/workbench/mobile-search-before-fix.json`. The site
header also now supplies a localized accessible search-button name when its visible
label is hidden on mobile. Narrow-screen search sizing fixes allow the dialog and
input to shrink and long result names to wrap. The snapshot report records header
and search-dialog hashes in addition to the prior weapon-page overlay hash.
Overflow-element diagnostics identified the underlying English header overflow:
brand, locale and login controls exceeded the narrow viewport and expanded the
layout viewport used by the dialog. Compact mobile-only header padding and gaps
resolve this without changing desktop spacing. Viewport checks compare against
both the browser layout viewport and the configured emulated viewport to prevent
overflow-induced viewport expansion from masquerading as a pass.
The final independent snapshot rerun passed all nine desktop and nine mobile
search samples, plus the existing 51 page and 78 discovery checks (147 passed,
zero failed). Seventeen uncovered entries remain, including per-profile sampling
gaps. The result stays `partial_pass`; the preview process ended `stopped`.

### Empty results and close/reset behavior

When searchable entities change, six additional scenarios cover zh/en/ja on both
desktop and mobile: a fixed nonmatching query, localized no-results text and zero
result links, Escape dismissal, reopening with cleared input, actual pointer-click
backdrop dismissal, and reopening with cleared input again. The browser must fetch
a successful nonempty HI3 index; request errors or empty data cannot pass as a
no-results state. The query is collision-checked against the fetched index. Each
scenario rechecks review/lifecycle validity and records explicit failure if any
step cannot complete. Arbitrary empty queries and a real mobile soft keyboard
remain uncovered.

The site now supplies Japanese no-results text and handles clicks on the actual
backdrop child; the old outer-container target check alone did not dismiss it.
The independent Next.js snapshot passed all six new scenarios on 2026-10-10:
153 total passed, zero failed, seventeen uncovered entries, `partial_pass`, and
final process lifecycle `stopped`. If discovery already reports an index-fetch
failure, empty-result scenarios are explicitly skipped rather than adding long
waits; the existing failed index check still prevents a passing result.

### Keyboard focus and navigation

The six empty/close scenarios also require initial input focus, Tab and Shift+Tab
containment with no results, and trigger focus restoration after Escape/backdrop
dismissal. Six additional keyboard navigation scenarios select the first changed
searchable category in review order (three locales, two profiles). They require
Shift+Tab from input to the last result, Tab wrapping back to input, Tab navigation
to the exact affected result and Enter navigation with the same destination checks
as pointer samples. These use actual browser keyboard events, not synthetic clicks.
Other entities/categories and real mobile hardware keyboards remain uncovered.

The dialog now captures/restores the prior focus, constrains Tab at its boundaries,
has localized dialog/input accessible names, and displays visible focus on results.
The header shortcut focuses the trigger before opening so keyboard-shortcut
dismissal has a stable return target. Screen-reader behavior, background inertness,
arrow-key selection and exhaustive assistive-technology audits remain uncovered.
The independent Next.js snapshot on 2026-10-10 passed all six keyboard-navigation
samples and the six expanded focus/close scenarios: 159 total passed, zero failed,
seventeen uncovered entries, `partial_pass`, and final lifecycle `stopped`.

## Manual Global official-source collection

The explicit collect button makes one fixed unauthenticated HTTPS request to the
Global English Latest channel used by the official website (app `5fcd2aa439ca4aea`,
channel 514, page 1, size 3). The list already includes article HTML. No arbitrary
URL, cookies, login, redirects, browser scripts, images, scheduler or auto-retry are
used. DNS resolution is limited to five seconds; only validated public IPv4 is
pinned into the HTTPS connection, retaining hostname TLS verification. Responses
are capped at 2 MiB with a 15-second request timeout. IPv6 is intentionally unsupported.

Source health distinguishes never checked, changed/unchanged first page, parse
failure and access failure; a seven-day stale indicator is separate. Failed runs
retain the prior successful snapshots without claiming they are current. Runs and
snapshots persist in SQLite schema v9; upgrades back up older databases first.
One in-process request at a time and a persisted post-run 60-second cooldown apply;
429 Retry-After extends cooldown. This is not a distributed collection lock.
Collection intent (`collecting`) is persisted before accessing the network. On
service restart, an interrupted request becomes `needs_reconciliation`, retains
the previous successful snapshots, and imposes a fresh 60-second cooldown. No
request is automatically replayed; the user may explicitly collect again afterward.
This fixed GET has no remote write to reconcile; it still cannot be reported as a
successful check. Failed/interrupted states label retained snapshots as historical.
Deterministic network tests cover DNS timeout/private-address rejection, pinned
single/all-address lookups, fixed endpoint/no credentials/TLS defaults, request
deadline, oversized bodies, stream errors/abort/premature close and malicious
redirects. Abort/error paths terminate the request without returning partial data.
Dependency injection is code-only for tests; HTTP clients cannot supply endpoints,
DNS resolvers or timeout overrides. These simulations are not a comprehensive TLS,
proxy or real-network penetration test.

Raw article HTML is displayed through textContent, never rendered or executed.
Snapshots are unverified and not automatically imported as evidence/facts. The
explicit excerpt handoff requires a reviewed checkbox and a nonempty continuous
raw-HTML excerpt (up to 30000 characters). The backend binds the current snapshot
digest, article ID/body hash and fetch time; title, URL, date, language and Global
scope come from the stored article, never client overrides. Changed snapshots
return 409. Evidence stays unverified, duplicate imports return the existing item,
and no facts/tasks are created automatically. Raw HTML remains text throughout;
no HTML-to-prose rewriting or translation is performed. Retained snapshots after
fetch failure may be imported only as historical evidence, not current-state proof.

Official evidence cards include a review-preparation panel: complete historical
announcement text, source/scope/date metadata, pending-field values/quotes, current
review status and a shared checklist. Context comes from the append-only run whose
snapshot digest and article body hash match the evidence, never from the current
first page as a substitute. Missing/mismatched context is explicitly unavailable.
Buttons select that evidence for manual field entry or open the existing field
review form; neither generates fields nor confirms facts automatically. Desktop
and mobile tests cover this navigation and verify that no review is created.

Complete history pagination, content edits,
region-specific verification and real-announcement draft acceptance are still
pending. A successful first-page check cannot establish that there are no updates
elsewhere. A real read-only request on 2026-10-10 parsed announcements 165770,
164955 and 163759; that is collection evidence, not fact approval.

## Local data and recovery

SQLite is stored at repository-root `.gachia-workbench/workbench.sqlite` (Git-ignored).
The directory is created with mode 0700 and the database with mode 0600. WAL,
transactions and unique keys prevent partial writes and duplicate tasks. Schema v9
adds official source state/run snapshots after v8 application previews. Before upgrading older schemas,
a SQLite `VACUUM INTO` backup (`workbench.sqlite.v<version>-<id>.bak`)
includes committed WAL data; backup failure stops
startup. Newer schemas are refused rather than overwritten. Backups contain evidence
and must be kept private. Restore into a separate directory with a compatible app;
never mix an old main database with newer WAL sidecars.
There are no external background jobs to replay in this version.

Evidence excerpts and task exports may contain sensitive source material: do not
import credentials or personal data. No automatic retention purge exists yet.
Stop the server before backing up the data directory; copy the whole directory,
including SQLite sidecars if present. To remove stored data, stop the server and
manually delete that directory.

## Tests

```sh
pnpm --filter @gachia/admin test
pnpm --filter @gachia/admin test:browser
```

Tests use temporary directories and no network beyond local HTTP. They cover
validation, deduplication, transactions, restart persistence, content drift,
uncovered checks, authentication, host/origin checks, request limits and forbidden
production routes. Public site builds and deployments are not required.
Browser smoke tests require a local Playwright Chromium installation and cover
desktop/mobile import, field review, stale-task warnings, task generation, JSON
download, reload, injection and layout. Backend tests also cover migration backups,
scope restrictions, review revocation, stale-review conflicts, task revision
selection, retry idempotency, sequential conflicts and permanent invalidation.

## Next slice

The explicit developer runner `tests/real-announcement-intake.mjs
--confirm-public-fetch` verifies a real Global announcement (165770) through
reviewed excerpt, unreviewed field and task preparation in a temporary database.
It verifies that even a forged review version cannot create a revision from an
unconfirmed field. Its report `reports/workbench/real-announcement-intake.json`
is `partial_pass_awaiting_human_review`; no human fact/draft decisions or worktrees
are created. Human review steps are documented in `docs/hi3-real-announcement-review.md`.

Search loading/retry is implemented: localized loading/error states, 15-second
fetch timeout, shape validation and failed-cache eviction. Five loader unit tests
and six desktop/mobile locale-specific 503 fault-injection developer scenarios
passed; the latter live in snapshot `recoveryChecks`, separately from the existing
159 normal checks (all passed, seventeen uncovered). Faults are never injected by
normal application-preview APIs. Retry retains the query and rejoins focus order.

The bounded Global collector, source health, restart reconciliation, network fault
tests, reviewed excerpt handoff and historical-context review-preparation panel
are implemented. Current backend regression: 54 passed, six browser-only cases
skipped. Last full browser regression: six passed plus desktop/mobile smoke;
the later review-preparation change also passed its dedicated desktop/mobile test.

Next priority is an actual human field decision in the workbench, followed by the
real announcement's revision/workspace/draft review and preview. That loop remains
incomplete. Independent engineering work can address OS isolation, read-only build
gates and retention/resource policies. Cross-instance collection locking, complete
history, scheduling and broader sources are not implemented. AI/multi-game/release
integration remain later phases; release requires separate explicit approval.
Remaining choices and scope are tracked in `docs/hi3-source-intake-decisions.md`
and the design document section 16, not inferred from existing guide content.

The execution-isolation implementation plan is in
`plans/workbench-execution-isolation.md`: start with read-only capability probes
and fail-closed policies, then frozen execution inputs, fixed Linux-runtime
adapter/leases, real isolation tests and Next integration. No OS isolation or
runtime installation is implemented by this plan; current previews remain explicitly
unsandboxed. Runtime choice, images and resource budgets require separate decisions.

I1 is implemented as `src/execution-policy.mjs`: authenticated state reports a
read-only executable-file probe at six fixed Docker/Podman paths. It does not run
commands, inspect daemon state, traverse PATH, install software or prove isolation.
Even finding every executable cannot enable `isolated_linux`; frozen inputs,
execution adapters/leases and isolation tests remain missing. Target budgets are
explicitly ineffective and distinct from current legacy limits.

Preview API calls now default to `disabled` and require explicit
`executionMode: "legacy_trusted_local"` plus the existing execution and unsandboxed
risk confirmations. Missing, unknown, disabled or isolated modes fail before
preflight, record creation or process launch; no automatic fallback exists. Existing
API clients must add the mode. Data-only previews are unaffected. The UI shows the
policy and sends the explicit legacy mode only after the risk confirmation.

I2 source-material slice adds an explicit freeze button on current accepted draft
reviews. It copies `apps/web`, `packages`, root package/lock/workspace/TS config into
a new private `.gachia-workbench/execution-materials/<id>` directory, without running
code or installing dependencies. Git metadata, node_modules and named build caches
are excluded. By default .env files (including templates), known credential filenames, symlinks
and nonordinary files are rejected. Budgets are 20000 files/256 MiB. This is a fixed
source-input profile, not a proof that all possible Next imports are covered.

SHA-256 manifests bind paths/bytes/executable bits and the accepted packet digest.
File descriptors use O_NOFOLLOW; source and destination are rescanned after copying,
and review validity is rechecked. Files are chmod read-only, but the same OS user
can still change them: this is not immutable storage or a complete TOCTOU defense.
Listing revalidates frozen contents and review; failed/partial copies remain visible,
non-executable and never automatically deleted. SQLite schema v10 persists records
and backs up older databases before migration. No deduplication/retention cleanup
is implemented yet.

All frozen records have execute/publish=false. Linux dependencies/image digests,
full runtime-input closure, OS isolation and runtime adapters remain pending. The
freeze API does not change legacy preview input and cannot enable isolated_linux.

Frozen records now include an `inputScope` report bound to the manifest digest.
The admin's TypeScript parser inspects static imports/exports, literal require/import,
JSONC config inheritance/paths, local dependencies and workspace package presence
using only verified manifest bytes. It never executes project configuration.
Diagnostics are capped at 200 with full counts; errors yield `needs_attention`,
otherwise the result is only `partial_pass`, never execution authorization.
Computed loaders, filesystem/URL/CSS resources, conditional exports, plugin loaders,
workspace YAML enumeration, lock closure and Linux native dependencies remain
uncovered. Scripts are inventoried as uncovered, not executed or assumed necessary.
Old records show unchecked; stale assessment invalidates applicability of reports.

Linux preparation requirements are specified in
`plans/workbench-execution-isolation.md` section 7, not implemented or downloaded.
Default capture still rejects all .env files including templates. A separate UI
action calls `POST /api/execution-materials/exclusions` to propose exclusion of the
single fixed path `apps/web/.env.example`. No arbitrary paths/globs are accepted.
The ordinary file is read only for hashing; no raw values are returned or stored.
The UI displays path, bytes, SHA-256 and reason before a cancellable confirmation.
Freeze requires `confirmExclusions:true` and the exact `exclusionDigest` bound to
review/packet and source manifest. Changed bytes, sources or packet invalidate it.
Symlinks, directories and other credential candidates are never exempted.

Manifest v2 binds included-file contentDigest plus exclusion audit metadata. The
excluded file is never copied; confirmation metadata is retained in the record,
and inputScope lists it as uncovered. Source drift is rechecked during freezing;
completed records audit the frozen copy/review, not later source-template edits.
Old v1 records retain their historical hashes and remain assessable. Unexpected
.env files in a copy make it stale. Schema stays v10 (JSON payload only).
This does not prove a template is credential-free, complete input closure or
authorize execution. No Linux dependency preparation is performed.

Frozen records also retain `dependencyScope`, bound to the material digest.
Using the admin's YAML parser, this checks pnpm lock v9 importer specifiers,
fixed workspace patterns (`apps/*`, `packages/*`), local workspace targets,
reachable dependency/optional snapshots and artifact integrity metadata presence.
Peer-qualified snapshot keys and cycles are handled. Duplicate keys, unsupported
YAML tags and excessive aliases fail; diagnostics cap at 200, graph traversal at
10000 nodes/50000 edges. No project module, hook or install script is executed.
Unsupported formats/protocols are reported, never guessed as valid.

This is metadata inspection only: peer satisfaction, overrides/catalog/patch/hook
semantics, platform filtering, downloaded artifact hashes, registry trust, native
modules and installed layout are not verified. Omitted lock importers are reported
explicitly; this does not validate a whole-workspace frozen install. Reports are
at most partial_pass, and never enable isolated_linux or legacy execution.
Old records without dependencyScope display unchecked. Schema remains v10.

## Linux Dependency Identity Plans

Each current frozen material offers a plan-only form. The authenticated
`POST /api/execution-materials/dependency-plans` endpoint accepts materialId,
confirmPlanOnly=true, image, platform, nodeVersion, pnpmVersion, sourceUrl and note.
Image must be a registry/repository@sha256 reference without a tag or credentials;
platform is explicitly linux/arm64 or linux/amd64. Versions must be exact, Node
at least 22.18.0 and pnpm equal to frozen root packageManager. The HTTPS source
link permits no credentials, query or fragment and is never fetched.

Records bind material/review/packet/lock digests and fixed policy: no lifecycle
scripts, host dependencies/credentials, runtime networking or runtime install.
Status is always planned_unverified with metadata_valid_only, and artifactVerified,
imageInspected and linuxTested all false. Prepare/execute/publish are false. User
values are assertions, not discovered versions, registry trust or verified images.

Records append inside the existing execution_materials JSON (schema v10). Identical
normalized plans deduplicate; changes append a new timestamped ID, up to 20 per
material, without overwriting history. Listing reassesses copy/review validity;
stale material rejects new plans and shows old bindings as stale. This uses the
existing single-process synchronous store, not a cross-process lease/append protocol.
Old materials without plans remain readable. No install, pull, runtime command or
network access occurs. Dependency preparation and isolation testing remain pending.

## Preparation Readiness And Contract

Listing computes plan readiness from the revalidated material, exact plan identity
hash, review/lock binding and material-bound scan reports. Current bindings yield
`blocked_unverified`, never ready; invalid bindings yield `stale`. Missing/failed
scans, partial scope, omitted importers and excluded runtime inputs are explicit
blockers, alongside missing actual image/artifact verification, preparer and OS
isolation. User-supplied validation flags cannot clear these blockers.

Current plans offer a contract download through authenticated
`POST /api/execution-materials/preparation-contract` with materialId/planId. The
service rechecks bindings before export; stale export returns 409. Export is a
deterministic digest-bound `specification_only` JSON with source manifests, plan
identity, scan reports and required preparer outputs. No host paths, config code,
raw source bytes or credentials are included. This response is derived, not a new
approval or durable verified-artifact record; schema remains v10.

The contract requires independent authorization, a cross-process lease, isolation,
effective budgets and deny-by-default preparation network policy. It specifies
observed image/platform/versions, artifact hashes, sanitized-log digest, native
module results and explicit lifecycle/reconciliation outcomes. A trusted future
adapter must verify output bytes, not accept pasted assertions. No output-import
API, actual preparer, authorization grant or runtime adapter is implemented here;
export remains possible for specification review while prepare/execute/publish
remain false. Offline exports can become stale and must be revalidated before use.

## Execution Intent Lease Foundation

Schema v11 adds execution_intents and a partial unique active-slot index. Existing
databases are backed up before migration. Upgrade with other controllers stopped;
concurrent first-time migration is not supported. Once initialized, SQLite
BEGIN IMMEDIATE transactions serialize independent connections/processes reserving
the single isolated_linux_preparation slot. Reserved and needs_reconciliation both
occupy it. Request IDs deduplicate matching ownership and input identity only;
replay does not renew the lease or grant permission.

The internal store API supports reserve, heartbeat and cancelBeforeLaunch; there
is no HTTP mutation API or runtime launch path. A 1000..60000ms lease requires the
owner instance ID and a 256-bit hex nonce, persisted only as SHA-256 and never
returned by listing. This is an accidental-control barrier, not protection from a
same-user process with database access. Input digests here are opaque bindings:
a future adapter must validate materials, plans and separate authorization before
calling reserve. Reservation alone is never permission to prepare or execute.

Expired leases become needs_reconciliation on list/mutation and never auto-release
or transfer. Wrong owners and expired owners cannot heartbeat or cancel. Live
owners can cancel only because this slice cannot create a runtime; no general
post-launch release method exists. Restart does not infer absence from a dead PID.
No reconciliation-clear action exists until trusted runtime identity inspection is
implemented; an abandoned reservation deliberately blocks the slot. Clock rollback
can delay expiration; PID/runtime ownership, launch/stop, timers, manual verified
reconciliation and hard resource budgets remain pending.

State exposes redacted control-plane history in the execution policy panel. This
lease is not wired into legacy previews, official collection, plan JSON appends or
dependency preparation. Those workflows do not acquire new cross-process safety.
Do not interpret this foundation as completed I3 or OS isolation.

## Launch Identity State Machine

Schema v12 rebuilds the intent table to add launching/identity_recorded states and
runtime identity metadata, retaining v11 records and backing up before migration.
An internal beginLaunch call requires a live reserved owner and persists a random
launchAttemptId, declared Docker/Podman kind, digest-pinned image, Linux platform
and SHA-256 of a separate runtime ownership nonce. No runtime call occurs.
Once launching, cancelBeforeLaunch cannot release the slot.

Internal recordLaunchResult accepts only identity_reported (full 64-hex instance
ID) or unknown, bound to owner, attempt, runtime nonce, image and platform. Identity
replays deduplicate; changing a recorded ID or launching again is rejected. The
reported identity remains unverified; runtimeCreated is null after any launch
intent, never true based on a declaration. No runtime absence is inferred from
unknown, process exit or restart. Unknown immediately requires reconciliation;
launching/identity_recorded lease expiry also retains the occupied slot and metadata.
Heartbeats remain owner-checked; cancellation is reserved-only. No stop/release,
runtime inspection or HTTP mutation endpoint exists, and all permissions stay false.
Listing redacts both control and runtime ownership hashes/nonces. Actual adapter
verification, material/authorization enforcement and trusted reconciliation remain
pending. Full immutable IDs currently target Docker/Podman 64-hex IDs only.

## Read-Only Runtime Identity Rules

The internal compareObservation function compares complete intent/attempt/runtime/
instance/image/platform/controller/plan identities and a private runtime nonce hash.
Observations must have a known state and a non-future timestamp at most 5000ms old.
Missing instance IDs, absent/unknown runtime, mismatches and clock ambiguity reject
the comparison. Exact assertions yield claims_match_only, never verified identity
or stop/release permissions. This pure comparison is not daemon inspection, and
there is no HTTP observation upload API. Observations/nonces are not persisted.

The policy panel offers authenticated POST /api/execution-intents/inspection-contract
with an intent id, downloading a deterministic digest-bound specification. It lists
redacted expected identity and pre-stop checks even for missing/expired instances;
such exports are useful for reconciliation design, not action authorization. It
does not change the database, renew/release leases, inspect a daemon or stop anything.
Expired control state is reflected in the export without mutation. No raw ownership
nonces/hashes appear in exported contracts or comparison reports. Schema stays v12.

Future inspection must use trusted daemon responses, resolve the platform-specific
image digest, check private ownership and reinspect immediately before any action.
Labels alone and an absent response cannot prove ownership or safe cleanup. Verified
stop, resource-remnant checks and reconciliation release remain unimplemented.

## Fixed Inspect Command Profile And Parser

The internal inspectProfile/compareInspectResults store helpers now bind a fixed
Docker/Podman parameter profile and parser to persisted intent identity. Commands
are only container inspect <full-id> and image inspect <digest-reference>, with a
fixed executable allowlist, no shell, 5s target timeout and 1 MiB per stdout. These
are specifications, not enforced subprocess limits: no subprocess runner exists.
Neither helper is exposed as an HTTP upload/run API. Schema remains v12.

The parser accepts one JSON object in each result array, complete successful output,
bounded stdout and no stderr; failures/timeouts/ambiguity remain unknown, never
inferred absent. It checks exact container ID, container/image content-ID linkage,
RepoDigests membership, Linux architecture and consistent state flags, then compares
private ownership and all required labels against persisted identity. Raw inspect
JSON can contain Env/secrets: it is processed in memory only, not returned, logged
or persisted; result reports contain fixed error codes, not raw error text.

Even matching fixtures produce claims_match_only, never verified identity. RepoDigest
metadata may reference a multi-platform index, labels may be forged, and daemon
endpoint/context, executable trust, image signatures, version-specific Docker/Podman
schemas and actual platform manifest resolution remain unverified. No runtime CLI
is invoked, no host environment is inherited by a runner, and stop/release stay off.
Future runner must pin daemon/context, sanitize environment and enforce actual
timeout/output bounds; missing or unexpected fields fail closed.

## Fixed Daemon Policy And Simulated Sessions

Internal simulateInspection now binds the full persisted intent snapshot to checks
before, between and after the two simulated inspect steps. It requires a live
identity_recorded lease and exact unchanged snapshot, including attempt, identity
and lease timestamps. Another connection's heartbeat or any state/identity change
invalidates the session conservatively. This is comparison fencing, not a lifecycle
lock, ABA-proof revision counter or permission for subsequent actions.

Two explicit Linux-system profiles specify Docker unix:///var/run/docker.sock or
Podman unix:///run/podman/podman.sock via fixed global arguments, a fixed working
directory and an environment containing only LANG/LC_ALL. No inherited runtime
contexts, HOME, PATH or credentials. Mac Desktop and rootless profiles, private
directory provisioning, socket/daemon identity, executable trust and Podman config
isolation are not implemented or validated. Profiles fail rather than fall back.

Only an explicitly injected simulator is supported; no spawn, CLI, socket access
or HTTP simulation/upload endpoint exists. Results are marked simulated and never
verified. Callback errors are redacted. Real timeout/output enforcement and trusted
daemon selection remain pending, and all operation permissions remain false.
Schema remains v12; simulated sessions do not persist observations or modify intents.

## Target Budget And Launch Protocol

The policy panel can export authenticated GET /api/execution-launch-protocol as a
deterministic, digest-bound specification. Budget is shared with policy: 2048 MiB
memory, 2 CPUs, 128 PIDs, 1024 MiB target temporary space and 600000ms lifetime.
effectiveLimits is null and all capabilities false; schema remains v12.

The Docker Linux-system template maps memory/swap, CPU, PID, readonly root, nonroot
UID, dropped capabilities, no-new-privileges, no log driver, no pulling, a bounded
/tmp tmpfs and readonly frozen-source placeholder. The image and source placeholders
make it explicitly incomplete, not a command generator or runnable invocation.
It describes create-before-inspect-before-start, not a one-shot run. Podman parameters
are left unsupported rather than assumed equivalent.

Network none is only an offline probe template; no published ports or browser
preview topology is defined. It cannot implement the existing Next preview.
Application must already be built with verified Linux dependencies; cache placement
on readonly mounts is unresolved. /tmp size is not total disk quota, and timeout
requires a durable trusted controller, not a runtime create flag. Actual cgroup,
seccomp, swap, daemon-side mount paths and cleanup remain untested. No runtime is
called, artifact prepared, authorization granted or host path accepted by this API.

## Offline Runtime Settings Comparison

Inspect parsing now includes a Docker-only settings report for the offline probe
profile: exact memory/swap/CPU/PID settings, non-root/read-only root, capabilities,
security options, private namespaces, no devices/extra mounts/ports, logging/restart,
core limits, tmpfs, readonly staging mount, entrypoint/command and minimal Env.
Missing or different expected fields reject matching; Podman remains unsupported.
Staging path must match the private /run/gachia-staging/<uuid> profile, but syntax
does not verify ownership or daemon-side path integrity. Current intent identity
does not supply a verified staging path, so it cannot clear this blocker.

Identity comparison remains a separate status; parser overallStatus is blocked if
either identity or settings fail, otherwise only claims_only_unverified. Reports
return codes rather than raw settings/secrets. Even an exact fixture produces no
effectiveLimits or start/stop permission. Additional backend fields, cgroup stress,
seccomp, submount races, total disk and durable lifetime remain uncovered. This is
not real daemon evidence or a complete allowlist for every Docker version. Schema
stays v12 and there is no runtime/API observation upload or action endpoint.

## Staging Mount Contract

Each current plan can export authenticated POST /api/execution-materials/staging-contract
with materialId/planId. Export revalidates material, review and plan bindings; stale
returns 409. The digest-bound specification includes source file hashes/exclusions,
material/plan/packet/lock/image/platform identity and private daemon-side staging
template. No host source path, raw source bytes or credentials are exported. It
does not create directories, copy artifacts or mount anything; schema remains v12.

An internal metadata checker defines only ordinary read-only files under
apps/web/node_modules and apps/web/.next, with 20000 files/1GiB budget and required
Next CLI/BUILD_ID entries. It rejects traversal, credentials, unsupported types,
duplicate or source/directory collisions, malformed hashes/modes and binding drift.
Errors cap at 100 with complete count; valid metadata remains metadata_only_unverified,
artifactBytesVerified=false and all staging/start permissions false. There is no
HTTP manifest upload or trusted verifier. Declared hashes are not actual bytes.

pnpm symlink/hardlink layout requires an explicit future materialization policy;
links are unsupported, not silently followed. Actual composer must verify complete
inventory/bytes/modes and source integrity before/after composition, preserve private
ownership, reject submount/link races and verify daemon-side paths immediately before
mount/start. Mac host paths are not interchangeable with Linux VM paths. Cache,
build closure, Linux artifacts and actual immutable staging protection remain pending.

## Internal Local Artifact Byte Check

verifyArtifactBytes reads a caller-selected internal root only after metadata passes.
It streams SHA-256 through O_NOFOLLOW descriptors and compares exact sizes and modes,
inode/device/link counts and timestamps before/after reads. Two complete inventory
scans detect missing/extra files, undeclared directories and between-scan changes.
Symlink paths/ancestors, hardlinked files, special files, cross-device boundaries and
read budgets are rejected; no copy, extraction, chmod or runtime call occurs.

Successful local fixtures yield local_bytes_match_only and artifactBytesVerified=true
strictly for that two-scan local snapshot, not Linux provenance or future mounting.
No intake/API path, durable verified record or execution permission is added. Reports
return fixed codes and digests, not host paths, file bytes or raw errors. Schema v12
is unchanged. Concurrent same-user ancestor replacement, same-device submounts and
post-check mutation remain uncovered; descriptor-relative traversal/immutable
staging and daemon mapping still require a trusted composer. Test hook betweenScans
is internal fault injection only, not a user action or verifier authority.

## Integration Gap Inventory And Mac Proposal

The policy panel exposes a deterministic isolation-integration report and download,
covering source closure, Linux artifacts, staging, control plane, runtime and actual
isolation tests. Status is blocked_not_integrated regardless of executable discovery.
Docker integration is currently deferred by project policy. On macOS Docker Desktop
is only a future candidate, not a selected runtime, installed software finding or
license/installation authorization. Other platforms remain
unselected. The inventory performs no additional filesystem or runtime discovery.

If integration is resumed, the proposed order is runtime/license/scope confirmation, separately authorized
bounded read-only discovery, pinned Mac daemon profile/runner, separately approved
Linux artifacts/staging, then sentinel isolation acceptance. No implicit installation,
VM startup, context switch, image pull, container operation or slot release is allowed.
Current Linux-system profiles cannot be reused as Mac Desktop daemon mappings.
The current schema is v13 (the source-history cursor index); this report does not
change the schema, record a durable runtime decision or grant permissions.

## Explicit Mac Read-Only Discovery

The panel now offers POST /api/mac-runtime-discovery with confirmReadOnly=true
after a scope confirmation. It examines two fixed Docker.app locations, four CLI
paths and at most 32 hashed ~/.docker/contexts/meta entries. Only bounded 16KiB
ordinary meta.json files are parsed; links, aliases, oversized/changing files and
hardlinks reject. Context names/endpoints are classified, never returned verbatim;
remote endpoints and arbitrary names are redacted. config.json, TLS directories
and login credentials are never read. No CLI, socket, daemon or VM action occurs.

Reports are transient, not saved in SQLite, and never grant runtime trust. Local
paths appear for the fixed installation scope only. Non-Mac discovery returns
unsupported. Other locations, versions/signatures, active context and daemon trust
remain unchecked. This is not a complete installed-software inventory or a runtime
selection. Schema remains v12 and installation still needs separate authorization.

## Local Official Collection History

Docker integration is deferred by user choice; normal browser workbench features
remain usable without it. The official source panel now queries local saved runs
by article title/ID and collection status, 10 per page (API maximum 20), descending
keyset cursor. List summaries omit raw bodies; an authenticated detail request
loads one saved record as escaped text. GET /api/official-source/history supports
query/status/limit/before; GET /api/official-source/history/<runId> returns a record.
No source request, deletion, approval or historical excerpt import occurs.

This is stored collection-attempt history, not complete official announcement history.
Failed/collecting records may carry the previous successful articles and digest;
lastAttempt/status and lastSuccess remain distinct. Search can therefore match
retained articles in failure records. Case folding is SQLite's built-in lower
(primarily ASCII); full-text multilingual normalization is not implemented. Queries
are parameterized and output-bounded, but JSON filtering may scan older rows and is
not an indexed full-text solution. Retention is unchanged.

History additionally supports inclusive from/until UTC dates based on lastAttempt,
not article publication or lastSuccess. Missing attempt dates do not match a date
filter; without date limits they remain visible. Invalid/calendar-overflow dates
and reversed ranges reject with 400. status=failed includes access_failed and
parse_failed only, not collecting or reconciliation. UI offers failed shortcut
(preserves other filters) and reset (clears all filters and returns to page one).
Pagination uses the applied filters even if the form is edited before submitting.
Sequence fencing prevents older query/detail responses replacing newer results;
failed queries clear results and disable pagination until a successful retry.
No automated collection, data deletion or approval changes are introduced.

History now includes previous-page navigation and a page/row-count indicator.
Only request cursors are retained in memory; returning to page one uses the
applied filters, not unsubmitted form edits. A fresh query/reset clears the cursor
stack. Both directions disable while loading and after a failed query. Pages are
live read-only queries, not a frozen snapshot: newly appended records may appear
when returning to page one. Reloading starts a new pagination session.

Schema v13 adds official_source_runs_source_cursor(source_id,id DESC), with the
existing pre-upgrade SQLite backup policy. This indexes source selection and
keyset ordering, not JSON status/date fields or article substring matching.
The 5,000-row mixed-source fixture verifies v12 backup/record preservation,
indexed source/cursor lookup without a temporary sort, bounded filtered traversal
without duplicates, and idempotent reopen. It is not a production latency benchmark.

## Read-only data quality diagnostics

The state scan includes index.quality (version 2, diagnostics_only), shown as an
expandable report beneath the existing checks. For each source entity, an existing
description or summary field group is checked for nonempty zh/en/ja text. Entirely
absent top-level optional groups are not treated as failures. Version 2 also checks
guide content and material source groups, skill name/description and guide FAQ
question/answer. FAQ uses bare English plus Zh/Ja suffixes (not En), matching the
existing contract. Present nested collections must be arrays of objects; required
nested groups are checked even on empty objects. Not all body fields are covered,
and this does not compare numbers or prove translation semantics.

Explicit character/weapon/material/guide Id/Ids fields are checked recursively.
Invalid types/IDs, missing targets, unavailable datasets and unknown Id/Ids keys
are separate diagnostics. Prose/link references and other datasets are uncovered.
Output caps at 2,000 checks, reference traversal at 5,000 objects/depth 16, and
nested field scans at 200 items per collection. truncated=true is incomplete,
not a successful clean verdict. Duplicate target IDs remain existing scan checks.

Confirmed facts are compared against today's UTC date using recorded validFrom /
validUntil, including both endpoints. Past ends, future starts, unknown windows,
invalid or reversed dates produce needs_review diagnostics only. Pending/rejected
facts are not included. No review, fact, task or database record is changed, and
a date warning neither revokes approval nor declares an event actually closed.
The report carries false autoConfirm/edit/execute/publish permissions and explicit
uncovered semantic, current-game-state, alias, build and production checks.

Literal task page suggestions now also match nonempty English and Japanese source
labels, without introducing a nickname dictionary or fuzzy/semantic matching.
Existing task snapshots remain unchanged. Schema remains v13; no network, model,
build or external runtime is invoked by this diagnostic stage.

## Read-only record and capacity snapshot

The explicit journal-panel button reads authenticated GET /api/storage-health.
A deferred SQLite read transaction reports page_size/page_count/freelist_count,
logical allocated/reusable bytes, schema version and counts for 15 fixed tables.
This is a logical database snapshot, not actual file/directory size, disk free
space, a growth trend or a restore-readiness check. No evidence body, host path,
raw SQL or user-supplied table name is returned.

No checkpoint, VACUUM, integrity scan, deletion, backup or restoration is invoked.
There is no retention policy or cleanup action. Failure clears the previous report
and supports retry. Reading counts can scan table indexes on a large database;
this manual diagnostic is not a scheduled background monitor. Schema stays v13.
The database-only recovery fixtures below complement migration backup tests;
neither proves complete disaster recovery.

## Temporary database recovery drills

storage-recovery.test.mjs exercises four bounded scenarios entirely in temporary
directories, with no restore/delete API or daily database access:

- A completed VACUUM INTO snapshot, copied to a separate restore target, retains
  exact evidence, pending facts, task/event history and source bytes; subsequent
  source writes do not appear in the restored snapshot. integrity_check is ok.
- A SQLite max_page_count fixture raises SQLITE_FULL, rolls back partial
  source/history/event writes, and permits a later write after reopening. This
  raw SQLite transaction fixture is not host ENOSPC, WAL exhaustion or an
  end-to-end service disk-full simulation.
- A RAISE(ROLLBACK) trigger exercises the actual store transaction helper after
  automatic rollback. The original error is retained, current/history/event
  records remain unchanged, and retry succeeds once the fixture trigger is removed.
- A dedicated writer child is terminated with SIGKILL after one committed WAL
  record and one uncommitted insert. Reopen retains only the committed record,
  accepts a new write and passes integrity_check. This does not simulate power
  loss or service/source recovery orchestration.

The store and read-only statistics helpers only issue ROLLBACK if SQLite still
has an active transaction, avoiding masking auto-rollback errors. Schema is v13.
Full workspaces/dependencies recovery, all-table historical approvals, host
disk-full and power-loss durability remain uncovered; daily data restoration
still requires a separately approved policy.

Recovery coverage now also includes a separate snapshot of three synthetic fact
reviews and a two-revision chain: exact history/digests, permanent invalidation
after revocation/reconfirmation, current second revision, false publish permission
and idempotent request replay are retained. These are temporary test approvals,
not human decisions or restored daily records.

Non-SQLite bytes and a 100-byte truncated SQLite copy reject without rewriting
the candidate or source file. Initialization errors explicitly close the database
connection. This is not comprehensive corrupted-page detection: there is no
trusted backup import/restore validator or runtime integrity scan.

A mocked VACUUM INTO failure verifies migration stops before v12 schema/index
changes, leaves committed history intact, and permits later v13 migration with
one successful backup. This exercises the actual migration failure branch, not
real host ENOSPC, permission denial, partial backup-file cleanup or power loss.

## Same-database collection fencing

Collection now reserves a UUID attempt with a fixed 60-second deadline in the
source payload using BEGIN IMMEDIATE. Cooldown checks, intent/current-history
writes and event logging are atomic across connections/processes sharing the same
SQLite database. This reuses schema v13; no execution-isolation slot is involved.
An additional service starting before the deadline preserves collecting state,
instead of incorrectly treating another live collector as interrupted.

Startup and explicit collection reconcile expired (or legacy unfenced) collecting
records once to needs_reconciliation with a fresh 60-second cooldown, preserving
prior snapshots. No startup/state read/timer automatically fetches or retries.
Completion requires the exact current attempt ID, collecting state and unexpired
deadline; late results cannot overwrite a reconciled or newer attempt. There is
no lease renewal: the production fetcher has a 5-second DNS plus 15-second request
budget, below the 60-second fence, and long suspension expires conservatively.

This is database write fencing, not OS cancellation of a suspended network
request. A retry after expiry is always explicit; an old request may still be
physically pending and its result will be rejected. Wall-clock jumps, different
databases/hosts, same-user direct database edits and full distributed locks are
not covered. Manual fixture saveSourceRecord remains an internal bypass, not a
collection API. Tests cover two-service live startup, expiry/late completion,
cooldown/no automatic fetch and two child processes racing for one attempt.

## Bounded directory capacity metadata

The manual storage-health response now adds files: an asynchronous metadata-only
inventory of the configured workbench directory. Fixed top-level categories are
database, SQLite sidecars, migration backups, workspaces, execution materials and
other. Nested files inherit their top-level category, so workspace dependencies
and logs are not separately semantic-classified. No filename/path/body is exported.

Only ordinary single-link files contribute stat.size (apparent bytes), not allocated
disk blocks. Symlinks, hardlinks, special files and different-device children are
skipped; a linked root is rejected. Missing/error/depth-skipped entries produce
partial, never a successful zero-space verdict. Defaults are 5,000 entries,
depth 16 and a cooperative 500ms elapsed budget checked between filesystem calls.
An individual slow syscall can exceed that budget; this is not a hard timeout.
Only one scan runs per server instance; another manual request receives 409.

The inventory is not atomic with the SQLite logical snapshot, and same-user
ancestor replacement, same-device mounts or concurrent changes are not completely
fenced. It is not a security boundary or a full inventory of external Git/dependency
storage. No disk-free calculation, growth trend, content read, cleanup, checkpoint,
compression or restore is performed. Schema stays v13.

## History list projection

The production history query now projects status/date/digest and article
id/title/publication metadata in SQLite. Full payload/rawHtml is no longer copied
across the SQLite/Node boundary and decoded for list results; details still read
the exact saved payload. Missing metadata appears as JSON null, and absent
articles produce an empty list. Search remains title/ID substring only.

The 5,000-row test now examines EXPLAIN QUERY PLAN for the actual filtered query,
not a simplified lookup: source/cursor index selection and no temporary sorting
are asserted. A ~540KB article-body fixture produces less than 1KB of SQLite list
rows while detail bytes remain exact, and body-only text does not match search.
SQLite still parses JSON internally and may scan source history for filters;
this is not an indexed JSON/full-text solution or a latency benchmark. Schema v13
and saved records are unchanged.

## Search modal background isolation slice

SearchDialog uses the actual web modal-background helper on its outer overlay.
It walks ancestor branches up to body, making only their siblings inert, so a
nested dialog never inerts its own ancestor. Dynamic background siblings are
observed; close disconnects the observer and restores original inert states and
inline body overflow before the existing trigger-focus restoration. Visual styles
and routes are unchanged. This is single-search-modal ownership, not a general
stacked-modal manager; concurrent modal/inert/scroll writers remain uncovered.

The Chromium modal-background test transpiles and executes the actual TypeScript
helper on a nested DOM at 1440/390 widths, verifying background focus rejection,
late siblings, pre-existing inert and exact scroll-state restoration. Source
contract tests verify SearchDialog wiring. It is not an integrated freshly built
Next app check or screen-reader/real-device accessibility certification. Arrow-key
results and stacked dialogs remain pending. It joins the independent browser
suite; backend-only tests now skip seven browser-specific cases.

## Search arrows and result status (2026-10-12)

The actual search-keyboard helper moves focus from input to the first/last result
with ArrowDown/ArrowUp, between native result links, and back to input at either
end. It does not consume Enter, so links retain native navigation. Composing IME
events and modified arrows are ignored; retry-button arrows and empty lists are
untouched. SearchDialog also ignores Escape while composing. Existing Tab/Escape
and focus restoration remain. This is native link navigation, not an ARIA combobox.

Ready result count (explicitly capped at 30) and empty/blocked-query messages use
polite atomic status regions; count/navigation instructions have zh/en/ja text.
No debounce or actual screen-reader announcement timing audit is claimed.
Chromium executes the real TypeScript helper on desktop/mobile DOM fixtures,
covering boundaries, empty results, modifiers/IME and native Enter. Source tests
verify component wiring/status attributes. Full Next integration, actual IME,
screen readers, physical devices and stacked dialogs remain unverified. The
independent browser suite now contains eight cases, skipped in backend-only runs.

## Explicit Next search integration harness

tests/next-search-integration.mjs requires WORKBENCH_NEXT_ORIGIN as an explicit
127.0.0.1 HTTP origin. It never starts a preview, installs dependencies or grants
approval. WORKBENCH_NEXT_REPORT optionally saves the developer report. Chromium
blocks non-origin requests and runs zh/en/ja at desktop/mobile widths, exercising
actual SearchDialog inert/scroll, arrow/Tab boundaries, Escape focus restoration,
empty status/reset and native Enter localized navigation. The harness retries the
opening click while waiting for hydration; it does not certify pre-hydration UX.

2026-10-12 report next-search-accessibility.json records six passing combinations
against the earlier independent no-credential snapshot, with only the three latest
search files synchronized/hash-checked. The Next process was stopped. Initial
hydration-before-click failures are preserved separately. It is not the entire
current worktree, a production build or human acceptance. Preview HI3 OG image
404 is an observed separate resource gap. Real screen readers/IME/devices and
stacked dialogs are still uncovered; schema and daily records are unchanged.

The 2026-10-12 readiness/OG follow-up disables the SSR search button until mounted,
with localized preparing labels/aria-busy, so it no longer presents an apparently
actionable pre-hydration trigger. The Next harness now requires one actionable
click, not repeated opening attempts. Three no-JavaScript locale checks confirm
the SSR disabled state. hi3.webp is an exact copy of the existing generic default
asset, not new official/game-specific artwork, resolving the observed 404.
next-search-ready-og.json records six real Next combinations plus HTTP image
checks, five synchronized-file hashes and stopped preview; Web 126 tests, types
and targeted lint pass. Earlier failure/success reports remain historical. No
claim is made for JavaScript-disabled search functionality or production rollout.

## Four read-only workflow slices (2026-10-12)

Header search/auth share one modal discriminator. Auth uses background isolation,
Tab/Escape and original trigger restoration; Cmd/Ctrl+K is ignored while another
modal is open. Dynamic search loading provides its own focus/scroll/inert lifecycle
and cancel button. This is single-header coordination, not arbitrary modal stacks;
delayed/failed chunks and actual OAuth remain uncovered. The independent Next
report next-modal-lifecycle.json has six passing locale/viewport combinations.

Quality coverage lists rulesVersion, observed/missing datasets, per-kind check
counts and confirmed-fact counts, with complete=false: zero findings is not full
coverage. Storage reports add two in-memory server observations (not persisted
growth), count/logical deltas, apparent deltas only for complete metadata scans,
15-table recovery fixture coverage, and saved source/preview reconciliation counts.
No external inspect/stop/retry or restore/delete action is available.

Authenticated GET /api/release-plan and its manual UI read five fixed repository
config paths and show SHA-256/status plus package scripts as declarations only.
HI3 main Worker/shared assets/Router impact is a candidate plan, not observed cloud
state or complete dependency analysis. All execute/upload/publish/rollback flags
are false. No commands, builds, deployment or cleanup are invoked; schema v13.

## Explicit search-module load recovery

SearchLoader replaces next/dynamic's loading-only fallback with a cancelable,
localized loading/failure dialog, 15-second promise timeout and explicit retry.
Unmounted attempts ignore late imports; switching to the ready dialog restores
loading ownership/focus first. No global close-search event or automatic retry is
used. The current Next dev webpack import retries after a simulated 503; production
chunk/CDN cache failures are not fully covered. Closing does not cancel underlying
browser script transport, but late results cannot reopen the unmounted loader.

next-search-loading.mjs runs only against an explicit localhost preview and holds
the observed dev search chunk, closes before release, then injects 503 and retries.
Six zh/en/ja desktop/mobile cases pass; normal Next integration also passes six.
Both reports preserve synchronized-file hashes and stopped preview state. Timeout
uses virtual-time unit tests; no real 15-second timeout claim. Web128 tests/types/
targeted lint pass. No daily database or deployment is touched.

## 代理审核身份补充（2026-10-12）

字段审核与草案审核新增`reviewerType`（`human`/`agent`/`unspecified`）、`authorizationBasis`及服务端固定`identityAssurance: self_reported`。代理必填授权依据；这些字段不授予权限，不替代事实检查、精确差异、版本及发布门禁。旧客户端省略类型时写为`unspecified`，历史缺失字段显示身份未注明，不自动认定人工；没有改写历史数据，schema仍v13。

界面提供身份选择和授权依据，事实状态改为中性“已确认”，审核历史明确类型；草案历史及导出保留元数据。真实公告有限代理核验报告见`reports/workbench/real-announcement-agent-review.json`，在独立临时库进行，不是日常数据库记录或生产批准。自动测试的代理身份均为合成夹具，不是真实内容审核。

## 真实公告隔离草案（2026-10-12）

`tests/real-announcement-draft.mjs --confirm-isolated-agent-draft`从仓库根目录显式运行，以保存的真实核验材料生成独立阶段数据库、detached草案、精确代理审核和数据预览；不加入test套件。仅改两条英文武器描述及镜像，不申请提交/发布权限。每次生成新阶段并保留，不自动覆盖或删除历史。

`tests/real-announcement-draft-check.mjs --confirm-local-preview-check`检查最新阶段数据库重开和18个固定模板浏览器案例，禁用JS/阻断网络，不运行项目代码。报告见`reports/workbench/real-announcement-draft*.json`。英文范围审核不批准未改动的本地化、status/数值，不等同于三语完整内容或Next验收。阶段路径、patch和HTML在报告内，日常数据库/主目录游戏数据不变。

三语模式：从仓库根目录显式运行`tests/real-announcement-draft.mjs --confirm-isolated-trilingual-draft`和`tests/real-announcement-draft-check.mjs --confirm-trilingual-preview-check`，产生独立新阶段及`real-announcement-trilingual-draft*.json`，不覆盖英文阶段报告。固定`announcement-descriptions.mjs`限制两个实体的六处三语描述，精确delta检查不批准其他字段，也不是通用翻译核验。中文/日文由本任务代理翻译，英文专名保留，不冒充官方本地化；报告保留本次代理语义审核范围矩阵。主目录数据/日常库不变，不自动执行项目代码或发布。

`tests/real-announcement-preview-plan.mjs --read-only`从仓库根目录读取三语阶段当前审核与实际源码，导出`real-announcement-preview-plan.json`：受影响页、源码摘要、未核验字段展示影响和metadata截断样例。`preview-readiness.mjs`仅检查固定dotenv位置/独立Next依赖路径，始终execute/install/publish=false，不替代真实启动preflight或依赖/秘密审计。当前草案无独立依赖，未执行应用；其他快照不等于本草案验收。

Web展示边界已修复（2026-10-12）：HI3目录/详情及武器搜索显示三语范围提示，metadata/OG标题中性且限定前置，Weapon JSON-LD描述附边界。`tests/next-weapon-scope.mjs <snapshot>`要求显式`WORKBENCH_NEXT_ORIGIN`为127.0.0.1，报告保留同步代码/数据摘要。开发快照6组三语双视口专项通过且停止；不是原草案或生产验收。Web133 tests/types/targeted lint通过，原草案依赖仍未准备。

`tests/real-announcement-baseline-plan.mjs --read-only`从根目录比较原三语草案与当前代码的固定20路径，生成`real-announcement-baseline-plan.json`。`preview-baseline.mjs`保留双侧摘要和不可用/缺失状态，复用依赖锁元数据诊断；所有copy/install/commit/execute/publish权限为false。不是完整源码闭包或安装许可。当前13处差异/缺失，原草案未包含新的范围提示等修复；依赖元数据partial_pass不代表依赖已安装或制品完整。不可将Web代码塞入仅JSON审核的工作区或自动提交当前dirty基线。

## 清理候选只读诊断（2026-10-12）

鉴权GET `/api/cleanup-plan`及手动面板对12类保存记录做ID/status/直接引用SQL投影（每类2000条），不加载证据正文/HTML/diff。引用记录、全部审核/任务/草案历史默认保护，待审核/活动/待对账显式标明。仅未见投影引用的证据可列为待政策审核候选，不是删除许可；超限/重复ID/悬空引用取消全部候选。输出500项、诊断100项上限显式报告。

没有保留期限或任何删除/覆盖/恢复动作。complete仅表示本次投影扫描，嵌套引用/官方来源历史/外部库/导出报告/agent-stages/真实进程与文件内容未覆盖，不当作全量影响分析。schema不变，真实清理仍单独批准。

2026-10-12后续覆盖优先于首片说明：cleanup-plan-v2扩展为14类，新增officialSources/sourceRuns；SQL json_tree仅投影配置引用键、confirmedFacts/factSnapshot事实ID和evidenceIds成员，每表10000条引用结果预算，超限/悬空/来源摘要找不到时取消候选。带来源摘要证据及全部来源历史默认保护，反向引用可见。正文/HTML/diff不传入诊断；SQL内部JSON遍历耗时无硬上限，未配置路径、外部库/agent-stages/文件/进程仍未覆盖。不是删除许可，不设置期限，schema仍v13。

cleanup-plan-v3进一步限定嵌套遍历的最新2000行输入窗口，单条payload超过1 MiB跳过json_tree并取消候选；不是CPU/耗时硬限制，顶层SQL投影仍可能解析大JSON。报告新增预算/assessment/全观察异常计数，中文界面区分预算和悬空引用，并提示0候选不等于通过；读取前清空旧结果。输出/诊断截断显式标明，不新增删除、覆盖或自动重试功能。

质量报告v3新增fieldMatrix：顶层键观察上限2000行/200键，字段分类与可选文本组eligible/checked/absent计数显式展示；缺失整组不算通过，文本存在不等于翻译准确，status/数值/名称等未由质量模块检查。configured指四类预期kind策略，额外kind通用规则可能运行。`reports/workbench/quality-field-matrix.json`为6类源数据专项，正常扫描仍4类；未扫描镜像/数据库事实，不是全schema验收或内容批准。

后续六类日常覆盖（2026-10-12，优先于首片）：scanContent额外读astral-ops/stigma-sets源数据，仅供质量诊断，读取状态/digest及缺失数据集明确。旧四类entries/files/镜像/修订指纹不变，新两类未验镜像/路由，不能据此批准编辑。configured改为六类预期存在策略而非全schema。skills/FAQ矩阵显示数组预算内元素、预期/保留文本诊断、无效组/项、缺失和截断；不验证语义。`daily-quality-six-datasets.json`保留本次日常源观察，不扫描数据库事实。

后续镜像/引用首片：配置astralOpId(s)/stigmaSetId(s)显式引用，六类映射在coverage.referenceFields。额外两类镜像独立additionalMirrors比较解析数组，保留摘要及缺失/损坏/不同/源不可用状态，问题数另列。旧修订指纹/entries和原finding门禁仍不变，不批准编辑/发布，不验路由/语义；真实只读报告`additional-quality-mirrors.json`当前两份一致。源与镜像均不改写，缺失不视为空数据。

ID诊断首片：独立idIntegrity统计已加载行格式/重复出现次数，异常输出2000项上限、总计保留；全部行扫描无硬耗时限制。显式引用目标重复时ambiguous_duplicate_target，不按存在即通过；fieldMatrix的id标格式/唯一性检查。summary.byRule只统计保留checks，ID异常另列，不是实体真实性或关联语义核验。`quality-id-integrity.json`当前六类15行ID异常0，不代表全内容批准，不改变数据/审核/旧指纹。

后续输入预算：质量函数仅处理32数据集/每集10000行/10000事实窗口，inputCoverage报告提供与观察数/异常，重复kind不静默合并，超限或重复目标集引用标不可靠。无效datasets/facts/声明显式报告，窗口外不当通过。上游文件读取/JSON解析和CPU/内存无硬限额；全局引用5000对象预算可能使后续引用未检查。`quality-input-budgets.json`当前6类15行预算内，旧报告保留历史范围，不自动批准或改写数据。

逐集引用覆盖：coverage.referenceTraversal区分完整/部分/未开始/无效跳过行、对象访问和配置/未知引用检查数，深度/对象/诊断预算停止事件显式定位；全局预算按输入顺序，不代表遗漏引用数量或语义核验。`quality-reference-traversal.json`当前6类15行完整遍历45对象、显式引用0条，不能宣称所有引用正确。对象预算先判定再计数，无执行/修改权限。

恢复矩阵v2：`recovery-draft-tables.test.mjs`扩展7类草案/执行表的独立合成SQLite快照保留测试（逐行/完整性/外键/身份/packet/HTML/幂等），恢复副本中的过期意图和保存running预览待对账且不启动进程。15表均有某项记录保留夹具不等于完整灾备，目录/依赖/真实运行态联合恢复、全部字段/故障组合和真实覆盖均未验；`recovery-table-coverage.json`仅测试覆盖声明。schema v13，无真实恢复动作。

本阶段验证：管理端186项中178通过、0失败、8浏览器项跳过；1440/390冒烟独立通过，语法/差异检查通过。未重跑独立8项浏览器全套、Web或生产构建，不代表原草案/生产验收。

发布计划v2：现有GET `/api/release-plan`增加8项门禁要求与依赖顺序，界面中文展示；所有门禁not_verified，不将配置读取/恢复夹具声明/历史报告当当前验收。固定5项输入摘要与包配置异常显式报告，不运行scripts；读取失败清空旧清单。`release-gate-summary.json`为只读配置观察，不读取日常数据库/真实草案/线上状态，不安装/提交/恢复/发布。本阶段188项中180通过、0失败、8跳过，1440/390冒烟通过；未重跑独立8项浏览器全套/Web/生产构建。

Worker/Router固定字段诊断：同次JSONC字节检查生产/预发布各5项主Worker名称、MAIN_SITE、自引用、OpenNext入口和ASSETS。预发布services不继承生产，重复绑定/目标错误为mismatch、配置/环境不可用为not_checked。`deployment-config-diagnostics.json`当前10项本地一致，但不核验产物存在/实际分流/实时绑定或全部Wrangler schema，不提升8项发布门禁。HI3归属是进程加载core或明确fallback，不重新解析任意目录源码。本阶段191项中183通过、0失败、8跳过，1440/390冒烟通过；无真实运行/数据库读写/安装/提交/发布，未重跑Web/生产构建及独立8项浏览器全套。

Router只读校验：`pnpm --filter @gachia/router check:generated`调用生成器`--check`，缺失/漂移失败但不写文件，默认生成行为不变。保留既有正则规则，不是完整TS schema校验。本次4项生成配置一致，Router26项模拟分流测试及types通过；新增HI3三种开关组合42请求到主Worker的边界检查，不代表资源存在或线上验收。`router-readonly-verification.json`为本地测试摘要；管理端192项中184通过/0失败/8跳过，本阶段未重跑浏览器/Web/生产构建，无安装/提交/真实恢复/部署。

基线清单首片：baseline-inventory仅读HEAD/status与最多2000个变更文件的工作树摘要（单文件4 MiB），分类不等于审查/批准，历史报告不提升验收；链接/超限显式未检查，两次Git观察不是原子快照，不扫描ignored/完整秘密/语义/暂存区字节。`current-baseline-inventory.json`是报告写入前的观察，不自动暂存/提交/复制草案。本阶段管理端193项中185通过、0失败、8跳过，未重跑浏览器/Web/Router/生产构建，无真实数据库/安装/发布操作。

基线清单v2局部审查修复：读取maxBytes+1上限及文件身份/元数据检查，最终路径NOFOLLOW/NONBLOCK；保留尾空格路径，仅JSON归内容数据，新增暂存/工作树状态、明确删除及byteCoverage。不是原子/OS隔离或全量基线审查，父目录并发替换等仍未全面防御。尾空格/换行/删除/暂存差异/预算/FIFO测试补齐；管理端194项中186通过/0失败/8跳过，未重跑浏览器/Web/Router/生产构建，无真实暂存/提交/数据库/发布动作。

发布配置边界审查：config-input固定输入1 MiB有界读取，拒绝链接/非普通文件、检查身份与元数据；摘要与解析同次字节，非跨文件原子快照。JSON/JSONC重复键（含转义）及AST结构预算超限拒绝，包严格JSON，Wrangler支持注释/尾逗号；预算在AST解析后，不是硬CPU/内存限制。`release-input-boundary.json`当前10项字段一致但8门禁未核验；管理端196项中188通过/0失败/8跳过，1440/390冒烟通过，无scripts执行/真实数据库/安装/提交/发布，未重跑独立浏览器全套/Web/Router/生产构建。

Router生成器源解析改用静态TS AST：唯一顶层配置、静态字面量/包装，重复/动态/未知字段/状态/错资源路径明确拒绝，不执行配置。真实4项生成文本一致，未写生成文件；管理端198项中190通过/0失败/8跳过，Router26项及types通过，未重跑浏览器/Web/生产构建。`router-generator-review.json`仅局部验收。文本预算在文件读取后，不是硬输入/CPU限制；动态配置及完整TS语义不支持，生产门禁不提升。

后续文件边界优先：router-config-files在文件读取阶段限制1 MiB，拒绝链接/非普通文件并检查身份/元数据，结果带同次字节摘要；缺失仅接受真实父目录。默认生成写前核对/NOFOLLOW/新建EXCL，仍非原子/崩溃安全替换，不能保证恶意父目录或全部并发防御。真实只跑--check且4项一致；临时写入夹具通过，管理端199项中191通过/0失败/8跳过，未重跑Router/types/浏览器/Web/生产构建。`router-generator-file-boundary.json`不提升发布门禁，无安装/真实提交/数据库/部署。

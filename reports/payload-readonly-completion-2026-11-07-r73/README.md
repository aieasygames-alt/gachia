# R73: read-only completion and source advancement

This change addresses the R72 stop after a known successful deployment and successful public acceptance. It does not replay deployment, rewrite the stopped journal, change preview timestamps or widen their validity window.

The completion entry accepts only the exact stopped sequence with a recorded successful deployment, no pending write, the `Unified promotion preview expired` reason and the original passed public evidence. Existing readers independently reopen the original module receipts, deployment API responses and fresh-at-write preview renewal. Unknown writes and other stop reasons remain rejected.

Completion verifies current/ancestor/original promotion CI, checks the candidate and recovery immutable modules, observes topology before and after fresh public acceptance, and requires the same exact deployment ID. The new local receipt pins those observations and the original journal. Completion observations must finish within 15 minutes. A failure marker prevents a partial receipt from being consumed.

The published-source reader independently validates this new receipt type, including every new public body and the old deployment evidence. Ancestor verification also checks the original promotion executor CI. The source index format and actual source-advance implementation are unchanged.

The supported command is `scripts/unified-promotion-completion.ts complete --request FILE --pin SHA256`. It has no deployment adapter, release-key, retry or force option; all cloud access uses the GET-only production reader. The live runner is an untracked local report artifact and only permits `complete` and `advance`.

Focused evidence tests (35 cases) and the actual fixed-function completion-to-115-source combination passed. Full local tests, exact CI and live execution results are recorded separately. No completion or source advancement is claimed merely by adding this code.

Local checkpoint: CMS 380/380 (353 seconds), fixed child 119/119, shared protocol 205/205, documentation/scope 38/38, typecheck passed. All completed with zero skipped tests. Exact CI and real execution remain pending at checkpoint creation.

## Actual completion and source-format correction

Commit `27c2a91` passed full CI `42345480293`. Its real completion command succeeded with `production_accepted`, zero cloud writes, and receipt pin `72ab19c2a7cbdd45d88eb1914372238878f4638331635a10183fd5bb9a132a0b`. It freshly checked 1,267 public responses and independently reopened the result.

The first source-advance attempt stopped before creating its index: `sea/raw-guides.json` was formatted differently in the published artifact and sealed source (368,524 versus 392,669 characters). Structured JSON values are exactly equal. All other 89 public pairs match bytes already. This is not a content or deployment difference.

The adapter now derives public JSON baseline bytes from the accepted artifact only after exact structured equality with the reviewed sealed source. Existing artifact/public-acceptance byte checks stay in place, and TypeScript sources stay unchanged. Content/type/array changes and corrupt input hashes are rejected by regression tests. A real offline projection verified all 115 sources and 90 pairs; only the one formatting difference changes baseline bytes.

Correction verification: CMS 380/380 (359 seconds), shared protocol 206/206, typecheck passed. The original failed attempt is retained; a separately named `advance-02` read-only attempt requires the corrected exact CI. No deployment retry or completion rewrite is involved.

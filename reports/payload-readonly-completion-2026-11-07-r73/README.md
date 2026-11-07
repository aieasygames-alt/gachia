# R73: read-only completion and source advancement

This change addresses the R72 stop after a known successful deployment and successful public acceptance. It does not replay deployment, rewrite the stopped journal, change preview timestamps or widen their validity window.

The completion entry accepts only the exact stopped sequence with a recorded successful deployment, no pending write, the `Unified promotion preview expired` reason and the original passed public evidence. Existing readers independently reopen the original module receipts, deployment API responses and fresh-at-write preview renewal. Unknown writes and other stop reasons remain rejected.

Completion verifies current/ancestor/original promotion CI, checks the candidate and recovery immutable modules, observes topology before and after fresh public acceptance, and requires the same exact deployment ID. The new local receipt pins those observations and the original journal. Completion observations must finish within 15 minutes. A failure marker prevents a partial receipt from being consumed.

The published-source reader independently validates this new receipt type, including every new public body and the old deployment evidence. Ancestor verification also checks the original promotion executor CI. The source index format and actual source-advance implementation are unchanged.

The supported command is `scripts/unified-promotion-completion.ts complete --request FILE --pin SHA256`. It has no deployment adapter, release-key, retry or force option; all cloud access uses the GET-only production reader. The live runner is an untracked local report artifact and only permits `complete` and `advance`.

Focused evidence tests (35 cases) and the actual fixed-function completion-to-115-source combination passed. Full local tests, exact CI and live execution results are recorded separately. No completion or source advancement is claimed merely by adding this code.

Local checkpoint: CMS 380/380 (353 seconds), fixed child 119/119, shared protocol 205/205, documentation/scope 38/38, typecheck passed. All completed with zero skipped tests. Exact CI and real execution remain pending at checkpoint creation.

# Source-bound dependency review plans

Run `CMS_LOCAL_ONLY=1 pnpm exec tsx scripts/dependency-review-plan.ts` from the CMS
directory. This reads the three pilot scopes without opening Payload or writing
source content. The output is review work, not an executable correction batch.

Each missing identity produces one issue containing every affected JSON pointer,
character identity and material quantity (character-ID pointers have no quantity).
No reference sample is substituted for the full impact list. The issue and plan
keys bind the dependency preview, including material revisions, character and
relation digests and the current routing policy. File-byte hashes are recorded
separately in the CLI evidence.

Lexical hints are deliberately limited to case/separator differences, the existing
`guide-to-*` versus `guide-of-*` pattern and qualified character IDs. They are
untrusted search aids, not aliases. One candidate is not automatic approval;
multiple candidates are explicitly ambiguous. No candidate means only that these
rules found none, not that no correct source exists. No fuzzy translation or
guessed basic/rising/advanced/senior mapping is performed.

`verifyDependencyReviewPlan` rebuilds from current inputs and compares the entire
plan, rejecting stale sources, modified hints, altered references or forged
execution flags. This detects accidental alteration; hashes do not authenticate
an approver. All issues remain `needs-source-review`, with `approvedTarget=null`.
There is no decision persistence, approval endpoint or source mutation executor.

Before resolving an issue, reviewers need authoritative identity/game-version
evidence, verification of every stage/quantity and URL/consumer impact. Missing
records, obsolete relations and legitimate variant identities require different
decisions. Neither deleting a dangling relation nor choosing its nearest name is
safe by default. Changed source data requires a new plan, not editing the saved
plan to make it look approved.

The inspected Main reader compares IDs exactly and filters unresolved characters.
Genshin additionally excludes upcoming characters in its data adapter. This plan
uses raw identities; runtime eligibility, media and full page parity remain T03
work. Even an empty plan (currently starrail) does not authorize publication.

# Local merge browser acceptance

This guide tests disposable synthetic data only. It does not approve real content,
publish a snapshot, or establish production readiness.

## Setup

Run commands from `services/content-cms`. Build the current source with the local
environment described in the README, then run:

```sh
pnpm exec tsx scripts/browser-merge-fixture.ts
```

The runner refuses an occupied localhost port 3100, creates a unique database
namespace and random reviewer credentials, and starts the existing production
build on 127.0.0.1 only. Credentials are saved with mode 0600 to the printed
`.local/browser-merge-*/browser-session.json` path. Do not commit or share it.
Stop with Ctrl-C; retain the disposable namespace for evidence. The script does
not rebuild the app: always build current source before running it.

## Reviewer walkthrough

1. Log in at `/admin` with the generated reviewer. Open Draft Merge Proposals.
2. Open the fixture proposal. Confirm one conflict: `zh.title` has original,
   human-edited and incoming values. Body is source-only; summary is editor-only.
3. In Workflow Events, create a `close` event with a substantive synthetic note.
   Confirm the event appears. Create `reconsider` on the same proposal.
4. Return to the proposal list and open the new proposal. Confirm its Parent
   Proposal Key points to the closed proposal and no decision exists yet.
5. Create a Draft Merge Decision, select `apply`, and enter a substantive note.
   Leave Choices empty and save. Expect the explicit missing-conflict-choice
   error, with no successful decision.
6. Add one Choice: Field `zh.title`, Choice `current`. Save. Expect success.
7. Open Editorial Drafts. Confirm title `Human-edited title`, body
   `Updated source body`, summary `Human summary`, and editor note
   `Preserve this editorial note.` Hold remains checked and state remains draft.
8. Record screenshot and verify stored decisions/events using a read-only check
   after stopping the server. Never start the original migration database.

The field dropdown loads the selected private proposal and lists only conflict
fields, with literal base/current/incoming previews. Loading failures disable
selection; switching proposals clears incompatible selections. These are display
hints, not approval: server validation still rejects missing, duplicate,
non-conflict and stale choices. Previously stored decisions remain read-only.

For a material fixture, run `pnpm exec tsx scripts/browser-merge-fixture.ts --material`
instead. Select `material.name` (the only conflict) and `incoming`. After applying,
expect name `Incoming source title`, notes `Updated source body`, unchanged rarity
3, empty uses, empty nameEn, null nameJa, and the preserved editor note/hold.
This exercises the material presence representation without replacing null or
empty values with invented translations.

Recorded browser cases cover guide/current with close/reconsider (batch15), and
material/incoming with filtered selection and previews (batch16). Dismiss/stale
interactions, proposal-switch/request-failure UI paths, mobile, keyboard
accessibility and multi-user browser concurrency need separate browser cases.
Existing API/unit tests are not substitutes for those UI cases.

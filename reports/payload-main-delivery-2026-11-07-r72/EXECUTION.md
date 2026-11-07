# Actual execution: Main active, completion still blocked

## Verified facts

- Executor commit: `847aeea479fa7c3bebdda5f6cd11ba8db81bf9e0`.
- Full exact CI run: `42330078182`; the project's real CI verifier passed before execution.
- The supported `promote` CLI ran once against the existing Ananta Chinese installation-guide pilot.
- Both freshly observed previews passed, 1,267 responses each.
- The canonical journal records `promotion_intent` followed by `promoted` for candidate `b4055676-45d2-460e-8d0e-3e649ddd3001`.
- Real public acceptance passed with 1,267 responses in the attempt's `public/result.json`.
- Final post-public verification stopped with `Unified promotion preview expired`; the command did not produce a success receipt.
- The temporary CMS session was logged out.
- A separate read-only cloud reconciliation confirmed that exact candidate remains at 100% Main traffic. Its status is `candidate_active_public_acceptance_still_required`, not formal completion. See `reconciliation.json`.
- No replay, automatic rollback or source advancement was performed.

## Evidence locations

The canonical attempt directory, relative to the repository, is:

`reports/payload-desktop-unified-2026-11-06-r46/frozen-ananta-01/unified-main-promotion-32896a23-b8bb-4933-bd62-5bb8bf2acfca`

The original stopped journal is:

`reports/payload-desktop-unified-2026-11-06-r46/frozen-ananta-01/unified-promotion-3ba5e4f94862e9493c6cda97197b4a59043df8b3d96865a288cdbf033499c33d.jsonl`

Do not modify either location or rerun `run-promotion.mjs`. The exclusive `attempt.json`, `stopped.json` and `promotion.log` retain this attempt. A successful public HTTP evidence file alone is not a completed publication receipt.

## Sole remaining delivery task

Implement and verify explicit read-only completion for this known stopped-after-deployment state. It must retain the original journal and deployment identity, revalidate exact executor/ancestor CI and immutable modules, freshly verify current topology and public content, and produce separately linked completion evidence that source advancement can independently consume. It must reject unknown writes, other stop causes and changed identities; it must have no deployment capability.

The current protocol checks the 15-minute pre-write preview freshness again after the lengthy public acceptance and final verifier. The completed-history reader also uses the last journal timestamp for freshness. Correct treatment must preserve freshness at the write boundary and use fresh identity/public observations for post-write completion, not extend old timestamps or simply increase the global timeout. This is the direct blocker to the single delivery objective; no unrelated framework expansion is needed.

Until that completion path is qualified, the guide is deployed and its recorded public checks pass, but the publication receipt/source-baseline delivery objective is **not complete**. `advance-source.mjs` must not be invoked without the required success receipt.

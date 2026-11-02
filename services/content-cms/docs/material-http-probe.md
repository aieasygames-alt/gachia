# Isolated material HTTP probe

`scripts/material-http-probe.ts` launches `apps/web` on loopback port 3317 and
requests a collection page, three representative NTE material detail IDs, a
missing ID, the main sitemap path and robots. It uses a disposable local process,
manual redirects and bounded response capture, then terminates the child.

This run is diagnostic only. It does not hit public domains, CDN/R2 or production
bindings. It records response status, location, content type, title/robots hints,
size and body digest. It does not claim metadata/search/sitemap parity merely
from a response, and it does not alter Snapshot or release state.

In the current checkout the probe is unavailable because the web app's Next
config fails before serving (`exports is not defined in ES module scope`). That is
an application/toolchain blocker, not a page 404 result. The diagnostics are
preserved in the batch report; do not retry by changing root app config as part
of the Payload task without a separate approved task.

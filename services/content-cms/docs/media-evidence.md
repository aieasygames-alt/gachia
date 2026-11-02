# Media evidence boundary

`buildMediaEvidence` consumes an explicit manifest for eligible character image
paths. It rejects traversal, duplicate paths, unsupported MIME types and
unbounded sizes. Missing or unexpected paths are reported rather than dropped.
Ineligible characters are not expected to have active media dependencies.

`sha256` plus a nonnegative byte count marks bytes as described, while
`rights=verified` is tracked independently. Neither field is authenticated by
this local function: no CDN/R2 request, checksum fetch, signature verification or
rights receipt lookup is performed. A populated manifest can therefore still be
non-publishable unless an independently trusted evidence process supplies these
facts.

The result is not a media upload manifest, cache instruction, public URL grant or
snapshot activation credential. It is a dependency report for T03. Image URL
construction remains governed by the reviewed character adapter; changing that
adapter requires a new preview and manifest.

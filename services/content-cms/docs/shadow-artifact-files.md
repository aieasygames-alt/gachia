# Local content-addressed shadow files

This is a synthetic POSIX filesystem experiment, not a production object store
or an actual Main/Worker adapter. No database, network, publication pointer or
public application is touched.

From `services/content-cms`:

```sh
CMS_LOCAL_ONLY=1 pnpm exec tsx scripts/shadow-file-experiment.ts
```

The runner verifies the batch17 synthetic fixture against the saved inventory,
creates a private temporary directory under `.local`, writes 17 snapshots and
two release maps, and launches five separate Node processes. Each child receives
an explicit root and immutable release context; all share the same files, not an
in-memory map. A sixth child reopens the old release for rollback validation.
The runner waits for all parallel children and removes only its own directory.
It prints compact JSON evidence; PID values vary between runs.

## Store contract

`shadowArtifactFiles(root)` requires an existing, canonical absolute directory
owned by the current user with no group/other permissions. Symlink roots and
ancestors are rejected by comparing realpath. Each operation checks the root's
device/inode and permissions again. File names are constructed exclusively from
an allowlisted kind and lowercase 64-character SHA-256 key.

- Writer verifies the parsed canonical-content digest, writes a unique 0600
  temporary file with exclusive creation, fsyncs it, atomically links to the final
  name without replacement, unlinks the temporary name, then fsyncs the directory.
  An existing destination is rejected even when its bytes are identical.
- Reader opens with O_NOFOLLOW/O_NONBLOCK, rejects nonregular and multiply linked
  files, checks size, and reads into a fixed limit-plus-one buffer. A growing file
  cannot cause unbounded buffering. Limits: release 1 MiB, snapshot 2 MiB. UTF-8
  decoding is strict. The consumer also retains its 32 MiB aggregate limit.
- Hashes identify canonical parsed JSON, not serialized bytes. The transport
  checks identity/integrity; the consumer must still validate exact DTO whitelist,
  full scope closure, routing, capabilities and expiry before exposing output.
- Missing or partial final files, invalid UTF-8/JSON, corruption, oversized files,
  wrong keys, links and incompatible peers fail closed. Pending filenames are
  never read. A release map on disk does not imply a complete or approved release.
- Rollback supplies an explicit old key and repeats all validations. There is no
  latest fallback, automatic rollback, activation or silent legacy substitution.

## Crash and security boundaries

Atomic visibility is not a multi-artifact transaction. A crash can leave pending
files or a final name with a second pending hard link; the latter is deliberately
unreadable until offline recovery. A directory-fsync failure can leave a committed
file even though write returned an error. Do not retry with overwrite or delete
unknown files; recovery/garbage collection needs a separately reviewed protocol.
No power-loss experiment or network filesystem semantics are claimed.

The parent directory must be trusted and not concurrently modified by an
adversary. Node path-based APIs do not provide an openat-style sandbox against
hostile ancestor replacement between checks. This API is not a public endpoint,
does not accept untrusted roots, and is not portable Windows/cloud storage code.
The CLI has a 64 KiB context limit; orchestration bounds child time and output.
Context scopes/capabilities/clock are trusted local inputs, not signed approvals.

Next: real typed public DTOs and dependency closure (T03), then opt-in actual
application shadow readers (T04). Production storage, approvals, activation,
asset/link verification and complete recovery remain separate gates.

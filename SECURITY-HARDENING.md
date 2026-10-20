# Security hardening notes

This fork tracks upstream Read On Bush (Apache-2.0). Security changes should remain isolated, testable, and easy to upstream.

## EPUB extraction resource limits (first patch)

The ZIP extraction path now caps:

| Resource | Limit |
| --- | ---: |
| Compressed EPUB size | 128 MiB |
| One uncompressed ZIP entry | 64 MiB |
| Total declared uncompressed ZIP entries | 256 MiB |
| ZIP entry count | 4,096 |

The extension checks the EPUB size before `fs.readFile` and once again after reading. Both full-book parsing and on-demand image extraction use the same guarded ZIP extractor. Oversized or malformed archives fail with a visible error instead of being silently truncated.

**Limitations:** ZIP central-directory size checks do not create a sandbox, and cannot rule out decoder bugs, high CPU load, malicious XML, or crafted PDFs. Limits may reject unusually large legitimate EPUBs. Also, `unzipSync` still expands accepted entries in memory; these caps only bound the expansion.

## Privacy review (source-level findings, not runtime proof)

- The app persists book paths and reading progress using VS Code extension `globalState`, with `setKeysForSync([])`.
- It writes EPUB/PDF extraction caches into `globalStorageUri`; local data is not encrypted at rest.
- The CloudConvert external-link action requires user selection; it does not upload a file itself.
- No systematic traffic capture or shipped VSIX binary/source-equivalence audit has yet been completed.
- A VS Code extension can execute with the user's filesystem permissions. An isolated `--user-data-dir` does **not** sandbox filesystem access.

## Verification checklist

- [ ] `npm ci`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm test` (VS Code extension host tests)
- [ ] `npm audit --omit=dev` (triage findings manually; don't blindly upgrade)
- [ ] Import and display TXT, EPUB and PDF on Windows/macOS
- [ ] Test legitimate EPUBs with images and edge-case chapter metadata
- [ ] Observe outbound network connections on startup and reading, using an isolated profile
- [ ] Compare packaged VSIX code with reviewed source

## Next changes (separate PRs)

1. PDF.js dependency modernization and comprehensive compatibility tests. The existing `isEvalSupported: false` is a mitigation for the known CVE-2024-4367 path, not a guarantee of no other bugs.
2. Limit PDF input size/page count/CPU time and consider cancellable parsing.
3. Signed/reproducible build and packaged-VSIX verification.

Do not ship this fork as “audited” until tests and binary verification complete.

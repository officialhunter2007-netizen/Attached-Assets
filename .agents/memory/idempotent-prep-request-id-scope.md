---
name: Idempotent prep requestIds — scope rules
description: One-shot file-prep requestIds for a wallet-charge helper must be scoped by user + subject + full content hash.
---
Gem-ledger uniqueness is `(user_id, request_id)`. A prep requestId derived from file content only — or from only a prefix of the hash — has two failure modes:
1. Same file uploaded to a *different subject* by the same user hits ledger dedupe (suppressing the charge) while still creating per-subject work → free processing on subject B.
2. Different files sharing a prefix + size collide → cross-file billing suppression.

**Why:** content-only or short-hash keys quietly undercharge under realistic re-upload patterns; the loss is invisible until finance reconciliation.

**How to apply:** prep requestIds for "one-shot per asset" charges must be `<op>_prep:${userId}:${subjectScope}:${sha256HexFullDigest}` using the FULL hex of the FULL file bytes. App-level dedupe on `(user, subject, content_hash)` rows is the primary integrity layer; ledger dedupe is defense-in-depth.

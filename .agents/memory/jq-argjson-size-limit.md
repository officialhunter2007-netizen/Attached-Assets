---
name: jq --argjson 128KB single-argument limit
description: Why the v4 curriculum generator's merge step crashed with "Argument list too long" and the file-based fix.
---

# Passing large JSON to jq: use files, not --argjson

In the bash curriculum generator (`scripts/generate-v4-instructions.sh`, `phase_merge`), the final merge crashed with bash error `line NNN: jq: Argument list too long` on a full-size curriculum, before `final.json` was ever written.

**Why:** Linux caps a *single* argv string at `MAX_ARG_STRLEN` = 128 KiB (`PAGE_SIZE * 32`), independent of the much larger `ARG_MAX` (~2 MB total). Passing a multi-hundred-KB JSON blob via `jq --argjson m "$bigvar"` makes that one argument exceed 128 KiB, so `exec(jq)` fails with E2BIG. A small TEST=1 run stays under the limit, so the bug only shows on real data.

**How to apply:** Any time a jq invocation needs a large JSON value, write it to a temp file and read it with `--slurpfile name file` (binds `$name` to an array → use `$name[0]`), not `--argjson`. This affected three spots in the merge: the units map, the assembled core curriculum, and the exam banks (unit/stage/level). Herestrings (`<<<`) and `jq -s file...` are fine because they go through stdin/files, not argv.

Rule of thumb: bash variables holding multi-KB JSON must reach jq via a file, never via a command-line argument.

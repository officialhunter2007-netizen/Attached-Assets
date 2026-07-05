---
name: Wandbox multi-file / stdin execution
description: How the /api/ai/run-code Wandbox proxy runs multi-file programs and stdin, and the Java public-class trap.
---

The coding-room "run" path proxies to Wandbox (`https://wandbox.org/api/compile.json`) via `/api/ai/run-code`. The request shape the FE sends is `{ language, code, codes[], stdin }`.

Wandbox semantics (verified live):
- `code` = the MAIN program. Wandbox writes it to a fixed filename `prog.<ext>` and compiles/runs THAT.
- `codes[]` = extra sidecar files, each written to its own `file` name in the same working dir. They are NOT auto-run; they are just present for imports/linking.
- `stdin` = fed to the program's standard input.

Rules that make it work:
- **Never put the entry file in `codes[]` as well.** Send it ONLY as `code`. Duplicating it (entry as both `code` and a `codes[]` item) causes duplicate-symbol errors — most visibly Java "duplicate class". codes[] = sidecars only.
- **Python multi-file** works out of the box: entry runs as `prog.py`, sidecars import by their own filenames via cwd resolution (`from helper import ...`). No compiler options needed.
- **Java trap**: because the entry is written to `prog.java`, javac rejects a `public` top-level type there ("class X is public, should be declared in a file named X.java"). Fix = strip the `public` modifier from top-level type declarations in the ENTRY only (class/interface/enum/record, allowing abstract/final/sealed/strictfp between). `public static void main` is untouched (static follows public, not a type keyword). Sidecar files keep their own filenames, so their `public class` is fine and must NOT be stripped. Non-default-package / `non-sealed` / `@interface` edge cases remain unhandled but are vanishingly rare in student code.
- C/C++/Rust multi-file would additionally need compiler-options to compile sidecars — NOT handled today (only Python + Java multi-file are the tested acceptance cases).

**Why:** a user complaint that coding rooms couldn't run large/complex programs. The single-file `code`-only model couldn't express multi-file projects or feed stdin.

**How to apply:** when touching run-code, keep entry-out-of-codes and the Java entry sanitizer. Test against Wandbox directly with the exact FE request shape (Python 2-file import, Python stdin, Java entry-with-public-class + public sidecar + stdin) — this is a fast, auth-free acceptance gate.

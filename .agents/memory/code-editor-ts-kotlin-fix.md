---
name: Code editor TypeScript + Kotlin fix
description: Root causes and fixes for TypeScript transpilation failure and Kotlin Wandbox 500 error in the code editor.
---

## TypeScript subprocess can't find `typescript` package

**Rule:** The TypeScript transpilation subprocess MUST use a CJS script (`_transpile.cjs`) that `require()`s TypeScript via absolute path — NOT `--input-type=module --eval` with a bare `import`.

**Why:** The transpile subprocess runs from a temp dir with no node_modules. Node resolves bare specifiers relative to CWD, so `import {transpileModule} from 'typescript'` fails silently (`.catch(() => null)`), falling back to a broken regex that left `private`/`public`/`protected` keywords intact.

**How to apply:** The CJS script uses:
```js
const ts = require("/home/runner/workspace/node_modules/typescript");
```
TypeScript lives at that pnpm symlink. The module config must be `ModuleKind.CommonJS` + `ScriptTarget.ES2022` (ES2022 preserves class field syntax; ES5 breaks it).

The regex fallback was also fixed to strip access modifiers:
```js
.replace(/\b(private|public|protected|readonly|abstract|override|declare)\s+(?=[a-zA-Z_$#])/g, "")
```

## Kotlin via Wandbox returns HTTP 500

**Rule:** Kotlin must NOT be in `WANDBOX_FALLBACK`. Wandbox removed Kotlin from their compiler list entirely. Route it to a friendly message pointing to `play.kotlinlang.org`.

**Why:** Wandbox API `/list.json` shows zero Kotlin compilers. Any Kotlin slug (e.g. `kotlin-1.9.10`) returns 500.

**How to apply:** Only `rust: "rust-1.82.0"` stays in `WANDBOX_FALLBACK`. Kotlin gets its own early-return in the route handler.

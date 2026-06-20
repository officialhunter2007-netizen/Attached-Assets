---
name: Promise.try polyfill for Node 20 (unpdf)
description: unpdf@1.6.0 internally calls Promise.try which only exists in Node 22+; on Node 20 this crashes the whole API on any PDF upload
---

# Promise.try polyfill for Node 20

## The Rule
`unpdf@1.6.0` calls `Promise.try()` internally inside pdfjs.mjs when parsing any PDF. `Promise.try` is a Node 22+ API absent in Node 20. Without the polyfill, any booklet PDF upload triggers an unhandled `TypeError: Promise.try is not a function` that crashes the entire API process.

**Why:** The server runs Node 20 (despite replit.md saying Node 24). `Promise.try` was added natively in Node 22 (TC39 proposal). The crash is an unhandled rejection inside unpdf's async chain — NOT at import time, so the server starts fine but crashes on first PDF upload.

**How to apply:** Add the polyfill at the TOP of `artifacts/api-server/src/index.ts` (after imports, before any code). Since `Promise.try` is only called at request-time (not import-time), this is safe — it runs at module init, before any HTTP request arrives.

```typescript
if (typeof (Promise as any).try !== "function") {
  (Promise as any).try = function <T>(
    fn: (...args: unknown[]) => T | PromiseLike<T>,
    ...args: unknown[]
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      try {
        resolve(fn(...args) as T | PromiseLike<T>);
      } catch (e) {
        reject(e);
      }
    });
  };
}
```

## Symptom
Server starts and runs normally, then on first PDF booklet upload:
```
TypeError: Promise.try is not a function
    at Mo.#t (.../unpdf@1.6.0/node_modules/unpdf/dist/pdfjs.mjs:54:...)
Node.js v20.20.0
ELIFECYCLE Command failed with exit code 1.
```

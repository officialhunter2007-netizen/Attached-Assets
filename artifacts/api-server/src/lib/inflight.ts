// ─────────────────────────────────────────────────────────────────────────────
// In-flight request deduplication.
//
// When N students hit "generate quiz" for the same unit at the same time,
// only ONE AI generation should run; everyone else awaits the same promise
// and receives the same quiz id. The DB upsert is already race-safe, but
// without this each concurrent cache-miss pays for its own AI call.
//
// The map entry is removed when the promise settles, so a failed generation
// can be retried immediately.
// ─────────────────────────────────────────────────────────────────────────────

const inflightMap = new Map<string, Promise<unknown>>();

export function dedupeInflight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflightMap.get(key);
  if (existing) return existing as Promise<T>;
  const p = fn();
  inflightMap.set(key, p);
  p.finally(() => inflightMap.delete(key)).catch(() => {});
  return p;
}

/** Error carrying an HTTP status so route handlers can map it directly. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

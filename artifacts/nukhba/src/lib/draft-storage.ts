const PREFIX = "nukhba.draft.";

export function loadDraft(subjectId: string): string {
  if (typeof localStorage === "undefined") return "";
  try {
    return localStorage.getItem(PREFIX + subjectId) || "";
  } catch {
    return "";
  }
}

export function saveDraft(subjectId: string, value: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (!value) localStorage.removeItem(PREFIX + subjectId);
    else localStorage.setItem(PREFIX + subjectId, value);
  } catch {
    // quota / private mode — silently ignore.
  }
}

export function clearDraft(subjectId: string): void {
  if (typeof localStorage === "undefined") return;
  try { localStorage.removeItem(PREFIX + subjectId); } catch {}
}

export function makeDebouncedDraftSaver(subjectId: string, delay = 500) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (value: string) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      saveDraft(subjectId, value);
      t = null;
    }, delay);
  };
}

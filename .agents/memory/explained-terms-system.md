---
name: Explained Terms System
description: Per-student term file — teacher tracks every term explained, injects known list into context, never re-explains or asks about un-explained terms.
---

## The Rule
Assume student knows NOTHING beyond the alphabet. Every technical/scientific term is unknown until `v4_explained_terms` proves otherwise.

## DB Table
```sql
CREATE TABLE v4_explained_terms (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  subject_id TEXT NOT NULL,
  term TEXT NOT NULL,
  explained_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, subject_id, term)
);
```

## Tag Protocol
- Teacher emits `[TERM_EXPLAINED: المصطلح]` at END of any response where a new term is explained (one per response).
- Tag is INVISIBLE to student — stripped from display, persisted to DB.

## Two Teaching Paths — BOTH must be kept in sync

### Legacy path (`routes/ai.ts`)
- Loading: after mistakes-bank load (~line 1620), uses `db.execute(sql\`SELECT term FROM v4_explained_terms...\`)`
- Injection: `${mistakesBankNote}${explainedTermsNote}` in both AR and EN prompts
- Rules: in the "قاعدة حجر الزاوية" section + tag contract in both AR/EN prompt templates
- Parsing: after mistakes-persist block, uses `fullResponse.matchAll(/\[TERM_EXPLAINED:...\]/gi)`
- Stripping: in `cleanTeachingChunk()` + study card `cardContext` cleanup

### v4 path (`routes/v4_teach.ts` + `lib/v4-teaching-core.ts`)
- Loading: in v4_teach.ts before `buildTeacherSystemPrompt` call, uses `db.execute(sql.raw(...))`
- Passed as: `explainedTermsNote` option to `buildTeacherSystemPrompt`
- Layer: LEXPLAINED ("## 1a. ملف مصطلحات الطالب") inserted between L1 and L2 in prompt layers
- Rules: in `buildPersonaLayer` before the emergency rules (قواعد الطوارئ)
- Tag list: added to الوسوم البروتوكولية in `buildPersonaLayer`
- Stripping: in `v4-protocol-tags.ts` → `stripProtocolTags()` + fullText strip in v4_teach.ts
- Capture: `__termExplainedCaptures` saved from fullText BEFORE strip (critical order!)
- Persistence: fire-and-forget after `applyTagEffects`, uses `db.execute(sql.raw(INSERT ON CONFLICT DO NOTHING))`

## Critical Order in v4_teach.ts (don't break)
```
fullText = stripThinkingLeakFromText(fullText);
// 1. CAPTURE before strip:
const __termExplainedCaptures = Array.from(fullText.matchAll(/\[TERM_EXPLAINED:...\]/gi));
// 2. THEN strip:
fullText = fullText.replace(/\[TERM_EXPLAINED:[^\]]*\]/gi, "");
// ... later after applyTagEffects:
// 3. PERSIST from captures (not from already-stripped fullText)
```

**Why:** stripping happens before parseProtocolTags, so TERM_EXPLAINED must be captured first or it's lost forever.

## Behavioral Rules (in both prompts)
1. Check "سبق شرحها" list — if term present → use freely; if absent → explain first, emit tag
2. Forbidden: asking about any un-explained term
3. Mandatory order: life-scene → simple definition → concrete example → `[TERM_EXPLAINED: term]`
4. Already-explained terms are NEVER re-explained

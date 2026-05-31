---
name: v4 labs future vision
description: Labs (المعامل) are currently admin-authored questions; the planned future is a full real-world simulation environment — do not treat the question format as final.
---

# v4 Labs — current state vs. stated future direction

**Current implementation:** A lab (معمل) is a set of admin-authored questions
(typed kinds: diagnostic / decision / application / analysis / connection)
created in the admin page. Backend = `v4-lab-exam-engine.ts`, UI = `v4-lab.tsx`,
routes `/lab/:slug/:labCode`.

**Stated future direction (user, May 2026):** The user intends to develop labs
into a *real-world simulation environment* — a large scenario with a dedicated,
high-quality, highly professional UI/UX. The question-based format is a
placeholder, NOT the final product.

**Why this matters / how to apply:**
- Do not over-invest in polishing the question-based lab format as if it were
  permanent, and do not design schema/contracts that hard-assume "a lab = a list
  of questions."
- When labs come up for real work, expect a much richer interactive simulation
  layer. Leave room in any lab-related data model / API for that expansion.
- This is a heads-up note from the user, not yet a concrete build task.

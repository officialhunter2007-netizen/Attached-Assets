# First-Session Audit — Task #36

## Goal
Every subject's FIRST teaching reply must be unmistakably "Nukhba": a Yemeni-context concrete moment, an interactive lab built live via `[[CREATE_LAB_ENV]]`, an editorial infographic via `[[IMAGE]]`, a `[MISTAKE]` capture, and a smooth transition into the personalized plan.

## Subjects covered (24/24)

### University (11)
| ID | Manual u1 | Showcase Kit | Specialized lab guidance |
|---|---|---|---|
| uni-it | ✅ | ✅ | generic via programming branch |
| uni-cybersecurity | ✅ | ✅ | ✅ (cybersecurity branch) |
| uni-data-science | ✅ | ✅ | ✅ (data-science branch) |
| uni-accounting | ✅ | ✅ | ✅ (pre-existing 12-tool lab) |
| uni-business | ✅ | ✅ | ✅ (business branch) |
| uni-software-eng | ✅ | ✅ | ✅ (programming branch) |
| uni-ai | ✅ | ✅ | ✅ (programming branch) |
| uni-mobile | ✅ | ✅ | ✅ (programming branch) |
| uni-cloud | ✅ | ✅ | generic CREATE_LAB_ENV |
| uni-networks | ✅ | ✅ | ✅ (networking branch) |
| uni-food-eng | (was already manual) | ✅ | ✅ (pre-existing food lab) |

### Skills (13)
| ID | Manual u1 | Showcase Kit | Specialized lab guidance |
|---|---|---|---|
| skill-html | ✅ | ✅ | IDE + Live Preview (codingRules) |
| skill-css | ✅ | ✅ | IDE + Live Preview (codingRules) |
| skill-js | ✅ | ✅ | IDE + Live Preview (codingRules) |
| skill-python | ✅ | ✅ | IDE (codingRules) |
| skill-cpp | ✅ | ✅ | IDE (codingRules) |
| skill-c | ✅ | ✅ | IDE (codingRules) |
| skill-java | ✅ | ✅ | IDE (codingRules) |
| skill-linux | ✅ | ✅ | generic CREATE_LAB_ENV |
| skill-windows | ✅ | ✅ | generic CREATE_LAB_ENV |
| skill-net-basics | ✅ | ✅ | ✅ (networking branch) |
| skill-nmap | ✅ | ✅ | ✅ (cybersecurity branch) |
| skill-wireshark | ✅ | ✅ | ✅ (cybersecurity branch) |
| skill-yemensoft | (was already manual) | ✅ | ✅ (pre-existing yemensoft env) |

## Each kit contains
1. **hookConcept** — single ≤20-word hook
2. **concreteScenario** — Yemeni-context (real cities/places: صنعاء، عدن، تعز، حضرموت، حدّة، شارع الزبيري)
3. **labEnvBlueprint** — full description with all 5 mandatory sections (context, initial data with real numbers, screens, success criteria, expected first mistake)
4. **imageBlueprint** — English-only FLUX prompt (no Arabic in image) + Arabic figcaption with title + 3 numbered legend lines
5. **firstMistakeTrap** — phrased as the wrong belief, used inside `[MISTAKE: ...]`
6. **transitionLine** — one Arabic sentence bridging from tour into plan

## Wiring
- `getShowcaseKit(subjectId)` lookup in `artifacts/api-server/src/lib/subject-showcase-kits.ts`
- Imported and passed to `buildFirstLessonShowcaseAddendum({ ..., kit })` in `routes/ai.ts` only when `isShowcaseOpener` is true
- The kit block is appended LAST to the system prompt, after all other addenda, so it dominates the model's most-recent instructions
- Falls back gracefully (legacy generic guidance) when subjectId has no kit registered

## Truthfulness guarantee
- Specialized lab branches only mention features that EXIST in the codebase:
  - food-eng: 6 calculators + HACCP builder (existing)
  - accounting: 12-tool academic lab (existing)
  - yemensoft: 5-screen ERP env (existing)
  - cybersecurity / data-science / networking / business / mobile-se-ai branches: only generic `CREATE_LAB_ENV` is mentioned (built dynamically per request) — NO claim of pre-installed specialized tools that don't exist
- IDE + Live Preview claims are unchanged (already accurate for HTML/CSS/JS/Python/etc.)

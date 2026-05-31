---
name: SCENE animated-SVG illustrations
description: How the illustrative-animation feature works and the security rule for rendering model-authored inline SVG safely.
---

# SCENE = Sonnet-authored animated SVG (the illustrative-animation feature)

The teacher emits `[[SCENE: <arabic description>]]`; the FE lazily POSTs it to
`/api/v4/scene`, which has **Claude Sonnet** author a self-contained animated
SVG (+ a short step caption track), disk-cached by content hash. This is the
platform's **sole** illustrative-animation tool — the legacy Gemini `[[ANIM]]`
HTML/CSS/JS path was removed from the teacher prompt (its FE iframe mount code
is left intact but unused; `buildAnimationLayer` is defined-but-unused).

**Why Sonnet authors the SVG, not the stepper:** the old SCENE renderer drew
only emoji actors + a sliding text chip — users called it weak/unprofessional.
Real "drawings" require an actual vector illustration, which Sonnet produces
well; emoji rows never will. The generation prompt and renderer both assume a
professional animated SVG now (brand palette gold #F59E0B / emerald #10B981,
RTL Arabic `<text>`, SMIL animation).

## Security rule — rendering UNTRUSTED model-authored inline SVG
**Rule:** SMIL animation (`<animate>`/`<animateTransform>`) is safe to keep ONLY
if you also remove every element an animated `attributeName` could weaponize.

**Why:** the classic SVG-sanitizer bypass is
`<a><animate attributeName="xlink:href" to="javascript:…"></a>` — allowing
animation tags while leaving a link/use/image target re-introduces XSS even
after DOMPurify runs. Allowing `attributeName` unrestricted is the trap.

**How to apply (client DOMPurify, the real boundary):** `USE_PROFILES.svg`,
`ADD_TAGS` only `animate`+`animateTransform`, plus
`FORBID_TAGS: a, use, image, foreignObject, set, animateMotion, mpath, script…`
and `FORBID_ATTR: href, xlink:href`. With no href-bearing element and no href
attr, an animated attribute has nothing dangerous to point at; pure visual
animation (opacity/transform/fill/geometry) still works. Server-side
`sanitizeSvgServer` is belt-and-suspenders (strip script/on*/href + neutralize
`javascript:`/`data:text/html`), NOT the boundary.

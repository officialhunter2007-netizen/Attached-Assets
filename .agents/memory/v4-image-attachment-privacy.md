---
name: v4 image attachment privacy invariant
description: When a student attaches an image in the v4 teaching flow, base64 must never leak beyond the single Gemini multimodal turn.
---

# v4 image attachment — base64 containment invariant

When a student attaches one image in the v4 lesson screen, the raw `data:image/...;base64,` URL must reach **only** the Gemini vision call as an `image_url` content part, and nothing else.

**Why:** The compressed conversation blob is shared by several consumers. The biggest trap: `compressed.recentMessages` is reused AFTER streaming to build the memory-capture transcript (warmth + personal-dictionary), and that path calls **Anthropic** (a different provider). A naive multimodal split that only fixes the Gemini message array still leaks the multi-MB base64 to Anthropic, to layer9 prompt text, and bloats logs/localStorage.

**How to apply (every layer must scrub independently):**
- **FE:** send the data URL inline ONLY in the current-turn wire `message` (markdown). Store a placeholder in chat state, strip the `image` field before persisting to localStorage, and strip it from the `history` array sent on the wire.
- **Backend, current turn:** extract the data URL from the LAST user message into the Gemini `image_url` part; replace its text with a placeholder.
- **Backend, older messages:** defensively scrub data URLs from every other message.
- **Backend, shared blob:** after building the Gemini messages, scrub `compressed.recentMessages` IN-PLACE and scrub `compressed.layer9Text`, so memory-capture / prompt / logs never see base64. The Gemini array holds its own separate cleaned/parts objects, so the in-place scrub does not affect the stream.

Rule of thumb: a multimodal attachment must be lifted out at the provider boundary and erased from every shared structure that outlives that single call.

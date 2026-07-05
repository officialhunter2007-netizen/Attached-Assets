---
name: Coding room preview iframe sandbox
description: Why the collaborative coding-room HTML preview iframe is a latent cross-student session-theft vector
---

The collaborative coding room renders a room member's authored HTML in a preview iframe with `sandbox="allow-scripts allow-same-origin"`.

**Why this matters:** the HTML is authored by *another student in the same room*, not the viewer. `allow-scripts` + `allow-same-origin` together let that peer's script run at the app's real origin, giving it read access to the viewer's cookies / localStorage (session token) — i.e. one student can steal another's session by getting them to run/preview HTML.

**How to apply:** for untrusted peer-authored `srcDoc` previews, drop `allow-same-origin` (scripts then run in a null origin and cannot touch app cookies/localStorage). Normal HTML/CSS/JS student previews do not need same-origin, so this is a safe fix. This predates the July 2026 coding-room UI redesign and was intentionally left out of that redesign's scope — treat it as a standalone security follow-up.

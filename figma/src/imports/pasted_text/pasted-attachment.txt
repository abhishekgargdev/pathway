# Figma Make Prompt — Revision (paste this as a follow-up to your existing Figma Make project, or as a fresh generation if starting over)

This carries the same tokens/signature element as before, but bakes in the fixes from the review: real spacing/breathing room, visible elevation, a working nav bar, and a richer home page. Paste the block below into Figma Make.

---

## The prompt

Refine/redesign the mobile-first UI for "Pathway" (the AI-guided skill-learning app) with the following corrections — the previous pass read as flat stacked list rows with no breathing room; this pass needs to feel like a real app with depth and spacing.

### Spacing & layout rules (apply to every screen)
- No content ever touches the viewport edge — consistent screen padding: 20px on mobile (375px frame), scaling to 24-32px at tablet/desktop frames.
- Every card, list item, and section has visible gap (12-16px) between it and its neighbor — never let elements butt directly against each other with just a hairline divider.
- Every card uses the full 16px corner radius, buttons/inputs 12px, pills/badges fully rounded — make the radius clearly visible in the mockup, not subtle to the point of reading as square.

### Elevation & depth (this was missing entirely — add it back)
- Resting cards get a soft, low-opacity neutral shadow (not a harsh black drop shadow).
- Elevated/active elements get a colored glow instead of a plain shadow: teal glow (`#5EEAD4`, low opacity, soft blur) for the "continue where you left off" card and any in-progress state; amber glow (`#FBBF24`) for the streak card.
- Establish clear visual hierarchy on the dashboard specifically: the "continue" card and streak counter should visually sit above the active-skills list, not sit at the same flat depth as everything else.
- Add a very subtle low-opacity radial gradient glow behind hero/focal moments (home hero, dashboard streak) for ambient depth — keep it restrained, this is atmosphere, not decoration.

### Bottom navigation (fix this specifically — it broke last time)
- 4 equal-width tap targets in a row, icon stacked above label inside each one, consistent spacing between icon and label and between each nav item — not inline run-together text.
- Active tab clearly distinct: teal icon + label; inactive tabs muted gray.
- Include safe-area bottom padding so it doesn't crowd the very edge of the frame on notched-phone mockups.
- At the desktop/tablet frame, show this convert into a left sidebar with the same 4 items, icon + label side by side, generous padding.

### The Learning Path node screen — refine, don't rebuild
- Keep the same 4 node states (locked/available/in-progress/completed) and the connecting-line concept, but add real spacing around and between each node card so it reads as a spaced vertical sequence, not an edge-to-edge stack.
- Make the in-progress node's glow visibly light the card behind it (not just a small glowing dot) so it's unmistakably the focal point of the screen.
- Add padding between the path and the frame edges on all sides.

### Home page — full content + visual rebuild
Design this as a proper marketing screen, not a single block of text:
1. **Hero** — a specific headline about being guided through a skill by an AI-generated learning path (not generic "learn anything" copy), subheadline naming the real mechanics (pick a skill → get a generated path → confirm understanding with quick checks → prove it with judged coding challenges). Gradient accent used on one element only (a headline word or a glow behind the hero visual).
2. **Hero visual** — a small live-look preview of the actual Learning Path component (a few nodes in mixed states), not a stock illustration — this should look like a real product screenshot, not marketing decoration.
3. **"How it works"** — 3 concrete steps with short copy each, laid out as a vertical stack on mobile, 3-column at desktop width.
4. **Coding challenge preview** — a small mock snippet showing a passed test-results row and a complexity badge (e.g. `O(n log n)`, mono font), so it's clear this includes real graded coding practice, not just flashcards.
5. **Closing CTA** — single "Log in" button, don't repeat the hero copy here.
- Generous section spacing (not cramped), consistent with the elevation system above.

### Mobile-first frames to produce
Show every screen at these exact frame widths so responsiveness is actually verifiable, not assumed: **320px** (smallest — the real stress test), **375px** (primary design frame), **430px**, then **768px** and **1280px** adaptations. At 320-375px, double check no text wraps awkwardly, no badge/pill overflows its container, and every tap target is at least 44px tall.

### Keep unchanged from the original brief
Color tokens, typography (Space Grotesk / Inter / JetBrains Mono), the loader's self-drawing path animation, and the overall screen list (home, login, dashboard, skill path, subtopic content, quiz, challenge, solution analysis, manage) — this pass is about spacing, depth, and the home page content, not a new direction.
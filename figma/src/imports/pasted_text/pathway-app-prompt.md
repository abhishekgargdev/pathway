# Figma Make Prompt — Paste this in as-is

## Design direction I picked (so you know the "why" before you paste this)

Given the subject — a personal, AI-driven skill-learning platform with a topic→subtopic tree, quizzes, and coding challenges — I avoided the two most common AI-generated-UI defaults (cream+serif+terracotta, or near-black+single-neon-accent) and grounded the identity in the app's actual data shape: a **path of connected nodes**, since that's literally what a skill's topic/subtopic tree *is*. That path is the signature element — it shows up in the skill map, echoes in the loading animation, and nowhere else, so it stays a signature instead of becoming wallpaper.

**Tokens:**
- Background `#0E1220` (deep navy, not pure black), Surface `#171B2E`, Surface-raised `#1F2440`
- Text primary `#EDEFF7`, text muted `#8B93B0`
- Accent (active/progress) — teal `#5EEAD4`
- Accent (streak/success/achievement) — amber `#FBBF24`
- Accent (errors/failed tests) — coral `#FB7185`
- Gradient (hero/celebratory moments only) — teal `#5EEAD4` → violet `#8B7CF6`
- Display type: **Space Grotesk** (geometric, techy, used for headings only)
- Body type: **Inter** (mobile legibility)
- Code/data type: **JetBrains Mono** (actually used for code blocks, test output, complexity tags — functional, not decorative)
- Radius: 16px cards, 12px buttons/inputs, full-round for pills/badges/nav
- Shadows: soft, colored (teal-tinted glow on active elements, not generic black drop shadow)

---

## The actual prompt (paste below into Figma Make)

Design a **mobile-first**, dark-themed UI for a personal AI-powered learning app called **"Pathway"** (placeholder name — feel free to keep or restyle it). The app helps one user pick skills to learn, works through an AI-generated topic/subtopic tree with examples, takes short quizzes to confirm understanding, and solves coding challenges that get judged against test cases and then explained with 5 alternative solutions.

### Brand & tokens
- Background `#0E1220`, surfaces `#171B2E` and `#1F2440`, text `#EDEFF7` / muted `#8B93B0`.
- Accent teal `#5EEAD4` for active/in-progress states, amber `#FBBF24` for streaks and success, coral `#FB7185` for errors/failed tests. Use a teal-to-violet gradient (`#5EEAD4` → `#8B7CF6`) sparingly, only for hero moments and celebratory states — never as a default button fill.
- Typography: Space Grotesk for all headings (bold, tight tracking), Inter for body/UI text, JetBrains Mono for anything code-related — code blocks, test-case output, complexity notation (e.g. `O(n log n)`), the streak counter number.
- 16px corner radius on cards, 12px on buttons and inputs, fully rounded pills for tags/badges/nav items. Soft colored glows instead of plain black shadows on active/focused elements.

### Signature element — the Learning Path
Design a **vertical connected-node path** as the core visual metaphor for a skill's topic/subtopic tree: circular nodes connected by lines, each node in one of four states — locked (dim, muted outline), available (teal outline, no fill), in-progress (teal fill, subtle pulsing glow), completed (solid teal fill with a checkmark, connecting line to the next node fully lit). This exact path pattern should also inform the **loading animation**: an SVG line that draws itself from node to node with a small glowing dot traveling along it, rather than a generic spinner. Use this path motif only in these two places — the skill map and the loader — so it reads as a signature, not decoration.

### Logo
Design a simple wordmark + icon lockup for "Pathway": an abstract icon built from 2-3 connected nodes/dots forming a small path or arrow shape — should work as a small app icon/favicon as well as a full lockup on the splash/home screen.

### Screens to design (mobile-first, then show how each adapts at tablet/desktop width)
1. **Splash/loader screen** — the path-drawing loader animation, logo, app name.
2. **Home / marketing screen** (pre-login) — explains what the app does, hero moment using the gradient sparingly, single "Log in" CTA.
3. **Login screen** — email + password, minimal, no signup link (single-user app).
4. **Dashboard** — greeting, streak counter (amber, mono numerals), "continue where you left off" card, list of active skills as compact horizontal progress cards, today's newly-ready content flagged with a small "new" badge.
5. **Skill detail / Learning Path screen** — the vertical node path described above, scrollable, tapping a node opens that subtopic.
6. **Subtopic content screen** — markdown-rendered lesson content, code example blocks in JetBrains Mono with syntax-highlight styling, a persistent bottom "Take the quiz" button once scrolled to the end.
7. **Quiz screen** — one question at a time, large tap targets for options, progress dots at top, clear pass/fail result state with the retry or "get a simpler explanation" path on failure.
8. **Coding challenge screen** — problem statement, language picker, code editor area (monospace, dark, line numbers), run/submit buttons, a test-results panel that lists each test case with pass/fail states in teal/coral.
9. **Solution analysis screen** (after passing) — your own solution's complexity/feedback card first, then a swipeable/stacked set of 5 alternative-solution cards, each tagged with concept/DSA pills (e.g. "OOP", "two-pointer") and time/space complexity shown in mono badges.
10. **Content Ops screen** (`/manage`) — a simple utility screen: generation queue status list, per-Gemini-key daily quota usage as small progress bars, a "regenerate" action per item. Keep this visually quieter/more utilitarian than the rest of the app — it's a maintenance screen, not a showcase one.

### Motion & interaction
- Page transitions: soft slide/fade, 200-250ms, ease-out.
- Node path: nodes animate from locked→available with a brief glow pulse when new content becomes ready; the connecting line animates filling in when a node completes.
- Buttons: subtle scale-down (0.97) on tap, teal glow on focus for accessibility.
- Quiz pass: brief celebratory micro-animation (glow burst or confetti-lite) using the gradient accent, not overused elsewhere.
- Streak counter: number ticks/rolls up on change.
- Respect reduced-motion: all animations should have a reduced/instant fallback.
- Keep motion **orchestrated, not scattered** — the path-drawing loader and the node-state transitions are the two moments that carry animation; everything else (buttons, transitions) should be quick and quiet so those two moments stand out.

### Responsiveness
Design mobile-first at 375px width as the primary frame for every screen above, with a bottom tab bar (Dashboard / Skills / Challenges / Profile). Then show tablet (768px) and desktop (1280px) adaptations: bottom tab bar becomes a left sidebar, single-column layouts become 2-column (e.g. content + a persistent progress sidebar on the subtopic screen), the node path can go from vertical-only to a wider layout with more breathing room.

### Deliverables
Please produce: the full screen set above at mobile width with tablet/desktop variants, a components page (buttons, cards, badges, node states, input fields, nav bar) as reusable components, and the logo lockup as a separate asset frame.
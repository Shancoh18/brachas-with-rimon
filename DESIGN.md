# DESIGN.md — Brachas with Rimon

**Theme scene:** an adult at a kitchen table at lunch, phone propped against
a glass, warm daylight — light theme, warm paper tones. (Dark theme: future,
for night bentching.)

**Color (Committed, warm):** canvas `--color-cream #faf7e9` (Rimon's own
cream — assets and canvas share one value, that's load-bearing); ink
`--color-espresso #2b211a`; support `--color-espresso-soft`, `--color-mocha`;
accents: `--color-gold #a87e2f` (achievement/study), `--color-rimon #a13327`
(action/identity), `--color-sage #7d8b74` (success/coverage). Never pure
black/white. One accent per element.

**Type:** Frank Ruhl Libre — display AND Hebrew (nikud-safe, `.hebrew` class:
RTL, line-height 1.9); Plus Jakarta Sans — UI. Scale contrast ≥1.25;
eyebrows: 10px, 800, tracking 0.2em, uppercase.

**Surfaces:** double-bezel cards (`<Bezel>`: outer tray + inner core,
concentric radii ~2rem), island pill CTAs with nested trailing icon circle
(`<PillButton>`), film grain via fixed pseudo-element. No side-stripe
borders, no gradient text, no glassmorphism except the fixed tab bar.

**Motion:** custom curves only — `cubic-bezier(0.32,0.72,0,1)` for entrances
/hero moves (700-800ms), `cubic-bezier(0.23,1,0.32,1)` 150-250ms for
high-frequency controls (tabs, toggles, chips). Buttons: `active:scale-[0.98]`.
Entrances: rise-in (translateY + blur). `prefers-reduced-motion` kills all of
it. Never animate layout properties.

**Rimon rules:** video-first pose loops color-matched to the canvas cream
(lutrgb pipeline in CLAUDE.md), radial-feather blend, spring entrance,
tap-boop. He walks the Guide's progress (RimonWalker). Chrome icons are
1.6px-stroke SVGs — chrome never uses emoji (emoji allowed in content voice:
challenges, tips).

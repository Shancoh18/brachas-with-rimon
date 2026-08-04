# Rimon expansion concepts — 2026-08-04

Six on-model concept images for adding more Rimon throughout the app.
Generated via Higgsfield (nano_banana_2, 1:1, 1k) with the canonical still as
an identity reference so the character stays exact.

**Reuse these for the next wave — do not re-upload / re-derive:**
- Identity reference: `public/mascot/rimon-hello.webp` uploaded as Higgsfield
  media `90b2e380-e0c4-4b47-a93d-e0d92495f56d` (role `image`).
- Prompt skeleton: "The exact same mascot character as the attached reference
  image … Keep identity, proportions, clay material and face EXACTLY as the
  reference. Now show him <scene>. Soft studio lighting, single soft ground
  shadow, plain solid warm cream background hex #FDFBF7 filling the entire
  frame edge to edge, nothing else in frame, centered composition."

| File | Scene | Intended placement |
| --- | --- | --- |
| rimon-1-sleeping.png | nightcap + pillow + zzz | empty/rest states (Journey zero-state, quiet hours), evening reminder art |
| rimon-2-shofar.png | blowing shofar, apple + honey | Rosh Hashanah seasonal takeover (Welcome hero + holiday tips) |
| rimon-3-scholar.png | graduation cap + open book | Learn headers, scholar challenge/badge art |
| rimon-4-detective.png | magnifying glass over plate | Identify screen "analyzing" upgrade |
| rimon-5-podium.png | trophy on #1 podium, confetti | Friends league winner, weekly recap, challenge complete |
| rimon-6-species-friends.png | Rimon + olive/date/grape/fig minis | kedima order teaching (Learn/Reference), Friends empty state |

Productionizing an approved concept: regenerate at 2k with the same reference
+ prompt, color-match the background into the #FDFBF7 family, export webp into
`public/mascot/`, then register the pose in `src/components/Rimon.tsx`
(STILL map; optional motion loop via Higgsfield image-to-video like the
existing seven). The component's video → still → hello fallback means a
still-only pose is safe to ship immediately.

Job IDs (for provenance / re-rolls): sleeping 8bf62e52, shofar 36280a95,
scholar 9ec5f2cb, detective a50066fd, podium 91c06d6a, species 6cd50f18.

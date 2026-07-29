/**
 * Nusach registry — all three packs now ship COMPLETE:
 *  - ari:      verbatim from chabad.org (the only nusach the approved halachic
 *              sites publish in full).
 *  - ashkenaz: Hebrew from the public-domain "Daat Siddur Ashkenaz" edition
 *              (via the Sefaria API — license field verified: Public Domain).
 *  - edot:     Me'ein Shalosh Hebrew from the CC0 "Shaliehsaboo Edition" of
 *              Siddur Edot HaMizrach (via the Sefaria API — license: CC0).
 * Transliterations for ashkenaz/edot are auto-generated and flagged in-app.
 * Halachic RULES still come only from chabad.org / brachos.org / oukosher.org
 * (see CLAUDE.md) — Sefaria is used solely for public-domain liturgical text.
 */
import { ARI } from './ari';
import { ASHKENAZ } from './ashkenaz';
import { EDOT } from './edot';
import type { NusachPack } from './types';

export const NUSACHIM: Record<string, NusachPack> = {
  ari: ARI,
  ashkenaz: ASHKENAZ,
  edot: EDOT,
};

export type NusachId = keyof typeof NUSACHIM;
export { ARI, ASHKENAZ, EDOT };
export type { NusachPack };

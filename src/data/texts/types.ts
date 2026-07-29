import type { AfterBracha, Bracha } from '../foods';

export interface Liturgy {
  hebrew: string;
  translit: string;
  english: string;
}

export interface NusachPack {
  id: 'ari' | 'ashkenaz' | 'edot';
  label: string;
  /** true = full text sourced verbatim from chabad.org; false = shared Hebrew + generated transliteration, verify against a licensed siddur */
  complete: boolean;
  completenessNote?: string;
  brachos: Record<Bracha, Liturgy>;
  boreiNefashos: Liturgy;
  /** Me'ein Shalosh assembled from opening + inserts + body + seal per active triggers */
  meeinShalosh: {
    opening: Liturgy;
    inserts: Record<'AlHamichya' | 'AlHagefen' | 'AlHaetz', Liturgy>;
    body: Liturgy;
    seals: Record<'AlHamichya' | 'AlHagefen' | 'AlHaetz', Liturgy>;
  };
  birkatHamazon: {
    intro: string;
    sections: { name: string; hebrew: string; translit: string; english: string }[];
    notes: string[];
  };
}

export type MeeinInsert = Extract<AfterBracha, 'AlHamichya' | 'AlHagefen' | 'AlHaetz'>;

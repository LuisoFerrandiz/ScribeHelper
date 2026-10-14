import type { CaseFull, PartyRole } from './types';

// SPEC-024 step 1b: the staged party/witness drafts and their conversion from
// the server's CaseFull, moved out of CaseForm.tsx (the conversion was
// written twice: reload() and refreshParties()).

// SPEC-016: a case can have several initiators/several respondents —
// mirrors WitnessDraft's own staging pattern (null id = not yet
// persisted, created on Save; add/remove only, no inline edit of an
// already-saved row, same as Witness).
export interface PartyDraft {
  id: number | null;
  sailNumber: string;
  boatName: string;
  representedBy: string;
}

export const emptyPartyDraft: PartyDraft = { id: null, sailNumber: '', boatName: '', representedBy: '' };

export interface WitnessDraft {
  id: number | null; // null = not yet persisted, created on Save
  fullName: string;
  role: string;
}

export function toPartyDrafts(full: CaseFull): Record<PartyRole, PartyDraft[]> {
  return {
    initiator: full.parties
      .filter((p) => p.role === 'initiator')
      .map((p) => ({ id: p.id, sailNumber: p.sail_number ?? '', boatName: p.boat_name ?? '', representedBy: p.represented_by ?? '' })),
    respondent: full.parties
      .filter((p) => p.role === 'respondent')
      .map((p) => ({ id: p.id, sailNumber: p.sail_number ?? '', boatName: p.boat_name ?? '', representedBy: p.represented_by ?? '' })),
  };
}

export function toWitnessDrafts(full: CaseFull): WitnessDraft[] {
  return full.witnesses.map((w) => ({ id: w.id, fullName: w.full_name, role: w.role ?? '' }));
}

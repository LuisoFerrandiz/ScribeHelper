export type SuggestionSource = 'protest_form' | 'hearing_notes' | 'phrase' | 'example' | 'party_position';

// SPEC-020: one uniform entry of the suggestion list. `source` is internal
// data only (never shown in the UI). SPEC-032 exception (D-044): `tag` is a short
// visible label, used only for a party's claim, never part of the inserted text.
export interface SuggestionItem {
  id: string;
  text: string;
  source: SuggestionSource;
  tag?: string;
}

interface CaseSuggestions {
  lines?: string[];
  paragraph?: string;
}

function fromSource(source: SuggestionSource, s: CaseSuggestions): SuggestionItem[] {
  const texts = [...(s.lines ?? []), ...(s.paragraph ? [s.paragraph] : [])];
  return texts
    .filter((t) => t.trim() !== '')
    .map((text, i) => ({ id: `${source}:${i}`, text, source }));
}

// Case-derived items in the fixed order of SPEC-020 RF-006: protest form
// (lines, then paragraph), then hearing notes (lines, then paragraph).
export function caseSuggestionItems(protestForm: CaseSuggestions, notes: CaseSuggestions): SuggestionItem[] {
  return [...fromSource('protest_form', protestForm), ...fromSource('hearing_notes', notes)];
}

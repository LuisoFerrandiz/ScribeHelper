export type SuggestionSource = 'protest_form' | 'hearing_notes' | 'phrase' | 'example';

// SPEC-020: one uniform entry of the suggestion list. `source` is internal
// data only (never shown in the UI).
export interface SuggestionItem {
  id: string;
  text: string;
  source: SuggestionSource;
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

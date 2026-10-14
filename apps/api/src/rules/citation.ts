import type { RuleLayer } from '../resources/storage.js';

// SPEC-022 RF-003/RF-006/RF-010: the single place that builds and resolves rule
// citations. No other module concatenates a prefix and a number.

export type CitationPrefix = 'RRS' | 'CR' | 'NoR' | 'SI';
export type DocType = 'nor' | 'si' | 'si_amendment';

export interface ParsedCitation {
  prefix: CitationPrefix | null; // null = no explicit prefix
  part: string | null; // 'Addendum E', 'Appendix B'
  number: string; // canonical: 'C6.1', '44.2'
  suffix: string | null; // '(a)' — only checked, never indexed
}

// 'c.6.1' -> 'C6.1': upper case, no dot between the letters and the first digit.
export function canonicalNumber(raw: string): string {
  return raw.trim().toUpperCase().replace(/^([A-Z]{1,2})\./, '$1');
}

export function prefixFor(layer: RuleLayer, docType: DocType | null): CitationPrefix | null {
  if (layer === 'rrs') return 'RRS';
  if (layer === 'class') return 'CR';
  if (docType === 'nor') return 'NoR';
  if (docType === 'si' || docType === 'si_amendment') return 'SI';
  return null; // event document not classified yet
}

export function formatCitation(c: {
  prefix: CitationPrefix | null;
  part: string | null;
  number: string;
  suffix?: string | null;
}): string {
  return [c.prefix, c.part, c.number + (c.suffix ?? '')].filter(Boolean).join(' ');
}

// RF-003: the label depends only on the section's own fields. An Addendum
// always carries its part; an Appendix only when the number is not native
// (native = starts with the appendix letter: A2.1 in Appendix A).
export function citationFor(s: { prefix: CitationPrefix | null; number: string; part: string | null }): string {
  let part = s.part;
  if (part && part.startsWith('Appendix ')) {
    const letter = part.slice('Appendix '.length);
    if (s.number.startsWith(letter)) part = null;
  }
  return formatCitation({ prefix: s.prefix, part, number: s.number });
}

const PREFIX_ALIASES: Record<string, CitationPrefix> = {
  rrs: 'RRS',
  rule: 'RRS',
  r: 'RRS',
  cr: 'CR',
  nor: 'NoR',
  si: 'SI',
};

const CITATION_TEXT =
  /^(?:(RRS|CR|NoR|SI|Rule|R)(?:\.\s*|\s+))?(?:(Appendix|Addendum)\s+([A-Za-z]\d?)\s+)?([A-Za-z]{0,2}\.?\d+(?:\.\d+)*)((?:\([A-Za-z0-9]+\))*)$/i;

// Lenient parser for typed text (RF-006): aliases Rule / R. map to RRS and are
// never stored. Returns null when the text is not shaped like a citation.
export function parseCitation(text: string): ParsedCitation | null {
  const m = CITATION_TEXT.exec(text.trim().replace(/\s+/g, ' '));
  if (!m) return null;
  const prefix = m[1] ? PREFIX_ALIASES[m[1].toLowerCase()] : null;
  const part = m[2] ? `${m[2][0].toUpperCase()}${m[2].slice(1).toLowerCase()} ${m[3].toUpperCase()}` : null;
  return {
    prefix: prefix ?? null,
    part,
    number: canonicalNumber(m[4]),
    suffix: m[5] ? m[5].toLowerCase() : null,
  };
}

// Inverse of formatCitation: only text with an explicit prefix resolves.
export function resolveCitation(text: string): ParsedCitation | null {
  const c = parseCitation(text);
  return c && c.prefix ? c : null;
}

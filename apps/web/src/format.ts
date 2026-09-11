import type { CaseFull } from './types';

// Turns structured data (parties, witnesses, jury, rule citations) into
// the plain text that gets pasted into the official decision document.
// The free-text boxes (Procedural Matters, Facts Found, Conclusion,
// Decision) need no formatting — their stored value is already the text.

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatParties(c: CaseFull): string {
  const roles: Array<'initiator' | 'respondent'> = ['initiator', 'respondent'];
  return roles
    .map((role) => {
      const p = c.parties.find((x) => x.role === role);
      if (!p) return `${capitalize(role)}: —`;
      const boat = [p.sail_number, p.boat_name].filter(Boolean).join(' ') || '—';
      const rep = p.represented_by ? `, represented by ${p.represented_by}` : '';
      return `${capitalize(role)}: ${boat}${rep}`;
    })
    .join('\n');
}

export function formatWitnesses(c: CaseFull): string {
  if (c.witnesses.length === 0) return '—';
  return c.witnesses.map((w) => `${w.full_name}${w.role ? ` — ${w.role}` : ''}`).join('\n');
}

export function formatRulesApplicable(c: CaseFull): string {
  if (c.ruleCitations.length === 0) return '—';
  return [...c.ruleCitations]
    .sort((a, b) => a.position - b.position)
    .map((r) => r.rule_reference)
    .join('\n');
}

export function formatJuryMembers(c: CaseFull): string {
  if (c.jury.length === 0) return '—';
  return [...c.jury]
    .sort((a, b) => b.is_chairman - a.is_chairman)
    .map((j) => `${j.full_name}${j.is_chairman ? ' (Chairman)' : ''}`)
    .join('\n');
}

// Form order, fixed (CONTEXT.md section 4). Never reorder.
export function formatFullDecision(c: CaseFull): string {
  const sections: Array<[string, string]> = [
    ['Parties', formatParties(c)],
    ['Witness', formatWitnesses(c)],
    ['Procedural Matters', c.procedural_matters || '—'],
    ['Facts Found', c.facts_found || '—'],
    ['Conclusion', c.conclusion || '—'],
    ['Rules Applicable', formatRulesApplicable(c)],
    ['Decision', c.decision || '—'],
    ['Jury Members', formatJuryMembers(c)],
  ];
  return sections.map(([label, text]) => `${label}\n${text}`).join('\n\n');
}

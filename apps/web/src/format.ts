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

function slugify(s: string): string {
  return s.trim().replace(/\s+/g, '-').replace(/[^A-Za-z0-9-]/g, '');
}

// D-005 follow-up: filename for the downloadable export — regatta name,
// case number zero-padded to 2 digits, today's date. case_number is free
// text, so pull the first number out of it rather than assume its shape.
export function buildDecisionFilename(c: CaseFull): string {
  const eventSlug = slugify(c.event.name) || 'Event';
  const numMatch = c.case_number.match(/\d+/);
  const caseNum = numMatch ? numMatch[0].padStart(2, '0') : slugify(c.case_number);
  const date = new Date().toISOString().slice(0, 10);
  return `${eventSlug}-Case${caseNum}-${date}.html`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nl2br(s: string): string {
  return escapeHtml(s).replace(/\n/g, '<br>');
}

// D-005 follow-up: richer-than-markdown export, matching the layout of
// the source Word template (Template_Jurydecision.docx) — header table,
// Parties/Witness tables, boxed free-text sections, Jury Members row.
// Single self-contained file: inline <style>, no JS, no external assets.
export function formatFullDecisionHtml(c: CaseFull): string {
  const initiator = c.parties.find((p) => p.role === 'initiator');
  const respondent = c.parties.find((p) => p.role === 'respondent');
  const partyRow = (label: string, p?: (typeof c.parties)[number]) => `
    <tr>
      <th>${label}</th>
      <td>${p?.sail_number ? escapeHtml(p.sail_number) : '—'}</td>
      <td>${p?.boat_name ? escapeHtml(p.boat_name) : '—'}</td>
      <td>${p?.represented_by ? escapeHtml(p.represented_by) : '—'}</td>
    </tr>`;

  const witnessRows = c.witnesses.length
    ? c.witnesses
        .map(
          (w) => `
    <tr>
      <td>${escapeHtml(w.full_name)}</td>
      <td>${w.role ? escapeHtml(w.role) : '—'}</td>
    </tr>`
        )
        .join('')
    : '<tr><td colspan="2">—</td></tr>';

  const jury = [...c.jury].sort((a, b) => b.is_chairman - a.is_chairman);
  const chairman = jury.find((j) => j.is_chairman);
  const others = jury.filter((j) => !j.is_chairman);
  const juryCells = [
    `<td><strong>Panel Chairman</strong><br>${chairman ? escapeHtml(chairman.full_name) : '—'}</td>`,
    ...others.map((j) => `<td>${escapeHtml(j.full_name)}</td>`),
  ].join('');

  const withCases = c.linkedCases.map((x) => x.case_number).join(', ') || '—';

  const box = (label: string, text: string) => `
  <div class="box">
    <div class="box-label">${escapeHtml(label)}</div>
    <div class="box-body">${text ? nl2br(text) : '—'}</div>
  </div>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(c.event.name)} — Case ${escapeHtml(c.case_number)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 800px; margin: 24px auto; color: #1a1a1a; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: top; font-size: 0.95em; }
  th { background: #f2f2f2; width: 1%; white-space: nowrap; }
  .header-table td { border: none; vertical-align: middle; }
  .title-cell { text-align: center; }
  .title-cell h1 { font-style: italic; font-size: 1.4em; margin: 0; text-decoration: underline; }
  .meta-cell { text-align: right; font-size: 0.95em; line-height: 1.5; }
  .section-title { font-weight: bold; margin: 4px 0; }
  .box { border: 1px solid #999; border-radius: 4px; padding: 8px 10px; margin-bottom: 12px; }
  .box-label { font-weight: bold; margin-bottom: 4px; }
  .box-body { white-space: pre-wrap; font-size: 0.95em; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>

<table class="header-table">
  <tr>
    <td class="title-cell" style="width:60%"><h1>Jury Decision</h1></td>
    <td class="meta-cell">
      Case: ${escapeHtml(c.case_number)}<br>
      Day: ${c.day ? escapeHtml(c.day) : '—'}<br>
      With Case(s): ${escapeHtml(withCases)}<br>
      Race: ${c.race ? escapeHtml(c.race) : '—'}
    </td>
  </tr>
</table>

<p class="section-title">Parties</p>
<table>
  <tr><th></th><th>Sail No:</th><th>Boat Name:</th><th>Represented by:</th></tr>
  ${partyRow('Initiator:', initiator)}
  ${partyRow('Respondent:', respondent)}
</table>

<p class="section-title">Witness:</p>
<table>
  <tr><th>Name</th><th>Role:</th></tr>
  ${witnessRows}
</table>

${box('Procedural Matters:', c.procedural_matters)}
${box('Facts Found:', c.facts_found)}
${box('Conclusion:', c.conclusion)}
${box('Rules applicable:', formatRulesApplicable(c))}
${box('Decision:', c.decision)}
<p>Parties informed of the decision (Date &amp; time): ${c.informed_at ? escapeHtml(c.informed_at) : '—'}</p>

<p class="section-title">Jury Members:</p>
<table>
  <tr>${juryCells || '<td>—</td>'}</tr>
</table>

</body>
</html>`;
}

// SPEC-024 step 1a: the case form's tab ids and labels, moved verbatim out of
// CaseForm.tsx. Order is the on-screen tab order.
export type CaseTab =
  | 'attachments'
  | 'general'
  | 'parties'
  | 'procedural'
  | 'facts'
  | 'conclusion'
  | 'rules'
  | 'decision'
  | 'review';

export const CASE_TABS: { id: CaseTab; label: string }[] = [
  { id: 'attachments', label: '0. Protest Form(s)' },
  { id: 'general', label: '1. General' },
  { id: 'parties', label: '2. Parties & Witness' },
  { id: 'procedural', label: '3. Procedural Matters' },
  { id: 'facts', label: '4. Facts Found' },
  { id: 'conclusion', label: '5. Conclusion' },
  { id: 'rules', label: '6. Rules Applicable' },
  { id: 'decision', label: '7. Decision' },
  { id: 'review', label: '8. Review' },
];

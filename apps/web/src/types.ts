export interface EventRow {
  id: number;
  name: string;
  venue: string | null;
  start_date: string | null;
  end_date: string | null;
  timezone: string;
  created_at: string;
}

export interface PersonRow {
  id: number;
  full_name: string;
}

// Event's judge pool (D-021) — added once per regatta.
export interface JuryMemberRow {
  id: number;
  event_id: number;
  person_id: number;
  is_chairman: 0 | 1;
}

// Panel actually sitting on one case, picked from that case's event pool.
export interface CaseJuryMemberRow {
  id: number;
  case_id: number;
  person_id: number;
  is_chairman: 0 | 1;
}

export interface BoatRow {
  id: number;
  sail_number: string;
  boat_name: string | null;
}

export type CaseType = 'protest' | 'redress';
export type PartyRole = 'initiator' | 'respondent';

export interface CaseRow {
  id: number;
  event_id: number;
  case_number: string;
  case_type: CaseType;
  day: string | null;
  race: string | null;
  informed_at: string | null;
  procedural_matters: string;
  facts_found: string;
  conclusion: string;
  decision: string;
  created_at: string;
  updated_at: string;
}

export interface PartyRow {
  id: number;
  case_id: number;
  role: PartyRole;
  boat_id: number | null;
  represented_by_id: number | null;
}

export interface WitnessRow {
  id: number;
  case_id: number;
  person_id: number;
  role: string | null;
}

export interface RuleCitationRow {
  id: number;
  case_id: number;
  rule_reference: string;
  position: number;
}

export interface CaseLinkRow {
  case_id: number;
  linked_case_id: number;
}

export type PhraseBox = 'procedural_matters' | 'facts_found' | 'conclusion' | 'decision';

export interface PhraseRow {
  id: number;
  box: PhraseBox;
  label: string;
  body: string;
  origin: 'base' | 'own';
  created_at: string;
}

export interface PhraseSearchHit extends PhraseRow {
  snippet: string;
}

// Phase 4: alternative AI draft panel (CONTEXT.md section 9). Reuses
// PhraseBox — same four free-text sections, one draft request each.
export interface CitationCheck {
  reference: string;
  found: boolean;
}

export interface DraftResult {
  text: string;
  citations: CitationCheck[];
}

// Phase 5: inline ghost-text completion (D-025).
export interface InlineCompletion {
  suggestion: string;
}

export type ResourceKind = 'rule' | 'example';
export type RuleLayer = 'rrs' | 'class' | 'event';
export type ExampleScope = 'base' | 'own';

export interface ResourceRow {
  id: number;
  kind: ResourceKind;
  layer: RuleLayer | null;
  event_id: number | null;
  scope: ExampleScope | null;
  title: string;
  original_filename: string;
  original_path: string;
  markdown_path: string | null;
  status: 'pending_review' | 'accepted';
  conversion_empty: 0 | 1;
  created_at: string;
  reviewed_at: string | null;
}

export interface ResourceFull extends ResourceRow {
  markdown: string;
}

export interface ResourceSearchHit {
  id: number;
  title: string;
  layer: RuleLayer;
  snippet: string;
}

export interface CaseFull extends CaseRow {
  event: EventRow;
  jury: { id: number; is_chairman: 0 | 1; full_name: string }[];
  parties: {
    id: number;
    role: PartyRole;
    sail_number: string | null;
    boat_name: string | null;
    represented_by: string | null;
  }[];
  witnesses: { id: number; role: string | null; full_name: string }[];
  ruleCitations: { id: number; rule_reference: string; position: number }[];
  linkedCases: { id: number; case_number: string }[];
}

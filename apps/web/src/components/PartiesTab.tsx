import type { FormEvent } from 'react';
import { CopyBox } from './CopyBox';
import { formatBoat, formatParties, formatWitnesses } from '../format';
import { emptyPartyDraft, type PartyDraft, type WitnessDraft } from '../caseDrafts';
import type { AttachmentExtraction, BoatRow, CaseFull, PartyRole, PersonRow } from '../types';

interface Props {
  liveCase: CaseFull;
  partyDrafts: Record<PartyRole, PartyDraft[]>;
  partyForm: Record<PartyRole, PartyDraft>;
  setPartyForm: React.Dispatch<React.SetStateAction<Record<PartyRole, PartyDraft>>>;
  witnessDraft: WitnessDraft[];
  witnessName: string;
  setWitnessName: (value: string) => void;
  witnessRole: string;
  setWitnessRole: (value: string) => void;
  extraction: AttachmentExtraction | null;
  boats: BoatRow[];
  people: PersonRow[];
  copied: Record<string, boolean>;
  markCopied: (key: string) => void;
  onUnstageParty: (role: PartyRole, index: number) => void;
  onStageParty: (role: PartyRole, e: FormEvent) => void;
  onAddSuggestedParty: (role: PartyRole) => void;
  onUnstageWitness: (index: number) => void;
  onStageWitness: (e: FormEvent) => void;
  onAddSuggestedWitness: (w: { full_name: string; role?: string }) => void;
}

// SPEC-024 step 4: the Parties & Witness tab's content, moved out of
// CaseForm.tsx. All state (party/witness drafts, the inline add forms) and the
// handlers stay in CaseForm (SPEC-024 R-2: they survive a tab switch today);
// CaseForm paints the surrounding div.tab-panel (R-4). The three <datalist>s
// are only used by this tab, so they live here.
export function PartiesTab({
  liveCase,
  partyDrafts,
  partyForm,
  setPartyForm,
  witnessDraft,
  witnessName,
  setWitnessName,
  witnessRole,
  setWitnessRole,
  extraction,
  boats,
  people,
  copied,
  markCopied,
  onUnstageParty,
  onStageParty,
  onAddSuggestedParty,
  onUnstageWitness,
  onStageWitness,
  onAddSuggestedWitness,
}: Props) {
  // Parties & Witness — one box, matching the fixed document
  // order (Parties, then Witness — format.ts's
  // formatFullDecision) both in the UI and in Copy.
  return (
    <CopyBox
      label="Parties & Witness"
      text={`${formatParties(liveCase)}\n\n${formatWitnesses(liveCase)}`}
      copied={!!copied.parties && !!copied.witness}
      onCopied={() => {
        markCopied('parties');
        markCopied('witness');
      }}
    >
      {(['initiator', 'respondent'] as PartyRole[]).map((role) => (
        <div key={role}>
          <h3>{role === 'initiator' ? 'Initiator(s)' : 'Respondent(s)'}</h3>
          <ul className="list">
            {partyDrafts[role].map((p, i) => (
              <li key={`${p.id ?? 'new'}-${i}`}>
                {formatBoat({ sail_number: p.sailNumber || null, boat_name: p.boatName || null })}
                {p.representedBy ? `, represented by ${p.representedBy}` : ''}{' '}
                <button type="button" onClick={() => onUnstageParty(role, i)}>
                  Remove
                </button>
              </li>
            ))}
            {partyDrafts[role].length === 0 && (
              <li className="muted">No {role === 'initiator' ? 'initiators' : 'respondents'} yet.</li>
            )}
          </ul>
          {extraction?.parties[role] && (
            <p className="muted">
              Suggested:{' '}
              {formatBoat({
                sail_number: extraction.parties[role]?.sail_number ?? null,
                boat_name: extraction.parties[role]?.boat_name ?? null,
              })}{' '}
              <button type="button" onClick={() => onAddSuggestedParty(role)}>
                Add
              </button>
            </p>
          )}
          <form onSubmit={(e) => onStageParty(role, e)} className="inline-form">
            <input
              list="boat-sail-numbers"
              placeholder="Sail number"
              value={partyForm[role].sailNumber}
              onChange={(e) => setPartyForm((prev) => ({ ...prev, [role]: { ...prev[role], sailNumber: e.target.value } }))}
            />
            <input
              list="boat-names"
              placeholder="Boat name"
              value={partyForm[role].boatName}
              onChange={(e) => setPartyForm((prev) => ({ ...prev, [role]: { ...prev[role], boatName: e.target.value } }))}
            />
            <input
              list="people-list"
              placeholder="Represented by"
              value={partyForm[role].representedBy}
              onChange={(e) => setPartyForm((prev) => ({ ...prev, [role]: { ...prev[role], representedBy: e.target.value } }))}
            />
            <button type="submit">Add</button>
          </form>
        </div>
      ))}

      <h3>Witness</h3>
      <ul className="list">
        {witnessDraft.map((w, i) => (
          <li key={`${w.id ?? 'new'}-${i}`}>
            {w.fullName}
            {w.role ? ` — ${w.role}` : ''}{' '}
            <button type="button" onClick={() => onUnstageWitness(i)}>
              Remove
            </button>
          </li>
        ))}
        {witnessDraft.length === 0 && <li className="muted">No witnesses yet.</li>}
      </ul>
      {extraction && extraction.witnesses.length > 0 && (
        <ul className="list">
          {extraction.witnesses.map((w, i) => (
            <li key={i}>
              Suggested: {w.full_name}
              {w.role ? ` — ${w.role}` : ''}{' '}
              <button type="button" onClick={() => onAddSuggestedWitness(w)}>
                Add
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={onStageWitness} className="inline-form">
        <input
          list="people-list"
          placeholder="Full name"
          value={witnessName}
          onChange={(e) => setWitnessName(e.target.value)}
          required
        />
        <input placeholder="Role" value={witnessRole} onChange={(e) => setWitnessRole(e.target.value)} />
        <button type="submit">Add</button>
      </form>
      <datalist id="boat-sail-numbers">
        {boats.map((b) => (
          <option key={b.id} value={b.sail_number} />
        ))}
      </datalist>
      <datalist id="boat-names">
        {boats.map((b) => b.boat_name && <option key={b.id} value={b.boat_name} />)}
      </datalist>
      <datalist id="people-list">
        {people.map((p) => (
          <option key={p.id} value={p.full_name} />
        ))}
      </datalist>
    </CopyBox>
  );
}

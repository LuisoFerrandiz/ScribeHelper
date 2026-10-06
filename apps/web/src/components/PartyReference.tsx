import { formatBoat } from '../format';

interface Party {
  sailNumber: string;
  boatName: string;
}

interface Props {
  initiators: Party[];
  respondents: Party[];
  race?: string;
  currentText: string;
}

// SPEC-006 RF-006: always-visible reference (not collapsible, unlike
// the rest of the panel) — read-only, never inserts anything. Highlights
// whichever party's sail number appears in what's currently typed.
// SPEC-008 RF-001 (Decision) extends it with an optional race row, same
// substring-highlight logic. SPEC-016: a case can have several
// initiators/respondents — one row per party, still one "—" row when a
// role has none, same empty-state look as before.
export function PartyReference({ initiators, respondents, race, currentText }: Props) {
  const matches = (p: Party) => !!p.sailNumber && currentText.includes(p.sailNumber);
  const raceMatches = !!race && currentText.includes(race);

  const row = (label: string, p: Party, key: string | number) => (
    <div key={key} className={matches(p) ? 'party-reference-row highlight' : 'party-reference-row'}>
      <strong>{label}:</strong> {formatBoat({ sail_number: p.sailNumber || null, boat_name: p.boatName || null })}
    </div>
  );

  return (
    <div className="party-reference">
      {initiators.length > 0
        ? initiators.map((p, i) => row('Initiator', p, `i-${i}`))
        : row('Initiator', { sailNumber: '', boatName: '' }, 'i-empty')}
      {respondents.length > 0
        ? respondents.map((p, i) => row('Respondent', p, `r-${i}`))
        : row('Respondent', { sailNumber: '', boatName: '' }, 'r-empty')}
      {race && (
        <div className={raceMatches ? 'party-reference-row highlight' : 'party-reference-row'}>
          <strong>Race:</strong> {race}
        </div>
      )}
    </div>
  );
}

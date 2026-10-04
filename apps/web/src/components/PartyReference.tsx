import { formatBoat } from '../format';

interface Party {
  sailNumber: string;
  boatName: string;
}

interface Props {
  initiator: Party;
  respondent: Party;
  currentText: string;
}

// SPEC-006 RF-006: always-visible reference (not collapsible, unlike
// the rest of the panel) — read-only, never inserts anything. Highlights
// whichever party's sail number appears in what's currently typed.
export function PartyReference({ initiator, respondent, currentText }: Props) {
  const matches = (p: Party) => !!p.sailNumber && currentText.includes(p.sailNumber);

  return (
    <div className="party-reference">
      <div className={matches(initiator) ? 'party-reference-row highlight' : 'party-reference-row'}>
        <strong>Initiator:</strong> {formatBoat({ sail_number: initiator.sailNumber || null, boat_name: initiator.boatName || null })}
      </div>
      <div className={matches(respondent) ? 'party-reference-row highlight' : 'party-reference-row'}>
        <strong>Respondent:</strong> {formatBoat({ sail_number: respondent.sailNumber || null, boat_name: respondent.boatName || null })}
      </div>
    </div>
  );
}

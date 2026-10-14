interface Props {
  parties: { sailNumber: string; role: 'initiator' | 'respondent' }[];
  hasX: boolean;
  hasY: boolean;
  onReplace: (label: 'X' | 'Y', sailNumber: string) => void;
}

// SPEC-025 RF-005 — X and Y in an inserted phrase are generic labels, not a
// fixed initiator/respondent: nothing is assumed, the drafter picks the boat.
// The buttons never take focus from the text box (mousedown without default
// action), so the gap session stays open.
export function PartyBar({ parties, hasX, hasY, onReplace }: Props) {
  const rows: ('X' | 'Y')[] = [...(hasX ? (['X'] as const) : []), ...(hasY ? (['Y'] as const) : [])];
  if (rows.length === 0 || parties.length === 0) return null;
  return (
    <div className="party-bar" data-gap-ui>
      {rows.map((label) => (
        <div key={label} className="party-bar-row">
          <span className="muted">Replace {label} with:</span>{' '}
          {parties.map((p) => (
            <button
              key={`${label}-${p.sailNumber}-${p.role}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onReplace(label, p.sailNumber)}
            >
              {p.sailNumber} ({p.role})
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

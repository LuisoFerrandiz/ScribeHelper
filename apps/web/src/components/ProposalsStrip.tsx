import { useRef, useState } from 'react';
import type { ProposalCard } from '../useProposals';
import type { AiState } from '../useProposals';

interface Props {
  cards: ProposalCard[];
  aiState: AiState;
  onInsert: (text: string) => void;
  onRefresh: () => void;
}

// SPEC-034 RF-001/RF-002 — up to three proposals above the box: just the text that
// will be inserted, in full. No origin, no title, no tag. One click inserts it at
// the caret. While the pointer is over the strip (or a click is under way) the
// cards do not change, so what is clicked is what was seen.
export function ProposalsStrip({ cards, aiState, onInsert, onRefresh }: Props) {
  const [hovering, setHovering] = useState(false);
  const frozen = useRef<ProposalCard[]>([]);
  if (!hovering) frozen.current = cards;
  const shown = hovering ? frozen.current : cards;

  return (
    <div
      className="proposals-strip"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="proposals-cards">
        {shown.map((c) => (
          <button
            key={c.key}
            type="button"
            className="proposal-card"
            data-gap-ui
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsert(c.text)}
          >
            {c.text}
          </button>
        ))}
      </div>
      <div className="proposals-bar" aria-live="polite">
        {aiState === 'loading' && <span className="muted">Updating…</span>}
        {(aiState === 'unavailable' || aiState === 'failed') && (
          <span className="muted">AI proposals unavailable</span>
        )}
        <button type="button" data-gap-ui onMouseDown={(e) => e.preventDefault()} onClick={onRefresh}>
          Refresh
        </button>
      </div>
    </div>
  );
}

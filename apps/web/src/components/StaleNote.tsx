import { useState } from 'react';
import { serverError } from '../api';
import { BOX_LABEL, type ChainBox } from '../staleBoxes';

interface Props {
  sources: ChainBox[]; // earlier boxes changed after this one
  onReview: () => Promise<void>;
}

// SPEC-029 RF-006 — informative only: the earlier box changed after this one
// was last edited, so this one may be out of date. "Mark as reviewed" says it
// still holds, without touching the text.
export function StaleNote({ sources, onReview }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (sources.length === 0) return null;

  async function handleReview() {
    setBusy(true);
    setError(null);
    try {
      await onReview();
    } catch (e) {
      setError(serverError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <p className="pending-note">
      {sources.map((s) => BOX_LABEL[s]).join(', ')} changed after this box was last edited.{' '}
      <button type="button" onClick={handleReview} disabled={busy}>
        {busy ? 'Saving…' : 'Mark as reviewed'}
      </button>
      {error && <span className="error"> {error}</span>}
    </p>
  );
}

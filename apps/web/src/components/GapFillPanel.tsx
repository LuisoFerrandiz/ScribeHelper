import { useMemo, useState } from 'react';
import { api, serverError } from '../api';
import { dataGaps, replaceGapsAt, type DataGap } from '../gapFill';
import type { GapFill } from '../types';

interface Props {
  caseId: number;
  text: string; // the box text on screen
  notes: string; // hearing notes on screen
  factsFound: string; // Facts Found on screen
  onApply: (next: string) => void; // writes the box text (closes the gap session)
}

type Status = 'pending' | 'accepted' | 'skipped';

interface Session {
  baseline: string; // text at the time of the request: proposals are checked against it
  appliedText: string; // what this panel last wrote; a different box text means the drafter edited
  gaps: DataGap[]; // id = position in this list
  fills: GapFill[];
  noValue: number;
  status: Record<number, Status>;
}

// SPEC-031 RF-005/RF-006 — the AI proposes a value for each DATA gap of the
// box (never alternatives or wording gaps); the drafter accepts or skips each
// one with its source and quote in view. Nothing is written without a click.
export function GapFillPanel({ caseId, text, notes, factsFound, onApply }: Props) {
  const gaps = useMemo(() => dataGaps(text), [text]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changed = session !== null && text !== session.appliedText;

  if (!session && gaps.length === 0 && !loading && !error) return null;

  async function run() {
    setError(null);
    setSession(null);
    setLoading(true);
    const baseline = text;
    const sent = dataGaps(baseline);
    try {
      const res = await api.fillGaps(
        caseId,
        sent.map((g, id) => ({ id, text: g.text, before: g.before, after: g.after })),
        notes,
        factsFound,
      );
      setSession({
        baseline,
        appliedText: baseline,
        gaps: sent,
        fills: res.fills,
        noValue: res.noValue.length,
        status: Object.fromEntries(res.fills.map((f) => [f.id, 'pending' as Status])),
      });
    } catch (e) {
      setError(serverError(e));
    } finally {
      setLoading(false);
    }
  }

  // Accepted values are always re-applied to the baseline, so a neighbouring
  // replacement never makes the next gap look changed.
  function accept(ids: number[]) {
    if (!session || changed) return;
    const done = Object.entries(session.status)
      .filter(([, s]) => s === 'accepted')
      .map(([id]) => Number(id));
    const items = [...done, ...ids].flatMap((id) => {
      const fill = session.fills.find((f) => f.id === id);
      return fill ? [{ gap: session.gaps[id], value: fill.value }] : [];
    });
    const { text: next, stale } = replaceGapsAt(session.baseline, items);
    const staleIds = new Set(stale.map((g) => session.gaps.indexOf(g)));
    const status = { ...session.status };
    for (const id of ids) status[id] = staleIds.has(id) ? 'skipped' : 'accepted';
    setSession({ ...session, status, appliedText: next });
    onApply(next);
  }

  function skip(id: number) {
    if (session) setSession({ ...session, status: { ...session.status, [id]: 'skipped' } });
  }

  const pending = session ? session.fills.filter((f) => session.status[f.id] === 'pending') : [];

  return (
    <div className="gap-fill" data-gap-ui>
      <button type="button" onClick={run} disabled={loading || (!session && gaps.length === 0)}>
        {loading ? 'Filling…' : 'Fill data gaps with AI'}
      </button>
      {error && <p className="error">{error}</p>}
      {session && changed && <p className="pending-note">The text changed — run it again.</p>}
      {session && !changed && session.fills.length === 0 && (
        <p className="muted">Nothing to fill from the sources.</p>
      )}
      {session && !changed && (
        <>
          <ul className="list">
            {session.fills.map((f) => (
              <li key={f.id}>
                <span className="muted">{session.gaps[f.id].text}</span> → <strong>{f.value}</strong>
                <br />
                <span className="muted">
                  {f.source}: “{f.quote}”
                </span>
                <br />
                {session.status[f.id] === 'pending' ? (
                  <>
                    <button type="button" onClick={() => accept([f.id])}>
                      Accept
                    </button>{' '}
                    <button type="button" onClick={() => skip(f.id)}>
                      Skip
                    </button>
                  </>
                ) : (
                  <span className="muted">{session.status[f.id] === 'accepted' ? 'Accepted' : 'Skipped'}</span>
                )}
              </li>
            ))}
          </ul>
          {pending.length > 1 && (
            <button type="button" onClick={() => accept(pending.map((f) => f.id))}>
              Accept all
            </button>
          )}
          {session.noValue > 0 && (
            <p className="muted">
              {session.noValue} {session.noValue === 1 ? 'gap' : 'gaps'} had no clear data in the sources.
            </p>
          )}
        </>
      )}
    </div>
  );
}

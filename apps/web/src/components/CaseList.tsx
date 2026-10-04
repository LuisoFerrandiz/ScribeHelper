import { useEffect, useState } from 'react';
import { api } from '../api';
import { formatBoat } from '../format';
import type { CaseSummaryRow } from '../types';

interface Props {
  caseId: number | null;
  onSelect: (eventId: number, caseId: number) => void;
  onNewCase: () => void;
}

// Entry screen (SPEC-001) — replaces CaseSelector.tsx's text+datalist
// picker with a tabular listing of every existing case, grouped by
// regatta (same visual grouping CaseSelector.tsx already used). No
// inputs of its own: "New case" opens the popup from SPEC-002, this
// component only lists and navigates.
export function CaseList({ caseId, onSelect, onNewCase }: Props) {
  const [rows, setRows] = useState<CaseSummaryRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listCaseSummaries()
      .then(setRows)
      .catch((e) => setError((e as Error).message));
  }, []);

  const eventNames = [...new Set(rows.map((r) => r.event_name))];

  return (
    <div className="case-list">
      <div className="case-list-toolbar">
        <button type="button" onClick={onNewCase}>
          New case
        </button>
        {error && <span className="error">{error}</span>}
      </div>

      {rows.length === 0 && !error && <p className="muted">No cases yet.</p>}

      {eventNames.map((eventName) => (
        <div key={eventName} className="case-list-event">
          <strong>{eventName}</strong>
          <table className="case-list-table">
            <thead>
              <tr>
                <th>Case</th>
                <th>Initiator</th>
                <th>Respondent</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((r) => r.event_name === eventName)
                .map((r) => (
                  <tr
                    key={r.id}
                    className={r.id === caseId ? 'active' : undefined}
                    onClick={() => onSelect(r.event_id, r.id)}
                  >
                    <td>{r.case_number}</td>
                    <td>{formatBoat(r.initiator)}</td>
                    <td>{formatBoat(r.respondent)}</td>
                    <td>{r.decided ? 'Decided' : 'Pending'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

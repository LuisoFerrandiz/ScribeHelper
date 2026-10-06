import { useEffect, useState, type MouseEvent } from 'react';
import { api } from '../api';
import { formatBoat } from '../format';
import { NewCaseDialog } from './NewCaseDialog';
import type { CaseSummaryRow, SessionUser } from '../types';

interface Props {
  caseId: number | null;
  onSelect: (eventId: number, caseId: number) => void;
  // SPEC-015: gates the Remove column/button to admins.
  user: SessionUser;
}

// Entry screen (SPEC-001) — replaces CaseSelector.tsx's text+datalist
// picker with a tabular listing of every existing case, grouped by
// regatta (same visual grouping CaseSelector.tsx already used). "New
// case" opens the popup from SPEC-002 — no create-form of its own.
export function CaseList({ caseId, onSelect, user }: Props) {
  const [rows, setRows] = useState<CaseSummaryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function reload() {
    return api.listCaseSummaries().then(setRows);
  }

  // SPEC-015: case_number is unique only per event (UNIQUE(event_id,
  // case_number)) — two regattas can both have a "Case 1", so the
  // confirmation must name the regatta too, not just the case number.
  async function handleDelete(e: MouseEvent, row: CaseSummaryRow) {
    e.stopPropagation();
    if (!window.confirm(`Delete case ${row.case_number} (${row.event_name})? This cannot be undone.`)) return;
    await api.deleteCase(row.id);
    await reload();
  }

  useEffect(() => {
    reload().catch((e) => setError((e as Error).message));
  }, []);

  const eventNames = [...new Set(rows.map((r) => r.event_name))];

  // Derived from the same rows already fetched for the listing — the
  // dialog needs id/name pairs for its regatta <select> and
  // event_id/case_number pairs for its duplicate pre-check, nothing a
  // second request would add.
  const events = [...new Map(rows.map((r) => [r.event_id, { id: r.event_id, name: r.event_name }])).values()];
  const existingCases = rows.map((r) => ({ event_id: r.event_id, case_number: r.case_number }));

  return (
    <div className="case-list">
      <div className="case-list-toolbar">
        <button type="button" onClick={() => setDialogOpen(true)}>
          New case
        </button>
        {error && <span className="error">{error}</span>}
      </div>

      {dialogOpen && (
        <NewCaseDialog
          events={events}
          existingCases={existingCases}
          onCreated={async (eventId, newCaseId) => {
            setDialogOpen(false);
            await reload();
            onSelect(eventId, newCaseId);
          }}
          onClose={() => setDialogOpen(false)}
        />
      )}

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
                {user.role === 'admin' && <th></th>}
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
                    {user.role === 'admin' && (
                      <td>
                        <button type="button" onClick={(e) => handleDelete(e, r)}>
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

import type { AttachmentExtraction, CaseFull, CaseRow } from '../types';

interface Props {
  caseNumber: string;
  onCaseNumberChange: (value: string) => void;
  day: string;
  onDayChange: (value: string) => void;
  race: string;
  onRaceChange: (value: string) => void;
  withCaseNote: string;
  onWithCaseNoteChange: (value: string) => void;
  extraction: AttachmentExtraction | null;
  onUseSuggestedDay: () => void;
  onUseSuggestedRace: () => void;
  linkedCases: CaseFull['linkedCases'];
  otherCases: CaseRow[];
  onLinkCase: (linkedCaseId: number) => Promise<void>;
  onRemoveLink: (linkedCaseId: number) => Promise<void>;
}

// SPEC-024 step 2b: the General tab's content, moved verbatim out of
// CaseForm.tsx. All state and handlers stay in CaseForm (SPEC-024 R-2);
// CaseForm paints the surrounding div.tab-panel (R-4).
export function GeneralTab({
  caseNumber,
  onCaseNumberChange,
  day,
  onDayChange,
  race,
  onRaceChange,
  withCaseNote,
  onWithCaseNoteChange,
  extraction,
  onUseSuggestedDay,
  onUseSuggestedRace,
  linkedCases,
  otherCases,
  onLinkCase,
  onRemoveLink,
}: Props) {
  return (
    <section className="box general-box">
      <h2>General</h2>
      <div className="general-fields-col">
        <div className="party-row">
          <strong>Case number</strong>
          <input value={caseNumber} onChange={(e) => onCaseNumberChange(e.target.value)} required />
        </div>
        <div className="party-row">
          <strong>Day</strong>
          <input value={day} onChange={(e) => onDayChange(e.target.value)} />
          {extraction?.day_candidate && (
            <button type="button" onClick={onUseSuggestedDay}>
              Use suggested
            </button>
          )}
        </div>
        <div className="party-row">
          <strong>Race</strong>
          <input value={race} onChange={(e) => onRaceChange(e.target.value)} />
          {extraction?.race_candidate && (
            <button type="button" onClick={onUseSuggestedRace}>
              Use suggested
            </button>
          )}
        </div>
        <div className="party-row">
          <strong>With case(s)</strong>
          <div className="with-case-inline">
            {linkedCases.map((lc) => (
              <span key={lc.id} className="chip">
                {lc.case_number}
                <button type="button" onClick={() => onRemoveLink(lc.id)} aria-label={`Unlink case ${lc.case_number}`}>
                  ×
                </button>
              </span>
            ))}
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) onLinkCase(Number(e.target.value));
              }}
            >
              <option value="">+ Link case…</option>
              {otherCases
                .filter((c) => !linkedCases.some((lc) => lc.id === c.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    Case {c.case_number}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div className="party-row">
          <strong>With case(s) notes</strong>
          <input
            value={withCaseNote}
            onChange={(e) => onWithCaseNoteChange(e.target.value)}
            placeholder="Free text — e.g. a case from another regatta"
          />
        </div>
      </div>
    </section>
  );
}

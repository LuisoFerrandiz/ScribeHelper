import { JurySlots } from './JurySlots';
import type { CaseFull } from '../types';

interface Props {
  proceduralMatters: string;
  onProceduralMattersChange: (value: string) => void;
  factsFound: string;
  onFactsFoundChange: (value: string) => void;
  conclusion: string;
  onConclusionChange: (value: string) => void;
  rulesApplicable: string;
  onRulesApplicableChange: (value: string) => void;
  decision: string;
  onDecisionChange: (value: string) => void;
  informedAt: string;
  onInformedAtChange: (value: string) => void;
  caseId: number;
  eventId: number;
  jury: CaseFull['jury'];
  onJuryChange: () => Promise<void>; // refreshes ONLY caseFull.jury — never the text boxes
  findOrCreatePerson: (fullName: string) => Promise<number>;
}

// SPEC-024 step 2a: the Review tab's content, moved verbatim out of
// CaseForm.tsx. All state stays in CaseForm (SPEC-024 R-2); CaseForm paints
// the surrounding div.tab-panel (R-4).
export function ReviewTab({
  proceduralMatters,
  onProceduralMattersChange,
  factsFound,
  onFactsFoundChange,
  conclusion,
  onConclusionChange,
  rulesApplicable,
  onRulesApplicableChange,
  decision,
  onDecisionChange,
  informedAt,
  onInformedAtChange,
  caseId,
  eventId,
  jury,
  onJuryChange,
  findOrCreatePerson,
}: Props) {
  return (
    <>
      <section className="box review-box">
        <h2>Review</h2>
        <h3>Procedural Matters</h3>
        <textarea value={proceduralMatters} onChange={(e) => onProceduralMattersChange(e.target.value)} rows={4} />
        <h3>Facts Found</h3>
        <textarea value={factsFound} onChange={(e) => onFactsFoundChange(e.target.value)} rows={6} />
        <h3>Conclusion</h3>
        <textarea value={conclusion} onChange={(e) => onConclusionChange(e.target.value)} rows={4} />
        <h3>Rules Applicable</h3>
        <textarea value={rulesApplicable} onChange={(e) => onRulesApplicableChange(e.target.value)} rows={4} />
        <h3>Decision</h3>
        <textarea value={decision} onChange={(e) => onDecisionChange(e.target.value)} rows={4} />
        <h3>Informed at (date &amp; time)</h3>
        <input value={informedAt} onChange={(e) => onInformedAtChange(e.target.value)} />
      </section>

      <JurySlots
        caseId={caseId}
        eventId={eventId}
        jury={jury}
        onJuryChange={onJuryChange}
        findOrCreatePerson={findOrCreatePerson}
      />
    </>
  );
}

import type { ReactNode } from 'react';
import { CopyBox } from './CopyBox';

interface Props {
  label: string;
  copyText: string;
  pendingText?: string; // text checked for unfilled gaps (SPEC-026); defaults to copyText
  below?: ReactNode; // SPEC-031: under the text box (AI gap fill)
  notes?: ReactNode; // SPEC-029: stale-box warning under the header
  copied: boolean;
  onCopied: () => void;
  textarea: ReactNode; // the ready-made GhostTextarea (rows, box, sailNumberRoles stay with the caller)
  tray?: ReactNode; // SPEC-034: proposals strip above the text box
  reference?: ReactNode; // SPEC-034: the parties of the case (Facts Found and Decision), read only
  side?: ReactNode; // Rules Applicable only (SPEC-023): its own column, until SPEC-034 step 4
}

// SPEC-024 step 3 / SPEC-034: the structure the five writing boxes share. The four phrase
// boxes are one column at the width of the text box the scribe writes in: the proposals strip,
// the parties reference, the text box and what goes under it. Rules Applicable still has its
// column (`side`). CaseForm paints the surrounding div.tab-panel (R-4).
export function WritingBox({ label, copyText, pendingText, notes, below, copied, onCopied, textarea, tray, reference, side }: Props) {
  const main = (
    <>
      {tray}
      {reference}
      {textarea}
      {below}
    </>
  );
  return (
    <CopyBox label={label} text={copyText} pendingText={pendingText ?? copyText} notes={notes} copied={copied} onCopied={onCopied}>
      {side ? (
        <div className="box-body-split">
          <div className="textarea-col">{main}</div>
          <div className="suggestions-col">{side}</div>
        </div>
      ) : (
        main
      )}
    </CopyBox>
  );
}

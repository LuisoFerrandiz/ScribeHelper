import type { ReactNode } from 'react';
import { CopyBox } from './CopyBox';

interface Props {
  label: string;
  copyText: string;
  pendingText?: string; // text checked for unfilled gaps (SPEC-026); defaults to copyText
  below?: ReactNode; // SPEC-031: under the text box (AI gap fill)
  notes?: ReactNode; // SPEC-029: warnings under the header (stale box, Rules Applicable warnings)
  copied: boolean;
  onCopied: () => void;
  textarea: ReactNode; // the ready-made GhostTextarea (rows, box, sailNumberRoles stay with the caller)
  tray?: ReactNode; // SPEC-034: proposals strip (phrase boxes) or citations tray (Rules Applicable)
  reference?: ReactNode; // SPEC-034: the parties of the case (Facts Found and Decision), read only
}

// SPEC-024 step 3 / SPEC-034: the structure the five writing boxes share, in one column at the
// width of the text box the scribe writes in: the tray, the parties reference, the text box and
// what goes under it. CaseForm paints the surrounding div.tab-panel (R-4).
export function WritingBox({ label, copyText, pendingText, notes, below, copied, onCopied, textarea, tray, reference }: Props) {
  return (
    <CopyBox label={label} text={copyText} pendingText={pendingText ?? copyText} notes={notes} copied={copied} onCopied={onCopied}>
      {tray}
      {reference}
      {textarea}
      {below}
    </CopyBox>
  );
}

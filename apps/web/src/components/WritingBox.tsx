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
  side: ReactNode; // suggestions column content (a suggestions-panel wrapper, when used, goes inside)
  tray?: ReactNode; // SPEC-034: proposals strip above the text box
}

// SPEC-024 step 3: the structure the five writing boxes share, moved out of
// CaseForm.tsx. It paints ONLY CopyBox > div.box-body-split >
// div.textarea-col + div.suggestions-col (SPEC-024 "Contrato de WritingBox");
// CaseForm paints the surrounding div.tab-panel (R-4).
export function WritingBox({ label, copyText, pendingText, notes, below, copied, onCopied, textarea, side, tray }: Props) {
  return (
    <CopyBox label={label} text={copyText} pendingText={pendingText ?? copyText} notes={notes} copied={copied} onCopied={onCopied}>
      <div className="box-body-split">
        <div className="textarea-col">
          {tray}
          {textarea}
          {below}
        </div>
        <div className="suggestions-col">{side}</div>
      </div>
    </CopyBox>
  );
}

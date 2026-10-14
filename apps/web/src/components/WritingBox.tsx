import type { ReactNode } from 'react';
import { CopyBox } from './CopyBox';

interface Props {
  label: string;
  copyText: string;
  pendingText?: string; // text checked for unfilled gaps (SPEC-026); defaults to copyText
  copied: boolean;
  onCopied: () => void;
  textarea: ReactNode; // the ready-made GhostTextarea (rows, box, sailNumberRoles stay with the caller)
  side: ReactNode; // suggestions column content (a suggestions-panel wrapper, when used, goes inside)
}

// SPEC-024 step 3: the structure the five writing boxes share, moved out of
// CaseForm.tsx. It paints ONLY CopyBox > div.box-body-split >
// div.textarea-col + div.suggestions-col (SPEC-024 "Contrato de WritingBox");
// CaseForm paints the surrounding div.tab-panel (R-4).
export function WritingBox({ label, copyText, pendingText, copied, onCopied, textarea, side }: Props) {
  return (
    <CopyBox label={label} text={copyText} pendingText={pendingText ?? copyText} copied={copied} onCopied={onCopied}>
      <div className="box-body-split">
        <div className="textarea-col">{textarea}</div>
        <div className="suggestions-col">{side}</div>
      </div>
    </CopyBox>
  );
}

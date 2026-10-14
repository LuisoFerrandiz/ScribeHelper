import type { ChangeEvent, RefObject } from 'react';
import { api } from '../api';
import type { AttachmentExtraction, CaseFull } from '../types';

interface Props {
  attachments: CaseFull['attachments'];
  extraction: AttachmentExtraction | null;
  extracting: boolean;
  uploadingAttachment: boolean;
  attachmentInputRef: RefObject<HTMLInputElement>;
  onUpload: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
  onProcess: () => Promise<void>;
}

// SPEC-024 step 2c: the Protest Form(s) tab's content, moved verbatim out of
// CaseForm.tsx. The upload/process state, the input ref and the handlers stay
// in CaseForm (SPEC-024 R-2: they survive a tab switch today — an upload in
// progress keeps showing "Uploading…" when you come back); CaseForm paints
// the surrounding div.tab-panel (R-4).
export function AttachmentsTab({
  attachments,
  extraction,
  extracting,
  uploadingAttachment,
  attachmentInputRef,
  onUpload,
  onRemove,
  onProcess,
}: Props) {
  return (
    <section className="box">
      <h2>Protest Form(s)</h2>
      <p className="muted">
        Any file format — scan, photo, PDF. Converted to Markdown when possible for later
        use; the original is always kept.
      </p>
      <ul className="list">
        {attachments.map((a) => (
          <li key={a.id}>
            <a href={api.attachmentFileUrl(a.id)} download>
              {a.original_filename}
            </a>{' '}
            <span className="muted">{new Date(a.uploaded_at).toLocaleString()}</span>
            {!!a.conversion_empty && (
              <span className="error"> — empty conversion, check original</span>
            )}{' '}
            <button type="button" onClick={() => onRemove(a.id)}>
              Remove
            </button>
          </li>
        ))}
        {attachments.length === 0 && <li className="muted">No files uploaded yet.</li>}
      </ul>
      <input
        ref={attachmentInputRef}
        type="file"
        onChange={onUpload}
        disabled={uploadingAttachment}
        hidden
      />
      <button
        type="button"
        onClick={() => attachmentInputRef.current?.click()}
        disabled={uploadingAttachment}
      >
        {uploadingAttachment ? 'Uploading…' : 'Upload file'}
      </button>{' '}
      <button
        type="button"
        onClick={onProcess}
        disabled={extracting || attachments.length === 0}
      >
        {extracting ? 'Processing…' : 'Process'}
      </button>
      {extraction && (
        <p className="muted">
          Processed. Suggestions from it are offered on the General, Parties &amp; Witness,
          Procedural Matters, Facts Found, Conclusion and Decision tabs — nothing was
          inserted automatically.
        </p>
      )}
    </section>
  );
}

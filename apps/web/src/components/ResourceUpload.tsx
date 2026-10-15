import { useEffect, useRef, useState, type DragEvent } from 'react';
import { api } from '../api';
import type { DocType, ExampleScope, ResourceFull, ResourceKind, ResourceRow } from '../types';
import { DOC_KINDS, DOC_KIND_LABEL, composeDocType, docTypeLabel, splitDocType, type DocKind } from '../docTypes';

interface Props {
  kind: ResourceKind;
  eventId: number | null;
}

// SPEC-033: rules are permanent ('rrs') or of an event. The legacy layer 'class'
// only shows up on a row the server has not migrated yet.
type Group = 'rrs' | 'event';

// An event document must say what it is (SPEC-022 RF-001, SPEC-033): it sets the citation prefix.
interface QueuedFile {
  file: File;
  docType: DocType | '';
}

// Kind (class rules / NoR / SI) plus an "Amendment" box; the stored doc_type composes both.
function DocTypePicker({ value, onChange }: { value: DocType | ''; onChange: (v: DocType | '') => void }) {
  const current = value ? splitDocType(value) : null;
  return (
    <>
      <select
        value={current?.kind ?? ''}
        onChange={(e) => {
          const k = e.target.value as DocKind | '';
          onChange(k ? composeDocType(k, current?.amendment ?? false) : '');
        }}
      >
        <option value="">Document type…</option>
        {DOC_KINDS.map((k) => (
          <option key={k} value={k}>
            {DOC_KIND_LABEL[k]}
          </option>
        ))}
      </select>{' '}
      <label>
        <input
          type="checkbox"
          checked={current?.amendment ?? false}
          disabled={!current}
          onChange={(e) => current && onChange(composeDocType(current.kind, e.target.checked))}
        />{' '}
        Amendment
      </label>
    </>
  );
}

const GROUP_LABEL: Record<Group, string> = {
  rrs: 'Permanent (RRS, appendices and RRS amendments)',
  event: 'Event (class rules, NoR, SI and their amendments)',
};

function GroupSelect({ value, onChange }: { value: Group; onChange: (v: Group) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as Group)}>
      <option value="rrs">{GROUP_LABEL.rrs}</option>
      <option value="event">{GROUP_LABEL.event}</option>
    </select>
  );
}

// What a rule document is, in words: "RRS" for permanent, "Class rules", "SI amendment"…
function kindLabel(r: ResourceRow): string {
  if (r.layer === 'rrs') return 'Permanent';
  if (r.layer === 'class') return 'legacy class rules — assign to an event';
  if (r.layer === 'event') return r.doc_type ? docTypeLabel(r.doc_type) : 'Event — not classified';
  return '';
}

function titleFromFilename(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(0, dot) : filename;
}

// Shared upload/review UI for both material stores (CONTEXT.md section 6):
// rules (authority, layered) and examples (style only, never cited). Same
// flow for both (D-009): upload -> convert -> review -> accept/reject.
// Drag-and-drop, one or many files at once — the title is taken from each
// file's own name, never asked for separately (user's explicit call).
export function ResourceUpload({ kind, eventId }: Props) {
  const [pending, setPending] = useState<ResourceRow[]>([]);
  const [accepted, setAccepted] = useState<ResourceRow[]>([]);
  const [preview, setPreview] = useState<ResourceFull | null>(null);
  const [layer, setLayer] = useState<Group>('rrs');
  const [scope, setScope] = useState<ExampleScope>('own');
  const [queued, setQueued] = useState<QueuedFile[]>([]);
  const [reLayer, setReLayer] = useState<Group>('rrs');
  const [reDocType, setReDocType] = useState<DocType | ''>('');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    try {
      const [pend, acc] = await Promise.all([
        api.listResources(kind, 'pending_review'),
        api.listResources(kind, 'accepted'),
      ]);
      setPending(pend);
      setAccepted(acc);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // The classification form follows the document being reviewed.
  useEffect(() => {
    if (preview?.layer) {
      // A legacy 'class' row is shown as an event document of type Class rules.
      setReLayer(preview.layer === 'rrs' ? 'rrs' : 'event');
      setReDocType(preview.layer === 'class' ? 'class' : (preview.doc_type ?? ''));
    }
  }, [preview?.id, preview?.layer, preview?.doc_type]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setQueued((prev) => [...prev, ...Array.from(list).map((file) => ({ file, docType: '' as const }))]);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  function removeQueued(index: number) {
    setQueued((prev) => prev.filter((_, i) => i !== index));
  }

  const needsDocType = kind === 'rule' && layer === 'event';
  const missingDocType = needsDocType && queued.some((q) => q.docType === '');

  async function handleUploadAll() {
    if (queued.length === 0) return;
    if (missingDocType) {
      setError('Choose the document type (class rules, NoR or SI) for every event file.');
      return;
    }
    if (kind === 'rule' && layer === 'event' && eventId === null) {
      setError('Pick a regatta on the Case tab first — event-layer rules belong to one.');
      return;
    }

    setUploading(true);
    setUploadProgress({ done: 0, total: queued.length });
    let lastCreated: ResourceFull | null = null;
    try {
      for (const [i, { file, docType }] of queued.entries()) {
        const form = new FormData();
        form.append('kind', kind);
        form.append('title', titleFromFilename(file.name));
        form.append('file', file);
        if (kind === 'rule') {
          form.append('layer', layer);
          if (layer === 'event' && eventId !== null) form.append('event_id', String(eventId));
          if (layer === 'event' && docType) form.append('doc_type', docType);
        } else {
          form.append('scope', scope);
        }
        lastCreated = await api.uploadResource(form);
        setUploadProgress({ done: i + 1, total: queued.length });
      }
      setQueued([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (lastCreated) setPreview(lastCreated);
      await refresh();
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }

  async function openPreview(id: number) {
    setPreview(await api.getResource(id));
  }

  async function handleAccept(id: number) {
    await api.acceptResource(id);
    setPreview(null);
    await refresh();
  }

  async function handleReject(id: number) {
    await api.rejectResource(id);
    setPreview(null);
    await refresh();
  }

  async function handleDelete(id: number) {
    await api.deleteResource(id);
    await refresh();
  }

  // Fixes a wrong pick at upload time (D-023) — moves the file and
  // updates the row without re-uploading/re-converting.
  // Changes layer / regatta / document type of a rule document (SPEC-022 RF-001).
  // The server rebuilds its rule index; citations already saved keep their text.
  async function handleReclassify(r: ResourceFull) {
    if (reLayer === 'event' && !r.event_id && eventId === null) {
      setError('Pick a regatta on the Case tab first — event-layer rules belong to one.');
      return;
    }
    if (reLayer === 'event' && reDocType === '') {
      setError('Choose the document type (class rules, NoR or SI).');
      return;
    }
    try {
      await api.reclassifyResource(r.id, {
        kind: 'rule',
        layer: reLayer,
        ...(reLayer === 'event' ? { event_id: r.event_id ?? eventId ?? undefined, doc_type: reDocType } : {}),
      });
      setPreview(await api.getResource(r.id));
      await refresh();
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleMoveToOtherKind(id: number) {
    const otherKind: ResourceKind = kind === 'rule' ? 'example' : 'rule';
    await api.reclassifyResource(id, otherKind === 'rule' ? { kind: 'rule', layer: 'rrs' } : { kind: 'example', scope: 'own' });
    setPreview(null);
    await refresh();
  }

  // SPEC-033: two groups of accepted rule documents. The legacy layer 'class' (not
  // migrated yet) is listed under Permanent with its own note so it never hides.
  const permanent = accepted.filter((r) => r.layer === 'rrs' || r.layer === 'class');
  const eventDocs = accepted.filter((r) => r.layer === 'event' && r.event_id === eventId);
  const otherEventCount = accepted.filter((r) => r.layer === 'event' && r.event_id !== eventId).length;

  function renderAccepted(r: ResourceRow) {
    return (
      <li key={r.id}>
        <button type="button" className="resource-title" onClick={() => openPreview(r.id)}>
          {r.title}
        </button>
        {r.layer && kind === 'rule' && <span className="muted"> — {kindLabel(r)}</span>}
        {r.scope && <span className="muted"> — {r.scope}</span>}{' '}
        <button
          type="button"
          className="icon-button"
          title="Delete"
          aria-label="Delete"
          onClick={() => handleDelete(r.id)}
        >
          🗑
        </button>
      </li>
    );
  }

  return (
    <div className="page">
      <h2>{kind === 'rule' ? 'Upload rules' : 'Upload examples'}</h2>
      {error && <p className="error">{error}</p>}

      <div className="upload-controls">
        {kind === 'rule' ? (
          <GroupSelect value={layer} onChange={setLayer} />
        ) : (
          <select value={scope} onChange={(e) => setScope(e.target.value as ExampleScope)}>
            <option value="own">Own</option>
            <option value="base">Base</option>
          </select>
        )}
      </div>

      <div
        className={`dropzone${dragOver ? ' dropzone-active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <p>Drag files here, or click to browse</p>
        <p className="muted">PDF, Word, Excel or Markdown. Title is taken from each file name.</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.xlsx,.xls,.md,.markdown"
          onChange={(e) => addFiles(e.target.files)}
          hidden
        />
      </div>

      {queued.length > 0 && (
        <div className="box">
          <ul className="list">
            {queued.map((f, i) => (
              <li key={`${f.file.name}-${i}`}>
                {f.file.name}{' '}
                {needsDocType && (
                  <>
                    <DocTypePicker
                      value={f.docType}
                      onChange={(v) => setQueued((prev) => prev.map((q, j) => (j === i ? { ...q, docType: v } : q)))}
                    />{' '}
                  </>
                )}
                <button type="button" onClick={() => removeQueued(i)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={handleUploadAll} disabled={uploading || missingDocType}>
            {uploadProgress ? `Uploading ${uploadProgress.done}/${uploadProgress.total}…` : `Upload ${queued.length}`}
          </button>
        </div>
      )}

      <section>
        <h3>Pending review</h3>
        <ul className="list resource-grid">
          {pending.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => openPreview(r.id)}>
                {r.title}
              </button>
              {r.layer && <span className="muted"> — {kindLabel(r)}</span>}
              {r.scope && <span className="muted"> — {r.scope}</span>}
              {!!r.conversion_empty && <span className="error"> — empty conversion, check original</span>}
            </li>
          ))}
          {pending.length === 0 && <li className="muted">Nothing waiting for review.</li>}
        </ul>
      </section>

      {preview && (
        <section className="box">
          <div className="box-header">
            <h2>{preview.title}</h2>
            <div>
              {preview.status === 'pending_review' && (
                <>
                  <button type="button" onClick={() => handleAccept(preview.id)}>
                    Accept
                  </button>{' '}
                  <button type="button" onClick={() => handleReject(preview.id)}>
                    Reject
                  </button>{' '}
                </>
              )}
              <button type="button" onClick={() => handleMoveToOtherKind(preview.id)}>
                Move to {kind === 'rule' ? 'examples' : 'rules'}
              </button>
            </div>
          </div>
          {!!preview.conversion_empty && (
            <p className="error">Conversion produced little or no text — this looks like a scanned document.</p>
          )}
          {preview.kind === 'rule' && preview.sectionsPreview && (
            <p className={preview.sectionsPreview.count === 0 ? 'error' : 'muted'}>
              {preview.sectionsPreview.count === 0
                ? 'No numbered rules detected; this document cannot be cited by number.'
                : `${preview.sectionsPreview.count} rules detected (${preview.sectionsPreview.sample.join(', ')})`}
            </p>
          )}
          {preview.kind === 'rule' && (
            <p>
              <GroupSelect value={reLayer} onChange={setReLayer} />{' '}
              {reLayer === 'event' && <DocTypePicker value={reDocType} onChange={setReDocType} />}{' '}
              <button
                type="button"
                onClick={() => handleReclassify(preview)}
                disabled={
                  preview.layer !== 'class' &&
                  reLayer === preview.layer &&
                  (reLayer !== 'event' || reDocType === (preview.doc_type ?? ''))
                }
              >
                Apply
              </button>
              {preview.layer === 'event' && !preview.doc_type && (
                <span className="error"> Classify this document so its rules can be cited.</span>
              )}
            </p>
          )}
          <pre className="resource-preview">{preview.markdown || '(empty)'}</pre>
        </section>
      )}

      <section>
        <h3>Accepted</h3>
        {kind === 'rule' ? (
          <>
            <div className="box">
              <h4>Permanent</h4>
              <p className="muted">The rules of sailing, their appendices and amendments. They apply to every event.</p>
              <ul className="list resource-grid">
                {permanent.map(renderAccepted)}
                {permanent.length === 0 && <li className="muted">Nothing accepted yet.</li>}
              </ul>
            </div>
            <div className="box">
              <h4>Event</h4>
              <p className="muted">
                Class rules, Notice of Race, Sailing Instructions and their amendments, for the event picked on the Case tab.
              </p>
              {eventId === null ? (
                <p className="muted">Pick a regatta on the Case tab to see and upload its documents.</p>
              ) : (
                <ul className="list resource-grid">
                  {eventDocs.map(renderAccepted)}
                  {eventDocs.length === 0 && <li className="muted">Nothing accepted for this event yet.</li>}
                </ul>
              )}
              {otherEventCount > 0 && (
                <p className="muted">
                  {otherEventCount} document{otherEventCount === 1 ? '' : 's'} of other events not shown.
                </p>
              )}
            </div>
          </>
        ) : (
          <ul className="list resource-grid">
            {accepted.map(renderAccepted)}
            {accepted.length === 0 && <li className="muted">Nothing accepted yet.</li>}
          </ul>
        )}
      </section>
    </div>
  );
}

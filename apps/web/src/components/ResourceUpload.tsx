import { useEffect, useRef, useState, type DragEvent } from 'react';
import { api } from '../api';
import type { DocType, ExampleScope, ResourceFull, ResourceKind, ResourceRow, RuleLayer } from '../types';

interface Props {
  kind: ResourceKind;
  eventId: number | null;
}

const DOC_TYPE_LABEL: Record<DocType, string> = {
  nor: 'Notice of Race',
  si: 'Sailing Instructions',
  si_amendment: 'SI amendment',
};

// An event document must say what it is (SPEC-022 RF-001): it sets the citation prefix.
interface QueuedFile {
  file: File;
  docType: DocType | '';
}

function DocTypeSelect({ value, onChange }: { value: DocType | ''; onChange: (v: DocType | '') => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as DocType | '')}>
      <option value="">Document type…</option>
      {(Object.keys(DOC_TYPE_LABEL) as DocType[]).map((t) => (
        <option key={t} value={t}>
          {DOC_TYPE_LABEL[t]}
        </option>
      ))}
    </select>
  );
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
  const [layer, setLayer] = useState<RuleLayer>('rrs');
  const [scope, setScope] = useState<ExampleScope>('own');
  const [queued, setQueued] = useState<QueuedFile[]>([]);
  const [reLayer, setReLayer] = useState<RuleLayer>('rrs');
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
      setReLayer(preview.layer);
      setReDocType(preview.doc_type ?? '');
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
      setError('Choose the document type (NoR, SI or SI amendment) for every event file.');
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
      setError('Choose the document type (NoR, SI or SI amendment).');
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

  return (
    <div className="page">
      <h2>{kind === 'rule' ? 'Upload rules' : 'Upload examples'}</h2>
      {error && <p className="error">{error}</p>}

      <div className="upload-controls">
        {kind === 'rule' ? (
          <select value={layer} onChange={(e) => setLayer(e.target.value as RuleLayer)}>
            <option value="rrs">RRS (permanent)</option>
            <option value="class">Class rules (per season)</option>
            <option value="event">Event (NoR/SIs/amendments)</option>
          </select>
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
                    <DocTypeSelect
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
              {r.layer && <span className="muted"> — {r.layer}</span>}
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
              <select value={reLayer} onChange={(e) => setReLayer(e.target.value as RuleLayer)}>
                <option value="rrs">RRS (permanent)</option>
                <option value="class">Class rules (per season)</option>
                <option value="event">Event (NoR/SIs/amendments)</option>
              </select>{' '}
              {reLayer === 'event' && <DocTypeSelect value={reDocType} onChange={setReDocType} />}{' '}
              <button
                type="button"
                onClick={() => handleReclassify(preview)}
                disabled={reLayer === preview.layer && (reLayer !== 'event' || reDocType === (preview.doc_type ?? ''))}
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
        <ul className="list resource-grid">
          {accepted.map((r) => (
            <li key={r.id}>
              <button type="button" className="resource-title" onClick={() => openPreview(r.id)}>
                {r.title}
              </button>
              {r.layer && <span className="muted"> — {r.layer}</span>}
              {r.doc_type && <span className="muted"> ({DOC_TYPE_LABEL[r.doc_type]})</span>}
              {r.layer === 'event' && !r.doc_type && <span className="error"> — not classified</span>}
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
          ))}
          {accepted.length === 0 && <li className="muted">Nothing accepted yet.</li>}
        </ul>
      </section>
    </div>
  );
}

import { useEffect, useRef, useState, type DragEvent } from 'react';
import { api } from '../api';
import type { ExampleScope, ResourceFull, ResourceKind, ResourceRow, RuleLayer } from '../types';

interface Props {
  kind: ResourceKind;
  eventId: number | null;
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
  const [queued, setQueued] = useState<File[]>([]);
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

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setQueued((prev) => [...prev, ...Array.from(list)]);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  function removeQueued(index: number) {
    setQueued((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUploadAll() {
    if (queued.length === 0) return;
    if (kind === 'rule' && layer === 'event' && eventId === null) {
      setError('Pick a regatta on the Case tab first — event-layer rules belong to one.');
      return;
    }

    setUploading(true);
    setUploadProgress({ done: 0, total: queued.length });
    let lastCreated: ResourceFull | null = null;
    try {
      for (const [i, file] of queued.entries()) {
        const form = new FormData();
        form.append('kind', kind);
        form.append('title', titleFromFilename(file.name));
        form.append('file', file);
        if (kind === 'rule') {
          form.append('layer', layer);
          if (layer === 'event' && eventId !== null) form.append('event_id', String(eventId));
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
              <li key={`${f.name}-${i}`}>
                {f.name}{' '}
                <button type="button" onClick={() => removeQueued(i)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={handleUploadAll} disabled={uploading}>
            {uploadProgress ? `Uploading ${uploadProgress.done}/${uploadProgress.total}…` : `Upload ${queued.length}`}
          </button>
        </div>
      )}

      <section>
        <h3>Pending review</h3>
        <ul className="list">
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
          <pre className="resource-preview">{preview.markdown || '(empty)'}</pre>
        </section>
      )}

      <section>
        <h3>Accepted</h3>
        <ul className="list">
          {accepted.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => openPreview(r.id)}>
                {r.title}
              </button>
              {r.layer && <span className="muted"> — {r.layer}</span>}
              {r.scope && <span className="muted"> — {r.scope}</span>}{' '}
              <button type="button" onClick={() => handleDelete(r.id)}>
                Delete
              </button>
            </li>
          ))}
          {accepted.length === 0 && <li className="muted">Nothing accepted yet.</li>}
        </ul>
      </section>
    </div>
  );
}

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../api';
import type { ExampleScope, ResourceFull, ResourceKind, ResourceRow, RuleLayer } from '../types';

interface Props {
  kind: ResourceKind;
  eventId: number | null;
}

// Shared upload/review UI for both material stores (CONTEXT.md section 6):
// rules (authority, layered) and examples (style only, never cited). Same
// flow for both (D-009): upload -> convert -> review -> accept/reject.
export function ResourceUpload({ kind, eventId }: Props) {
  const [pending, setPending] = useState<ResourceRow[]>([]);
  const [accepted, setAccepted] = useState<ResourceRow[]>([]);
  const [preview, setPreview] = useState<ResourceFull | null>(null);
  const [title, setTitle] = useState('');
  const [layer, setLayer] = useState<RuleLayer>('rrs');
  const [scope, setScope] = useState<ExampleScope>('own');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !title.trim()) return;
    if (kind === 'rule' && layer === 'event' && eventId === null) {
      setError('Pick a regatta on the Case tab first — event-layer rules belong to one.');
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('kind', kind);
      form.append('title', title.trim());
      form.append('file', file);
      if (kind === 'rule') {
        form.append('layer', layer);
        if (layer === 'event' && eventId !== null) form.append('event_id', String(eventId));
      } else {
        form.append('scope', scope);
      }

      const created = await api.uploadResource(form);
      setTitle('');
      if (fileRef.current) fileRef.current.value = '';
      setPreview(created);
      await refresh();
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
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

  return (
    <div className="page">
      <h2>{kind === 'rule' ? 'Upload rules' : 'Upload examples'}</h2>
      {error && <p className="error">{error}</p>}

      <form onSubmit={handleUpload} className="inline-form">
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
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
        <input ref={fileRef} type="file" accept=".pdf,.docx,.xlsx,.xls,.md,.markdown" required />
        <button type="submit" disabled={uploading}>
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </form>

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
            {preview.status === 'pending_review' && (
              <div>
                <button type="button" onClick={() => handleAccept(preview.id)}>
                  Accept
                </button>{' '}
                <button type="button" onClick={() => handleReject(preview.id)}>
                  Reject
                </button>
              </div>
            )}
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

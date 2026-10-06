# SPEC-015 — Plan

Relacionado: `SPEC-015-delete-case.md` (requisitos).

## 1. Backend — `apps/api/src/routes/crud.ts`

```ts
interface CrudOptions {
  table: string;
  fields: string[];
  touchUpdatedAt?: boolean;
  // SPEC-015: 'cases' gets a dedicated DELETE (admin guard + attachment
  // file cleanup) registered elsewhere — the generic one would skip both.
  skipDelete?: boolean;
}

export function registerCrud(app: FastifyInstance, prefix: string, opts: CrudOptions) {
  const { table, fields, touchUpdatedAt, skipDelete } = opts;
  // ... GET/GET:id/POST/PUT unchanged ...

  if (!skipDelete) {
    app.delete(`/${prefix}/:id`, (req, reply) => {
      // unchanged body
    });
  }
}
```

## 2. Backend — nuevo `apps/api/src/routes/caseDelete.ts`

```ts
import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { requireAdmin } from '../auth/guard.js';
import { deleteAttachmentFiles } from '../case-attachments/storage.js';

interface CaseAttachmentFileRow {
  original_path: string;
  markdown_path: string | null;
}

// Deleting a case cascades every DB row via schema.sql's ON DELETE
// CASCADE (party/witness/case_rule_citation/case_jury_member/case_link/
// case_attachment) — but a cascade never touches files on disk. This
// route cleans up each attachment's files first, same helper the
// single-attachment DELETE route already uses (D-027), then deletes the
// case row itself. Admin-only (D-026), same guard as /users/:id.
export function registerCaseDeleteRoute(app: FastifyInstance) {
  app.delete('/cases/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.prepare('SELECT id FROM protest_case WHERE id = ?').get(id);
    if (!row) return reply.code(404).send({ error: 'not found' });

    const attachments = db
      .prepare('SELECT original_path, markdown_path FROM case_attachment WHERE case_id = ?')
      .all(id) as CaseAttachmentFileRow[];
    for (const a of attachments) {
      await deleteAttachmentFiles({ originalPath: a.original_path, markdownPath: a.markdown_path });
    }

    db.prepare('DELETE FROM protest_case WHERE id = ?').run(id);
    reply.code(204).send();
  });
}
```

## 3. Backend — `apps/api/src/routes/index.ts`

```ts
import { registerCaseDeleteRoute } from './caseDelete.js';
// ...
registerCrud(app, 'cases', {
  table: 'protest_case',
  fields: [...],
  touchUpdatedAt: true,
  skipDelete: true, // SPEC-015: dedicated route below instead
});
// ... (junto a las otras rutas case-scoped, p.ej. tras registerCaseAttachmentRoutes)
registerCaseDeleteRoute(app);
```

## 4. Frontend — `apps/web/src/api.ts`

```ts
deleteCase: (id: number) => del(`/cases/${id}`),
```

## 5. Frontend — `apps/web/src/components/CaseList.tsx`

```tsx
interface Props {
  caseId: number | null;
  onSelect: (eventId: number, caseId: number) => void;
  user: SessionUser; // SPEC-015: gates the Remove button to admins
}

export function CaseList({ caseId, onSelect, user }: Props) {
  // ... reload/dialogOpen unchanged ...

  async function handleDelete(e: MouseEvent, row: CaseSummaryRow) {
    e.stopPropagation();
    // case_number is unique only per event (UNIQUE(event_id, case_number)
    // in schema.sql) — two regattas can both have a "Case 1", so the
    // confirmation must name the regatta too, not just the case number.
    if (!window.confirm(`Delete case ${row.case_number} (${row.event_name})? This cannot be undone.`)) return;
    await api.deleteCase(row.id);
    await reload();
  }

  // ... in the table header, one more <th> if user.role === 'admin' ...
  // ... in each row, after the Decision <td>:
  {user.role === 'admin' && (
    <td>
      <button type="button" onClick={(e) => handleDelete(e, r)}>
        Remove
      </button>
    </td>
  )}
```

(Import `MouseEvent` from `'react'` and `SessionUser` from `'../types'`.)

## 6. Frontend — `apps/web/src/App.tsx`

```tsx
<CaseList
  caseId={currentCaseId}
  onSelect={(eventId, caseId) => {
    setCurrentEventId(eventId);
    setCurrentCaseId(caseId);
  }}
  user={user}
/>
```

(`user` is already `SessionUser | null` in scope, but this render
branch only happens after the login gate, so it's non-null there — a
non-null assertion or an early-return guard already covers this
elsewhere in `App.tsx`; implementation confirms the exact existing
pattern before adding the prop.)

## Verificación

- `npm run build` (api) / `npm run typecheck` (web) limpios.
- RF-001: loguear como no-admin (si existe un segundo usuario de
  prueba, o confirmar vía lectura de código que `user.role` controla
  el render) → sin botón Remove visible en el listado.
- RF-002: pulsar Remove en un caso de prueba → diálogo de
  confirmación con el número de caso; Cancelar → el caso sigue en el
  listado.
- RF-003/RF-004: crear un caso de prueba con un party, un testigo, una
  cita de regla, un adjunto subido y un jurado asignado → Remove →
  confirmar → el caso desaparece del listado; verificar por API/DB que
  no quedan filas huérfanas en `party`/`witness`/`case_rule_citation`/
  `case_jury_member`; verificar que los ficheros del adjunto ya no
  existen en `data/case_attachments/`.
- RF-005: `DELETE /cases/:id` con una sesión no-admin (o sin sesión)
  → 403.
- RF-006: los otros "Remove" (testigo, regla, adjunto, jurado) sin
  regresión.
- Revisión con el agente `reviewer`: QA de spec/plan antes de
  implementar, validación RF por RF después, verificación en vivo
  (localhost primero, luego confirmado contra el entorno desplegado).

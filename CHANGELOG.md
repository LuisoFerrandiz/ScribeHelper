# Changelog

All notable changes to Scribe Helper are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project does not cut semantic-version releases — entries are
grouped by date instead, matching the commit history. For the *why*
behind any entry, see `DECISIONS.md` (`D-NNN`, append-only, full
alternatives + reasoning) and, from 2026-10-04 onward, `specs/SPEC-NNN-*.md`
(requirements/plan/tasks per unit of work, Spec-Driven Development).

## [Unreleased]

Nothing pending — `master` and `origin/master` are in sync as of the
last entry below.

## 2026-10-04 — SPEC-007/SPEC-008: Conclusion and Decision suggestion sources

### Added
- Conclusion: protest form candidate paragraph (when the uploaded form
  already documents one), AI suggestions mined from `examples/`
  replacing "AI draft" (SPEC-007).
- Decision: always-visible party + race reference list (initiator,
  respondent, race — highlighted when mentioned in the text), AI
  suggestions mined from `examples/` replacing "AI draft" (SPEC-008).

With this, all four writing boxes (Procedural Matters, Facts Found,
Conclusion, Decision) share the same three-source suggestions panel.

## 2026-10-04 — SDD adoption, reviewer subagent, SPEC-001/002/005/006

### Added
- Spec-Driven Development workflow: `specs/SPEC-NNN-*.md` (spec + plan
  + tasks) per unit of work; `.claude/agents/reviewer.md`, a read-only
  subagent that validates a spec before building or an implementation
  against its spec/plan/tasks after building.
- SPEC-001: case-list entry screen (replaces the old case selector),
  admin-only nav items enforced, username dropdown with log out.
- SPEC-002: "New case" popup (native `<dialog>`), event/case
  uniqueness enforced server-side (`409 duplicate` on the generic CRUD
  insert path), not just client-side.
- SPEC-005: Procedural Matters — AI suggestions mined from accepted
  `examples/` (base + own), generalized phrases, replacing "AI draft"
  for this box; phrase library reseeded from the converted `.md` of
  the Preferred Standard Wording spreadsheet rather than the `.xlsx`
  directly (D-022 follow-up).
- SPEC-006: Facts Found — same AI-suggestions-from-examples source;
  deterministic sail-number → role ghost-text completion (no network,
  no debounce); always-visible party reference list, highlighting
  whichever party's sail number is already in the text.

### Fixed
- `apps/api/src/routes/resources.ts` write routes (create/accept/
  reject/delete/reclassify) had no server-side admin check — only the
  frontend hid the buttons. Found during SPEC-001 review; now guarded
  with `requireAdmin`, matching `users.ts`.
- SPEC-002: the generic CRUD insert handler now catches
  `UNIQUE constraint failed` and returns `409 { error: 'duplicate' }`
  instead of a raw 500, for every entity using `registerCrud`.

## 2026-09-29 — Case attachments, AI extraction into the form

### Added
- D-027: protest-form uploads per case ("0. Protest Form(s)" tab,
  before "1. General & Parties"), converted to Markdown on upload,
  own pipeline — not a fourth material store, not citable, not
  searchable, no accept/reject gate (unlike `rules/`/`examples/`).
- AI extraction of what an uploaded protest form already states, as
  click-to-insert suggestions: parties, witnesses, Procedural Matters
  candidate, Facts Found candidates (discrete, one per entry),
  auto-generated Procedural Matters lines for represented parties and
  witnesses.
- Sail numbers always shown with their country prefix (e.g. "ITA
  32004"), everywhere one appears.

### Fixed
- Extraction JSON parsing (fenced/unfenced/malformed response
  handling) and response-shape normalization.
- A person's name following a sail number in a protest form is
  `represented_by`, never `boat_name`.

### Changed
- Box suggestions moved from an always-open block to a collapsible
  right-hand sidebar.
- Smaller, normal-line-height text in the writing boxes.

## 2026-09-17 — Non-LAN access fix

### Fixed
- Empty case/example lists when accessed over a non-LAN connection —
  nginx reverse-proxies `/api` to the API container instead of the
  frontend calling it directly.

## 2026-09-16 — Decision export format

### Changed
- D-005 follow-up: "Copy all" replaced by a one-click download;
  export format switched from `.md` to a single-file `.html` matching
  the official decision template, since the official form is itself
  distributed as `.html` (D-005's filename-extension correction).
- Download button moved next to the tab bar, styled to match the tab
  palette instead of standing out as a solid green button.
- Clickable regatta/case browser added alongside the download button.

## 2026-09-15 — Phases 2 through 5.5

### Added
- **Phase 2** (D-022): phrase library (`phrase` table + FTS5), seeded
  from World Sailing's Preferred Standard Wording spreadsheet (9
  sheets mapped onto the 4 writing boxes); "save current text as
  phrase"; rule picker searching the loaded corpus from Rules
  Applicable.
- **Phase 3** (D-020): resource ingestion pipeline (`rules/` +
  `examples/`) — upload, per-format Node conversion to Markdown,
  human review (accept/reject), FTS5 search; drag-and-drop upload
  with title taken from filename; reclassify endpoint (rule ↔
  example).
- **Phase 4** (D-024): AI alternative-draft panel (Anthropic API),
  grounded in the actual corpus rule text (not just the reference
  number), with per-box citation validation (existence check against
  the accepted rules corpus).
- **Phase 5** (D-025): inline ghost-text completion — automatic,
  debounced, Haiku 4.5.
- **Phase 5.5** (D-026): login, single admin account, signed cookie
  sessions (not server-stored).
- D-021: Jury Members as a per-case panel picked from an event-level
  judge pool, not fixed for the whole event — two levels, not one.
- Case form split into tabs (General, Procedural, Facts, Conclusion,
  Decision); Jury Members as its own tab; General tab merges Parties
  & Witness under one Save button.
- Case screen becomes the app's entry point (D-019); events list
  screen removed; event/case creation via a find-or-create picker
  (D-018) instead of separate forms.
- Full-width layout, collapsible boxes, self-hosted Inter font,
  focus-mode palette and typography for the writing surface, unified
  tab style across nav levels, two-column resource lists.

### Fixed
- Every bodyless `DELETE` (and reject) request was failing with 400.
- FTS5 delete-by-id type-coercion bug (D-023).
- AI draft was ignoring unsaved text — now sends the box's live text,
  not the last row saved to the database.
- Production crash-loop: `@fastify/secure-session` (native deps)
  replaced with a hand-rolled signed cookie (D-026 follow-up);
  port-mapping incident found while verifying that fix documented
  alongside it.

## 2026-09-13 — Deploy config

### Changed
- Deploy configuration updated for the Ubuntu/Portainer host.

## 2026-09-11 — Phase 1: initial build

### Added
- Data model (`apps/api/db/schema.sql`), Fastify API, React + Vite
  case form, Docker multi-stage build, `docker-compose.yml`.
- D-001–D-017: v1 scoped to protests only; product entirely in
  English (chat in Spanish per working convention, D-002); single
  user, local-first, no accounts in v1 (superseded by D-026); nothing
  cited unless present in the corpus (D-004); no `.docx` export,
  copy-paste per box instead (D-005); CodeMirror 6 chosen over TipTap
  (D-006); three separate material stores — `rules/`, `examples/`,
  `phrases/` (D-007); layered rules corpus with precedence (D-008);
  everything stored as Markdown regardless of source format (D-009);
  no OCR (D-010); SQLite + FTS5, not Postgres/a vector database
  (D-011); containerized from day one (D-012); file-sync exclusions
  (D-013); `case_rule_citation` as its own table, not a text column
  (D-014); table named `protest_case`, not the reserved word `case`
  (D-015); SQLite access via `node:sqlite`, not `better-sqlite3`
  (native build failed on this machine, D-016); copy-per-box covers
  all 8 form sections, not only the 4 human-written boxes (D-017).

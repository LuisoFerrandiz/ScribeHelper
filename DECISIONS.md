# Scribe Helper — Decision Log

> Every significant decision, with the alternatives that were on the table
> and the reason one was chosen. This exists because in six months nobody
> remembers what problem a decision was solving, and undoing a decision
> without knowing its reason is how projects break.
>
> **Append only.** To change a decision, add a new entry that supersedes
> the old one. Do not edit history.

Related: `CLAUDE.md` (project overview, architecture, commands) and
`constitution.md` (principles, non-negotiable limits, who decides) —
both reference entries here by `D-NNN`; this log is never duplicated
into either of them.

Format: `D-NNN` · date · status (`accepted`, `superseded by D-NNN`, `revisited`)

---

## D-001 · 2026-09-11 · accepted
### v1 covers protests only

**Options**
- Protests and requests for redress together
- Protests only

**Decision:** protests only.

**Why:** redress hearings have a different form and a different flow.
Building both at once doubles the surface before either is proven in a
real event.

**Consequence:** the data model must leave room for redress, so adding it
later is additive rather than a rewrite. Nothing else is built for it now.

---

## D-002 · 2026-09-11 · accepted
### The product is entirely in English

**Decision:** interface, buttons, menus, error messages, code, field names
and project documents are all in English.

**Why:** the defined terms of the racing rules are native to English and
carry exact technical meaning that does not survive translation. Drafting
in English means the tool's vocabulary matches the authoritative
vocabulary, with no translation layer to get wrong.

**Consequence:** no i18n layer, no language switching. This removes a whole
category of work.

---

## D-003 · 2026-09-11 · accepted
### Single user, local first. No accounts in v1.

**Options**
- Build multi-user from the start
- Build for one user, add sharing later

**Decision:** one user, running locally.

**Why:** the owner is the only user. Accounts, roles and permissions are
the classic sink for personal projects that will "one day" be multi-user.

**Consequence and the condition attached:** the application must not
hardcode the assumption that the person opening it is the owner. Whether
authentication is required is a matter of configuration, not of rewriting
the application. See D-012.

---

## D-004 · 2026-09-11 · accepted
### Nothing is cited unless it is in the corpus

**Decision:** an iron rule. Any rule number the system cannot trace to
loaded text does not get produced.

**Why:** a language model citing rules from memory invents numbering with
total confidence. In a protest, a misquoted rule is not a bug; it is a
badly founded decision. This risk grows when other judges use the tool,
because they sign what the tool produced.

**Consequence:** Phase 4 includes a validation pass that rejects rule
numbers absent from the corpus. Every rule statement shows where it came
from, from the first version.

---

## D-005 · 2026-09-11 · accepted
### No .docx export in v1. Copy-paste per box instead.

**Options**
- Fill the existing .docx template with placeholders
- Build the document from scratch with a document library
- No export; a copy button per box

**Decision:** copy button per box, plus a copy-all in form order.

**Why:** export was the least valuable and most tedious block of work. It
also carried a library licensing question that no longer needs answering.

**Consequence:** the application's boxes must still mirror the form
exactly, with the same names in the same order, so export can be added
later by connecting a wire. Two cheap safeguards against copy-paste
mistakes: a visual indicator of which boxes have been copied, and a
copy-all button.

**Revisit when:** export is wanted. This is a deliberate deferral, not a
rejection.

**Follow-up (2026-09-16):** export was wanted — connected the wire this
deferral anticipated. The "Copy all (form order)" button in `CaseForm.tsx`
is replaced by a "Download decision (.md)" button: it builds
`formatFullDecision(liveCase)` (same fixed section order, unchanged) into a
`Blob` and triggers a browser download, no server round-trip. Plain
Markdown, not .docx — no new dependency, no library-licensing question,
matching this decision's own reasoning for not doing the harder export.
Filename convention (`format.ts`'s `buildDecisionFilename`): `<event
name>-Case<NN>-<date>.md`, e.g. `OG-Case01-2026-09-16.md` — regatta name
slugified, case number's first digit run zero-padded to 2 digits, today's
date. Per-box Copy buttons are unchanged.

**Follow-up (2026-09-16, second):** switched the export from plain `.md`
to a single self-contained `.html` file (`formatFullDecisionHtml` in
`format.ts`), for richer formatting than markdown — bold labels, tables,
line breaks — closer to the source Word template
(`Template_Jurydecision.docx`). Still no new dependency, still built and
downloaded entirely client-side (inline `<style>`, no JS, no external
assets); opens in any browser and prints to PDF via the browser's own
Print dialog. Layout follows the template's header table (Case/Day/With
Case(s)/Race), Parties/Witness tables, and boxed free-text sections, but
keeps the app's own canonical labels/order over the template's wording
(Initiator/Respondent not Protestor/Protestee, Facts Found not Fact
Founds, Conclusion and Rules Applicable kept as two sections) — same
principle as this decision's original text. Fields present in some
template variants but absent from the data model (Validity, Case Summary,
Class/Group, signatures, Scribe role) are not included. Filename extension
changed from `.md` to `.html`; the naming convention itself is unchanged.

---

## D-006 · 2026-09-11 · accepted
### Editor: CodeMirror 6. TipTap rejected.

**Options**
- CodeMirror 6
- TipTap (ProseMirror)
- A standalone React ghost-text component

**Decision:** CodeMirror 6.

**Why, primary reason:** TipTap's official AI autocompletion (Content AI)
installs from a private registry, depends on TipTap's backend service and
requires a paid subscription on an eligible plan. It ships with
out-of-the-box support for OpenAI's models, and connecting a custom LLM
backend is reserved for the business plan. This project uses Claude and is
self-hosted. Paying a monthly subscription for the privilege of connecting
Claude is not defensible here.

**Why, secondary reasons:** CodeMirror covers both suggestion mechanisms
in one engine and at no cost. MIT-licensed inline-suggestion extensions
exist for ghost text; the native autocomplete extension, with a custom
completion source using `matchBefore`, covers the deterministic phrase
library.

**Why the standalone component was rejected:** it solves AI ghost text but
not the deterministic phrase library, leaving two autocomplete systems
built on different technologies fighting over the same key.

**Risks accepted:**
- CodeMirror is a code editor in disguise. Line wrapping must be enabled
  explicitly and the code-editor styling must be removed.
- Browser spellcheck works but must be enabled explicitly. This matters:
  all drafting is in English. **Verify this early, not in Phase 5.**
- If rich text (bold, lists) is ever needed, migration is required. The
  current form has no rich formatting in any box, so this is judged
  unlikely.

**Implementation note:** debounce the completion trigger and close any open
completion on each keystroke. Without this, every keypress fires a request,
which here means money per keystroke.

---

## D-007 · 2026-09-11 · accepted
### Three separate material stores: rules, examples, phrases

**Decision:** `rules/` is authority, `examples/` is style, `phrases/` is
the user's own wording. They are never merged.

**Why:** they have different levels of trust. A phrase written by the user
must never be presented as a rule. An example decision must never be cited
as authority.

**Naming:** `phrases/` was chosen over `boilerplate/`. Both are correct;
*boilerplate* is the legal-drafting term. `phrases/` explains itself to
anyone picking up the project cold. Renaming later touches folder,
database, API and UI at once, which is why it was decided up front.

---

## D-008 · 2026-09-11 · accepted
### The rules corpus is layered, and the layers have precedence

**Decision:** permanent material (RRS, class rules) and event material
(NoR, SIs, amendments) live in separate directories. Event material is
replaced at every regatta.

**Why:** sailing instructions and their amendments **modify** the RRS.
Citing the RRS while ignoring an event amendment yields a citation that is
correct and a decision that is wrong.

---

## D-009 · 2026-09-11 · accepted
### Everything is stored as Markdown, whatever it arrives as

**Decision:** PDF, Excel, Word and Markdown all enter; `.md` is the only
stored format. Conversion happens inside the application, once, at import.

**Why:** one format for the AI to read, one format for the index, no
per-format branching in the code.

**Attached decisions:**
- The **original is always kept** next to the `.md`. Conversion loses
  things, particularly tables and numbering.
- Conversion is **reviewable**: the user accepts or rejects the Markdown.
  Rejecting deletes everything, original included, leaving no orphans.
- **The `.md` is never hand-edited.** To fix a bad conversion, the user
  repairs the source outside the system and re-uploads.
- **Deleting the `.md` regenerates it** from the original and sends it back
  through review. Deleting is the "redo this" button.
- **Empty or near-empty conversion raises a warning.** That is what a
  scanned PDF looks like, and without the warning a rulebook can be
  "loaded" and empty exactly when it is needed.

**Open:** the conversion library has not been chosen. Decide in Phase 3,
verifying current options rather than picking from memory.

---

## D-010 · 2026-09-11 · accepted
### No OCR

**Decision:** scanned documents are processed by the user before upload.

**Why:** OCR is a heavy dependency inside the container, and the user's
workflow already handles it externally.

---

## D-011 · 2026-09-11 · accepted
### SQLite, not Postgres. FTS5, not a vector database.

**Decision:** SQLite as a file inside `data/db/`. SQLite FTS5 for corpus
search.

**Why:** one user, one writer. SQLite needs no container and no
administration, and the backup is a folder copy. For a corpus this size,
parsing the RRS by rule number and searching by keyword is more precise
and cheaper than embeddings.

**Consequence:** keep the data layer cleanly separated so moving to
Postgres is roughly a day's work if concurrent writing ever arrives.
Semantic search can be added later if keyword search proves insufficient.

---

## D-012 · 2026-09-11 · accepted
### Built to be containerised from day one

**Decision:** the target is the owner's home server (Ubuntu, CasaOS,
Portainer), as a multi-container stack.

**Rules adopted now, because they are free now and painful later:**
- All configuration through environment variables in `.env`. Nothing
  hardcoded.
- All data under a single `data/` directory, which becomes the mounted
  volume and doubles as the complete backup.
- Relative paths only. No Windows paths anywhere in the code.
- The server listens on `0.0.0.0`, not `localhost`. Inside a container,
  `localhost` is unreachable from outside. This is the most common
  first-time containerisation error.
- **Timezone via environment variable.** Containers default to UTC, and
  decisions carry the time the parties were informed, which must be event
  time.

**Consequence:** the `Dockerfile` and `docker-compose.yml` are written at
the end of Phase 1, even though they are not used yet, because they force
the directory structure to be correct.

**Deferred:** authentication. Running on a server means the assumption
behind D-003 no longer holds. Phase 5.5.

---

## D-013 · 2026-09-11 · accepted
### File sync exclusions

**Context:** the project lives under a path on the owner's PC that is
synchronised with Syncthing. (Synology Drive is disabled on both machines
and survives only in the folder name.)

**Decision:** a `.stignore` excluding `node_modules/`, build artifacts,
`.git/`, `data/db/` and Syncthing's own conflict files.

**Why:** real-time sync over thousands of small files corrupts
repositories, and syncing a live SQLite file mid-write corrupts the
database.

**Standing risk:** if the application ever runs on both the PC and the
server while the folder is synced, two processes would write the same
SQLite file. That is why `data/db/` is excluded. Database backup is a
periodic copy, not sync of the live file.

---

## D-014 · 2026-09-11 · accepted
### Rules Applicable stored as a separate table, not a text column

**Options**
- A `rules_applicable TEXT` column on the case, same as the other three
  written boxes
- A separate `case_rule_citation` table, one row per citation, free text
  in Phase 1

**Decision:** separate table.

**Why:** Rules Applicable is a hybrid (CONTEXT.md section 4): human-written
in Phase 1, but meant to come from a closed, validated list backed by the
corpus once Phase 3 exists. A table of rows survives that transition
without a schema change or a data migration; a single text column would
need to be split into rows later, migrating existing case data.

**Consequence:** in Phase 1 `case_rule_citation.rule_reference` is free
text, ordered by `position`, with no validation. Phase 3 adds corpus
validation on top of the same table.

---

## D-015 · 2026-09-11 · accepted
### Table named `protest_case`, not `case`

**Decision:** the case table is `protest_case`.

**Why:** `CASE` is a reserved SQL keyword. Using it as a table name works
in SQLite but forces quoting everywhere and invites mistakes.

**Consequence:** none beyond the name. Same content as the `case` entity
described in CONTEXT.md and RULES.md.

---

## D-016 · 2026-09-11 · accepted
### SQLite access via node:sqlite, not better-sqlite3

**Options**
- `better-sqlite3` — the more established library, native C++ addon
- `node:sqlite` — built into Node.js since 22.5, no external dependency

**Decision:** `node:sqlite`.

**Why:** `better-sqlite3` has no prebuilt binary for this Node version on
this machine and failed to compile from source (`node-gyp` could not find
a Visual Studio C++ toolchain on Windows). `node:sqlite` ships with Node
itself, needs no native compilation on any platform, and its synchronous
API (`prepare`, `.run`, `.get`, `.all`) is compatible with the code already
written against it.

**Consequence:** `engines.node` in `apps/api/package.json` set to
`>=22.5.0`. The Docker image (Phase 1 Step 4) must use a matching Node
version. Removes a native-dependency risk from containerisation (D-012)
entirely, at no cost found so far.

---

## D-017 · 2026-09-11 · accepted
### Copy-per-box covers all 8 form sections, not only the 4 human-written boxes

**Options**
- Copy button only on Procedural Matters, Facts Found, Conclusion, Decision
  — the four boxes CONTEXT.md section 4 names as "the only places where
  writing assistance applies"
- Copy button on all 8 sections of the fixed structure (Parties, Witness,
  Procedural Matters, Facts Found, Conclusion, Rules Applicable, Decision,
  Jury Members)

**Decision:** all 8 sections.

**Why:** "writing assistance" (section 5, phrase library and AI) is a
narrower concept than "copy to clipboard" (section 3, in scope for v1).
The whole document, auto-filled sections included, gets pasted into the
official decision one piece at a time. D-005 describes the boxes as
mirroring the form "exactly" for future export, which reads as the whole
form, not a subset.

**Consequence:** Parties, Witness, Rules Applicable and Jury Members are
formatted from structured data into plain text for copying (`format.ts`).
Jury Members is shown read-only in the case form — it belongs to the
event (CONTEXT.md section 4) and is edited from the event screen, not
duplicated as an editable control per case.

---

## D-018 · 2026-09-15 · accepted
### Event/case creation moved from forms to a find-or-create picker

**Options**
- Keep the explicit "New event" and "New case" forms (Name/Venue/Timezone;
  Case number/Day/Race) as the only way to create rows
- Remove those forms; a regatta/case picker at the top of the case screen
  resolves free text against existing rows, and creates one when there is
  no match

**Decision:** the picker. `EventList` becomes a read-only list (click to
open); a new `CaseSelector` component, shown above `CaseForm`, holds two
`<input>` + `<datalist>` fields (regatta, case number) and a Go button that
finds-or-creates both, matching the existing `findOrCreatePerson`/
`findOrCreateBoat` pattern already used for parties and jury.

**Why:** the judge works during a live regatta and wants to jump between
cases without a multi-screen click path; typing a name they already used
should just select it, typing a new one should just work.

**Consequence:** a new event created this way gets `venue: null,
timezone: 'UTC'` — editable later from the event list only by direct DB
access today, since there is no edit form yet (open question below). A new
case gets `day: null, race: null`, filled in by hand in the case form as
before. No backend changes: purely client-side find-or-create against
`/events` and `/cases`, same as the existing person/boat pattern.

**Open:** no UI yet to edit an event's venue/timezone after auto-creation,
or a case's event assignment after auto-creation. Revisit if this proves
annoying in practice.

**Follow-up (2026-09-16):** typing into the datalist fields wasn't enough —
the user wanted to see and click every regatta/case, not just recall one by
typed name. Added a plain browsable tree under the picker in
`CaseSelector.tsx`: events as headers, their cases as click-to-open buttons
(active one highlighted). No new screen, no route — this stays inside
`CaseSelector`, consistent with D-019's removal of a separate Events list
screen; it only makes the picker's own data (already fetched via
`api.listEvents`/`api.listCases`) visible instead of typed-only.

---

## D-019 · 2026-09-15 · accepted
### Events list screen removed; Case screen is the app's entry point

**Options**
- Keep Events list as the landing screen, Case screen reached by
  drilling down through it
- Remove Events list; land directly on the Case screen (its
  `CaseSelector` already finds-or-creates the regatta, per D-018)

**Decision:** removed. `EventList.tsx` and `EventDetail.tsx` deleted.
`App.tsx` now holds a flat tab bar (`Case` / `Jury` / `Upload examples` /
`Upload rules`) instead of a drill-down view stack.

**Why:** during a live regatta the judge works case-by-case; a landing
list of regattas added a click with no value once the picker already
covers lookup and creation.

**Consequence:** Jury management (previously part of `EventDetail`) is
now `JuryPanel.tsx`, a utility reached from the top nav, scoped to
whichever regatta `CaseSelector` currently has selected (`currentEventId`
in `App.tsx`). The nav also gets two upload utility buttons for Phase 3
(`Upload examples`, `Upload rules`), currently `UploadPlaceholder.tsx`
stubs pending the ingestion backend.

---

## D-020 · 2026-09-15 · accepted
### Phase 3 ingestion: `resource` table, FTS5, per-format Node conversion

**Decision:** one `resource` table for both rules and examples (kind
column), storing original + converted paths relative to `dataDir`
(CONTEXT.md section 8 layout). Conversion via per-format Node libraries,
verified against DECISIONS.md D-009's open question:

- `.md`/`.markdown` — passthrough
- `.pdf` — `pdf-parse` v2 (class-based `PDFParse.getText()` API; its v1
  function-call API is gone in this version)
- `.docx` — `mammoth.convertToMarkdown` (present at runtime; its bundled
  `.d.ts` is stale and omits it, so the call is cast narrowly in
  `convert.ts` rather than typed through the package's own types)
- `.xlsx`/`.xls` — `xlsx`, sheets rendered as HTML tables (valid inside
  Markdown, handles merged/ragged cells better than a hand-rolled pipe
  table)

Upload is multipart (`@fastify/multipart`), FTS5 confirmed working under
`node:sqlite` (tested directly: `CREATE VIRTUAL TABLE ... USING fts5`
succeeds). Only accepted `kind = 'rule'` rows are indexed into
`resource_fts` — examples are never cited (D-007), so never searched for
citation purposes.

**Why one shared table instead of two:** rules and examples go through
the identical upload → convert → review → accept/reject flow (D-009);
splitting into two tables would duplicate every column and every route.
What differs (layer vs scope, FTS indexing) is handled with nullable
columns and a CHECK constraint tying them to `kind`.

**Reject deletes the row, not just the files:** CONTEXT.md section 7 says
reject leaves "no orphans" for files; extended here to mean no orphan
database row either, since a rejected resource carries no information
worth keeping. `status` therefore only has two values in practice
(`pending_review`, `accepted`); no `rejected` value.

**Open risk, unverified:** `pdf-parse` v2 depends on `@napi-rs/canvas`, a
native (Rust/napi-rs) binary. It should resolve a `linux-musl-x64`
prebuild automatically when `npm ci` runs inside the `node:24-alpine`
Docker build (D-012), same as any napi-rs package, but this has not been
verified by actually building the image — no Docker on this dev machine.
If the Alpine build fails on this dependency, the fallback is `pdfjs-dist`
directly (drop `pdf-parse`'s wrapper, use its text-extraction API without
the canvas-only image/screenshot features this project never calls).

---

## D-021 · 2026-09-15 · accepted
### Jury Members: per-case panel, not fixed for the whole event

**Context:** CONTEXT.md section 4 states jury members "belong to the
event, not the case." In practice (user's correction), judges rotate
between hearings at the same regatta — the panel sitting on one protest
is usually not the same as on the next one.

**Options**
- Keep jury fixed per event (as documented), shared read-only by every
  case
- Move jury entirely to the case, no event-level concept at all
- Two-tier: an event-level judge pool (added once) + a per-case panel
  picked from that pool, chairman decided per case

**Decision:** two-tier. `jury_member` (event, person, is_chairman)
becomes the event's judge pool — `is_chairman` there is now vestigial,
kept only for old rows, meaningless going forward. New table
`case_jury_member` (case, person, is_chairman) holds the panel actually
sitting on one case. Not FK-enforced against the pool — the pool is a
picker convenience, not a hard membership rule (consistent with Rules
Applicable being free text in Phase 1, D-014).

**Why not drop the event-level pool entirely:** the same handful of
judges typically works most hearings at a given regatta; without a pool,
every case would retype the same few names from scratch. The pool keeps
"enter once" (CONTEXT.md section 1) while the panel itself is picked per
case.

**Consequence:**
- `JuryPanel.tsx` (Jury utility, top nav) manages the pool only — no
  chairman toggle there any more.
- `CaseForm.tsx`'s Jury Members box is now editable (previously
  read-only): add/remove from the case's panel, chairman picked per
  case, choices offered from the datalist of the event's pool.
- `GET /cases/:id/full`'s `jury` array now reads from `case_jury_member`
  joined on `case_id`, not `jury_member` joined on `event_id`.
- This directly contradicts CONTEXT.md section 4's current wording,
  which should be corrected the next time that document is revised by
  its author — not done here per the standing rule against editing those
  three files without being asked.

---

## D-022 · 2026-09-15 · accepted
### Phase 2 phrase library, seeded from World Sailing's Preferred Standard Wording

**Context:** user has the World Sailing "Preferred Standard Wording"
spreadsheet (9 sheets: Procedural Matters, Validity, Protest/Redress
Conclusions, Protest/Redress Decisions, NO Hearing, Reopenings) — public
guidance wording with bracketed placeholders (`[X]`, `[##]`), organized
by which part of a decision each fragment belongs to.

**Decision:** built Phase 2 (CONTEXT.md phase table) around this file
instead of starting the phrase library empty. New `phrase` table
(box, label, body, origin) + `phrase_fts` (FTS5, same pattern as
`resource_fts`, D-020). `origin` reuses the base/own split already
established for examples (D-007): `base` = seeded, not user-editable or
deletable; `own` = saved by the user from a box's current text
(`POST /phrases`, "Save current text as phrase" in `PhrasePicker.tsx`).

**Sheet → box mapping**, decided when proposing this to the user:
Procedural Matters → `procedural_matters`; Validity, Protest/Redress
Conclusions, Reopenings → `conclusion`; Protest/Redress Decisions →
`decision`. "NO Hearing" is structured differently (one label heading
four grouped lines: Suggested Fact / Conclusion / Decision Short /
Decision) and is parsed specially (`seedPhrases.ts`), splitting each
group across `facts_found`, `conclusion` and `decision`.

**Seeding mechanics:** the spreadsheet ships in the repo at
`apps/api/seed/preferred-standard-wording.xlsx` (Dockerfile copies it
into the image). `seedBasePhrases()` runs from `migrate.ts` on every
container start, idempotent by checking `COUNT(*) WHERE origin='base'`
first — not a unique constraint, since near-duplicate wording rows in
the source are legitimate, not bugs.

**What this is not:** deterministic inline completion (ghost text) or
ranking phrases by keystroke context — CONTEXT.md's "deterministic
completion" and D-006's CodeMirror migration are still open. This is the
browse/search/insert/save half of Phase 2, using plain textareas.

---

## D-023 · 2026-09-15 · accepted
### Reclassify endpoint for resources; fixed an FTS5 type-coercion bug

**Context:** user had uploaded several files as `kind: 'rule'` that were
actually examples.

**Decision:** `POST /resources/:id/reclassify` (body: `kind`, `layer`
or `scope`, optional `event_id`) moves the markdown file to the correct
directory (`storage.ts`'s new `moveMarkdown`) and updates the row,
instead of requiring delete + re-upload + re-convert. `ResourceUpload.tsx`
exposes it as a "Move to examples/rules" button in the preview panel.

**Bug found and fixed while testing this:** `DELETE FROM resource_fts
WHERE resource_id = ?` (and the equivalent in `phrase_fts`) was being
called with the string `id` straight from `req.params`, never matching
the integer stored in that `UNINDEXED` FTS5 column — confirmed directly
against `node:sqlite`: an ordinary table coerces `'1'` to match integer
`1` in a WHERE clause, but an FTS5 virtual table's UNINDEXED column does
not apply that affinity coercion. Practical effect: reclassifying a rule
to an example (or deleting an accepted resource, or deleting a phrase)
left a stale row in the FTS index — search kept surfacing content that
should have disappeared. Fixed everywhere by wrapping the id in
`Number(id)` before comparing against `resource_id`/`phrase_id`.

**Consequence:** any future FTS delete-by-id must remember this — it is
not a one-off typo, it is how UNINDEXED columns behave in this SQLite
build.

---

## D-024 · 2026-09-15 · accepted
### Phase 4: AI draft panel, Anthropic API, per-box citation check

**Options**
- Anthropic API vs OpenAI vs a local model
- API key in `.env` (server-side) vs pasted into the UI and stored in the DB
- Citation validation: check existence in the uploaded corpus, check RRS
  reference format only, or both

**Decision**
- Anthropic API (`@anthropic-ai/sdk`, model `claude-sonnet-5`), called
  only from `apps/api/src/ai/draft.ts` — the first and only place in the
  app that reaches the network (RULES.md R-23 exception, ordering per
  R-34 and CONTEXT.md section 9: this comes after every offline-capable
  phase).
- `ANTHROPIC_API_KEY` read from the environment (`.env` → docker-compose
  → container), same pattern as every other deployment setting. Missing
  key returns a clear 502 from `POST /cases/:id/draft`, not a silent
  no-op.
- One request drafts one box (`procedural_matters`, `facts_found`,
  `conclusion`, `decision` — the same four as the phrase library, D-022).
  The prompt is built only from that case's own saved rows (parties,
  witnesses, the other boxes' current text, and its already-added rule
  citations) — never from other cases, and the model is told not to cite
  outside the rules it was given.
- Citation check = existence only: every `RRS n`/`Rule n` reference the
  model outputs is extracted (`extractCitations`, keyword-gated regex so
  ordinary numbers like a race number are never treated as a citation)
  and checked as a plain substring against the accepted rule corpus's
  converted Markdown (`validateCitations`). Not an FTS5 `MATCH` — a
  reference like `42.1(a)` has punctuation the FTS5 tokenizer splits on,
  same class of gotcha as D-023's UNINDEXED-column bug, so a phrase MATCH
  would misbehave; plain substring search on the small corpus is simpler
  and correct.
- Nothing is written to the case automatically. The panel
  (`AIDraftPanel.tsx`) shows the draft text and a found/not-found line per
  citation; the drafter presses Insert, same one-way flow as the phrase
  picker.

**Consequence:** deploying this feature requires setting
`ANTHROPIC_API_KEY` in the server's `.env` (Portainer "Repository" method
picks it up automatically, same as every other variable). Leaving it
unset keeps the rest of the app fully offline — the draft panel is the
only feature affected.

**Follow-up (same day):** the first version only sent the model each
cited rule's *reference string* ("RRS 42.1(a)"), never the rule's actual
text — the corpus was used solely to check the model's citations after
the fact, not to ground the draft while writing it. Fixed by loading the
accepted rule corpus once per request and pulling a ~500-character
excerpt around each cited reference's first match
(`loadAcceptedRuleCorpus`/`findExcerpt` in `apps/api/src/ai/draft.ts`),
included in the prompt as that rule's text; the system prompt now tells
the model to state what a rule requires only when its text was given,
never guess from the bare number. The same loaded corpus is reused for
the post-hoc citation check, so it is read from disk once per request,
not twice.

**Second follow-up (2026-09-15, real-usage report):** `generateDraft`
read the box being drafted from `protest_case` in the database —
whatever was last saved by the Save button — never the text currently
sitting in the textarea. Typing in Procedural Matters and pressing
"AI draft" without saving first drafted from stale (often empty) saved
text, which looked like the model ignoring what was just written and
inventing an unrelated decision. Fixed by sending the box's live,
unsaved text with the request (`AIDraftPanel`'s new `currentText` prop →
`POST /cases/:id/draft`'s `currentText` field → `generateDraft`'s new
parameter, used in place of `caseRow[box]` in `buildPrompt`), and by
telling the model explicitly: when the drafter's own current text is
given, the job is to turn *that* into a polished section — same facts,
same order — never to replace it with new content of its own invention.

---

## D-025 · 2026-09-15 · accepted
### Phase 5: inline ghost-text completion, automatic + Haiku 4.5

**Options**
- Trigger: manual shortcut (request a continuation on demand) vs
  automatic ghost text after a typing pause (Copilot-style)
- Model: same as the draft panel (`claude-sonnet-5`) vs a faster/cheaper
  one, given this fires far more often

**Decision**
- Automatic: after `DEBOUNCE_MS` (900ms) of no typing, with the cursor
  at the end of the box and at least `MIN_CHARS` (15) characters typed,
  `GhostTextarea` (`apps/web/src/components/GhostTextarea.tsx`) requests
  a continuation and shows it as gray text after the cursor. Tab accepts
  it (appended to the real value); typing, moving the cursor, or Escape
  drops it. Only fires when the cursor is at the very end of the text —
  mid-text ghost completion is out of scope for this phase.
- Model: `claude-haiku-4-5-20251001`, a separate route
  (`POST /cases/:id/complete`, `apps/api/src/ai/complete.ts`) from the
  draft panel's — short output (`max_tokens: 60`), only the last 1500
  characters of the box sent as context, and the system prompt forbids
  introducing a new rule citation, boat, person, or fact: it continues
  wording already committed to, it does not draft new content the way
  the Phase 4 panel does. No corpus grounding here (D-024's excerpt
  lookup) — the cost/latency of reading the corpus on every keystroke
  pause was not worth it for a completion this short.
- Ghost text itself is a same-metrics mirror `<div>` behind the real
  `<textarea>` (`.ghost-textarea` CSS): the mirror's copy of the real
  text is `color: transparent` (the textarea draws the real glyphs on
  top, in the same position), and only the suggestion appended after it
  shows through the textarea's transparent background. Known limitation:
  the mirror does not track textarea scroll position, so a heavily
  scrolled box (long text, few visible rows) can misalign — accepted for
  this phase rather than syncing scroll, since the four boxes are short
  in practice.

**Consequence:** every one of the four free-text boxes now fires an API
call on a ~1 second typing pause whenever the drafter is actively
writing — distinct from Phase 4's on-demand draft panel, this is
metered, continuous usage. Kept cheap on purpose (Haiku, short output,
truncated context) but it is the first feature in the app whose cost
scales with how much you type, not with how many times you click a
button.

---

## Open questions

Not yet decided. Listed so they are not silently forgotten.

- **Prompt caching** for the rule corpus and system prompts — worth
  revisiting once real usage volume is known; Phase 4 and 5 both settled
  their models (`claude-sonnet-5`, `claude-haiku-4-5-20251001`) but ship
  without caching.
- **Network exposure** of the deployed instance: local network only, or
  reachable from outside. Phase 5.5.

## D-026 · 2026-09-15 · accepted
### Phase 5.5: login, single admin, cookie sessions

**Options**
- Admin account creation: seed from `.env` vars vs a manual create-admin
  script
- Normal-user permissions: identical to admin except user management,
  vs isolated to each user's own cases
- Session mechanism: signed/sealed cookie vs JWT in localStorage

**Decision** (user's explicit call, 2026-09-15)
- `app_user` table: `username`, `password_hash` (scrypt via `node:crypto`,
  `"<salt-hex>:<hash-hex>"` — no bcrypt/argon2 dependency), `role`
  (`admin`/`user`).
- The one admin account is seeded from `ADMIN_USERNAME`/`ADMIN_PASSWORD`
  in `.env` (`apps/api/src/db/seedAdmin.ts`, idempotent — same pattern
  as `ANTHROPIC_API_KEY`). There is no signup screen and no "first user
  becomes admin" trick; only an admin can create further accounts
  (`POST /users`, admin-only), and only an admin can create other
  admins. Deleting the last remaining admin is refused.
- One shared permission level beyond that: every logged-in user (admin
  or not) can do everything in the app except manage users — cases,
  resources, and phrases are not scoped per-user. Simpler data model,
  matches the user's stated need.
- Session: `@fastify/secure-session` — an encrypted, sealed cookie
  (`scribe_session`, `httpOnly`, `sameSite: lax`, 30-day `maxAge`); no
  server-side session store, the cookie *is* the session, so nothing
  new to back up or expire server-side. The 32-byte key is derived by
  hashing `SESSION_SECRET` (any string works, `apps/api/src/auth/
  session.ts`) — a missing secret falls back to a random key generated
  at process start (every session invalidated on restart) rather than
  running with a known, empty key.
  - `cookie.secure: false` because deployment is plain HTTP on the LAN
    (`http://192.168.1.105:3000`, no TLS) — a `secure` cookie would
    never be sent and login would silently not work. Revisit if this
    ever sits behind HTTPS.
- Global auth guard (`apps/api/src/auth/guard.ts`): an `onRequest` hook
  applied to every route except `/health` and `/auth/login`, not a
  per-route `preHandler` — a new route added later is protected by
  default instead of by remembering to guard it. `requireAdmin` adds
  the role check on top, only for `/users/*`.
  - CORS switched to `credentials: true` (was `origin: true` alone) so
    the cookie survives the web app and API being on different
    origins/ports; the frontend's `fetch` calls now send
    `credentials: 'include'`.
- Self-service `POST /auth/change-password` (any logged-in user, own
  account only) — the only way to change a password once
  `ADMIN_USERNAME`/`ADMIN_PASSWORD` created an account; no admin-side
  "reset a user's password" yet.

**Consequence:** every route in the app now requires a session except
`/health` and the login page itself — deploying without
`ADMIN_USERNAME`/`ADMIN_PASSWORD`/`SESSION_SECRET` set locks everyone
out (by design, fails closed). Losing/rotating `SESSION_SECRET` logs
every user out; that's an accepted, documented consequence, not a bug.

**Incident and fix (2026-09-15, same day):** the first version used
`@fastify/secure-session`, which depends on `sodium-native` for its
sealed-cookie encryption — a native addon shipped as prebuilt
platform binaries. In production the API container crash-looped on
every start:

```
Error: Cannot find addon '.' imported from
'file:///app/node_modules/sodium-native/binding.js'
```

`sodium-native`'s prebuilds don't cover `linux-x64-musl`
(`node:24-alpine`, this project's base image, D-016's same musl-vs-glibc
class of gotcha as `better-sqlite3`). The container kept restarting,
nginx kept serving the last built frontend, and the browser saw
"Failed to fetch" — nothing pointed at the real cause except the
container logs.

Fixed by dropping `@fastify/secure-session` entirely for a signed (not
encrypted) cookie built on `node:crypto` alone (`apps/api/src/auth/
session.ts`): `"<base64url payload>.<hmac-sha256 hex>"`, verified with
`timingSafeEqual`. `@fastify/cookie` (pure JS, `cookie` + `fastify-
plugin` as its only deps) replaces `@fastify/secure-session` for
parsing/setting the cookie itself. The session payload (`{id, username,
role}`) has nothing secret in it, so signed-but-readable is an
acceptable trade for "the client can't forge or alter it" — the same
reasoning that keeps this project off native dependencies everywhere
else (`node:sqlite` over `better-sqlite3`, D-016; `node:crypto` scrypt
over `bcrypt`/`argon2` for passwords, this same D-026).

**Second, unrelated fault found while verifying the fix above:** after
redeploying the code fix, `/health` itself timed out
(`ERR_CONNECTION_TIMED_OUT`) — a pure networking failure, not an app
error. `docker inspect` on the `api` container showed
`NetworkSettings.Ports: {}`: no host port bound at all, despite
`docker-compose.yml` declaring `ports: "${API_PORT:-3000}:3000"` and
`API_PORT=3000` being set correctly in the stack's environment
variables. Portainer's "Update the stack" had rebuilt the image but not
recreated the container with the port mapping applied. Fixed by forcing
a full stack redeploy (re-pull + recreate, not just a container
restart/rebuild) — confirmed via `docker inspect` showing the correct
`PortBindings` afterward, then `/health` and login both working.
**Lesson:** after any `docker-compose.yml` change touching `ports:`,
verify the running container's actual port binding (`docker inspect`,
or just try reaching the port) — a partial Portainer stack update can
rebuild the image while silently leaving the old container's network
config in place.

**Follow-up (2026-09-17): cross-origin cookie broke on any access path
other than the LAN IP.** `cookie.secure: false` was already documented
above as LAN-only; the same fixed LAN IP baked into the *frontend's* API
address (`docker-compose.yml`'s `API_URL`, written into `config.js` by
`apps/web/docker-entrypoint.d/40-scribe-config.sh`, read by
`apps/web/src/api.ts`) turned out to have a second, worse consequence:
`sameSite: 'lax'` cookies are dropped by the browser on cross-*site*
fetches (same IP-different port still counts as same-site; a different
IP, e.g. reaching the app over Tailscale, does not). So login "worked"
(`Login.tsx` sets the user straight from the response body) while every
later authenticated call 401'd invisibly — `CaseSelector.tsx`'s
`Promise.all([...]).then(...)` had no `.catch`, so cases/examples just
showed up empty with no error.

**Fix:** stopped configuring a separate API host at all. `apps/web/
nginx.conf` (new) now reverse-proxies `/api/` to the `api` container
(Compose service-name DNS), and the frontend calls that relative path by
default. The browser only ever talks to the one origin it already used
to load the page, so the session cookie is always same-site regardless
of LAN/Tailscale/whatever address reaches the box — no more per-network
`API_URL` to remember to change. `API_URL` still exists as an explicit
override (R-16) but defaults to `/api` instead of a hardcoded LAN IP.
Also added the missing `.catch` in `CaseSelector.tsx` so an auth/network
failure surfaces a visible error next time, instead of a silent empty
list.

---

## D-027 · 2026-09-29 · accepted
### Case attachments: protest form uploads, own pipeline (not resources.ts)

**Options**
- Reuse the `resource` table/pipeline (`kind`, upload → convert → review
  → accept/reject, FTS indexing)
- A separate, simpler `case_attachment` table: upload → convert → store,
  no review gate, no indexing
- Store the file only, no conversion (defer Markdown conversion to when
  extraction is actually built)
- One attachment per case vs. several

**Decision** (user's explicit call, 2026-09-29)
- New `case_attachment` table (`apps/api/db/schema.sql`), separate from
  `resource`. Case attachments are not one of the three material stores
  (CONTEXT.md §6, D-007): not citable authority, not a style sample, not
  reusable wording — they belong to one case only. Merging them into
  `resource` would blur that distinction for no benefit; `resource`'s
  `kind`/`layer`/`scope` branching and `resource_fts` indexing don't
  apply here at all.
- No review/accept-reject gate, unlike `resource`. A bad conversion of a
  case attachment doesn't cause a wrong citation the way a bad rules
  conversion would (CONTEXT.md §7: "Review matters most in `rules/`"),
  so the extra step buys nothing here.
- **Converted to Markdown on upload anyway**, reusing
  `apps/api/src/resources/convert.ts`'s `convertToMarkdown` unchanged
  (same PDF/`.docx`/`.xlsx`/`.md` support, same "no OCR" rule, D-010) —
  the user's stated reason: smaller footprint than keeping only the
  original, and readable text ready for whenever extraction-to-
  suggestions gets built (not this phase). For a file type the function
  doesn't support (e.g. an image), conversion is skipped instead of
  failing the upload — `markdown_path` stays `NULL`, original still
  stored. The `conversion_empty` flag (`resource`'s "looks like a
  scanned PDF" signal) carries over so the UI can still warn.
- **Several attachments per case**, not one — matches real cases heard
  together with more than one protest form (e.g. the Snipe example in
  `data/examples/own`, Request No. 01 and 02 under one hearing).
- New own tab in the case form, **"0. Protest Form(s)"**, before
  "1. General & Parties" — not a box inside that tab (user's explicit
  call). Upload is immediate on file selection, no queue, no format
  restriction on the `<input>` (any file type accepted, per the user:
  "cualquier formato").
- Table named `case_attachment`, not `protest_form` — leaves room for a
  second attachment kind later (e.g. damage photos) without a schema
  rewrite, same forward-compatible-column pattern as `case_type` ahead
  of redress (D-001). Nothing currently distinguishes attachment kinds;
  every row is a protest form in practice for now.

**Consequence:** `GET /cases/:id/full` now also returns `attachments`
(id, filename, `conversion_empty`, upload date) — one more join, same
shape as `parties`/`witnesses`/etc. New routes:
`POST /cases/:caseId/attachments`, `GET /attachments/:id/file`
(download, original bytes), `DELETE /attachments/:id`. Storage lives at
`data/case_attachments/originals/` (original) and
`data/case_attachments/` (converted `.md`), own directory, not mixed
into `data/rules/` or `data/examples/`.

**Not built yet, by design:** nothing reads the stored Markdown for
suggestions. That's the reason for converting now — so a later phase
can read cheap text instead of re-parsing PDFs — but this phase only
stores and serves the file.

## D-028 · 2026-10-04 · accepted
### Separate UX from programming logic — both as code architecture and as work order

**Options**
- Code architecture only: components stay presentation-only, business
  logic/formatting lives in separate helpers/services (e.g. `format.ts`)
- Work-order only: design the user experience (flow, screens, copy)
  before deciding the implementation, never the reverse
- Both

**Decision** (user's explicit call, 2026-10-04)
- **Both.** Components (`apps/web/src/components/*.tsx`) must not embed
  business logic, calculations, or data formatting — that belongs in a
  separate helper/service (`format.ts` is the existing pattern: pure
  functions like `formatParties`/`formatWitnesses`/`formatJuryMembers`,
  called by components, never duplicated inline). A component's job is
  to render state and dispatch actions; it reads formatted output, it
  doesn't produce it.
- When building a new screen or feature, the UX (what the user sees,
  the flow, the copy) is defined first, as part of the spec
  (`specs/SPEC-NNN-*.md`'s Requisitos/Intención), before any
  implementation plan commits to a data model or endpoint shape. This
  was already the de facto order for SPEC-001/002 (requirements →
  plan → tasks); this decision makes it an explicit, named principle
  instead of an unstated habit.
- Applies going forward, not retroactively: existing components with
  inline formatting (if any slipped through before `format.ts`
  existed) are not an automatic refactor target — flagged only if
  touched for another reason.

**Consequence:** added to `constitution.md` → Principios, as a rule
future specs and code reviews can cite by name.

## D-029 · 2026-10-05 · accepted
### Internal coherence: presentation mode and suggestion sources stay uniform within a tab

**Options**
- No explicit rule — let each tab's presentation and suggestion
  sources be decided case by case, as specs have done so far
- Name two coherence rules explicitly, as a principle future specs
  must satisfy or consciously override

**Decision** (user's explicit call, 2026-10-05)

**Both.** Two coherence rules, named so a spec/review can cite them
instead of re-deriving the reasoning each time:

1. **One presentation mode per tab.** If a tab presents its
   information as a form (labeled inputs the user fills in), every
   field on that tab is a form field — not a mix of form inputs and
   free-text/document-style boxes within the same tab. Named because
   the owner flagged it applies to "1. General & Parties": the
   "General" section (Case number/Day/Race/With case(s), SPEC-010) is
   a plain form, while "Parties & Witness" renders inside a `CopyBox`
   (the same wrapper used for the four free-text document boxes) even
   though its content is also form inputs, not free text. Whether
   that is actually an inconsistency to fix, or a legitimate
   difference (Parties & Witness is one of the eight fixed document
   boxes and genuinely needs its own "Copy" button; "General" is case
   metadata, not a document box, and has none) is left for the spec
   that addresses this to work out — this decision only establishes
   the rule, not the fix.
2. **Suggestion sources available on one writing-box tab are
   available on all of them.** If a writing-box tab's suggestions
   panel can offer a given *kind* of source (Phrases, AI suggestions
   from examples, a protest-form candidate paragraph/lines), that kind
   of source should be offered — even if empty — on Procedural
   Matters, Facts Found, Conclusion, and Decision alike, not present
   on three and silently absent on the fourth. Concrete known gap:
   Decision has no protest-form candidate source at all (SPEC-008
   scoped it out explicitly: "casi siempre vacío... no se conecta
   aquí"), while Procedural Matters/Facts Found/Conclusion all have
   one. This rule does **not** cover the always-visible read-only
   reference lists (`PartyReference.tsx` — initiator/respondent/race
   highlighting in Facts Found and Decision, SPEC-006/SPEC-008): those
   are explicitly not suggestions (never insert, never click-to-apply,
   D-004/SPEC-008 RF-004) and sit outside this rule by design.

**Consequence:** added to `constitution.md` → Principios, as a rule
future specs and code reviews can cite by name. Applies going forward
— like D-028, not a mandate to retrofit every existing tab in this
same change; a spec that touches "1. General & Parties" or any of the
four writing-box tabs should check against these two rules and either
satisfy them or note explicitly why not.

## D-030 · 2026-10-13 · accepted

**Context:** SPEC-020 (fase F2 del replanteo de `issue.md`). El dueño
explicó que, en Procedural Matters, Facts Found y Conclusion, al juez no
le importa de dónde viene una sugerencia; le importa poder pasarla al
cuadro principal fácilmente. El panel lateral repartía las sugerencias en
secciones plegables por origen (Protest form, Hearing notes, Phrases, AI
suggestions) con botones distintos según la sección.

**Decision:** el panel por secciones se sustituye por una **lista única
uniforme** por caja (`SuggestionList`): siempre visible, botones iguales
que muestran el texto que se insertará (recortado a 3 líneas, completo
en el tooltip), sin marca de origen. Por defecto solo lo derivado del
caso (formulario, luego notas); las frases aparecen al buscar o con
"Browse phrases"; las sugerencias desde ejemplos, con el botón explícito
"Suggest from examples" (caché por caja en un hook). Se corrige además
`GET /phrases/search` para filtrar por caja antes del `LIMIT`.
`SuggestionsPanel`, `PhrasePicker` y `ExamplePhraseSuggestions` se
eliminan; `AIDraftPanel` se conserva sin montar hasta F4/F6.

**Alternatives considered:** mantener las secciones con botones
uniformes; lista mezclada con marca de origen; listar todas las frases
por defecto.

**Consequences:** una pulsación más para ver frases. `AIDraftPanel`
queda sin uso en la UI hasta F4/F6. D-029 no cambia (describe fuentes
uniformes, no secciones) y `constitution.md` tampoco: las fuentes que
nombra siguen existiendo, solo desaparece su presentación en secciones.
Sustituye el diseño de secciones de SPEC-001/005/017.

## D-031 · 2026-10-14 · accepted

**Context:** el menú superior tenía una entrada "Jury" (`JuryPanel.tsx`,
D-018/SPEC-009) para gestionar la lista de jueces del evento. Desde
SPEC-009 el jurado de cada caso se elige en la propia pantalla del caso
(`JurySlots`), que además permite añadir un juez nuevo al evento
(`createJuryMember`) al asignarlo. El dueño indica que la entrada de menú
"Jury" ya no tiene sentido.

**Decision:** se quita la entrada "Jury" del menú superior y se borra
`JuryPanel.tsx`. La lista de jueces del evento se sigue alimentando desde
`JurySlots` en cada caso. Sustituye lo dicho en D-018 sobre la "utilidad
Jury en el menú superior"; no cambia el modelo de datos de D-021 (pool del
evento + jurado por caso).

**Alternatives considered:** dejar la entrada (rechazada: redundante);
moverla a la pantalla del caso (no necesario, `JurySlots` ya cubre el
alta).

**Consequences:** ya no hay pantalla para **quitar** un juez del pool del
evento (`deleteJuryMember` queda en `api.ts` sin uso en la UI). Si hace
falta, se añade en `JurySlots` en una spec futura. Los jueces del pool ya
asignados a casos no se ven afectados.

## D-032 · 2026-10-14 · accepted

**Context:** SPEC-023. Rules Applicable era una lista de citas
(`case_rule_citation`, D-014) sin cuadro de texto; las otras cuatro
cajas son cuadros de redacción con sugerencias al lado. El dueño pide
que Rules Applicable sea una caja más: sugerencias del sistema a la
izquierda, cuadro de texto a la derecha (con texto fantasma), y el cuadro
también en la pestaña Review entre Conclusion y Decision.

**Decision:** se añade `protest_case.rules_applicable` (texto), guardado
con el Save único (SPEC-014). La tabla `case_rule_citation` se conserva
como **registro de citas** (alta y baja instantáneas). El documento
(Copy, Download) sale del texto del cuadro; si está vacío y el caso tiene
citas, sigue saliendo la lista de citas (casos anteriores, sin migración).
Si hay texto y alguna cita registrada no aparece en él, la pestaña lo avisa
y ofrece "Insert missing". El texto fantasma en esta caja usa un prompt
propio que **nunca escribe números de regla ni prefijos**, con un filtro
determinista en el servidor que descarta cualquier sugerencia con dígitos
o con RRS/NoR/SI/CR.

**Alternatives considered:** cuadro derivado de solo lectura (opción B del
dueño, descartada); fallback sin aviso (descartado: perdía reglas en
silencio al empezar a escribir); ampliar `PhraseBox` y la tabla `phrase`
(requiere recrear la tabla por su `CHECK`; fuera de alcance).

**Consequences:** sustituye parcialmente a D-014 (la tabla sigue, ahora
junto a una columna de texto). Es una **excepción a "solo cuatro cajas"**
de `CLAUDE.md` y `constitution.md`, cuyo texto no se ha modificado (lo
actualizará el dueño si quiere). Excepción conocida a D-029 regla 1 (la
pestaña mezcla caja de documento y controles de alta, como ya admitía
SPEC-021). Tensión con D-004: lo que se teclea en el cuadro no se valida
contra el corpus; SPEC-022 valida lo que se añade al registro, y la
validación de las referencias escritas a mano queda para una fase
posterior (F6). SPEC-014 RF-006 se conserva solo para las citas del
registro. `draft.ts` ignora el texto del cuadro a propósito (el panel de
borrador no está montado, D-030). No edita D-004.

## D-033 · 2026-10-14 · accepted

**Context:** SPEC-020, SPEC-021, SPEC-023 y D-030 a D-032 cambian el
modelo descrito en `CLAUDE.md` y `constitution.md` (lista única de
sugerencias, Rules Applicable como quinta caja de redacción con registro
de citas, menú "Jury" quitado). D-032 dejó pendiente actualizar ambos
textos; el dueño lo ordena el 2026-10-14.

**Decision:** `CLAUDE.md` se actualiza en sitio (cinco cajas, mecanismos de
sugerencia, tabla de fases con la fila 5.7, método SDD y pestañas del
caso). `constitution.md`, que es append-only, **no se edita**: se añade una
sección "Enmiendas" con una entrada fechada que sustituye explícitamente lo
que cambia (cuatro pestañas de redacción → cinco, presentación por
secciones, tensión con D-004, menú Jury, cuenta de decisiones).

**Alternatives considered:** editar el texto de `constitution.md` en sitio
(rechazada: viola su propia regla de append-only); no actualizarlos y
dejar solo D-032 (rechazada: dejaba la documentación contradictoria).

**Consequences:** `CLAUDE.md` y `constitution.md` coinciden con el código
desplegado. La decisión de citas de SPEC-022 pasa a ser D-034. ISS-012 de
`issue.md` queda resuelto.

## D-035 · 2026-10-14 · accepted

**Context:** ISS-006. `CaseForm.tsx` tenía 1091 líneas: estado del caso,
carga, refrescos parciales, guardado, procesado de notas y adjuntos, y el
JSX de nueve pestañas, sin suite de tests. Cada spec reciente lo tocaba y el
riesgo de regresión crecía.

**Decision:** refactor puro (SPEC-024), en pasos pequeños con un commit y un
redeploy por paso, comparando el DOM renderizado antes y después. Reglas:
sin cambio observable (mismo DOM, textos, clases y comentarios movidos tal
cual); **el estado se queda en `CaseForm`**, incluido el estado efímero de
los formularios inline y de subida (hoy sobrevive al cambio de pestaña);
componentes a nivel de módulo (si no, se remontarían y romperían el texto
fantasma y el foco); `CaseForm` pinta `div.tab-panel`; los refrescos
parciales siguen siendo parciales. Resultado: `TabBar`/`caseTabs`,
`caseDrafts`, `refreshCasePart`, `ReviewTab`, `GeneralTab`, `AttachmentsTab`,
`PartiesTab` y `WritingBox` (compartido por las cinco cajas de redacción).
`CaseForm.tsx`: 758 líneas.

**Alternatives considered:** mover también el estado de formularios a cada
pestaña (rechazada: cambiaba el comportamiento al cambiar de pestaña);
extraer cada pestaña de redacción como componente propio (rechazada: lo único
que comparten es `WritingBox`, y las diferencias se quedan en línea); hooks
`useNotesExtraction`/`useCaseSave` (aplazada: riesgo alto por los cierres
sobre estado, solo a petición).

**Consequences:** SPEC-022 (F1) y futuras specs tocan `RulesSuggestions`,
`WritingBox` o la pestaña concreta, no un fichero de 1000 líneas. Método de
verificación reutilizable para refactors sin tests: hash de `innerHTML` por
pestaña sobre dos casos de prueba, más comprobaciones de comportamiento en
vivo. La decisión de citas de SPEC-022 sigue siendo D-034.

## D-034 · 2026-10-14 · accepted

**Context:** ISS-002. Una cita nacía de texto libre sin validar y el buscador
del corpus indexaba documentos enteros (un resultado era "RRS Parts +
fragmento", sin número de regla ni botón). `draft.ts` validaba por subcadena
(`4` pasaba si existía `44`). El dueño pidió que la cita nazca de elegir una
regla del corpus, con siempre el mismo formato, y que no se pueda citar lo
que no está en las reglas subidas (D-004).

**Decision:** SPEC-022.
- **Índice por regla:** tablas `rule_section` y `rule_section_fts` (id
  `AUTOINCREMENT`). Un parser puro (`resources/ruleSections.ts`) parte el
  Markdown de cada documento de reglas aceptado en secciones numeradas, con
  dos estilos de cabecera (tabulador para el RRS, espacio para NoR/SI), filtros
  de ruido, primera aparición gana por (número, parte) y noción de **parte**
  (Appendix del RRS, Addendum de NoR/SI). Se indexa al aceptar, al
  reclasificar y al arrancar (idempotente, por recurso, sin fallar nunca).
- **Cita canónica** (un solo módulo, `rules/citation.ts`): `RRS 44.2`,
  `CR …`, `NoR 1.9`, `SI 12`; con parte cuando haría falta (`SI Addendum E
  2.14`, `RRS Appendix B 44`; los números nativos de un apéndice, `RRS A2.1`,
  no la llevan). La etiqueta solo depende de los campos de la sección, nunca
  del estado del corpus. `resource.doc_type` (`nor | si | si_amendment`, solo
  capa `event`) fija el prefijo; se elige al subir y se cambia al
  reclasificar (que gana capa, regata y tipo).
- **Validación en el servidor:** `POST /rule-citations` es una ruta propia
  (`text` o `section_id`); el `POST` y el `PUT` genéricos se desactivan
  (`skipCreate`/`skipUpdate`, nuevos en `crud.ts`). Solo se acepta lo que
  resuelve a una sección de un recurso aceptado y, para NoR/SI, del evento del
  caso. Texto libre fuera del corpus: **rechazado**. Sin prefijo se asume RRS
  solo si el número existe en el cuerpo principal del RRS. Duplicados por
  forma canónica. El botón "Add" registra la cita **y** la escribe en el
  cuadro de Rules Applicable (D-032) en un clic.
- **`draft.ts`:** `extractCitations` reconoce `RRS|Rule|NoR|CR|SI` (los tres
  últimos solo en forma canónica) con parte; `validateCitations` y el
  excerpt consultan `rule_section` por prefijo, evento y número exacto.
- **Citas antiguas:** no se migran ni se marcan. Las escribió el propio juez,
  siguen en el documento y el borrador, sin texto en el corpus, dice "text not
  found" sin inventar.

**Alternatives considered:** solo número con comprobación (rechazada: no da
botón ni formato único); bloquear los números repetidos de Appendix/Addendum
(rechazada: se citan con la parte); primera aparición citable (rechazada:
ambigua); texto libre con marca "unverified" (rechazada por el dueño: D-004
estricto); migrar las citas viejas (rechazada por el dueño).

**Consequences:** sustituye el diseño por documento de D-011/D-020 **en lo
que respecta a citas** (el índice por documento sigue en `resource_fts` para
documentos sin secciones). No edita D-004: lo cumple en el servidor. El
arranque añade dos columnas a `resource` y rellena el índice, así que antes
del redeploy conviene copiar `data/db`; después hay que reclasificar el NoR y
las SI de París (subidos con capa `rrs`) a `event` con su tipo (ISS-013). El
índice habilita F5 (reglas sugeridas desde Facts Found). Cases, Calls y
apelaciones (capa 5) siguen sin capa ni cita.

## D-036 · 2026-10-14 · accepted

**Context:** F3 del replanteo (ISS-010 y `issue.md`). 160 de las 333 frases
base traen huecos entre corchetes (`[##]`, `[injury]`, `[insert name]`) y X/Y
como etiquetas de las partes, pero se insertaban literales y al final del
cuadro; el texto fantasma no usaba la librería (solo número de vela e IA).

**Decision:** SPEC-025. Un hueco es un corchete equilibrado del nivel exterior
(anidados dentro; un `[` sin pareja es texto) y **cada corchete es un hueco
propio, también los pegados**: las alternativas (`[injury] [serious damage]`)
las borra o las deja el escribano. Los paréntesis no son huecos. Una frase de
la librería se inserta **en el cursor** (al final como antes si el cuadro nunca
tuvo el foco) y abre una sesión sobre el texto insertado: el primer hueco queda
seleccionado, Tab / Shift+Tab los recorren y Escape la cierra. **X e Y** (sueltas
o `[X]`/`[Y]`, un `[X] [Y]` pegado es un grupo) no son paradas de Tab: una barra
de partes bajo el cuadro ofrece los barcos del caso y un clic sustituye todas
las apariciones; no se asume qué parte es iniciador o respondido. El texto
fantasma propone primero el resto de una frase de la librería por prefijo del
último párrafo (mínimo 12 caracteres, la más corta; comparación en el cliente,
sin llamada de red), después el número de vela y la IA como hasta ahora.
Rules Applicable no cambia.

**Alternatives considered:** formulario previo por hueco (rechazada: más clics y
se pierde el contexto); relleno automático de X=iniciador, Y=respondido
(rechazada: X/Y son etiquetas genéricas, y se equivocaría sin avisar); Tab por
cada X/Y suelta (rechazada: hasta 7 paradas inútiles por frase); alternativas
pegadas como un solo hueco (rechazada por el dueño); ruta `GET
/phrases/complete` por pulsación (rechazada: no es offline y añade red a cada
tecla).

**Consequences:** **los huecos sin rellenar no se avisan al copiar ni al
descargar**: un `[##]` puede llegar al documento final (fallo silencioso
conocido, se aborda en F6 con un aviso). La inserción hecha por la aplicación
no entra en el historial de deshacer del navegador. No se tocan el esquema ni
la API. Sustituye en lo necesario el "frases con huecos" de `CLAUDE.md`, sin
editarlo.

## D-037 · 2026-10-14 · accepted

**Aviso de huecos sin rellenar (SPEC-026, F6 primer trozo).** Cada caja de
redacción muestra, bajo su cabecera (visible también colapsada), una línea
"N gaps, M party labels (X/Y) still to fill" cuando el texto que escribió el
juez aún tiene `[huecos]` o etiquetas `X`/`Y` (misma definición que SPEC-025, una
sola función). El resumen aparece arriba de la pestaña Review y Download pide
una confirmación con el recuento por caja. **Avisa, no bloquea**: el humano
decide. Rules Applicable se analiza solo por el texto de su caja (la lista de
citas viene del corpus); Parties no se analiza. Cierra la consecuencia abierta
en D-036.

**Alternatives considered:** bloquear Download con pendientes (rechazada: impide
sacar un borrador a propósito); marcar los huecos dentro del cuadro (rechazada:
complica el cuadro de texto plano); avisar solo al descargar (rechazada: Copy
por caja es el camino más usado).

**Consequences:** falsos positivos posibles (`[sic]`, una `X`/`Y` escrita a
propósito) que solo informan. Solo cliente; sin cambios de API ni de datos.

## D-038 · 2026-10-14 · accepted

**Reglas sugeridas desde Facts Found (SPEC-027, F5).** Un botón "Suggest from
Facts Found" en Rules Applicable envía el texto de la caja en pantalla a
`POST /rules/suggest`, que busca en el índice por regla de SPEC-022 (FTS5,
`bm25` con el encabezado pesando 5 veces el cuerpo) y devuelve hasta 8 reglas
con el mismo Add validado. Es **determinista**: sin IA, sin red y sin coste.
Los términos se reducen con un stemming simple (`-ing`, `-ed`, `-es`, `-s`) y
se buscan como prefijo, porque los hechos van en pasado y las reglas en
presente y el índice no tiene stemming; se descartan palabras vacías y el
vocabulario omnipresente (`boat`, `race`, `rule`, `rrs`…). Un número escrito
en los hechos con prefijo ("RRS 14", "rule 10") sale primero. Las variantes
de apéndice del RRS van detrás de las reglas principales y se omiten si la
principal con el mismo número ya está. Solo Facts Found es fuente (lo
probado); nada se inserta sin un clic.

**Alternatives considered:** IA que decida qué regla aplica (rechazada por
ahora: puede equivocarse con convicción, principio de orden del proyecto; la
búsqueda determinista primero); sugerir al teclear Facts Found (rechazada:
ruido y llamadas continuas; botón explícito); hearing notes y formulario de
protesta como fuentes (rechazada: no son lo probado); cambiar el índice a
stemming de FTS5 `porter` (rechazada: migración de esquema y reindexado para
un aviso aproximado).

**Consequences:** es una ayuda aproximada, con ruido (una frase floja trae
reglas de relleno): la ayuda lo dice y el juez decide. Sin cambios de
esquema. Reutiliza `RuleHitList` (extraído de `RulePicker`).

## D-039 · 2026-10-14 · accepted

**Validar las referencias tecleadas en Rules Applicable (SPEC-028, F6).** Una
cita añadida con Add ya está validada contra el corpus (SPEC-022), pero la caja
es texto libre. `POST /rules/check` extrae del texto en pantalla las
referencias con prefijo ("RRS 44.2", "rule 14", "NoR 1.9", "SI 12"), con la
misma `explicitRefs` de SPEC-027, y devuelve las que no resuelven a ninguna
sección elegible del caso; `RulesSuggestions` muestra "Not found in the loaded
rules: …" con debounce de 500 ms. **Avisa, no bloquea ni edita.** Años
(`RRS 2021`) y texto que `parseCitation` no entiende se ignoran; se deduplica
por forma canónica.

**Alternatives considered:** bloquear Save o Download con referencias sin
resolver (rechazada: el juez puede citar algo que el corpus aún no tiene);
validar en el cliente (rechazada: el índice y la elegibilidad por evento viven
en el servidor); extender la extracción a listas y rangos (rechazada por ahora:
`explicitRefs` es compartida con F5 y los casos son raros).

**Consequences:** límites aceptados: `RULE 14` en mayúsculas, `Rules 10`,
listas, rangos y referencias con parte (`RRS Appendix B 44`) no se comprueban;
solo los primeros 8000 caracteres; un documento de evento sin clasificar no
resuelve NoR ni SI. Cargar un documento se refleja al reabrir la pestaña. Solo
Rules Applicable, sin cambios de esquema.

## D-040 · 2026-10-14 · accepted

**Aviso de desfase entre cajas (SPEC-029, F6).** La decisión es una cadena
(Facts Found → Rules Applicable → Conclusion → Decision). El servidor guarda
cuándo cambió cada caja de la cadena: cuatro columnas aditivas
`facts_found_at`, `rules_applicable_at`, `conclusion_at`, `decision_at` en
`protest_case`, puestas por el PUT genérico de `cases` solo cuando el valor
recibido difiere del guardado (`stampOnChange`), y a NULL si la caja se vacía.
Una caja avisa ("X changed after this box was last edited") cuando una caja
anterior de la cadena tiene una marca estrictamente posterior; "Mark as
reviewed" (`POST /cases/:id/box-reviewed`) sube la marca sin tocar el texto.
**Avisa, no bloquea**; solo cuenta lo guardado.

**Alternatives considered:** una sola marca de Facts Found más una "revisada"
por caja (rechazada: pierde las dependencias intermedias); comparar el texto
en el cliente contra una copia al cargar (rechazada: no sabe el orden de
edición entre sesiones); bloquear Download (rechazada, como D-037).

**Consequences:** límites aceptados: las altas y bajas de citas registradas
no mueven `rules_applicable_at`; un Save desde una pestaña con texto viejo
marca esa caja como cambiada; falsos avisos por cambios menores se descartan
con el botón; resolución de un segundo; los casos existentes no avisan hasta
que se editan. Migración aditiva e idempotente.

## D-041 · 2026-10-14 · accepted

**El texto fantasma de IA ve las cajas anteriores (SPEC-030, F6).** Amplía
D-025, que solo daba al modelo el final de la caja que se escribe. Ahora
`POST /cases/:id/complete` acepta `context` con las cajas anteriores de la
cadena, solo como datos de lectura: Rules Applicable ve Facts Found;
Conclusion ve Facts Found y Rules Applicable; Decision ve además Conclusion.
El servidor aplica la tabla (ignora otras claves, valores no cadena y
cualquier `context` que no sea un objeto simple), conserva los primeros 1500
caracteres de cada caja de contexto, quita del contexto las marcas del mensaje
y declara en el prompt que el contexto son datos y no instrucciones. Para Rules
Applicable se quitan los **dígitos** de Facts Found antes de enviarlo y el
prompt prohíbe nombrar reglas, en cifras o en palabras; el filtro de salida de
dígitos y prefijos se mantiene (D-004). En Conclusion y Decision solo puede
aparecer una referencia de regla que ya esté en las cajas anteriores o en el
texto dado. El cliente lee el contexto de una referencia al disparar la
petición, así que un cambio de contexto no relanza llamadas.

**Alternatives considered:** dar al modelo los hechos del caso desde la base de
datos (rechazada: ignora el texto sin guardar y obliga a leer la BD en cada
pausa); contexto en todas las cajas, incluida Facts Found (rechazada: no hay
cajas anteriores en la cadena); prompt caching del contexto (rechazada por
ahora: el contexto cambia con cada edición); enviar el contexto completo sin
tope (rechazada: coste en una llamada que se dispara al teclear).

**Consequences:** más entrada por llamada (hasta 4 × 1500 caracteres en
Decision) en un modelo barato (Haiku). Límites aceptados: una regla nombrada en
palabras en Rules Applicable puede pasar el filtro (se acepta con Tab y no
queda registrada); el fantasma ya visible puede quedar obsoleto si cambia una
caja anterior; el contexto no se valida contra el corpus, pero SPEC-028 avisa
de referencias que no existen. Sin cambios de esquema.

## D-042 · 2026-10-14 · accepted

**La IA rellena solo los huecos de datos de las frases (SPEC-031, F4).** Un
botón "Fill data gaps with AI" en las cuatro cajas de frases pide a la IA un
valor para cada hueco **de datos** (`[##]`, `[race ##]`, `[date]`, `[time]`…),
con su fuente y una cita literal; el juez acepta o descarta cada valor con la
cita a la vista. La librería real mostró que casi todos los huecos son
**alternativas** (233 de 498, pegados a otro: `[injury] [serious damage]`) u
opciones de redacción; elegir entre ellos es una decisión del juez y la
herramienta no decide nada, así que **nunca se ofrecen**. Solo 30 de 333 frases
tienen huecos de datos. La defensa contra el invento es **determinista**, no el
prompt: el servidor descarta toda propuesta cuya cita no aparezca literalmente
en la fuente que vio el modelo, cuyo valor no esté contenido en la cita, o que
contenga una referencia de regla o las palabras rule/RRS/NoR/SI/CR (D-004).
Fuentes: hearing notes y Facts Found en pantalla, partes, testigos y
formularios de protesta convertidos del caso. Aceptar comprueba que el hueco
sigue siendo el mismo (texto y contexto) y escribe por el mango de la caja,
que cierra la sesión de Tab; "Accept all" valida contra el texto original y
aplica de atrás hacia delante.

**Alternatives considered:** elegir también entre alternativas (rechazada: es
la decisión del juez); rellenar todos los huecos de golpe y deshacer
(rechazada por el dueño: aceptar uno a uno con vista previa); avisar de lo que
ninguna frase cubre (descartada por el dueño); rellenar de forma determinista
los datos que la app ya conoce (parcialmente: los datos del caso van como
fuente `case_data`, y las X/Y siguen en la barra de partes).

**Consequences:** alcance estrecho a propósito (unas 9 % de las frases); una
llamada de Sonnet por clic, acotada (hasta unos 17 000 caracteres de fuentes,
20 huecos). El valor sale literal de la fuente y el juez lo ve con su cita,
pero eso no garantiza que sea el dato correcto para ese hueco. Datos de partes,
testigos y formularios se envían al modelo como ya hacen la extracción de
adjuntos y de notas. Sin cambios de esquema.

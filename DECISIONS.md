# Scribe Helper — Decision Log

> Every significant decision, with the alternatives that were on the table
> and the reason one was chosen. This exists because in six months nobody
> remembers what problem a decision was solving, and undoing a decision
> without knowing its reason is how projects break.
>
> **Append only.** To change a decision, add a new entry that supersedes
> the old one. Do not edit history.

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

## Open questions

Not yet decided. Listed so they are not silently forgotten.

- **Conversion library** for PDF, Word and Excel to Markdown. Phase 3.
- **Model assignment.** Current intent: a fast, cheap model for inline
  completion; a stronger one for the draft panel; prompt caching for the
  corpus and system prompt. Verify current model names and pricing against
  Anthropic's documentation at the time of implementation rather than
  relying on memory.
- **Network exposure** of the deployed instance: local network only, or
  reachable from outside. Phase 5.5.

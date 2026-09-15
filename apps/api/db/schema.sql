-- Scribe Helper — SQLite schema
-- Phase 1. See DECISIONS.md D-011, D-001, and CONTEXT.md section 4.

PRAGMA foreign_keys = ON;

-- Reusable across roles: witness, representative, jury member.
-- Entered once, never retyped (CONTEXT.md section 1).
CREATE TABLE IF NOT EXISTS person (
  id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  venue TEXT,
  start_date TEXT,
  end_date TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Panel chairman and jury members belong to the event, not the case
-- (CONTEXT.md section 4).
CREATE TABLE IF NOT EXISTS jury_member (
  id INTEGER PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  person_id INTEGER NOT NULL REFERENCES person(id),
  is_chairman INTEGER NOT NULL DEFAULT 0 CHECK (is_chairman IN (0, 1)),
  UNIQUE (event_id, person_id)
);

-- Reusable across cases and events. Not scoped to an event: the same
-- boat can appear at more than one regatta.
CREATE TABLE IF NOT EXISTS boat (
  id INTEGER PRIMARY KEY,
  sail_number TEXT NOT NULL,
  boat_name TEXT,
  UNIQUE (sail_number, boat_name)
);

CREATE TABLE IF NOT EXISTS protest_case (
  id INTEGER PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  case_number TEXT NOT NULL,

  -- v1 covers protests only (DECISIONS.md D-001). This column exists so
  -- redress can be added later without a schema rewrite; nothing beyond
  -- the column is built now.
  case_type TEXT NOT NULL DEFAULT 'protest' CHECK (case_type IN ('protest', 'redress')),

  day TEXT,
  race TEXT,
  informed_at TEXT, -- date and time parties were informed, event timezone (RULES.md R-20)

  -- The four human-written boxes (CONTEXT.md section 4).
  procedural_matters TEXT NOT NULL DEFAULT '',
  facts_found TEXT NOT NULL DEFAULT '',
  conclusion TEXT NOT NULL DEFAULT '',
  decision TEXT NOT NULL DEFAULT '',

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (event_id, case_number)
);

-- "With Case(s)" — links between cases heard together. Symmetric by
-- convention: the API writes both directions, or reads treat the pair
-- as unordered. Self-referencing, not a fixed pair, so more than two
-- cases can be linked.
CREATE TABLE IF NOT EXISTS case_link (
  case_id INTEGER NOT NULL REFERENCES protest_case(id) ON DELETE CASCADE,
  linked_case_id INTEGER NOT NULL REFERENCES protest_case(id) ON DELETE CASCADE,
  PRIMARY KEY (case_id, linked_case_id),
  CHECK (case_id != linked_case_id)
);

-- Initiator or respondent. One row per party per case.
CREATE TABLE IF NOT EXISTS party (
  id INTEGER PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES protest_case(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('initiator', 'respondent')),
  boat_id INTEGER REFERENCES boat(id),
  represented_by_id INTEGER REFERENCES person(id)
);

CREATE TABLE IF NOT EXISTS witness (
  id INTEGER PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES protest_case(id) ON DELETE CASCADE,
  person_id INTEGER NOT NULL REFERENCES person(id),
  role TEXT
);

-- Rules Applicable: written by the human, one citation per row, free
-- text in Phase 1. Phase 3 adds validation against the rules corpus
-- and a picker UI without changing this table (additive, same pattern
-- as case_type above for redress).
CREATE TABLE IF NOT EXISTS case_rule_citation (
  id INTEGER PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES protest_case(id) ON DELETE CASCADE,
  rule_reference TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_jury_member_event ON jury_member(event_id);
CREATE INDEX IF NOT EXISTS idx_case_event ON protest_case(event_id);
CREATE INDEX IF NOT EXISTS idx_party_case ON party(case_id);
CREATE INDEX IF NOT EXISTS idx_witness_case ON witness(case_id);
CREATE INDEX IF NOT EXISTS idx_case_rule_citation_case ON case_rule_citation(case_id);

-- Phase 3: uploaded material (CONTEXT.md sections 6-7). Two kinds, never
-- merged (D-007): rules (authority, layered) and examples (style only,
-- never cited). Same ingestion flow for both (D-009, D-018-followup):
-- upload original -> convert to .md -> user reviews -> accept (keep both
-- files) or reject (delete both, no orphans).
CREATE TABLE IF NOT EXISTS resource (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('rule', 'example')),

  -- Layer precedence for rules (CONTEXT.md section 6): rrs < class < event.
  -- NULL when kind = 'example'.
  layer TEXT CHECK (layer IN ('rrs', 'class', 'event')),
  -- 'event' layer rules (NoR/SIs/amendments) belong to one regatta and are
  -- replaced every event; NULL for 'rrs'/'class' (permanent, global).
  event_id INTEGER REFERENCES event(id) ON DELETE CASCADE,

  -- Example scope (CONTEXT.md section 6): base ships with the project and
  -- is not user-editable/deletable; own is uploaded by the user. NULL when
  -- kind = 'rule'.
  scope TEXT CHECK (scope IN ('base', 'own')),

  title TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  original_path TEXT NOT NULL, -- data/originals/<uuid>.<ext>, kept next to the .md always
  markdown_path TEXT, -- data/rules/<layer>/... or data/examples/<scope>/..., set once converted

  -- pending_review: converted, awaiting accept/reject.
  -- accepted: both files kept, indexed in resource_fts if kind = 'rule'.
  -- rejected is not stored here — reject deletes both files and this row
  -- (CONTEXT.md section 7: "no orphans"), so only these two states persist.
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'accepted')),
  -- Conversion produced an empty or near-empty result — the scanned-PDF
  -- warning (CONTEXT.md section 7), surfaced at review regardless of status.
  conversion_empty INTEGER NOT NULL DEFAULT 0 CHECK (conversion_empty IN (0, 1)),

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,

  CHECK (
    (kind = 'rule' AND layer IS NOT NULL AND scope IS NULL) OR
    (kind = 'example' AND scope IS NOT NULL AND layer IS NULL)
  ),
  CHECK ((layer = 'event') = (event_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_resource_kind_status ON resource(kind, status);
CREATE INDEX IF NOT EXISTS idx_resource_event ON resource(event_id);

-- Search over accepted rules only (D-011: FTS5, no vector DB — the RRS is
-- numbered/structured, keyword search is more precise and cheaper here).
-- Examples are never cited, so they are not indexed for the rule picker.
-- External-content-free (stores its own copy of title/body) because the
-- source of truth is the .md file on disk, not the database; resource_id
-- is UNINDEXED so it comes back with every match without being searched.
CREATE VIRTUAL TABLE IF NOT EXISTS resource_fts USING fts5(
  title,
  body,
  resource_id UNINDEXED,
  tokenize = 'porter unicode61'
);

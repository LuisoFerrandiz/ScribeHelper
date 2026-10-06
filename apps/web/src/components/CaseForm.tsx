import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { api } from '../api';
import { CopyBox } from './CopyBox';
import { GhostTextarea } from './GhostTextarea';
import { JurySlots } from './JurySlots';
import { SuggestionsPanel } from './SuggestionsPanel';
import {
  buildDecisionFilename,
  formatAutoProceduralLines,
  formatBoat,
  formatFullDecisionHtml,
  formatParties,
  formatRulesApplicable,
  formatWitnesses,
} from '../format';
import type {
  AttachmentExtraction,
  BoatRow,
  CaseFull,
  CaseRow,
  NotesExtraction,
  PartyRole,
  PersonRow,
  ResourceSearchHit,
} from '../types';

interface Props {
  caseId: number;
}

// SPEC-016: a case can have several initiators/several respondents —
// mirrors WitnessDraft's own staging pattern (null id = not yet
// persisted, created on Save; add/remove only, no inline edit of an
// already-saved row, same as Witness).
interface PartyDraft {
  id: number | null;
  sailNumber: string;
  boatName: string;
  representedBy: string;
}

const emptyPartyDraft: PartyDraft = { id: null, sailNumber: '', boatName: '', representedBy: '' };

interface WitnessDraft {
  id: number | null; // null = not yet persisted, created on Save
  fullName: string;
  role: string;
}

// The case form. Boxes in fixed form order for the official document
// (CONTEXT.md section 4, format.ts's formatFullDecision — never
// reordered): Parties, Witness, Procedural Matters, Facts Found,
// Conclusion, Rules Applicable, Decision, Jury Members. The on-screen
// tab layout is a separate, editable concern. Per DECISIONS.md D-029
// (internal coherence, SPEC-011): every tab with editable content has
// its own Save button that persists only that tab's own data — no
// shared/batched save across tabs any more. Parties & Witness got
// split out of "General" into its own tab for the same reason
// (General is a plain form, Parties & Witness is a document box —
// mixing the two in one tab is what D-029 rule 1 forbids).
// Per-case jury assignment (Jury Members) has no tab here any more —
// pulled out 2026-10-05 to become its own top-level tab in a later spec.
export function CaseForm({ caseId }: Props) {
  const [caseFull, setCaseFull] = useState<CaseFull | null>(null);
  const [boats, setBoats] = useState<BoatRow[]>([]);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [otherCases, setOtherCases] = useState<CaseRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  // SPEC-014: one Save for the whole case, next to Download decision —
  // replaces SPEC-011's per-tab Save buttons at the user's request.
  const [savingAll, setSavingAll] = useState(false);
  const [copied, setCopied] = useState<Record<string, boolean>>({});

  // Scalar fields, edited locally and saved together (Save button).
  const [caseNumber, setCaseNumber] = useState('');
  const [day, setDay] = useState('');
  const [race, setRace] = useState('');
  const [informedAt, setInformedAt] = useState('');
  const [withCaseNote, setWithCaseNote] = useState('');
  const [proceduralMatters, setProceduralMatters] = useState('');
  const [factsFound, setFactsFound] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [decision, setDecision] = useState('');

  // SPEC-017: free-form hearing notes, persisted with the rest of the
  // form but never exported — an AI source feeding the 4 writing boxes.
  const [notes, setNotes] = useState('');
  const [notesExtraction, setNotesExtraction] = useState<NotesExtraction | null>(null);
  const [notesProcessing, setNotesProcessing] = useState(false);
  // Arms the auto-trigger (10e below) only once the user edits notes in
  // THIS session — reload() seeds this to the already-saved value, not
  // '', so opening a case and switching tabs never fires AI on its own.
  const lastProcessedNotes = useRef('');
  // Synchronous in-flight guard — notesProcessing (state) updates
  // asynchronously, so two tab switches in the same tick could both
  // still see it as false and both fire.
  const processingRef = useRef(false);

  // SPEC-016: several initiators/several respondents — one staged list
  // per role, same add/remove pattern as witnessDraft below.
  const [partyDrafts, setPartyDrafts] = useState<Record<PartyRole, PartyDraft[]>>({
    initiator: [],
    respondent: [],
  });
  const [partyForm, setPartyForm] = useState<Record<PartyRole, PartyDraft>>({
    initiator: emptyPartyDraft,
    respondent: emptyPartyDraft,
  });

  // Staged locally, reconciled against the server in one batch by the
  // General tab's single Save button (no more per-witness Add call).
  const [witnessDraft, setWitnessDraft] = useState<WitnessDraft[]>([]);
  const [witnessName, setWitnessName] = useState('');
  const [witnessRole, setWitnessRole] = useState('');

  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [extraction, setExtraction] = useState<AttachmentExtraction | null>(null);
  const [extracting, setExtracting] = useState(false);

  // Stable identity across renders — GhostTextarea's useEffect depends on
  // this array, and a fresh one every render would re-run it (clearing
  // any visible ghost-text) on every keystroke elsewhere in the form.
  const sailNumberRoles = useMemo(
    () => [
      ...partyDrafts.initiator.filter((p) => p.sailNumber).map((p) => ({ sailNumber: p.sailNumber, role: 'initiator' as const })),
      ...partyDrafts.respondent.filter((p) => p.sailNumber).map((p) => ({ sailNumber: p.sailNumber, role: 'respondent' as const })),
    ],
    [partyDrafts],
  );

  const [ruleText, setRuleText] = useState('');
  const [ruleQuery, setRuleQuery] = useState('');
  const [ruleHits, setRuleHits] = useState<ResourceSearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  // UI grouping only — copy-all still walks the fixed CONTEXT.md box
  // order (formatFullDecision), unaffected by which tab is active.
  // Per-case jury assignment used to live here as its own tab; pulled
  // out (2026-10-05, user's call) to become its own top-level tab in a
  // later spec instead of a CaseForm sub-tab.
  type CaseTab =
    | 'attachments'
    | 'general'
    | 'parties'
    | 'procedural'
    | 'facts'
    | 'conclusion'
    | 'decision'
    | 'review';
  const [caseTab, setCaseTab] = useState<CaseTab>('general');

  async function reload() {
    try {
      const [full, allBoats, allPeople, allCases] = await Promise.all([
        api.getCaseFull(caseId),
        api.listBoats(),
        api.listPeople(),
        api.listCases(),
      ]);
      setCaseFull(full);
      setBoats(allBoats);
      setPeople(allPeople);
      setOtherCases(allCases.filter((c) => c.event_id === full.event_id && c.id !== caseId));

      setCaseNumber(full.case_number);
      setDay(full.day ?? '');
      setRace(full.race ?? '');
      setInformedAt(full.informed_at ?? '');
      setWithCaseNote(full.with_case_note ?? '');
      setNotes(full.notes ?? '');
      lastProcessedNotes.current = full.notes ?? '';
      setProceduralMatters(full.procedural_matters);
      setFactsFound(full.facts_found);
      setConclusion(full.conclusion);
      setDecision(full.decision);

      setPartyDrafts({
        initiator: full.parties
          .filter((p) => p.role === 'initiator')
          .map((p) => ({ id: p.id, sailNumber: p.sail_number ?? '', boatName: p.boat_name ?? '', representedBy: p.represented_by ?? '' })),
        respondent: full.parties
          .filter((p) => p.role === 'respondent')
          .map((p) => ({ id: p.id, sailNumber: p.sail_number ?? '', boatName: p.boat_name ?? '', representedBy: p.represented_by ?? '' })),
      });

      setWitnessDraft(full.witnesses.map((w) => ({ id: w.id, fullName: w.full_name, role: w.role ?? '' })));

      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // Refreshes ONLY caseFull.jury — never the four free-text useState
  // (unlike reload() above, which re-seeds them from the server and
  // would silently discard unsaved edits made on the Review tab,
  // SPEC-009 RF-007). JurySlots calls this, never reload().
  async function reloadJury() {
    const full = await api.getCaseFull(caseId);
    setCaseFull((prev) => (prev ? { ...prev, jury: full.jury } : full));
  }

  // SPEC-013: refreshes ONLY caseFull.linkedCases — same criterion as
  // reloadJury/refreshParties above, never the four free-text useState
  // nor the General fields.
  async function refreshLinkedCases() {
    const full = await api.getCaseFull(caseId);
    setCaseFull((prev) => (prev ? { ...prev, linkedCases: full.linkedCases } : full));
  }

  // SPEC-013: refreshes ONLY caseFull.attachments.
  async function refreshAttachments() {
    const full = await api.getCaseFull(caseId);
    setCaseFull((prev) => (prev ? { ...prev, attachments: full.attachments } : full));
  }

  // SPEC-013: refreshes ONLY caseFull.ruleCitations.
  async function refreshRuleCitations() {
    const full = await api.getCaseFull(caseId);
    setCaseFull((prev) => (prev ? { ...prev, ruleCitations: full.ruleCitations } : full));
  }

  // SPEC-011: refreshes ONLY parties/witnesses (and what's derived
  // from them: partyDrafts/witnessDraft) — never
  // caseNumber/day/race/informedAt nor the four free-text useState
  // (same criterion as reloadJury above). New witnesses/parties get a
  // server-assigned id the local draft doesn't have yet;
  // findOrCreateBoat/findOrCreatePerson already keep boats/people
  // current on their own, no need to re-fetch those here.
  async function refreshParties() {
    const full = await api.getCaseFull(caseId);
    setCaseFull((prev) => (prev ? { ...prev, parties: full.parties, witnesses: full.witnesses } : full));

    setPartyDrafts({
      initiator: full.parties
        .filter((p) => p.role === 'initiator')
        .map((p) => ({ id: p.id, sailNumber: p.sail_number ?? '', boatName: p.boat_name ?? '', representedBy: p.represented_by ?? '' })),
      respondent: full.parties
        .filter((p) => p.role === 'respondent')
        .map((p) => ({ id: p.id, sailNumber: p.sail_number ?? '', boatName: p.boat_name ?? '', representedBy: p.represented_by ?? '' })),
    });
    setWitnessDraft(full.witnesses.map((w) => ({ id: w.id, fullName: w.full_name, role: w.role ?? '' })));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  // Rule picker (Phase 3): a debounced lookup against the loaded corpus
  // (FTS5, accepted rule resources only, D-020) — surfaces where a rule
  // number actually appears so a citation can be verified before typing
  // it into the box below (D-004: nothing cited without a trace). Whole
  // documents are indexed, not individual numbered rules, so this finds
  // the right document/snippet; the exact reference is still typed by
  // hand into ruleText.
  useEffect(() => {
    if (!ruleQuery.trim()) {
      setRuleHits([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      api
        .searchResources(ruleQuery.trim())
        .then(setRuleHits)
        .catch(() => setRuleHits([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [ruleQuery]);

  async function findOrCreateBoat(sailNumber: string, boatName: string | null): Promise<number> {
    const existing = boats.find(
      (b) =>
        b.sail_number.toLowerCase() === sailNumber.toLowerCase() &&
        (b.boat_name ?? '') === (boatName ?? ''),
    );
    if (existing) return existing.id;
    const created = await api.createBoat({ sail_number: sailNumber, boat_name: boatName });
    setBoats((prev) => [...prev, created]);
    return created.id;
  }

  async function findOrCreatePerson(fullName: string): Promise<number> {
    const existing = people.find((p) => p.full_name.toLowerCase() === fullName.toLowerCase());
    if (existing) return existing.id;
    const created = await api.createPerson({ full_name: fullName });
    setPeople((prev) => [...prev, created]);
    return created.id;
  }

  function markCopied(key: string) {
    setCopied((prev) => ({ ...prev, [key]: true }));
  }

  // SPEC-014: one Save for the whole case — General + Parties &
  // Witness (incl. party/witness reconciliation) + the four free-text
  // boxes, all in one action. Replaces SPEC-011's per-tab saves. Rules
  // Applicable/With case(s)/attachments/jury keep acting instantly,
  // unchanged, never part of this save.
  async function handleSaveAll() {
    setSavingAll(true);
    try {
      await api.updateCase(caseId, {
        case_number: caseNumber.trim(),
        day: day.trim() || null,
        race: race.trim() || null,
        informed_at: informedAt.trim() || null,
        with_case_note: withCaseNote.trim() || null,
        notes,
        procedural_matters: proceduralMatters,
        facts_found: factsFound,
        conclusion,
        decision,
      });

      // SPEC-016: add/remove reconciliation per role, same pattern as
      // witnesses below — no inline edit of an already-saved party.
      for (const role of ['initiator', 'respondent'] as PartyRole[]) {
        const drafts = partyDrafts[role];
        const keptPartyIds = new Set(drafts.filter((d) => d.id !== null).map((d) => d.id));
        for (const p of caseFull?.parties.filter((p) => p.role === role) ?? []) {
          if (!keptPartyIds.has(p.id)) await api.deleteParty(p.id);
        }
        for (const d of drafts) {
          if (d.id === null && (d.sailNumber.trim() || d.boatName.trim() || d.representedBy.trim())) {
            const boatId = d.sailNumber.trim() ? await findOrCreateBoat(d.sailNumber.trim(), d.boatName.trim() || null) : null;
            const representedById = d.representedBy.trim() ? await findOrCreatePerson(d.representedBy.trim()) : null;
            await api.createParty({ case_id: caseId, role, boat_id: boatId, represented_by_id: representedById });
          }
        }
      }

      const keptIds = new Set(witnessDraft.filter((w) => w.id !== null).map((w) => w.id));
      for (const w of caseFull?.witnesses ?? []) {
        if (!keptIds.has(w.id)) await api.deleteWitness(w.id);
      }
      for (const w of witnessDraft) {
        if (w.id === null && w.fullName.trim()) {
          const personId = await findOrCreatePerson(w.fullName.trim());
          await api.createWitness({ case_id: caseId, person_id: personId, role: w.role.trim() || null });
        }
      }

      await refreshParties();
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingAll(false);
    }
  }

  function handleStageWitness(e: FormEvent) {
    e.preventDefault();
    if (!witnessName.trim()) return;
    setWitnessDraft((prev) => [...prev, { id: null, fullName: witnessName.trim(), role: witnessRole.trim() }]);
    setWitnessName('');
    setWitnessRole('');
  }

  function handleUnstageWitness(index: number) {
    setWitnessDraft((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAddRule(e: FormEvent) {
    e.preventDefault();
    if (!ruleText.trim() || !caseFull) return;
    await api.createRuleCitation({
      case_id: caseId,
      rule_reference: ruleText.trim(),
      position: caseFull.ruleCitations.length,
    });
    setRuleText('');
    await refreshRuleCitations();
  }

  async function handleRemoveRule(id: number) {
    await api.deleteRuleCitation(id);
    await refreshRuleCitations();
  }

  // "With Case(s)" (top row, general tab): link/unlink is a discrete
  // action of its own, not part of the batched Save — it takes effect
  // as soon as you pick a case.
  async function handleLinkCase(linkedCaseId: number) {
    await api.createCaseLink({ case_id: caseId, linked_case_id: linkedCaseId });
    await refreshLinkedCases();
  }

  async function handleRemoveLink(linkedCaseId: number) {
    await api.deleteCaseLink({ case_id: caseId, linked_case_id: linkedCaseId });
    await refreshLinkedCases();
  }

  // Tab 0: protest form(s) for this case (DECISIONS.md D-027). Any
  // format, uploaded immediately on selection — no queue/review, unlike
  // the resource (rules/examples) upload flow.
  async function handleUploadAttachment(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingAttachment(true);
    try {
      await api.uploadCaseAttachment(caseId, file);
      await refreshAttachments();
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function handleRemoveAttachment(id: number) {
    await api.deleteCaseAttachment(id);
    await refreshAttachments();
  }

  // Manual "Process" (D-027 follow-up) — reads the uploaded protest
  // form(s) and returns candidate suggestions for other boxes. Never
  // writes anything itself; the drafter inserts what's useful.
  async function handleProcessAttachments() {
    setExtracting(true);
    setError(null);
    try {
      setExtraction(await api.extractAttachments(caseId));
    } catch (err) {
      setError((err as Error).message);
      setExtraction(null);
    } finally {
      setExtracting(false);
    }
  }

  // SPEC-017: manual "Process" trigger for hearing notes, also fired
  // automatically (see the useEffect below) when switching into a
  // writing-box tab if the notes changed since the last run. Never
  // writes to the case — same click-to-insert pattern as everything
  // else in SuggestionsPanel.
  async function handleProcessNotes() {
    if (!notes.trim() || processingRef.current) return;
    processingRef.current = true;
    setNotesProcessing(true);
    try {
      setNotesExtraction(await api.extractNotes(caseId, notes));
      lastProcessedNotes.current = notes;
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      processingRef.current = false;
      setNotesProcessing(false);
    }
  }

  // Auto-trigger: entering a writing-box tab re-processes the notes if
  // they changed (in this session) since the last run — never on mount
  // (lastProcessedNotes starts equal to the loaded value, see reload()).
  useEffect(() => {
    const writingTabs: CaseTab[] = ['procedural', 'facts', 'conclusion', 'decision'];
    if (writingTabs.includes(caseTab) && notes.trim() && notes !== lastProcessedNotes.current) {
      handleProcessNotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseTab]);

  // SPEC-016: adds a new entry to that role's list instead of
  // overwriting a single slot — same spirit as addSuggestedWitness
  // below.
  function addSuggestedParty(role: PartyRole) {
    const suggested = extraction?.parties[role];
    if (!suggested) return;
    setPartyDrafts((prev) => ({
      ...prev,
      [role]: [
        ...prev[role],
        {
          id: null,
          sailNumber: suggested.sail_number ?? '',
          boatName: suggested.boat_name ?? '',
          representedBy: suggested.represented_by ?? '',
        },
      ],
    }));
  }

  function handleStageParty(role: PartyRole, e: FormEvent) {
    e.preventDefault();
    const form = partyForm[role];
    if (!form.sailNumber.trim() && !form.boatName.trim() && !form.representedBy.trim()) return;
    setPartyDrafts((prev) => ({ ...prev, [role]: [...prev[role], { ...form, id: null }] }));
    setPartyForm((prev) => ({ ...prev, [role]: emptyPartyDraft }));
  }

  function handleUnstageParty(role: PartyRole, index: number) {
    setPartyDrafts((prev) => ({ ...prev, [role]: prev[role].filter((_, i) => i !== index) }));
  }

  function useSuggestedDay() {
    if (extraction?.day_candidate) setDay(extraction.day_candidate);
  }

  function useSuggestedRace() {
    if (extraction?.race_candidate) setRace(extraction.race_candidate);
  }

  function addSuggestedWitness(w: { full_name: string; role?: string }) {
    setWitnessDraft((prev) => [...prev, { id: null, fullName: w.full_name, role: w.role ?? '' }]);
  }

  if (!caseFull) return <p>Loading…</p>;

  // Live view: saved structured data plus whatever is currently typed in
  // the four free-text boxes, so Copy reflects what is on screen even
  // before Save is pressed.
  const liveCase: CaseFull = {
    ...caseFull,
    procedural_matters: proceduralMatters,
    facts_found: factsFound,
    conclusion,
    decision,
  };
  const autoProceduralLines = formatAutoProceduralLines(liveCase);

  // D-005 follow-up: single-click .html export of the full decision,
  // matching the source Word template's layout, built from the live
  // (possibly unsaved) case data — replaces the old "Copy all" button.
  function handleDownload() {
    const html = formatFullDecisionHtml(liveCase);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildDecisionFilename(liveCase);
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page">
      <div className="case-header">
        <h2>Case {caseFull.event.name} — {caseNumber || '(no number)'}</h2>
      </div>
      {error && <p className="error">{error}</p>}

      <section className="box">
        <h2>Hearing notes</h2>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        <button type="button" onClick={handleProcessNotes} disabled={notesProcessing || !notes.trim()}>
          {notesProcessing ? 'Processing…' : 'Process'}
        </button>
      </section>

      <div className="tab-bar-row">
        <nav className="tab-bar tab-bar-pill">
        <button
          type="button"
          className={caseTab === 'attachments' ? 'active' : undefined}
          aria-current={caseTab === 'attachments'}
          onClick={() => setCaseTab('attachments')}
        >
          0. Protest Form(s)
        </button>
        <button
          type="button"
          className={caseTab === 'general' ? 'active' : undefined}
          aria-current={caseTab === 'general'}
          onClick={() => setCaseTab('general')}
        >
          1. General
        </button>
        <button
          type="button"
          className={caseTab === 'parties' ? 'active' : undefined}
          aria-current={caseTab === 'parties'}
          onClick={() => setCaseTab('parties')}
        >
          2. Parties &amp; Witness
        </button>
        <button
          type="button"
          className={caseTab === 'procedural' ? 'active' : undefined}
          aria-current={caseTab === 'procedural'}
          onClick={() => setCaseTab('procedural')}
        >
          3. Procedural Matters
        </button>
        <button
          type="button"
          className={caseTab === 'facts' ? 'active' : undefined}
          aria-current={caseTab === 'facts'}
          onClick={() => setCaseTab('facts')}
        >
          4. Facts Found
        </button>
        <button
          type="button"
          className={caseTab === 'conclusion' ? 'active' : undefined}
          aria-current={caseTab === 'conclusion'}
          onClick={() => setCaseTab('conclusion')}
        >
          5. Conclusion
        </button>
        <button
          type="button"
          className={caseTab === 'decision' ? 'active' : undefined}
          aria-current={caseTab === 'decision'}
          onClick={() => setCaseTab('decision')}
        >
          6. Decision
        </button>
        <button
          type="button"
          className={caseTab === 'review' ? 'active' : undefined}
          aria-current={caseTab === 'review'}
          onClick={() => setCaseTab('review')}
        >
          7. Review
        </button>
      </nav>
        <button type="button" className="btn-accent" onClick={handleDownload}>
          Download decision (.html)
        </button>
        <button type="button" className="btn-accent" onClick={handleSaveAll} disabled={savingAll}>
          {savingAll ? 'Saving…' : 'Save'}
        </button>
      </div>

      {caseTab === 'attachments' && (
        <div className="tab-panel">
          <section className="box">
            <h2>Protest Form(s)</h2>
            <p className="muted">
              Any file format — scan, photo, PDF. Converted to Markdown when possible for later
              use; the original is always kept.
            </p>
            <ul className="list">
              {caseFull.attachments.map((a) => (
                <li key={a.id}>
                  <a href={api.attachmentFileUrl(a.id)} download>
                    {a.original_filename}
                  </a>{' '}
                  <span className="muted">{new Date(a.uploaded_at).toLocaleString()}</span>
                  {!!a.conversion_empty && (
                    <span className="error"> — empty conversion, check original</span>
                  )}{' '}
                  <button type="button" onClick={() => handleRemoveAttachment(a.id)}>
                    Remove
                  </button>
                </li>
              ))}
              {caseFull.attachments.length === 0 && <li className="muted">No files uploaded yet.</li>}
            </ul>
            <input
              ref={attachmentInputRef}
              type="file"
              onChange={handleUploadAttachment}
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
              onClick={handleProcessAttachments}
              disabled={extracting || caseFull.attachments.length === 0}
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
        </div>
      )}

      {caseTab === 'general' && (
        <div className="tab-panel">
          <section className="box general-box">
            <h2>General</h2>
            <div className="general-fields-col">
              <div className="party-row">
                <strong>Case number</strong>
                <input value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} required />
              </div>
              <div className="party-row">
                <strong>Day</strong>
                <input value={day} onChange={(e) => setDay(e.target.value)} />
                {extraction?.day_candidate && (
                  <button type="button" onClick={useSuggestedDay}>
                    Use suggested
                  </button>
                )}
              </div>
              <div className="party-row">
                <strong>Race</strong>
                <input value={race} onChange={(e) => setRace(e.target.value)} />
                {extraction?.race_candidate && (
                  <button type="button" onClick={useSuggestedRace}>
                    Use suggested
                  </button>
                )}
              </div>
              <div className="party-row">
                <strong>With case(s)</strong>
                <div className="with-case-inline">
                  {caseFull.linkedCases.map((lc) => (
                    <span key={lc.id} className="chip">
                      {lc.case_number}
                      <button type="button" onClick={() => handleRemoveLink(lc.id)} aria-label={`Unlink case ${lc.case_number}`}>
                        ×
                      </button>
                    </span>
                  ))}
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) handleLinkCase(Number(e.target.value));
                    }}
                  >
                    <option value="">+ Link case…</option>
                    {otherCases
                      .filter((c) => !caseFull.linkedCases.some((lc) => lc.id === c.id))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          Case {c.case_number}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="party-row">
                <strong>With case(s) notes</strong>
                <input
                  value={withCaseNote}
                  onChange={(e) => setWithCaseNote(e.target.value)}
                  placeholder="Free text — e.g. a case from another regatta"
                />
              </div>
            </div>
          </section>
        </div>
      )}

      {caseTab === 'parties' && (
        <div className="tab-panel">
          {/* Parties & Witness — one box, matching the fixed document
              order (Parties, then Witness — format.ts's
              formatFullDecision) both in the UI and in Copy. */}
          <CopyBox
            label="Parties & Witness"
            text={`${formatParties(liveCase)}\n\n${formatWitnesses(liveCase)}`}
            copied={!!copied.parties && !!copied.witness}
            onCopied={() => {
              markCopied('parties');
              markCopied('witness');
            }}
          >
            {(['initiator', 'respondent'] as PartyRole[]).map((role) => (
              <div key={role}>
                <h3>{role === 'initiator' ? 'Initiator(s)' : 'Respondent(s)'}</h3>
                <ul className="list">
                  {partyDrafts[role].map((p, i) => (
                    <li key={`${p.id ?? 'new'}-${i}`}>
                      {formatBoat({ sail_number: p.sailNumber || null, boat_name: p.boatName || null })}
                      {p.representedBy ? `, represented by ${p.representedBy}` : ''}{' '}
                      <button type="button" onClick={() => handleUnstageParty(role, i)}>
                        Remove
                      </button>
                    </li>
                  ))}
                  {partyDrafts[role].length === 0 && (
                    <li className="muted">No {role === 'initiator' ? 'initiators' : 'respondents'} yet.</li>
                  )}
                </ul>
                {extraction?.parties[role] && (
                  <p className="muted">
                    Suggested:{' '}
                    {formatBoat({
                      sail_number: extraction.parties[role]?.sail_number ?? null,
                      boat_name: extraction.parties[role]?.boat_name ?? null,
                    })}{' '}
                    <button type="button" onClick={() => addSuggestedParty(role)}>
                      Add
                    </button>
                  </p>
                )}
                <form onSubmit={(e) => handleStageParty(role, e)} className="inline-form">
                  <input
                    list="boat-sail-numbers"
                    placeholder="Sail number"
                    value={partyForm[role].sailNumber}
                    onChange={(e) => setPartyForm((prev) => ({ ...prev, [role]: { ...prev[role], sailNumber: e.target.value } }))}
                  />
                  <input
                    list="boat-names"
                    placeholder="Boat name"
                    value={partyForm[role].boatName}
                    onChange={(e) => setPartyForm((prev) => ({ ...prev, [role]: { ...prev[role], boatName: e.target.value } }))}
                  />
                  <input
                    list="people-list"
                    placeholder="Represented by"
                    value={partyForm[role].representedBy}
                    onChange={(e) => setPartyForm((prev) => ({ ...prev, [role]: { ...prev[role], representedBy: e.target.value } }))}
                  />
                  <button type="submit">Add</button>
                </form>
              </div>
            ))}

            <h3>Witness</h3>
            <ul className="list">
              {witnessDraft.map((w, i) => (
                <li key={`${w.id ?? 'new'}-${i}`}>
                  {w.fullName}
                  {w.role ? ` — ${w.role}` : ''}{' '}
                  <button type="button" onClick={() => handleUnstageWitness(i)}>
                    Remove
                  </button>
                </li>
              ))}
              {witnessDraft.length === 0 && <li className="muted">No witnesses yet.</li>}
            </ul>
            {extraction && extraction.witnesses.length > 0 && (
              <ul className="list">
                {extraction.witnesses.map((w, i) => (
                  <li key={i}>
                    Suggested: {w.full_name}
                    {w.role ? ` — ${w.role}` : ''}{' '}
                    <button type="button" onClick={() => addSuggestedWitness(w)}>
                      Add
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={handleStageWitness} className="inline-form">
              <input
                list="people-list"
                placeholder="Full name"
                value={witnessName}
                onChange={(e) => setWitnessName(e.target.value)}
                required
              />
              <input placeholder="Role" value={witnessRole} onChange={(e) => setWitnessRole(e.target.value)} />
              <button type="submit">Add</button>
            </form>
            <datalist id="boat-sail-numbers">
              {boats.map((b) => (
                <option key={b.id} value={b.sail_number} />
              ))}
            </datalist>
            <datalist id="boat-names">
              {boats.map((b) => b.boat_name && <option key={b.id} value={b.boat_name} />)}
            </datalist>
            <datalist id="people-list">
              {people.map((p) => (
                <option key={p.id} value={p.full_name} />
              ))}
            </datalist>
          </CopyBox>
        </div>
      )}

      {caseTab === 'procedural' && (
        <div className="tab-panel">
      {/* 3. Procedural Matters */}
      <CopyBox
        label="Procedural Matters"
        text={proceduralMatters}
        copied={!!copied.procedural_matters}
        onCopied={() => markCopied('procedural_matters')}
      >
        <div className="box-body-split">
          <div className="textarea-col">
            <GhostTextarea
              caseId={caseId}
              box="procedural_matters"
              value={proceduralMatters}
              onChange={setProceduralMatters}
              rows={4}
            />
          </div>
          <div className="suggestions-col">
            <SuggestionsPanel
              caseId={caseId}
              box="procedural_matters"
              currentText={proceduralMatters}
              onInsert={(text) => setProceduralMatters((prev) => (prev ? `${prev}\n\n${text}` : text))}
              protestForm={{
                lines: autoProceduralLines,
                paragraph: extraction?.procedural_matters_candidate
                  ? { label: 'From protest form', text: extraction.procedural_matters_candidate }
                  : undefined,
              }}
              notesForm={
                notesExtraction?.procedural_matters_candidate
                  ? { paragraph: { label: 'From hearing notes', text: notesExtraction.procedural_matters_candidate } }
                  : undefined
              }
            />
          </div>
        </div>
      </CopyBox>
        </div>
      )}

      {caseTab === 'facts' && (
        <div className="tab-panel">
      {/* 4. Facts Found */}
      <CopyBox
        label="Facts Found"
        text={factsFound}
        copied={!!copied.facts_found}
        onCopied={() => markCopied('facts_found')}
      >
        <div className="box-body-split">
          <div className="textarea-col">
            <GhostTextarea
              caseId={caseId}
              box="facts_found"
              value={factsFound}
              onChange={setFactsFound}
              rows={6}
              sailNumberRoles={sailNumberRoles}
            />
          </div>
          <div className="suggestions-col">
            <SuggestionsPanel
              caseId={caseId}
              box="facts_found"
              currentText={factsFound}
              onInsert={(text) => setFactsFound((prev) => (prev ? `${prev}\n\n${text}` : text))}
              protestForm={{ lines: extraction?.facts_found_candidates }}
              notesForm={{ lines: notesExtraction?.facts_found_candidates }}
              partyReference={{
                initiators: partyDrafts.initiator.map((p) => ({ sailNumber: p.sailNumber, boatName: p.boatName })),
                respondents: partyDrafts.respondent.map((p) => ({ sailNumber: p.sailNumber, boatName: p.boatName })),
              }}
            />
          </div>
        </div>
      </CopyBox>
        </div>
      )}

      {caseTab === 'conclusion' && (
        <div className="tab-panel">
      <div className="two-col">
        {/* 5. Conclusion */}
        <CopyBox
          label="Conclusion"
          text={conclusion}
          copied={!!copied.conclusion}
          onCopied={() => markCopied('conclusion')}
        >
          <div className="box-body-split">
            <div className="textarea-col">
              <GhostTextarea caseId={caseId} box="conclusion" value={conclusion} onChange={setConclusion} rows={4} />
            </div>
            <div className="suggestions-col">
              <SuggestionsPanel
                caseId={caseId}
                box="conclusion"
                currentText={conclusion}
                onInsert={(text) => setConclusion((prev) => (prev ? `${prev}\n\n${text}` : text))}
                protestForm={
                  extraction?.conclusion_candidate
                    ? { paragraph: { label: 'From protest form', text: extraction.conclusion_candidate } }
                    : undefined
                }
                notesForm={
                  notesExtraction?.conclusion_candidate
                    ? { paragraph: { label: 'From hearing notes', text: notesExtraction.conclusion_candidate } }
                    : undefined
                }
              />
            </div>
          </div>
        </CopyBox>

        {/* 6. Rules Applicable */}
        <CopyBox
          label="Rules Applicable"
          text={formatRulesApplicable(liveCase)}
          copied={!!copied.rules_applicable}
          onCopied={() => markCopied('rules_applicable')}
        >
          <ul className="list">
            {caseFull.ruleCitations.map((r) => (
              <li key={r.id}>
                {r.rule_reference}{' '}
                <button type="button" onClick={() => handleRemoveRule(r.id)}>
                  Remove
                </button>
              </li>
            ))}
            {caseFull.ruleCitations.length === 0 && <li className="muted">No rules cited yet.</li>}
          </ul>
          <form onSubmit={handleAddRule} className="inline-form">
            <input
              placeholder="e.g. RRS 18.2(b)"
              value={ruleText}
              onChange={(e) => setRuleText(e.target.value)}
              required
            />
            <button type="submit">Add</button>
          </form>

          <div className="rule-picker">
            <input
              placeholder="Search the loaded rules corpus (e.g. propulsion)"
              value={ruleQuery}
              onChange={(e) => setRuleQuery(e.target.value)}
            />
            {searching && <p className="muted">Searching…</p>}
            {!searching && ruleQuery.trim() !== '' && ruleHits.length === 0 && (
              <p className="muted">No match in the loaded corpus. Upload it first (Upload rules, top nav).</p>
            )}
            <ul className="list">
              {ruleHits.map((h) => (
                <li key={h.id}>
                  <strong>{h.title}</strong> <span className="muted">({h.layer})</span>
                  <br />
                  <span className="muted">{h.snippet}</span>
                </li>
              ))}
            </ul>
          </div>
        </CopyBox>
      </div>
        </div>
      )}

      {caseTab === 'decision' && (
        <div className="tab-panel">
      {/* SPEC-016: a form field, kept out of the Decision CopyBox
          below (D-029 rule 1 — never mix a form input with a document
          box in the same tab), same reasoning as "General". */}
      <section className="box">
        <div className="party-row">
          <strong>Informed at (date &amp; time)</strong>
          <input value={informedAt} onChange={(e) => setInformedAt(e.target.value)} placeholder="e.g. 2026-10-06 18:30" />
        </div>
      </section>
      {/* 7. Decision */}
      <CopyBox
        label="Decision"
        text={decision}
        copied={!!copied.decision}
        onCopied={() => markCopied('decision')}
      >
        <div className="box-body-split">
          <div className="textarea-col">
            <GhostTextarea caseId={caseId} box="decision" value={decision} onChange={setDecision} rows={4} />
          </div>
          <div className="suggestions-col">
            <SuggestionsPanel
              caseId={caseId}
              box="decision"
              currentText={decision}
              onInsert={(text) => setDecision((prev) => (prev ? `${prev}\n\n${text}` : text))}
              protestForm={
                extraction?.decision_candidate
                  ? { paragraph: { label: 'From protest form', text: extraction.decision_candidate } }
                  : undefined
              }
              notesForm={
                notesExtraction?.decision_candidate
                  ? { paragraph: { label: 'From hearing notes', text: notesExtraction.decision_candidate } }
                  : undefined
              }
              partyReference={{
                initiators: partyDrafts.initiator.map((p) => ({ sailNumber: p.sailNumber, boatName: p.boatName })),
                respondents: partyDrafts.respondent.map((p) => ({ sailNumber: p.sailNumber, boatName: p.boatName })),
                race,
              }}
            />
          </div>
        </div>
      </CopyBox>
        </div>
      )}

      {caseTab === 'review' && (
        <div className="tab-panel">
          <section className="box review-box">
            <h2>Review</h2>
            <h3>Procedural Matters</h3>
            <textarea value={proceduralMatters} onChange={(e) => setProceduralMatters(e.target.value)} rows={4} />
            <h3>Facts Found</h3>
            <textarea value={factsFound} onChange={(e) => setFactsFound(e.target.value)} rows={6} />
            <h3>Conclusion</h3>
            <textarea value={conclusion} onChange={(e) => setConclusion(e.target.value)} rows={4} />
            <h3>Decision</h3>
            <textarea value={decision} onChange={(e) => setDecision(e.target.value)} rows={4} />
            <h3>Informed at (date &amp; time)</h3>
            <input value={informedAt} onChange={(e) => setInformedAt(e.target.value)} />
          </section>

          <JurySlots
            caseId={caseId}
            eventId={caseFull.event.id}
            jury={caseFull.jury}
            onJuryChange={reloadJury}
            findOrCreatePerson={findOrCreatePerson}
          />
        </div>
      )}
    </div>
  );
}

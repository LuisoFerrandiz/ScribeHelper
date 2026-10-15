import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { api } from '../api';
import { AttachmentsTab } from './AttachmentsTab';
import { GhostTextarea, type GhostTextareaHandle } from './GhostTextarea';
import { GeneralTab } from './GeneralTab';
import { PartiesTab } from './PartiesTab';
import { PartyReference } from './PartyReference';
import { ReviewTab } from './ReviewTab';
import { RulesSuggestions } from './RulesSuggestions';
import { ProposalsTray } from './ProposalsTray';
import { RulesWarnings } from './RulesWarnings';
import { useRuleRefCheck } from '../useRuleRefCheck';
import { TabBar } from './TabBar';
import { WritingBox } from './WritingBox';
import {
  buildDecisionFilename,
  formatAutoProceduralLines,
  formatFullDecisionHtml,
  formatRulesApplicable,
  missingCitations,
  citationInText,
} from '../format';
import { type CaseTab } from '../caseTabs';
import { emptyPartyDraft, toPartyDrafts, toWitnessDrafts, type PartyDraft, type WitnessDraft } from '../caseDrafts';
import { partyPositionContext } from '../partyPosition';
import { describePending, pendingMarks } from '../pendingMarks';
import { staleSources, type BoxStamps, type ChainBox } from '../staleBoxes';
import { StaleNote } from './StaleNote';
import { GapFillPanel } from './GapFillPanel';
import type {
  AttachmentExtraction,
  BoatRow,
  CaseFull,
  CaseRow,
  PartyRole,
  PersonRow,
} from '../types';

interface Props {
  caseId: number;
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
// Per-case jury assignment (Jury Members) is not a tab: JurySlots sits at
// the bottom of the Review tab (the top-level "Jury" menu entry was
// removed, D-031).
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
  // SPEC-023: Rules Applicable text (saved with Save), next to the instant
  // citation registry (caseFull.ruleCitations).
  const [rulesApplicable, setRulesApplicable] = useState('');
  const [decision, setDecision] = useState('');

  // SPEC-017: free-form hearing notes, persisted with the rest of the
  // form but never exported — an AI source feeding the 4 writing boxes.
  const [notes, setNotes] = useState('');

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

  // SPEC-025: one handle per box that uses the phrase library, so a click on a
  // phrase inserts it at the caret of that box; `phraseRefresh` makes the boxes
  // reload their phrases after the user saves one.
  const proceduralBoxRef = useRef<GhostTextareaHandle>(null);
  const factsBoxRef = useRef<GhostTextareaHandle>(null);
  const conclusionBoxRef = useRef<GhostTextareaHandle>(null);
  const decisionBoxRef = useRef<GhostTextareaHandle>(null);
  const [phraseRefresh, setPhraseRefresh] = useState(0);


  // UI grouping only — copy-all still walks the fixed CONTEXT.md box
  // order (formatFullDecision), unaffected by which tab is active.
  // Per-case jury assignment is not a tab: JurySlots sits at the bottom of
  // the Review tab (D-031).
  const [caseTab, setCaseTab] = useState<CaseTab>('general');
  // SPEC-034 RF-021: typed references the corpus does not contain (Rules tab only).
  const unresolvedRefs = useRuleRefCheck(caseId, rulesApplicable, caseTab === 'rules');

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
      setProceduralMatters(full.procedural_matters);
      setFactsFound(full.facts_found);
      setConclusion(full.conclusion);
      setRulesApplicable(full.rules_applicable ?? '');
      setDecision(full.decision);

      setPartyDrafts(toPartyDrafts(full));

      setWitnessDraft(toWitnessDrafts(full));

      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // SPEC-024 step 1c: one partial refresh for the four parts that only
  // replace a single caseFull slice. Each one refreshes ONLY its own slice —
  // never the four free-text useState (unlike reload() above, which re-seeds
  // them from the server and would silently discard unsaved edits made on
  // the Review tab, SPEC-009 RF-007 / SPEC-013), nor the General fields.
  //   jury          — JurySlots calls this, never reload().
  //   linkedCases   — SPEC-013, "With case(s)".
  //   attachments   — SPEC-013, protest forms.
  //   ruleCitations — SPEC-013, the citation registry.
  async function refreshCasePart(part: 'jury' | 'linkedCases' | 'attachments' | 'ruleCitations') {
    const full = await api.getCaseFull(caseId);
    setCaseFull((prev) => (prev ? { ...prev, [part]: full[part] } : full));
  }

  // SPEC-011: refreshes ONLY parties/witnesses (and what's derived
  // from them: partyDrafts/witnessDraft) — never
  // caseNumber/day/race/informedAt nor the four free-text useState
  // (same criterion as refreshCasePart above). New witnesses/parties get a
  // server-assigned id the local draft doesn't have yet;
  // findOrCreateBoat/findOrCreatePerson already keep boats/people
  // current on their own, no need to re-fetch those here.
  async function refreshParties() {
    const full = await api.getCaseFull(caseId);
    setCaseFull((prev) => (prev ? { ...prev, parties: full.parties, witnesses: full.witnesses } : full));

    setPartyDrafts(toPartyDrafts(full));
    setWitnessDraft(toWitnessDrafts(full));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

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
  // boxes (SPEC-023: plus the Rules Applicable text), all in one action.
  // Replaces SPEC-011's per-tab saves. The rule citation registry (add/
  // remove), With case(s), attachments and jury keep acting instantly,
  // unchanged, never part of this save.
  async function handleSaveAll() {
    setSavingAll(true);
    try {
      const saved = await api.updateCase(caseId, {
        case_number: caseNumber.trim(),
        day: day.trim() || null,
        race: race.trim() || null,
        informed_at: informedAt.trim() || null,
        with_case_note: withCaseNote.trim() || null,
        notes,
        procedural_matters: proceduralMatters,
        facts_found: factsFound,
        conclusion,
        rules_applicable: rulesApplicable,
        decision,
      });
      // SPEC-029: the server stamped the chain boxes that changed; keep the texts in edit.
      setCaseFull((prev) =>
        prev
          ? {
              ...prev,
              facts_found_at: saved.facts_found_at,
              rules_applicable_at: saved.rules_applicable_at,
              conclusion_at: saved.conclusion_at,
              decision_at: saved.decision_at,
            }
          : prev,
      );

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

  // SPEC-022 RF-005: one click registers the citation (validated by the server)
  // and writes it at the end of the Rules Applicable text. Errors propagate to
  // RulesSuggestions, which shows the server's message.
  async function handleAddRule(input: { text: string } | { section_id: number }) {
    if (!caseFull) return;
    const row = await api.addRuleCitation({ case_id: caseId, ...input });
    await refreshCasePart('ruleCitations');
    setRulesApplicable((prev) =>
      citationInText(prev, row.rule_reference) ? prev : prev ? `${prev}\n${row.rule_reference}` : row.rule_reference,
    );
  }

  async function handleRemoveRule(id: number) {
    await api.deleteRuleCitation(id);
    await refreshCasePart('ruleCitations');
  }

  // "With Case(s)" (top row, general tab): link/unlink is a discrete
  // action of its own, not part of the batched Save — it takes effect
  // as soon as you pick a case.
  async function handleLinkCase(linkedCaseId: number) {
    await api.createCaseLink({ case_id: caseId, linked_case_id: linkedCaseId });
    await refreshCasePart('linkedCases');
  }

  async function handleRemoveLink(linkedCaseId: number) {
    await api.deleteCaseLink({ case_id: caseId, linked_case_id: linkedCaseId });
    await refreshCasePart('linkedCases');
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
      await refreshCasePart('attachments');
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function handleRemoveAttachment(id: number) {
    await api.deleteCaseAttachment(id);
    await refreshCasePart('attachments');
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
    rules_applicable: rulesApplicable,
    decision,
  };
  const autoProceduralLines = formatAutoProceduralLines(liveCase);

  // SPEC-029: stale-box warning, from the saved stamps (unsaved edits do not count).
  const stamps: BoxStamps = {
    facts_found_at: caseFull.facts_found_at,
    rules_applicable_at: caseFull.rules_applicable_at,
    conclusion_at: caseFull.conclusion_at,
    decision_at: caseFull.decision_at,
  };
  async function handleReviewed(box: 'rules_applicable' | 'conclusion' | 'decision') {
    const next = await api.markBoxReviewed(caseId, box);
    setCaseFull((prev) => (prev ? { ...prev, ...next } : prev));
  }
  // SPEC-031: AI proposals for the data gaps of a phrase box. Accepting writes
  // through the box handle, which also closes its Tab gap session.
  const gapPanel = (text: string, handle: React.RefObject<GhostTextareaHandle | null>, set: (v: string) => void) => (
    <GapFillPanel
      caseId={caseId}
      text={text}
      notes={notes}
      factsFound={factsFound}
      onApply={(next) => (handle.current ? handle.current.replaceValue(next) : set(next))}
    />
  );
  const staleNote = (box: 'rules_applicable' | 'conclusion' | 'decision') => (
    <StaleNote
      sources={staleSources(box as ChainBox, stamps)}
      onReview={() => handleReviewed(box)}
    />
  );

  // SPEC-026: one line per writing box that still has gaps or X / Y labels.
  // Recomputed every render from the same texts the boxes show.
  const pendingLines = (
    [
      ['Procedural Matters', proceduralMatters],
      ['Facts Found', factsFound],
      ['Conclusion', conclusion],
      ['Rules Applicable', rulesApplicable],
      ['Decision', decision],
    ] as const
  ).flatMap(([box, text]) => {
    const p = pendingMarks(text);
    return p.count > 0 ? [`${box}: ${describePending(p)}`] : [];
  });

  // D-005 follow-up: single-click .html export of the full decision,
  // matching the source Word template's layout, built from the live
  // (possibly unsaved) case data — replaces the old "Copy all" button.
  function handleDownload() {
    // SPEC-026: warn, never block — the drafter may want an unfinished draft.
    if (pendingLines.length > 0 && !window.confirm(`${pendingLines.join('\n')}\n\nDownload anyway?`)) return;
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

      <section className="box hearing-notes-box">
        <h2>Hearing notes</h2>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </section>

      <div className="tab-bar-row">
        <TabBar caseTab={caseTab} onSelect={setCaseTab} />
        <button type="button" className="btn-accent" onClick={handleDownload}>
          Download decision (.html)
        </button>
        <button type="button" className="btn-accent" onClick={handleSaveAll} disabled={savingAll}>
          {savingAll ? 'Saving…' : 'Save'}
        </button>
      </div>

      {caseTab === 'attachments' && (
        <div className="tab-panel">
          <AttachmentsTab
            attachments={caseFull.attachments}
            extraction={extraction}
            extracting={extracting}
            uploadingAttachment={uploadingAttachment}
            attachmentInputRef={attachmentInputRef}
            onUpload={handleUploadAttachment}
            onRemove={handleRemoveAttachment}
            onProcess={handleProcessAttachments}
          />
        </div>
      )}

      {caseTab === 'general' && (
        <div className="tab-panel">
          <GeneralTab
            caseNumber={caseNumber}
            onCaseNumberChange={setCaseNumber}
            day={day}
            onDayChange={setDay}
            race={race}
            onRaceChange={setRace}
            withCaseNote={withCaseNote}
            onWithCaseNoteChange={setWithCaseNote}
            extraction={extraction}
            onUseSuggestedDay={useSuggestedDay}
            onUseSuggestedRace={useSuggestedRace}
            linkedCases={caseFull.linkedCases}
            otherCases={otherCases}
            onLinkCase={handleLinkCase}
            onRemoveLink={handleRemoveLink}
          />
        </div>
      )}

      {caseTab === 'parties' && (
        <div className="tab-panel">
          <PartiesTab
            liveCase={liveCase}
            partyDrafts={partyDrafts}
            partyForm={partyForm}
            setPartyForm={setPartyForm}
            witnessDraft={witnessDraft}
            witnessName={witnessName}
            setWitnessName={setWitnessName}
            witnessRole={witnessRole}
            setWitnessRole={setWitnessRole}
            extraction={extraction}
            boats={boats}
            people={people}
            copied={copied}
            markCopied={markCopied}
            onUnstageParty={handleUnstageParty}
            onStageParty={handleStageParty}
            onAddSuggestedParty={addSuggestedParty}
            onUnstageWitness={handleUnstageWitness}
            onStageWitness={handleStageWitness}
            onAddSuggestedWitness={addSuggestedWitness}
          />
        </div>
      )}

      {caseTab === 'procedural' && (
        <div className="tab-panel">
      {/* 3. Procedural Matters */}
      <WritingBox
        label="Procedural Matters"
        copyText={proceduralMatters}
        copied={!!copied.procedural_matters}
        below={gapPanel(proceduralMatters, proceduralBoxRef, setProceduralMatters)}
        onCopied={() => markCopied('procedural_matters')}
        tray={
          <ProposalsTray
            caseId={caseId}
            box="procedural_matters"
            text={proceduralMatters}
            notes={notes}
            instantLines={autoProceduralLines}
            refreshKey={phraseRefresh}
            onInsert={(text) => proceduralBoxRef.current?.insertAtCaret(text)}
            getSelectedText={() => proceduralBoxRef.current?.getSelectedText() ?? ''}
            onPhraseSaved={() => setPhraseRefresh((n) => n + 1)}
          />
        }
        textarea={
          <GhostTextarea
            caseId={caseId}
            box="procedural_matters"
            value={proceduralMatters}
            onChange={setProceduralMatters}
            rows={4}
            ref={proceduralBoxRef}
            phraseBox="procedural_matters"
            phraseRefreshKey={phraseRefresh}
            parties={sailNumberRoles}
          />
        }
      />
        </div>
      )}

      {caseTab === 'facts' && (
        <div className="tab-panel">
      {/* 4. Facts Found */}
      <WritingBox
        label="Facts Found"
        copyText={factsFound}
        copied={!!copied.facts_found}
        below={gapPanel(factsFound, factsBoxRef, setFactsFound)}
        onCopied={() => markCopied('facts_found')}
        tray={
          <ProposalsTray
            caseId={caseId}
            box="facts_found"
            text={factsFound}
            notes={notes}
            refreshKey={phraseRefresh}
            onInsert={(text) => factsBoxRef.current?.insertAtCaret(text)}
            getSelectedText={() => factsBoxRef.current?.getSelectedText() ?? ''}
            onPhraseSaved={() => setPhraseRefresh((n) => n + 1)}
          />
        }
        textarea={
          <GhostTextarea
            caseId={caseId}
            box="facts_found"
            value={factsFound}
            onChange={setFactsFound}
            rows={6}
            sailNumberRoles={sailNumberRoles}
            ref={factsBoxRef}
            phraseBox="facts_found"
            phraseRefreshKey={phraseRefresh}
            parties={sailNumberRoles}
          />
        }
        reference={
          <PartyReference
            initiators={partyDrafts.initiator.map((p) => ({ sailNumber: p.sailNumber, boatName: p.boatName }))}
            respondents={partyDrafts.respondent.map((p) => ({ sailNumber: p.sailNumber, boatName: p.boatName }))}
            currentText={factsFound}
          />
        }
      />
        </div>
      )}

      {caseTab === 'conclusion' && (
        <div className="tab-panel">
      {/* 5. Conclusion */}
        <WritingBox
          label="Conclusion"
          copyText={conclusion}
          notes={staleNote('conclusion')}
          copied={!!copied.conclusion}
          below={gapPanel(conclusion, conclusionBoxRef, setConclusion)}
          onCopied={() => markCopied('conclusion')}
          tray={
            <ProposalsTray
              caseId={caseId}
              box="conclusion"
              text={conclusion}
              notes={notes}
              chain={{ facts_found: factsFound, rules_applicable: rulesApplicable }}
              refreshKey={phraseRefresh}
              onInsert={(text) => conclusionBoxRef.current?.insertAtCaret(text)}
              getSelectedText={() => conclusionBoxRef.current?.getSelectedText() ?? ''}
              onPhraseSaved={() => setPhraseRefresh((n) => n + 1)}
            />
          }
          textarea={
            <GhostTextarea
              caseId={caseId}
              box="conclusion"
              chain={{
                facts_found: factsFound,
                rules_applicable: rulesApplicable,
                party_position: partyPositionContext(extraction),
              }}
              value={conclusion}
              onChange={setConclusion}
              rows={4}
              ref={conclusionBoxRef}
              phraseBox="conclusion"
              phraseRefreshKey={phraseRefresh}
              parties={sailNumberRoles}
            />
          }
        />
        </div>
      )}

      {caseTab === 'rules' && (
        <div className="tab-panel">
        {/* 6. Rules Applicable — SPEC-023 / SPEC-034: a writing box like the others; the
            citations tray sits above the text box, its warnings under the header. */}
        <WritingBox
          label="Rules Applicable"
          copyText={formatRulesApplicable(liveCase)}
          pendingText={rulesApplicable}
          notes={
            <>
              {staleNote('rules_applicable')}
              <RulesWarnings
                missing={missingCitations(liveCase)}
                hasText={rulesApplicable.trim() !== ''}
                unresolved={unresolvedRefs}
                onInsertMissing={() =>
                  setRulesApplicable((prev) => {
                    const refs = missingCitations(liveCase).join('\n');
                    return prev ? `${prev}\n${refs}` : refs;
                  })
                }
              />
            </>
          }
          copied={!!copied.rules_applicable}
          onCopied={() => markCopied('rules_applicable')}
          tray={
            <RulesSuggestions
              caseId={caseId}
              citations={caseFull.ruleCitations}
              factsText={factsFound}
              onInsert={(text) => setRulesApplicable((prev) => (prev ? `${prev}\n${text}` : text))}
              onAddCitation={handleAddRule}
              onRemoveCitation={handleRemoveRule}
            />
          }
          textarea={
            <GhostTextarea
              caseId={caseId}
              box="rules_applicable"
              chain={{ facts_found: factsFound }}
              value={rulesApplicable}
              onChange={setRulesApplicable}
              rows={6}
            />
          }
        />
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
      <WritingBox
        label="Decision"
        copyText={decision}
        notes={staleNote('decision')}
        copied={!!copied.decision}
        below={gapPanel(decision, decisionBoxRef, setDecision)}
        onCopied={() => markCopied('decision')}
        tray={
          <ProposalsTray
            caseId={caseId}
            box="decision"
            text={decision}
            notes={notes}
            chain={{ facts_found: factsFound, rules_applicable: rulesApplicable, conclusion }}
            refreshKey={phraseRefresh}
            onInsert={(text) => decisionBoxRef.current?.insertAtCaret(text)}
            getSelectedText={() => decisionBoxRef.current?.getSelectedText() ?? ''}
            onPhraseSaved={() => setPhraseRefresh((n) => n + 1)}
          />
        }
        textarea={
          <GhostTextarea
            caseId={caseId}
            box="decision"
            chain={{
              facts_found: factsFound,
              rules_applicable: rulesApplicable,
              conclusion,
              party_position: partyPositionContext(extraction),
            }}
            value={decision}
            onChange={setDecision}
            rows={4}
            ref={decisionBoxRef}
            phraseBox="decision"
            phraseRefreshKey={phraseRefresh}
            parties={sailNumberRoles}
          />
        }
        reference={
          <PartyReference
            initiators={partyDrafts.initiator.map((p) => ({ sailNumber: p.sailNumber, boatName: p.boatName }))}
            respondents={partyDrafts.respondent.map((p) => ({ sailNumber: p.sailNumber, boatName: p.boatName }))}
            race={race}
            currentText={decision}
          />
        }
      />
        </div>
      )}

      {caseTab === 'review' && (
        <div className="tab-panel">
          <ReviewTab
            proceduralMatters={proceduralMatters}
            onProceduralMattersChange={setProceduralMatters}
            factsFound={factsFound}
            onFactsFoundChange={setFactsFound}
            conclusion={conclusion}
            onConclusionChange={setConclusion}
            rulesApplicable={rulesApplicable}
            onRulesApplicableChange={setRulesApplicable}
            decision={decision}
            onDecisionChange={setDecision}
            informedAt={informedAt}
            onInformedAtChange={setInformedAt}
            caseId={caseId}
            eventId={caseFull.event.id}
            jury={caseFull.jury}
            onJuryChange={() => refreshCasePart('jury')}
            findOrCreatePerson={findOrCreatePerson}
            pending={pendingLines}
          />
        </div>
      )}
    </div>
  );
}

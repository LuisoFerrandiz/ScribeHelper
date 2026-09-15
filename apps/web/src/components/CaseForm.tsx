import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { AIDraftPanel } from './AIDraftPanel';
import { CopyBox } from './CopyBox';
import { PhrasePicker } from './PhrasePicker';
import {
  formatFullDecision,
  formatJuryMembers,
  formatParties,
  formatRulesApplicable,
  formatWitnesses,
} from '../format';
import type { BoatRow, CaseFull, CaseRow, PartyRole, PersonRow, ResourceSearchHit } from '../types';

interface PoolEntry {
  personId: number;
  fullName: string;
}

interface Props {
  caseId: number;
}

interface PartyEdit {
  sailNumber: string;
  boatName: string;
  representedBy: string;
}

const emptyParty: PartyEdit = { sailNumber: '', boatName: '', representedBy: '' };

// The case form. Boxes in fixed form order (CONTEXT.md section 4):
// Parties, Witness, Procedural Matters, Facts Found, Conclusion,
// Rules Applicable, Decision, Jury Members. Every box copies to the
// clipboard (DECISIONS.md D-005); the four free-text boxes plus a
// Save button persist to the case row.
export function CaseForm({ caseId }: Props) {
  const [caseFull, setCaseFull] = useState<CaseFull | null>(null);
  const [boats, setBoats] = useState<BoatRow[]>([]);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [otherCases, setOtherCases] = useState<CaseRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<Record<string, boolean>>({});

  // Scalar fields, edited locally and saved together (Save button).
  const [caseNumber, setCaseNumber] = useState('');
  const [day, setDay] = useState('');
  const [race, setRace] = useState('');
  const [informedAt, setInformedAt] = useState('');
  const [proceduralMatters, setProceduralMatters] = useState('');
  const [factsFound, setFactsFound] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [decision, setDecision] = useState('');

  const [initiator, setInitiator] = useState<PartyEdit>(emptyParty);
  const [respondent, setRespondent] = useState<PartyEdit>(emptyParty);

  const [witnessName, setWitnessName] = useState('');
  const [witnessRole, setWitnessRole] = useState('');

  const [ruleText, setRuleText] = useState('');
  const [ruleQuery, setRuleQuery] = useState('');
  const [ruleHits, setRuleHits] = useState<ResourceSearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  const [linkCaseId, setLinkCaseId] = useState('');

  // Judge pool for this case's event (D-021) — who actually sits on THIS
  // case, and who chairs it, is picked here, not fixed for the event.
  const [judgePool, setJudgePool] = useState<PoolEntry[]>([]);
  const [juryPersonName, setJuryPersonName] = useState('');
  const [juryIsChairman, setJuryIsChairman] = useState(false);

  // UI grouping only — copy-all still walks the fixed CONTEXT.md box
  // order (formatFullDecision), unaffected by which tab is active.
  type CaseTab = 'general' | 'procedural' | 'facts' | 'conclusion' | 'decision';
  const [caseTab, setCaseTab] = useState<CaseTab>('general');

  async function reload() {
    try {
      const [full, allBoats, allPeople, allCases, allPool] = await Promise.all([
        api.getCaseFull(caseId),
        api.listBoats(),
        api.listPeople(),
        api.listCases(),
        api.listJuryMembers(),
      ]);
      setCaseFull(full);
      setBoats(allBoats);
      setPeople(allPeople);
      setOtherCases(allCases.filter((c) => c.event_id === full.event_id && c.id !== caseId));
      const nameById = new Map(allPeople.map((p) => [p.id, p.full_name]));
      setJudgePool(
        allPool
          .filter((j) => j.event_id === full.event_id)
          .map((j) => ({ personId: j.person_id, fullName: nameById.get(j.person_id) ?? '—' })),
      );

      setCaseNumber(full.case_number);
      setDay(full.day ?? '');
      setRace(full.race ?? '');
      setInformedAt(full.informed_at ?? '');
      setProceduralMatters(full.procedural_matters);
      setFactsFound(full.facts_found);
      setConclusion(full.conclusion);
      setDecision(full.decision);

      const i = full.parties.find((p) => p.role === 'initiator');
      const r = full.parties.find((p) => p.role === 'respondent');
      setInitiator({
        sailNumber: i?.sail_number ?? '',
        boatName: i?.boat_name ?? '',
        representedBy: i?.represented_by ?? '',
      });
      setRespondent({
        sailNumber: r?.sail_number ?? '',
        boatName: r?.boat_name ?? '',
        representedBy: r?.represented_by ?? '',
      });

      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
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

  async function handleSaveCase(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateCase(caseId, {
        case_number: caseNumber.trim(),
        day: day.trim() || null,
        race: race.trim() || null,
        informed_at: informedAt.trim() || null,
        procedural_matters: proceduralMatters,
        facts_found: factsFound,
        conclusion,
        decision,
      });
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function saveParty(role: PartyRole) {
    const state = role === 'initiator' ? initiator : respondent;
    const boatId = state.sailNumber.trim()
      ? await findOrCreateBoat(state.sailNumber.trim(), state.boatName.trim() || null)
      : null;
    const representedById = state.representedBy.trim()
      ? await findOrCreatePerson(state.representedBy.trim())
      : null;

    const existing = caseFull?.parties.find((p) => p.role === role);
    if (existing) {
      await api.updateParty(existing.id, { boat_id: boatId, represented_by_id: representedById });
    } else {
      await api.createParty({ case_id: caseId, role, boat_id: boatId, represented_by_id: representedById });
    }
    await reload();
  }

  async function handleAddWitness(e: FormEvent) {
    e.preventDefault();
    if (!witnessName.trim()) return;
    const personId = await findOrCreatePerson(witnessName.trim());
    await api.createWitness({ case_id: caseId, person_id: personId, role: witnessRole.trim() || null });
    setWitnessName('');
    setWitnessRole('');
    await reload();
  }

  async function handleRemoveWitness(id: number) {
    await api.deleteWitness(id);
    await reload();
  }

  async function handleAddJury(e: FormEvent) {
    e.preventDefault();
    const entry = judgePool.find((p) => p.fullName.toLowerCase() === juryPersonName.trim().toLowerCase());
    if (!entry) return; // must be in the event's pool — added via the Jury utility
    await api.createCaseJuryMember({
      case_id: caseId,
      person_id: entry.personId,
      is_chairman: juryIsChairman ? 1 : 0,
    });
    setJuryPersonName('');
    setJuryIsChairman(false);
    await reload();
  }

  async function handleRemoveJury(id: number) {
    await api.deleteCaseJuryMember(id);
    await reload();
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
    await reload();
  }

  async function handleRemoveRule(id: number) {
    await api.deleteRuleCitation(id);
    await reload();
  }

  async function handleAddLink(e: FormEvent) {
    e.preventDefault();
    if (!linkCaseId) return;
    await api.createCaseLink({ case_id: caseId, linked_case_id: Number(linkCaseId) });
    setLinkCaseId('');
    await reload();
  }

  async function handleRemoveLink(linkedCaseId: number) {
    await api.deleteCaseLink({ case_id: caseId, linked_case_id: linkedCaseId });
    await reload();
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

  async function handleCopyAll() {
    await navigator.clipboard.writeText(formatFullDecision(liveCase));
    setCopied({
      parties: true,
      witness: true,
      procedural_matters: true,
      facts_found: true,
      conclusion: true,
      rules_applicable: true,
      decision: true,
      jury_members: true,
    });
  }

  return (
    <div className="page">
      <div className="case-header">
        <h2>Case {caseFull.event.name} — {caseNumber || '(no number)'}</h2>
        <button type="button" onClick={handleCopyAll}>
          Copy all (form order)
        </button>
      </div>
      {error && <p className="error">{error}</p>}

      <nav className="case-tabs">
        <button type="button" onClick={() => setCaseTab('general')} disabled={caseTab === 'general'}>
          1. General &amp; Parties
        </button>
        <button type="button" onClick={() => setCaseTab('procedural')} disabled={caseTab === 'procedural'}>
          2. Procedural Matters
        </button>
        <button type="button" onClick={() => setCaseTab('facts')} disabled={caseTab === 'facts'}>
          3. Facts Found
        </button>
        <button type="button" onClick={() => setCaseTab('conclusion')} disabled={caseTab === 'conclusion'}>
          4. Conclusion
        </button>
        <button type="button" onClick={() => setCaseTab('decision')} disabled={caseTab === 'decision'}>
          5. Decision
        </button>
      </nav>

      {caseTab === 'general' && (
        <>
      <form onSubmit={handleSaveCase} className="case-meta">
        <label>
          Case number
          <input value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} required />
        </label>
        <label>
          Day
          <input value={day} onChange={(e) => setDay(e.target.value)} />
        </label>
        <label>
          Race
          <input value={race} onChange={(e) => setRace(e.target.value)} />
        </label>
        <label>
          Informed at (event time)
          <input
            placeholder="e.g. 2026-09-11 18:30"
            value={informedAt}
            onChange={(e) => setInformedAt(e.target.value)}
          />
        </label>
        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save case'}
        </button>
      </form>

      {/* 1. Parties */}
      <CopyBox
        label="Parties"
        text={formatParties(liveCase)}
        copied={!!copied.parties}
        onCopied={() => markCopied('parties')}
      >
        {(['initiator', 'respondent'] as PartyRole[]).map((role) => {
          const state = role === 'initiator' ? initiator : respondent;
          const setState = role === 'initiator' ? setInitiator : setRespondent;
          return (
            <div key={role} className="party-row">
              <strong>{role === 'initiator' ? 'Initiator' : 'Respondent'}</strong>
              <input
                list="boat-sail-numbers"
                placeholder="Sail number"
                value={state.sailNumber}
                onChange={(e) => setState({ ...state, sailNumber: e.target.value })}
              />
              <input
                list="boat-names"
                placeholder="Boat name"
                value={state.boatName}
                onChange={(e) => setState({ ...state, boatName: e.target.value })}
              />
              <input
                list="people-list"
                placeholder="Represented by"
                value={state.representedBy}
                onChange={(e) => setState({ ...state, representedBy: e.target.value })}
              />
              <button type="button" onClick={() => saveParty(role)}>
                Save
              </button>
            </div>
          );
        })}
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

      {/* 2. Witness */}
      <CopyBox
        label="Witness"
        text={formatWitnesses(liveCase)}
        copied={!!copied.witness}
        onCopied={() => markCopied('witness')}
      >
        <ul className="list">
          {caseFull.witnesses.map((w) => (
            <li key={w.id}>
              {w.full_name}
              {w.role ? ` — ${w.role}` : ''}{' '}
              <button type="button" onClick={() => handleRemoveWitness(w.id)}>
                Remove
              </button>
            </li>
          ))}
          {caseFull.witnesses.length === 0 && <li className="muted">No witnesses yet.</li>}
        </ul>
        <form onSubmit={handleAddWitness} className="inline-form">
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
      </CopyBox>
        </>
      )}

      {caseTab === 'procedural' && (
        <>
      {/* 3. Procedural Matters */}
      <CopyBox
        label="Procedural Matters"
        text={proceduralMatters}
        copied={!!copied.procedural_matters}
        onCopied={() => markCopied('procedural_matters')}
      >
        <textarea
          value={proceduralMatters}
          onChange={(e) => setProceduralMatters(e.target.value)}
          rows={4}
        />
        <PhrasePicker
          box="procedural_matters"
          currentText={proceduralMatters}
          onInsert={(text) => setProceduralMatters((prev) => (prev ? `${prev}\n\n${text}` : text))}
        />
        <AIDraftPanel
          caseId={caseId}
          box="procedural_matters"
          onInsert={(text) => setProceduralMatters((prev) => (prev ? `${prev}\n\n${text}` : text))}
        />
      </CopyBox>
        </>
      )}

      {caseTab === 'facts' && (
        <>
      {/* 4. Facts Found */}
      <CopyBox
        label="Facts Found"
        text={factsFound}
        copied={!!copied.facts_found}
        onCopied={() => markCopied('facts_found')}
      >
        <textarea value={factsFound} onChange={(e) => setFactsFound(e.target.value)} rows={6} />
        <PhrasePicker
          box="facts_found"
          currentText={factsFound}
          onInsert={(text) => setFactsFound((prev) => (prev ? `${prev}\n\n${text}` : text))}
        />
        <AIDraftPanel
          caseId={caseId}
          box="facts_found"
          onInsert={(text) => setFactsFound((prev) => (prev ? `${prev}\n\n${text}` : text))}
        />
      </CopyBox>
        </>
      )}

      {caseTab === 'conclusion' && (
        <>
      {/* 5. Conclusion */}
      <CopyBox
        label="Conclusion"
        text={conclusion}
        copied={!!copied.conclusion}
        onCopied={() => markCopied('conclusion')}
      >
        <textarea value={conclusion} onChange={(e) => setConclusion(e.target.value)} rows={4} />
        <PhrasePicker
          box="conclusion"
          currentText={conclusion}
          onInsert={(text) => setConclusion((prev) => (prev ? `${prev}\n\n${text}` : text))}
        />
        <AIDraftPanel
          caseId={caseId}
          box="conclusion"
          onInsert={(text) => setConclusion((prev) => (prev ? `${prev}\n\n${text}` : text))}
        />
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
        </>
      )}

      {caseTab === 'decision' && (
        <>
      {/* 7. Decision */}
      <CopyBox
        label="Decision"
        text={decision}
        copied={!!copied.decision}
        onCopied={() => markCopied('decision')}
      >
        <textarea value={decision} onChange={(e) => setDecision(e.target.value)} rows={4} />
        <PhrasePicker
          box="decision"
          currentText={decision}
          onInsert={(text) => setDecision((prev) => (prev ? `${prev}\n\n${text}` : text))}
        />
        <AIDraftPanel
          caseId={caseId}
          box="decision"
          onInsert={(text) => setDecision((prev) => (prev ? `${prev}\n\n${text}` : text))}
        />
      </CopyBox>
        </>
      )}

      {caseTab === 'general' && (
        <>
      {/* 8. Jury Members — the panel sitting on THIS case (D-021), picked
          from the event's judge pool (Jury utility, top nav) */}
      <CopyBox
        label="Jury Members"
        text={formatJuryMembers(liveCase)}
        copied={!!copied.jury_members}
        onCopied={() => markCopied('jury_members')}
      >
        <ul className="list">
          {caseFull.jury.map((j) => (
            <li key={j.id}>
              {j.full_name}
              {j.is_chairman ? ' (Chairman)' : ''}{' '}
              <button type="button" onClick={() => handleRemoveJury(j.id)}>
                Remove
              </button>
            </li>
          ))}
          {caseFull.jury.length === 0 && <li className="muted">No jury members assigned to this case yet.</li>}
        </ul>
        {judgePool.length === 0 ? (
          <p className="muted">No judges in this event's pool yet — add them from the Jury utility (top nav).</p>
        ) : (
          <form onSubmit={handleAddJury} className="inline-form">
            <input
              list="judge-pool-list"
              placeholder="Judge name"
              value={juryPersonName}
              onChange={(e) => setJuryPersonName(e.target.value)}
              required
            />
            <label>
              <input type="checkbox" checked={juryIsChairman} onChange={(e) => setJuryIsChairman(e.target.checked)} />
              Chairman
            </label>
            <button type="submit">Add to this case</button>
          </form>
        )}
        <datalist id="judge-pool-list">
          {judgePool.map((p) => (
            <option key={p.personId} value={p.fullName} />
          ))}
        </datalist>
      </CopyBox>

      {/* With Case(s) — not part of the fixed box list, but needed to reach it */}
      <section className="box">
        <h2>With Case(s)</h2>
        <ul className="list">
          {caseFull.linkedCases.map((lc) => (
            <li key={lc.id}>
              Case {lc.case_number}{' '}
              <button type="button" onClick={() => handleRemoveLink(lc.id)}>
                Unlink
              </button>
            </li>
          ))}
          {caseFull.linkedCases.length === 0 && <li className="muted">No linked cases.</li>}
        </ul>
        <form onSubmit={handleAddLink} className="inline-form">
          <select value={linkCaseId} onChange={(e) => setLinkCaseId(e.target.value)} required>
            <option value="">Select a case…</option>
            {otherCases
              .filter((c) => !caseFull.linkedCases.some((lc) => lc.id === c.id))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  Case {c.case_number}
                </option>
              ))}
          </select>
          <button type="submit">Link</button>
        </form>
      </section>
        </>
      )}
    </div>
  );
}

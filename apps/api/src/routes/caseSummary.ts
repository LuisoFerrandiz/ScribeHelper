import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';

export interface CaseSummaryRow {
  id: number;
  case_number: string;
  event_id: number;
  event_name: string;
  decided: boolean;
  initiators: { sail_number: string | null; boat_name: string | null }[];
  respondents: { sail_number: string | null; boat_name: string | null }[];
}

interface CaseJoinRow {
  id: number;
  case_number: string;
  decision: string;
  event_id: number;
  event_name: string;
}

interface PartyJoinRow {
  case_id: number;
  role: 'initiator' | 'respondent';
  sail_number: string | null;
  boat_name: string | null;
}

// Entry screen (SPEC-001): one row per case, grouped by event in the
// frontend, with just enough of each party to render without a second
// round trip per row — the per-case join `caseDetail.ts` already does
// for `/full`, batched here for every case at once instead.
export function registerCaseSummaryRoute(app: FastifyInstance) {
  app.get('/cases/summary', () => {
    const cases = db
      .prepare(
        `SELECT protest_case.id, protest_case.case_number, protest_case.decision,
                event.id AS event_id, event.name AS event_name
         FROM protest_case JOIN event ON event.id = protest_case.event_id
         ORDER BY event.name, protest_case.case_number`,
      )
      .all() as unknown as CaseJoinRow[];

    if (cases.length === 0) return [];

    const caseIds = cases.map((c) => c.id);
    const placeholders = caseIds.map(() => '?').join(',');
    const parties = db
      .prepare(
        `SELECT party.case_id, party.role, boat.sail_number, boat.boat_name
         FROM party LEFT JOIN boat ON boat.id = party.boat_id
         WHERE party.case_id IN (${placeholders})`,
      )
      .all(...caseIds) as unknown as PartyJoinRow[];

    const partiesByCase = new Map<number, PartyJoinRow[]>();
    for (const p of parties) {
      const list = partiesByCase.get(p.case_id) ?? [];
      list.push(p);
      partiesByCase.set(p.case_id, list);
    }

    const rows: CaseSummaryRow[] = cases.map((c) => {
      const caseParties = partiesByCase.get(c.id) ?? [];
      const byRole = (role: 'initiator' | 'respondent') =>
        caseParties.filter((x) => x.role === role).map((p) => ({ sail_number: p.sail_number, boat_name: p.boat_name }));
      return {
        id: c.id,
        case_number: c.case_number,
        event_id: c.event_id,
        event_name: c.event_name,
        decided: c.decision.trim() !== '',
        initiators: byRole('initiator'),
        respondents: byRole('respondent'),
      };
    });

    return rows;
  });
}

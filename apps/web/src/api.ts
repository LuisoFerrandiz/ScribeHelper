import type {
  BoatRow,
  CaseFull,
  CaseLinkRow,
  CaseRow,
  EventRow,
  JuryMemberRow,
  PartyRow,
  PersonRow,
  ResourceFull,
  ResourceKind,
  ResourceRow,
  ResourceSearchHit,
  RuleCitationRow,
  WitnessRow,
} from './types';

// No AI, no external network calls in this phase (RULES.md R-23) — every
// request here goes to the local API, never out to the internet.
//
// Two sources, in priority order: `window.__API_URL__`, written at
// container start by the nginx entrypoint from the API_URL environment
// variable (RULES.md R-16 — configurable without rebuilding the image);
// falling back to Vite's build-time env for `npm run dev`.
declare global {
  interface Window {
    __API_URL__?: string;
  }
}
const API_URL = window.__API_URL__ ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${options?.method ?? 'GET'} ${path} failed: ${res.status} ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const post = <T>(path: string, data: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(data) });
const put = <T>(path: string, data: unknown) =>
  request<T>(path, { method: 'PUT', body: JSON.stringify(data) });
const del = (path: string, data?: unknown) =>
  request<void>(path, { method: 'DELETE', body: data ? JSON.stringify(data) : undefined });

export const api = {
  listEvents: () => request<EventRow[]>('/events'),
  createEvent: (data: Partial<EventRow>) => post<EventRow>('/events', data),

  listPeople: () => request<PersonRow[]>('/people'),
  createPerson: (data: { full_name: string }) => post<PersonRow>('/people', data),

  listBoats: () => request<BoatRow[]>('/boats'),
  createBoat: (data: { sail_number: string; boat_name: string | null }) => post<BoatRow>('/boats', data),

  listJuryMembers: () => request<JuryMemberRow[]>('/jury-members'),
  createJuryMember: (data: Partial<JuryMemberRow>) => post<JuryMemberRow>('/jury-members', data),
  deleteJuryMember: (id: number) => del(`/jury-members/${id}`),

  listCases: () => request<CaseRow[]>('/cases'),
  createCase: (data: Partial<CaseRow>) => post<CaseRow>('/cases', data),
  updateCase: (id: number, data: Partial<CaseRow>) => put<CaseRow>(`/cases/${id}`, data),
  getCaseFull: (id: number) => request<CaseFull>(`/cases/${id}/full`),

  createParty: (data: Partial<PartyRow>) => post<PartyRow>('/parties', data),
  updateParty: (id: number, data: Partial<PartyRow>) => put<PartyRow>(`/parties/${id}`, data),

  createWitness: (data: Partial<WitnessRow>) => post<WitnessRow>('/witnesses', data),
  deleteWitness: (id: number) => del(`/witnesses/${id}`),

  createRuleCitation: (data: Partial<RuleCitationRow>) => post<RuleCitationRow>('/rule-citations', data),
  deleteRuleCitation: (id: number) => del(`/rule-citations/${id}`),

  createCaseLink: (data: CaseLinkRow) => post<CaseLinkRow>('/case-links', data),
  deleteCaseLink: (data: CaseLinkRow) => del('/case-links', data),

  listResources: (kind: ResourceKind, status?: string) =>
    request<ResourceRow[]>(`/resources?kind=${kind}${status ? `&status=${status}` : ''}`),
  getResource: (id: number) => request<ResourceFull>(`/resources/${id}`),
  uploadResource: async (form: FormData): Promise<ResourceFull> => {
    const res = await fetch(`${API_URL}/resources`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`upload failed: ${res.status} ${await res.text().catch(() => '')}`);
    return res.json();
  },
  acceptResource: (id: number) => post<ResourceRow>(`/resources/${id}/accept`, {}),
  rejectResource: (id: number) => request<void>(`/resources/${id}/reject`, { method: 'POST' }),
  deleteResource: (id: number) => del(`/resources/${id}`),
  searchResources: (q: string) => request<ResourceSearchHit[]>(`/resources/search?q=${encodeURIComponent(q)}`),
};

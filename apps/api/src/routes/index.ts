import type { FastifyInstance } from 'fastify';
import { registerCrud } from './crud.js';
import { registerCaseLinkRoutes } from './caseLinks.js';
import { registerCaseDetailRoute } from './caseDetail.js';
import { registerCaseSummaryRoute } from './caseSummary.js';
import { registerCaseAttachmentRoutes } from './caseAttachments.js';
import { registerCaseDeleteRoute } from './caseDelete.js';
import { registerExtractAttachmentsRoute } from './extractAttachments.js';
import { registerResourceRoutes } from './resources.js';
import { registerPhraseRoutes } from './phrases.js';
import { registerDraftRoute } from './draft.js';
import { registerExampleSuggestionsRoute } from './exampleSuggestions.js';
import { registerCompleteRoute } from './complete.js';
import { registerAuthRoutes } from './auth.js';
import { registerUserRoutes } from './users.js';

export function registerRoutes(app: FastifyInstance) {
  registerAuthRoutes(app);
  registerUserRoutes(app);

  registerCrud(app, 'people', { table: 'person', fields: ['full_name'] });

  registerCrud(app, 'events', {
    table: 'event',
    fields: ['name', 'venue', 'start_date', 'end_date', 'timezone'],
  });

  // Event's judge pool (D-021) — added once per regatta, never per case.
  registerCrud(app, 'jury-members', {
    table: 'jury_member',
    fields: ['event_id', 'person_id', 'is_chairman'],
  });

  // Panel actually sitting on one case, picked from that case's event
  // pool (D-021) — chairman is decided here, not at the pool level.
  registerCrud(app, 'case-jury-members', {
    table: 'case_jury_member',
    fields: ['case_id', 'person_id', 'is_chairman'],
  });

  registerCrud(app, 'boats', { table: 'boat', fields: ['sail_number', 'boat_name'] });

  registerCrud(app, 'cases', {
    table: 'protest_case',
    fields: [
      'event_id',
      'case_number',
      'case_type',
      'day',
      'race',
      'informed_at',
      'with_case_note',
      'procedural_matters',
      'facts_found',
      'conclusion',
      'decision',
    ],
    touchUpdatedAt: true,
    skipDelete: true, // SPEC-015: dedicated route below instead
  });

  registerCrud(app, 'parties', {
    table: 'party',
    fields: ['case_id', 'role', 'boat_id', 'represented_by_id'],
  });

  registerCrud(app, 'witnesses', {
    table: 'witness',
    fields: ['case_id', 'person_id', 'role'],
  });

  registerCrud(app, 'rule-citations', {
    table: 'case_rule_citation',
    fields: ['case_id', 'rule_reference', 'position'],
  });

  registerCaseLinkRoutes(app);
  registerCaseSummaryRoute(app);
  registerCaseDetailRoute(app);
  registerCaseAttachmentRoutes(app);
  registerCaseDeleteRoute(app);
  registerExtractAttachmentsRoute(app);
  registerResourceRoutes(app);
  registerPhraseRoutes(app);
  registerDraftRoute(app);
  registerExampleSuggestionsRoute(app);
  registerCompleteRoute(app);
}

/**
 * Generated Route Helpers — DO NOT EDIT
 *
 * Re-run:  node scripts/manifest/generate-route-manifest.mjs
 * Generated at: 2026-02-16T21:27:39.823Z
 * Total routes: 412
 */

// eslint-disable-next-line -- generated file, string literals are canonical definitions

// ---------------------------------------------------------------------------
// Route path builders
// ---------------------------------------------------------------------------

/** GET /api/accounting/accounts */
export const accountingAccounts = (): string => "/api/accounting/accounts";

/** GET /api/accounting/accounts/:id */
export const accountingAccountsById = (id: string): string => "/api/accounting/accounts/:id".replace(":id", encodeURIComponent(id));

/** GET /api/administrative/chat/threads */
export const administrativeChatThreads = (): string => "/api/administrative/chat/threads";

/** PATCH /api/administrative/chat/threads/:threadId */
export const administrativeChatThreadsByThreadId = (threadId: string): string => "/api/administrative/chat/threads/:threadId".replace(":threadId", encodeURIComponent(threadId));

/** GET /api/administrative/chat/threads/:threadId/messages */
export const administrativeChatThreadsMessages = (threadId: string): string => "/api/administrative/chat/threads/:threadId/messages".replace(":threadId", encodeURIComponent(threadId));

/** GET, POST /api/administrative/tasks */
export const administrativeTasks = (): string => "/api/administrative/tasks";

/** GET, PATCH, DELETE /api/administrative/tasks/:id */
export const administrativeTasksById = (id: string): string => "/api/administrative/tasks/:id".replace(":id", encodeURIComponent(id));

/** GET /api/ai/suggestions */
export const aiSuggestions = (): string => "/api/ai/suggestions";

/** GET /api/ai/summaries/:eventId */
export const aiSummaries = (eventId: string): string => "/api/ai/summaries/:eventId".replace(":eventId", encodeURIComponent(eventId));

/** GET /api/analytics/events/profitability */
export const analyticsEventsProfitability = (): string => "/api/analytics/events/profitability";

/** GET /api/analytics/finance */
export const analyticsFinance = (): string => "/api/analytics/finance";

/** GET /api/analytics/kitchen */
export const analyticsKitchen = (): string => "/api/analytics/kitchen";

/** GET /api/analytics/staff/employees/:employeeId */
export const analyticsStaffEmployees = (employeeId: string): string => "/api/analytics/staff/employees/:employeeId".replace(":employeeId", encodeURIComponent(employeeId));

/** GET /api/analytics/staff/summary */
export const analyticsStaffSummary = (): string => "/api/analytics/staff/summary";

/** GET /api/collaboration/auth */
export const collaborationAuth = (): string => "/api/collaboration/auth";

/** POST /api/collaboration/notifications/commands/create */
export const collaborationNotificationsCommandsCreate = (): string => "/api/collaboration/notifications/commands/create";

/** POST /api/collaboration/notifications/commands/mark-dismissed */
export const collaborationNotificationsCommandsMarkDismissed = (): string => "/api/collaboration/notifications/commands/mark-dismissed";

/** POST /api/collaboration/notifications/commands/mark-read */
export const collaborationNotificationsCommandsMarkRead = (): string => "/api/collaboration/notifications/commands/mark-read";

/** POST /api/collaboration/notifications/commands/remove */
export const collaborationNotificationsCommandsRemove = (): string => "/api/collaboration/notifications/commands/remove";

/** POST /api/collaboration/workflows/commands/activate */
export const collaborationWorkflowsCommandsActivate = (): string => "/api/collaboration/workflows/commands/activate";

/** POST /api/collaboration/workflows/commands/create */
export const collaborationWorkflowsCommandsCreate = (): string => "/api/collaboration/workflows/commands/create";

/** POST /api/collaboration/workflows/commands/deactivate */
export const collaborationWorkflowsCommandsDeactivate = (): string => "/api/collaboration/workflows/commands/deactivate";

/** POST /api/collaboration/workflows/commands/update */
export const collaborationWorkflowsCommandsUpdate = (): string => "/api/collaboration/workflows/commands/update";

/** GET /api/command-board */
export const commandBoard = (): string => "/api/command-board";

/** GET /api/command-board/:boardId */
export const commandBoardByBoardId = (boardId: string): string => "/api/command-board/:boardId".replace(":boardId", encodeURIComponent(boardId));

/** GET /api/command-board/:boardId/cards */
export const commandBoardCards = (boardId: string): string => "/api/command-board/:boardId/cards".replace(":boardId", encodeURIComponent(boardId));

/** GET /api/command-board/:boardId/cards/:cardId */
export const commandBoardCardsByBoardId = (boardId: string, cardId: string): string => "/api/command-board/:boardId/cards/:cardId".replace(":boardId", encodeURIComponent(boardId)).replace(":cardId", encodeURIComponent(cardId));

/** GET /api/command-board/:boardId/connections */
export const commandBoardConnections = (boardId: string): string => "/api/command-board/:boardId/connections".replace(":boardId", encodeURIComponent(boardId));

/** GET /api/command-board/:boardId/connections/:connectionId */
export const commandBoardConnectionsByBoardId = (boardId: string, connectionId: string): string => "/api/command-board/:boardId/connections/:connectionId".replace(":boardId", encodeURIComponent(boardId)).replace(":connectionId", encodeURIComponent(connectionId));

/** POST /api/command-board/:boardId/draft */
export const commandBoardDraft = (boardId: string): string => "/api/command-board/:boardId/draft".replace(":boardId", encodeURIComponent(boardId));

/** GET /api/command-board/:boardId/groups */
export const commandBoardGroups = (boardId: string): string => "/api/command-board/:boardId/groups".replace(":boardId", encodeURIComponent(boardId));

/** GET, PUT /api/command-board/:boardId/groups/:groupId */
export const commandBoardGroupsByBoardId = (boardId: string, groupId: string): string => "/api/command-board/:boardId/groups/:groupId".replace(":boardId", encodeURIComponent(boardId)).replace(":groupId", encodeURIComponent(groupId));

/** POST /api/command-board/:boardId/groups/:groupId/cards */
export const commandBoardGroupsCards = (boardId: string, groupId: string): string => "/api/command-board/:boardId/groups/:groupId/cards".replace(":boardId", encodeURIComponent(boardId)).replace(":groupId", encodeURIComponent(groupId));

/** GET /api/command-board/:boardId/replay */
export const commandBoardReplay = (boardId: string): string => "/api/command-board/:boardId/replay".replace(":boardId", encodeURIComponent(boardId));

/** POST /api/command-board/boards/commands/activate */
export const commandBoardBoardsCommandsActivate = (): string => "/api/command-board/boards/commands/activate";

/** POST /api/command-board/boards/commands/create */
export const commandBoardBoardsCommandsCreate = (): string => "/api/command-board/boards/commands/create";

/** POST /api/command-board/boards/commands/deactivate */
export const commandBoardBoardsCommandsDeactivate = (): string => "/api/command-board/boards/commands/deactivate";

/** POST /api/command-board/boards/commands/update */
export const commandBoardBoardsCommandsUpdate = (): string => "/api/command-board/boards/commands/update";

/** POST /api/command-board/cards/commands/create */
export const commandBoardCardsCommandsCreate = (): string => "/api/command-board/cards/commands/create";

/** POST /api/command-board/cards/commands/move */
export const commandBoardCardsCommandsMove = (): string => "/api/command-board/cards/commands/move";

/** POST /api/command-board/cards/commands/remove */
export const commandBoardCardsCommandsRemove = (): string => "/api/command-board/cards/commands/remove";

/** POST /api/command-board/cards/commands/resize */
export const commandBoardCardsCommandsResize = (): string => "/api/command-board/cards/commands/resize";

/** POST /api/command-board/cards/commands/update */
export const commandBoardCardsCommandsUpdate = (): string => "/api/command-board/cards/commands/update";

/** POST /api/command-board/connections/commands/create */
export const commandBoardConnectionsCommandsCreate = (): string => "/api/command-board/connections/commands/create";

/** POST /api/command-board/connections/commands/remove */
export const commandBoardConnectionsCommandsRemove = (): string => "/api/command-board/connections/commands/remove";

/** POST /api/command-board/groups/commands/create */
export const commandBoardGroupsCommandsCreate = (): string => "/api/command-board/groups/commands/create";

/** POST /api/command-board/groups/commands/remove */
export const commandBoardGroupsCommandsRemove = (): string => "/api/command-board/groups/commands/remove";

/** POST /api/command-board/groups/commands/update */
export const commandBoardGroupsCommandsUpdate = (): string => "/api/command-board/groups/commands/update";

/** GET, POST /api/command-board/layouts */
export const commandBoardLayouts = (): string => "/api/command-board/layouts";

/** GET /api/command-board/layouts/:layoutId */
export const commandBoardLayoutsByLayoutId = (layoutId: string): string => "/api/command-board/layouts/:layoutId".replace(":layoutId", encodeURIComponent(layoutId));

/** POST /api/command-board/layouts/commands/create */
export const commandBoardLayoutsCommandsCreate = (): string => "/api/command-board/layouts/commands/create";

/** POST /api/command-board/layouts/commands/remove */
export const commandBoardLayoutsCommandsRemove = (): string => "/api/command-board/layouts/commands/remove";

/** POST /api/command-board/layouts/commands/update */
export const commandBoardLayoutsCommandsUpdate = (): string => "/api/command-board/layouts/commands/update";

/** GET /api/conflicts/detect */
export const conflictsDetect = (): string => "/api/conflicts/detect";

/** POST /api/crm/client-contacts/commands/create */
export const crmClientContactsCommandsCreate = (): string => "/api/crm/client-contacts/commands/create";

/** POST /api/crm/client-contacts/commands/remove */
export const crmClientContactsCommandsRemove = (): string => "/api/crm/client-contacts/commands/remove";

/** POST /api/crm/client-contacts/commands/set-primary */
export const crmClientContactsCommandsSetPrimary = (): string => "/api/crm/client-contacts/commands/set-primary";

/** POST /api/crm/client-contacts/commands/update */
export const crmClientContactsCommandsUpdate = (): string => "/api/crm/client-contacts/commands/update";

/** POST /api/crm/client-interactions/commands/complete */
export const crmClientInteractionsCommandsComplete = (): string => "/api/crm/client-interactions/commands/complete";

/** POST /api/crm/client-interactions/commands/create */
export const crmClientInteractionsCommandsCreate = (): string => "/api/crm/client-interactions/commands/create";

/** POST /api/crm/client-interactions/commands/update */
export const crmClientInteractionsCommandsUpdate = (): string => "/api/crm/client-interactions/commands/update";

/** POST /api/crm/client-preferences/commands/create */
export const crmClientPreferencesCommandsCreate = (): string => "/api/crm/client-preferences/commands/create";

/** POST /api/crm/client-preferences/commands/remove */
export const crmClientPreferencesCommandsRemove = (): string => "/api/crm/client-preferences/commands/remove";

/** POST /api/crm/client-preferences/commands/update */
export const crmClientPreferencesCommandsUpdate = (): string => "/api/crm/client-preferences/commands/update";

/** GET /api/crm/clients */
export const crmClients = (): string => "/api/crm/clients";

/** GET /api/crm/clients/:id */
export const crmClientsById = (id: string): string => "/api/crm/clients/:id".replace(":id", encodeURIComponent(id));

/** GET, POST /api/crm/clients/:id/contacts */
export const crmClientsContacts = (id: string): string => "/api/crm/clients/:id/contacts".replace(":id", encodeURIComponent(id));

/** GET /api/crm/clients/:id/events */
export const crmClientsEvents = (id: string): string => "/api/crm/clients/:id/events".replace(":id", encodeURIComponent(id));

/** GET, POST /api/crm/clients/:id/interactions */
export const crmClientsInteractions = (id: string): string => "/api/crm/clients/:id/interactions".replace(":id", encodeURIComponent(id));

/** PUT, DELETE /api/crm/clients/:id/interactions/:interactionId */
export const crmClientsInteractionsById = (id: string, interactionId: string): string => "/api/crm/clients/:id/interactions/:interactionId".replace(":id", encodeURIComponent(id)).replace(":interactionId", encodeURIComponent(interactionId));

/** GET, POST /api/crm/clients/:id/preferences */
export const crmClientsPreferences = (id: string): string => "/api/crm/clients/:id/preferences".replace(":id", encodeURIComponent(id));

/** POST /api/crm/clients/commands/archive */
export const crmClientsCommandsArchive = (): string => "/api/crm/clients/commands/archive";

/** POST /api/crm/clients/commands/create */
export const crmClientsCommandsCreate = (): string => "/api/crm/clients/commands/create";

/** POST /api/crm/clients/commands/reactivate */
export const crmClientsCommandsReactivate = (): string => "/api/crm/clients/commands/reactivate";

/** POST /api/crm/clients/commands/update */
export const crmClientsCommandsUpdate = (): string => "/api/crm/clients/commands/update";

/** POST /api/crm/leads/commands/archive */
export const crmLeadsCommandsArchive = (): string => "/api/crm/leads/commands/archive";

/** POST /api/crm/leads/commands/convert-to-client */
export const crmLeadsCommandsConvertToClient = (): string => "/api/crm/leads/commands/convert-to-client";

/** POST /api/crm/leads/commands/create */
export const crmLeadsCommandsCreate = (): string => "/api/crm/leads/commands/create";

/** POST /api/crm/leads/commands/disqualify */
export const crmLeadsCommandsDisqualify = (): string => "/api/crm/leads/commands/disqualify";

/** POST /api/crm/leads/commands/update */
export const crmLeadsCommandsUpdate = (): string => "/api/crm/leads/commands/update";

/** POST /api/crm/proposal-line-items/commands/create */
export const crmProposalLineItemsCommandsCreate = (): string => "/api/crm/proposal-line-items/commands/create";

/** POST /api/crm/proposal-line-items/commands/remove */
export const crmProposalLineItemsCommandsRemove = (): string => "/api/crm/proposal-line-items/commands/remove";

/** POST /api/crm/proposal-line-items/commands/update */
export const crmProposalLineItemsCommandsUpdate = (): string => "/api/crm/proposal-line-items/commands/update";

/** GET /api/crm/proposals */
export const crmProposals = (): string => "/api/crm/proposals";

/** GET /api/crm/proposals/:id */
export const crmProposalsById = (id: string): string => "/api/crm/proposals/:id".replace(":id", encodeURIComponent(id));

/** POST /api/crm/proposals/:id/send */
export const crmProposalsSend = (id: string): string => "/api/crm/proposals/:id/send".replace(":id", encodeURIComponent(id));

/** POST /api/crm/proposals/commands/accept */
export const crmProposalsCommandsAccept = (): string => "/api/crm/proposals/commands/accept";

/** POST /api/crm/proposals/commands/create */
export const crmProposalsCommandsCreate = (): string => "/api/crm/proposals/commands/create";

/** POST /api/crm/proposals/commands/mark-viewed */
export const crmProposalsCommandsMarkViewed = (): string => "/api/crm/proposals/commands/mark-viewed";

/** POST /api/crm/proposals/commands/reject */
export const crmProposalsCommandsReject = (): string => "/api/crm/proposals/commands/reject";

/** POST /api/crm/proposals/commands/send */
export const crmProposalsCommandsSend = (): string => "/api/crm/proposals/commands/send";

/** POST /api/crm/proposals/commands/update */
export const crmProposalsCommandsUpdate = (): string => "/api/crm/proposals/commands/update";

/** POST /api/crm/proposals/commands/withdraw */
export const crmProposalsCommandsWithdraw = (): string => "/api/crm/proposals/commands/withdraw";

/** GET /api/crm/venues */
export const crmVenues = (): string => "/api/crm/venues";

/** GET /api/crm/venues/:id */
export const crmVenuesById = (id: string): string => "/api/crm/venues/:id".replace(":id", encodeURIComponent(id));

/** GET /api/crm/venues/:id/events */
export const crmVenuesEvents = (id: string): string => "/api/crm/venues/:id/events".replace(":id", encodeURIComponent(id));

/** GET /api/cron/idempotency-cleanup */
export const cronIdempotencyCleanup = (): string => "/api/cron/idempotency-cleanup";

/** GET /api/events */
export const events = (): string => "/api/events";

/** GET /api/events/:eventId/export/csv */
export const eventsExportCsv = (eventId: string): string => "/api/events/:eventId/export/csv".replace(":eventId", encodeURIComponent(eventId));

/** GET, POST /api/events/:eventId/guests */
export const eventsGuests = (eventId: string): string => "/api/events/:eventId/guests".replace(":eventId", encodeURIComponent(eventId));

/** GET /api/events/:eventId/warnings */
export const eventsWarnings = (eventId: string): string => "/api/events/:eventId/warnings".replace(":eventId", encodeURIComponent(eventId));

/** GET /api/events/allergens/check */
export const eventsAllergensCheck = (): string => "/api/events/allergens/check";

/** POST /api/events/allergens/warnings/acknowledge */
export const eventsAllergensWarningsAcknowledge = (): string => "/api/events/allergens/warnings/acknowledge";

/** GET, POST /api/events/battle-boards */
export const eventsBattleBoards = (): string => "/api/events/battle-boards";

/** GET, PUT, DELETE /api/events/battle-boards/:boardId */
export const eventsBattleBoardsByBoardId = (boardId: string): string => "/api/events/battle-boards/:boardId".replace(":boardId", encodeURIComponent(boardId));

/** POST /api/events/battle-boards/commands/add-dish */
export const eventsBattleBoardsCommandsAddDish = (): string => "/api/events/battle-boards/commands/add-dish";

/** POST /api/events/battle-boards/commands/create */
export const eventsBattleBoardsCommandsCreate = (): string => "/api/events/battle-boards/commands/create";

/** POST /api/events/battle-boards/commands/finalize */
export const eventsBattleBoardsCommandsFinalize = (): string => "/api/events/battle-boards/commands/finalize";

/** POST /api/events/battle-boards/commands/open */
export const eventsBattleBoardsCommandsOpen = (): string => "/api/events/battle-boards/commands/open";

/** POST /api/events/battle-boards/commands/remove-dish */
export const eventsBattleBoardsCommandsRemoveDish = (): string => "/api/events/battle-boards/commands/remove-dish";

/** POST /api/events/battle-boards/commands/start-voting */
export const eventsBattleBoardsCommandsStartVoting = (): string => "/api/events/battle-boards/commands/start-voting";

/** POST /api/events/battle-boards/commands/vote */
export const eventsBattleBoardsCommandsVote = (): string => "/api/events/battle-boards/commands/vote";

/** POST /api/events/budget-line-items/commands/create */
export const eventsBudgetLineItemsCommandsCreate = (): string => "/api/events/budget-line-items/commands/create";

/** POST /api/events/budget-line-items/commands/remove */
export const eventsBudgetLineItemsCommandsRemove = (): string => "/api/events/budget-line-items/commands/remove";

/** POST /api/events/budget-line-items/commands/update */
export const eventsBudgetLineItemsCommandsUpdate = (): string => "/api/events/budget-line-items/commands/update";

/** GET /api/events/budgets */
export const eventsBudgets = (): string => "/api/events/budgets";

/** GET, PUT, DELETE /api/events/budgets/:id */
export const eventsBudgetsById = (id: string): string => "/api/events/budgets/:id".replace(":id", encodeURIComponent(id));

/** GET, POST /api/events/budgets/:id/line-items */
export const eventsBudgetsLineItems = (id: string): string => "/api/events/budgets/:id/line-items".replace(":id", encodeURIComponent(id));

/** GET, PUT, DELETE /api/events/budgets/:id/line-items/:lineItemId */
export const eventsBudgetsLineItemsById = (id: string, lineItemId: string): string => "/api/events/budgets/:id/line-items/:lineItemId".replace(":id", encodeURIComponent(id)).replace(":lineItemId", encodeURIComponent(lineItemId));

/** POST /api/events/budgets/commands/approve */
export const eventsBudgetsCommandsApprove = (): string => "/api/events/budgets/commands/approve";

/** POST /api/events/budgets/commands/create */
export const eventsBudgetsCommandsCreate = (): string => "/api/events/budgets/commands/create";

/** POST /api/events/budgets/commands/finalize */
export const eventsBudgetsCommandsFinalize = (): string => "/api/events/budgets/commands/finalize";

/** POST /api/events/budgets/commands/update */
export const eventsBudgetsCommandsUpdate = (): string => "/api/events/budgets/commands/update";

/** POST /api/events/catering-orders/commands/cancel */
export const eventsCateringOrdersCommandsCancel = (): string => "/api/events/catering-orders/commands/cancel";

/** POST /api/events/catering-orders/commands/confirm */
export const eventsCateringOrdersCommandsConfirm = (): string => "/api/events/catering-orders/commands/confirm";

/** POST /api/events/catering-orders/commands/create */
export const eventsCateringOrdersCommandsCreate = (): string => "/api/events/catering-orders/commands/create";

/** POST /api/events/catering-orders/commands/mark-complete */
export const eventsCateringOrdersCommandsMarkComplete = (): string => "/api/events/catering-orders/commands/mark-complete";

/** POST /api/events/catering-orders/commands/start-prep */
export const eventsCateringOrdersCommandsStartPrep = (): string => "/api/events/catering-orders/commands/start-prep";

/** POST /api/events/catering-orders/commands/update */
export const eventsCateringOrdersCommandsUpdate = (): string => "/api/events/catering-orders/commands/update";

/** GET /api/events/contracts */
export const eventsContracts = (): string => "/api/events/contracts";

/** GET /api/events/contracts/:id */
export const eventsContractsById = (id: string): string => "/api/events/contracts/:id".replace(":id", encodeURIComponent(id));

/** POST /api/events/contracts/:id/document */
export const eventsContractsDocument = (id: string): string => "/api/events/contracts/:id/document".replace(":id", encodeURIComponent(id));

/** POST /api/events/contracts/:id/send */
export const eventsContractsSend = (id: string): string => "/api/events/contracts/:id/send".replace(":id", encodeURIComponent(id));

/** POST /api/events/contracts/:id/signature */
export const eventsContractsSignature = (id: string): string => "/api/events/contracts/:id/signature".replace(":id", encodeURIComponent(id));

/** GET /api/events/contracts/:id/signatures */
export const eventsContractsSignatures = (id: string): string => "/api/events/contracts/:id/signatures".replace(":id", encodeURIComponent(id));

/** PATCH /api/events/contracts/:id/status */
export const eventsContractsStatus = (id: string): string => "/api/events/contracts/:id/status".replace(":id", encodeURIComponent(id));

/** GET /api/events/contracts/expiring */
export const eventsContractsExpiring = (): string => "/api/events/contracts/expiring";

/** GET /api/events/documents/parse */
export const eventsDocumentsParse = (): string => "/api/events/documents/parse";

/** POST /api/events/event/commands/archive */
export const eventsEventCommandsArchive = (): string => "/api/events/event/commands/archive";

/** POST /api/events/event/commands/cancel */
export const eventsEventCommandsCancel = (): string => "/api/events/event/commands/cancel";

/** POST /api/events/event/commands/confirm */
export const eventsEventCommandsConfirm = (): string => "/api/events/event/commands/confirm";

/** POST /api/events/event/commands/create */
export const eventsEventCommandsCreate = (): string => "/api/events/event/commands/create";

/** POST /api/events/event/commands/finalize */
export const eventsEventCommandsFinalize = (): string => "/api/events/event/commands/finalize";

/** POST /api/events/event/commands/unfinalize */
export const eventsEventCommandsUnfinalize = (): string => "/api/events/event/commands/unfinalize";

/** POST /api/events/event/commands/update */
export const eventsEventCommandsUpdate = (): string => "/api/events/event/commands/update";

/** POST /api/events/event/commands/update-date */
export const eventsEventCommandsUpdateDate = (): string => "/api/events/event/commands/update-date";

/** POST /api/events/event/commands/update-guest-count */
export const eventsEventCommandsUpdateGuestCount = (): string => "/api/events/event/commands/update-guest-count";

/** POST /api/events/event/commands/update-location */
export const eventsEventCommandsUpdateLocation = (): string => "/api/events/event/commands/update-location";

/** GET /api/events/export/csv */
export const eventsExportCsv_1 = (): string => "/api/events/export/csv";

/** GET /api/events/guests/:guestId */
export const eventsGuestsByGuestId = (guestId: string): string => "/api/events/guests/:guestId".replace(":guestId", encodeURIComponent(guestId));

/** GET /api/events/import/server-to-server */
export const eventsImportServerToServer = (): string => "/api/events/import/server-to-server";

/** GET /api/events/imports/:importId */
export const eventsImports = (importId: string): string => "/api/events/imports/:importId".replace(":importId", encodeURIComponent(importId));

/** POST /api/events/profitability/commands/create */
export const eventsProfitabilityCommandsCreate = (): string => "/api/events/profitability/commands/create";

/** POST /api/events/profitability/commands/recalculate */
export const eventsProfitabilityCommandsRecalculate = (): string => "/api/events/profitability/commands/recalculate";

/** POST /api/events/profitability/commands/update */
export const eventsProfitabilityCommandsUpdate = (): string => "/api/events/profitability/commands/update";

/** GET, POST /api/events/reports */
export const eventsReports = (): string => "/api/events/reports";

/** GET, PUT, DELETE /api/events/reports/:reportId */
export const eventsReportsByReportId = (reportId: string): string => "/api/events/reports/:reportId".replace(":reportId", encodeURIComponent(reportId));

/** POST /api/events/reports/commands/approve */
export const eventsReportsCommandsApprove = (): string => "/api/events/reports/commands/approve";

/** POST /api/events/reports/commands/complete */
export const eventsReportsCommandsComplete = (): string => "/api/events/reports/commands/complete";

/** POST /api/events/reports/commands/create */
export const eventsReportsCommandsCreate = (): string => "/api/events/reports/commands/create";

/** POST /api/events/reports/commands/submit */
export const eventsReportsCommandsSubmit = (): string => "/api/events/reports/commands/submit";

/** POST /api/events/summaries/commands/create */
export const eventsSummariesCommandsCreate = (): string => "/api/events/summaries/commands/create";

/** POST /api/events/summaries/commands/refresh */
export const eventsSummariesCommandsRefresh = (): string => "/api/events/summaries/commands/refresh";

/** POST /api/events/summaries/commands/update */
export const eventsSummariesCommandsUpdate = (): string => "/api/events/summaries/commands/update";

/** POST /api/inventory/alerts/subscribe */
export const inventoryAlertsSubscribe = (): string => "/api/inventory/alerts/subscribe";

/** GET /api/inventory/cycle-count/audit-logs */
export const inventoryCycleCountAuditLogs = (): string => "/api/inventory/cycle-count/audit-logs";

/** GET /api/inventory/cycle-count/records/:id */
export const inventoryCycleCountRecords = (id: string): string => "/api/inventory/cycle-count/records/:id".replace(":id", encodeURIComponent(id));

/** POST /api/inventory/cycle-count/records/commands/create */
export const inventoryCycleCountRecordsCommandsCreate = (): string => "/api/inventory/cycle-count/records/commands/create";

/** POST /api/inventory/cycle-count/records/commands/update */
export const inventoryCycleCountRecordsCommandsUpdate = (): string => "/api/inventory/cycle-count/records/commands/update";

/** POST /api/inventory/cycle-count/records/commands/verify */
export const inventoryCycleCountRecordsCommandsVerify = (): string => "/api/inventory/cycle-count/records/commands/verify";

/** GET /api/inventory/cycle-count/sessions */
export const inventoryCycleCountSessions = (): string => "/api/inventory/cycle-count/sessions";

/** GET /api/inventory/cycle-count/sessions/:sessionId */
export const inventoryCycleCountSessionsBySessionId = (sessionId: string): string => "/api/inventory/cycle-count/sessions/:sessionId".replace(":sessionId", encodeURIComponent(sessionId));

/** GET /api/inventory/cycle-count/sessions/:sessionId/finalize */
export const inventoryCycleCountSessionsFinalize = (sessionId: string): string => "/api/inventory/cycle-count/sessions/:sessionId/finalize".replace(":sessionId", encodeURIComponent(sessionId));

/** GET /api/inventory/cycle-count/sessions/:sessionId/records */
export const inventoryCycleCountSessionsRecords = (sessionId: string): string => "/api/inventory/cycle-count/sessions/:sessionId/records".replace(":sessionId", encodeURIComponent(sessionId));

/** GET /api/inventory/cycle-count/sessions/:sessionId/variance-reports */
export const inventoryCycleCountSessionsVarianceReports = (sessionId: string): string => "/api/inventory/cycle-count/sessions/:sessionId/variance-reports".replace(":sessionId", encodeURIComponent(sessionId));

/** POST /api/inventory/cycle-count/sessions/commands/cancel */
export const inventoryCycleCountSessionsCommandsCancel = (): string => "/api/inventory/cycle-count/sessions/commands/cancel";

/** POST /api/inventory/cycle-count/sessions/commands/complete */
export const inventoryCycleCountSessionsCommandsComplete = (): string => "/api/inventory/cycle-count/sessions/commands/complete";

/** POST /api/inventory/cycle-count/sessions/commands/create */
export const inventoryCycleCountSessionsCommandsCreate = (): string => "/api/inventory/cycle-count/sessions/commands/create";

/** POST /api/inventory/cycle-count/sessions/commands/finalize */
export const inventoryCycleCountSessionsCommandsFinalize = (): string => "/api/inventory/cycle-count/sessions/commands/finalize";

/** POST /api/inventory/cycle-count/sessions/commands/start */
export const inventoryCycleCountSessionsCommandsStart = (): string => "/api/inventory/cycle-count/sessions/commands/start";

/** POST /api/inventory/cycle-count/variance-reports/commands/approve */
export const inventoryCycleCountVarianceReportsCommandsApprove = (): string => "/api/inventory/cycle-count/variance-reports/commands/approve";

/** POST /api/inventory/cycle-count/variance-reports/commands/create */
export const inventoryCycleCountVarianceReportsCommandsCreate = (): string => "/api/inventory/cycle-count/variance-reports/commands/create";

/** POST /api/inventory/cycle-count/variance-reports/commands/review */
export const inventoryCycleCountVarianceReportsCommandsReview = (): string => "/api/inventory/cycle-count/variance-reports/commands/review";

/** GET /api/inventory/forecasts */
export const inventoryForecasts = (): string => "/api/inventory/forecasts";

/** GET /api/inventory/forecasts/alerts */
export const inventoryForecastsAlerts = (): string => "/api/inventory/forecasts/alerts";

/** GET /api/inventory/forecasts/batch */
export const inventoryForecastsBatch = (): string => "/api/inventory/forecasts/batch";

/** GET /api/inventory/items */
export const inventoryItems = (): string => "/api/inventory/items";

/** GET /api/inventory/items/:id */
export const inventoryItemsById = (id: string): string => "/api/inventory/items/:id".replace(":id", encodeURIComponent(id));

/** POST /api/inventory/purchase-order-items/commands/create */
export const inventoryPurchaseOrderItemsCommandsCreate = (): string => "/api/inventory/purchase-order-items/commands/create";

/** POST /api/inventory/purchase-order-items/commands/remove */
export const inventoryPurchaseOrderItemsCommandsRemove = (): string => "/api/inventory/purchase-order-items/commands/remove";

/** POST /api/inventory/purchase-order-items/commands/update */
export const inventoryPurchaseOrderItemsCommandsUpdate = (): string => "/api/inventory/purchase-order-items/commands/update";

/** GET /api/inventory/purchase-orders */
export const inventoryPurchaseOrders = (): string => "/api/inventory/purchase-orders";

/** GET /api/inventory/purchase-orders/:id */
export const inventoryPurchaseOrdersById = (id: string): string => "/api/inventory/purchase-orders/:id".replace(":id", encodeURIComponent(id));

/** POST /api/inventory/purchase-orders/:id/complete */
export const inventoryPurchaseOrdersComplete = (id: string): string => "/api/inventory/purchase-orders/:id/complete".replace(":id", encodeURIComponent(id));

/** GET /api/inventory/purchase-orders/:id/items/:itemId/quality */
export const inventoryPurchaseOrdersItemsQuality = (id: string, itemId: string): string => "/api/inventory/purchase-orders/:id/items/:itemId/quality".replace(":id", encodeURIComponent(id)).replace(":itemId", encodeURIComponent(itemId));

/** PUT /api/inventory/purchase-orders/:id/items/:itemId/quantity */
export const inventoryPurchaseOrdersItemsQuantity = (id: string, itemId: string): string => "/api/inventory/purchase-orders/:id/items/:itemId/quantity".replace(":id", encodeURIComponent(id)).replace(":itemId", encodeURIComponent(itemId));

/** POST /api/inventory/purchase-orders/commands/approve */
export const inventoryPurchaseOrdersCommandsApprove = (): string => "/api/inventory/purchase-orders/commands/approve";

/** POST /api/inventory/purchase-orders/commands/cancel */
export const inventoryPurchaseOrdersCommandsCancel = (): string => "/api/inventory/purchase-orders/commands/cancel";

/** POST /api/inventory/purchase-orders/commands/create */
export const inventoryPurchaseOrdersCommandsCreate = (): string => "/api/inventory/purchase-orders/commands/create";

/** POST /api/inventory/purchase-orders/commands/mark-ordered */
export const inventoryPurchaseOrdersCommandsMarkOrdered = (): string => "/api/inventory/purchase-orders/commands/mark-ordered";

/** POST /api/inventory/purchase-orders/commands/mark-received */
export const inventoryPurchaseOrdersCommandsMarkReceived = (): string => "/api/inventory/purchase-orders/commands/mark-received";

/** POST /api/inventory/purchase-orders/commands/reject */
export const inventoryPurchaseOrdersCommandsReject = (): string => "/api/inventory/purchase-orders/commands/reject";

/** POST /api/inventory/purchase-orders/commands/submit */
export const inventoryPurchaseOrdersCommandsSubmit = (): string => "/api/inventory/purchase-orders/commands/submit";

/** GET, POST /api/inventory/reorder-suggestions */
export const inventoryReorderSuggestions = (): string => "/api/inventory/reorder-suggestions";

/** GET /api/inventory/stock-levels */
export const inventoryStockLevels = (): string => "/api/inventory/stock-levels";

/** GET /api/inventory/stock-levels/adjust */
export const inventoryStockLevelsAdjust = (): string => "/api/inventory/stock-levels/adjust";

/** GET /api/inventory/stock-levels/locations */
export const inventoryStockLevelsLocations = (): string => "/api/inventory/stock-levels/locations";

/** GET /api/inventory/stock-levels/transactions */
export const inventoryStockLevelsTransactions = (): string => "/api/inventory/stock-levels/transactions";

/** POST /api/inventory/suppliers/commands/create */
export const inventorySuppliersCommandsCreate = (): string => "/api/inventory/suppliers/commands/create";

/** POST /api/inventory/suppliers/commands/deactivate */
export const inventorySuppliersCommandsDeactivate = (): string => "/api/inventory/suppliers/commands/deactivate";

/** POST /api/inventory/suppliers/commands/update */
export const inventorySuppliersCommandsUpdate = (): string => "/api/inventory/suppliers/commands/update";

/** POST /api/inventory/transactions/commands/create */
export const inventoryTransactionsCommandsCreate = (): string => "/api/inventory/transactions/commands/create";

/** POST /api/kitchen/ai/bulk-generate/prep-tasks */
export const kitchenAiBulkGeneratePrepTasks = (): string => "/api/kitchen/ai/bulk-generate/prep-tasks";

/** POST /api/kitchen/ai/bulk-generate/prep-tasks/save */
export const kitchenAiBulkGeneratePrepTasksSave = (): string => "/api/kitchen/ai/bulk-generate/prep-tasks/save";

/** GET /api/kitchen/allergens/detect-conflicts */
export const kitchenAllergensDetectConflicts = (): string => "/api/kitchen/allergens/detect-conflicts";

/** POST /api/kitchen/allergens/update-dish */
export const kitchenAllergensUpdateDish = (): string => "/api/kitchen/allergens/update-dish";

/** GET /api/kitchen/allergens/warnings */
export const kitchenAllergensWarnings = (): string => "/api/kitchen/allergens/warnings";

/** POST /api/kitchen/containers/commands/create */
export const kitchenContainersCommandsCreate = (): string => "/api/kitchen/containers/commands/create";

/** POST /api/kitchen/containers/commands/deactivate */
export const kitchenContainersCommandsDeactivate = (): string => "/api/kitchen/containers/commands/deactivate";

/** POST /api/kitchen/containers/commands/update */
export const kitchenContainersCommandsUpdate = (): string => "/api/kitchen/containers/commands/update";

/** GET /api/kitchen/dish/list */
export const kitchenDishList = (): string => "/api/kitchen/dish/list";

/** GET /api/kitchen/dishes */
export const kitchenDishes = (): string => "/api/kitchen/dishes";

/** POST /api/kitchen/dishes/commands/create */
export const kitchenDishesCommandsCreate = (): string => "/api/kitchen/dishes/commands/create";

/** POST /api/kitchen/dishes/commands/update-lead-time */
export const kitchenDishesCommandsUpdateLeadTime = (): string => "/api/kitchen/dishes/commands/update-lead-time";

/** POST /api/kitchen/dishes/commands/update-pricing */
export const kitchenDishesCommandsUpdatePricing = (): string => "/api/kitchen/dishes/commands/update-pricing";

/** GET /api/kitchen/ingredient/list */
export const kitchenIngredientList = (): string => "/api/kitchen/ingredient/list";

/** GET /api/kitchen/ingredients */
export const kitchenIngredients = (): string => "/api/kitchen/ingredients";

/** POST /api/kitchen/ingredients/commands/create */
export const kitchenIngredientsCommandsCreate = (): string => "/api/kitchen/ingredients/commands/create";

/** POST /api/kitchen/ingredients/commands/update-allergens */
export const kitchenIngredientsCommandsUpdateAllergens = (): string => "/api/kitchen/ingredients/commands/update-allergens";

/** POST /api/kitchen/inventory/commands/adjust */
export const kitchenInventoryCommandsAdjust = (): string => "/api/kitchen/inventory/commands/adjust";

/** POST /api/kitchen/inventory/commands/consume */
export const kitchenInventoryCommandsConsume = (): string => "/api/kitchen/inventory/commands/consume";

/** POST /api/kitchen/inventory/commands/create */
export const kitchenInventoryCommandsCreate = (): string => "/api/kitchen/inventory/commands/create";

/** POST /api/kitchen/inventory/commands/release-reservation */
export const kitchenInventoryCommandsReleaseReservation = (): string => "/api/kitchen/inventory/commands/release-reservation";

/** POST /api/kitchen/inventory/commands/reserve */
export const kitchenInventoryCommandsReserve = (): string => "/api/kitchen/inventory/commands/reserve";

/** POST /api/kitchen/inventory/commands/restock */
export const kitchenInventoryCommandsRestock = (): string => "/api/kitchen/inventory/commands/restock";

/** POST /api/kitchen/inventory/commands/waste */
export const kitchenInventoryCommandsWaste = (): string => "/api/kitchen/inventory/commands/waste";

/** GET /api/kitchen/inventoryitem/list */
export const kitchenInventoryitemList = (): string => "/api/kitchen/inventoryitem/list";

/** POST /api/kitchen/kitchen-tasks/commands/add-tag */
export const kitchenKitchenTasksCommandsAddTag = (): string => "/api/kitchen/kitchen-tasks/commands/add-tag";

/** POST /api/kitchen/kitchen-tasks/commands/cancel */
export const kitchenKitchenTasksCommandsCancel = (): string => "/api/kitchen/kitchen-tasks/commands/cancel";

/** POST /api/kitchen/kitchen-tasks/commands/claim */
export const kitchenKitchenTasksCommandsClaim = (): string => "/api/kitchen/kitchen-tasks/commands/claim";

/** POST /api/kitchen/kitchen-tasks/commands/complete */
export const kitchenKitchenTasksCommandsComplete = (): string => "/api/kitchen/kitchen-tasks/commands/complete";

/** POST /api/kitchen/kitchen-tasks/commands/create */
export const kitchenKitchenTasksCommandsCreate = (): string => "/api/kitchen/kitchen-tasks/commands/create";

/** POST /api/kitchen/kitchen-tasks/commands/reassign */
export const kitchenKitchenTasksCommandsReassign = (): string => "/api/kitchen/kitchen-tasks/commands/reassign";

/** POST /api/kitchen/kitchen-tasks/commands/release */
export const kitchenKitchenTasksCommandsRelease = (): string => "/api/kitchen/kitchen-tasks/commands/release";

/** POST /api/kitchen/kitchen-tasks/commands/remove-tag */
export const kitchenKitchenTasksCommandsRemoveTag = (): string => "/api/kitchen/kitchen-tasks/commands/remove-tag";

/** POST /api/kitchen/kitchen-tasks/commands/start */
export const kitchenKitchenTasksCommandsStart = (): string => "/api/kitchen/kitchen-tasks/commands/start";

/** POST /api/kitchen/kitchen-tasks/commands/update-complexity */
export const kitchenKitchenTasksCommandsUpdateComplexity = (): string => "/api/kitchen/kitchen-tasks/commands/update-complexity";

/** POST /api/kitchen/kitchen-tasks/commands/update-priority */
export const kitchenKitchenTasksCommandsUpdatePriority = (): string => "/api/kitchen/kitchen-tasks/commands/update-priority";

/** POST /api/kitchen/manifest/dishes */
export const kitchenManifestDishes = (): string => "/api/kitchen/manifest/dishes";

/** PATCH /api/kitchen/manifest/dishes/:dishId/pricing */
export const kitchenManifestDishesPricing = (dishId: string): string => "/api/kitchen/manifest/dishes/:dishId/pricing".replace(":dishId", encodeURIComponent(dishId));

/** GET /api/kitchen/manifest/prep-lists */
export const kitchenManifestPrepLists = (): string => "/api/kitchen/manifest/prep-lists";

/** GET /api/kitchen/manifest/recipes */
export const kitchenManifestRecipes = (): string => "/api/kitchen/manifest/recipes";

/** POST /api/kitchen/manifest/recipes/:recipeId/activate */
export const kitchenManifestRecipesActivate = (recipeId: string): string => "/api/kitchen/manifest/recipes/:recipeId/activate".replace(":recipeId", encodeURIComponent(recipeId));

/** POST /api/kitchen/manifest/recipes/:recipeId/deactivate */
export const kitchenManifestRecipesDeactivate = (recipeId: string): string => "/api/kitchen/manifest/recipes/:recipeId/deactivate".replace(":recipeId", encodeURIComponent(recipeId));

/** GET /api/kitchen/manifest/recipes/:recipeId/metadata */
export const kitchenManifestRecipesMetadata = (recipeId: string): string => "/api/kitchen/manifest/recipes/:recipeId/metadata".replace(":recipeId", encodeURIComponent(recipeId));

/** POST /api/kitchen/manifest/recipes/:recipeId/restore */
export const kitchenManifestRecipesRestore = (recipeId: string): string => "/api/kitchen/manifest/recipes/:recipeId/restore".replace(":recipeId", encodeURIComponent(recipeId));

/** POST /api/kitchen/manifest/recipes/:recipeId/versions */
export const kitchenManifestRecipesVersions = (recipeId: string): string => "/api/kitchen/manifest/recipes/:recipeId/versions".replace(":recipeId", encodeURIComponent(recipeId));

/** GET /api/kitchen/menu/list */
export const kitchenMenuList = (): string => "/api/kitchen/menu/list";

/** GET /api/kitchen/menudish/list */
export const kitchenMenudishList = (): string => "/api/kitchen/menudish/list";

/** GET /api/kitchen/menus */
export const kitchenMenus = (): string => "/api/kitchen/menus";

/** POST /api/kitchen/menus/commands/activate */
export const kitchenMenusCommandsActivate = (): string => "/api/kitchen/menus/commands/activate";

/** POST /api/kitchen/menus/commands/create */
export const kitchenMenusCommandsCreate = (): string => "/api/kitchen/menus/commands/create";

/** POST /api/kitchen/menus/commands/deactivate */
export const kitchenMenusCommandsDeactivate = (): string => "/api/kitchen/menus/commands/deactivate";

/** POST /api/kitchen/menus/commands/update */
export const kitchenMenusCommandsUpdate = (): string => "/api/kitchen/menus/commands/update";

/** POST /api/kitchen/menus/dishes/commands/create */
export const kitchenMenusDishesCommandsCreate = (): string => "/api/kitchen/menus/dishes/commands/create";

/** POST /api/kitchen/overrides */
export const kitchenOverrides = (): string => "/api/kitchen/overrides";

/** POST /api/kitchen/prep-comments/commands/create */
export const kitchenPrepCommentsCommandsCreate = (): string => "/api/kitchen/prep-comments/commands/create";

/** POST /api/kitchen/prep-comments/commands/resolve */
export const kitchenPrepCommentsCommandsResolve = (): string => "/api/kitchen/prep-comments/commands/resolve";

/** POST /api/kitchen/prep-comments/commands/soft-delete */
export const kitchenPrepCommentsCommandsSoftDelete = (): string => "/api/kitchen/prep-comments/commands/soft-delete";

/** POST /api/kitchen/prep-comments/commands/unresolve */
export const kitchenPrepCommentsCommandsUnresolve = (): string => "/api/kitchen/prep-comments/commands/unresolve";

/** GET /api/kitchen/prep-lists */
export const kitchenPrepLists = (): string => "/api/kitchen/prep-lists";

/** GET /api/kitchen/prep-lists/:id */
export const kitchenPrepListsById = (id: string): string => "/api/kitchen/prep-lists/:id".replace(":id", encodeURIComponent(id));

/** GET, POST /api/kitchen/prep-lists/autogenerate/process */
export const kitchenPrepListsAutogenerateProcess = (): string => "/api/kitchen/prep-lists/autogenerate/process";

/** POST /api/kitchen/prep-lists/commands/activate */
export const kitchenPrepListsCommandsActivate = (): string => "/api/kitchen/prep-lists/commands/activate";

/** POST /api/kitchen/prep-lists/commands/cancel */
export const kitchenPrepListsCommandsCancel = (): string => "/api/kitchen/prep-lists/commands/cancel";

/** POST /api/kitchen/prep-lists/commands/create */
export const kitchenPrepListsCommandsCreate = (): string => "/api/kitchen/prep-lists/commands/create";

/** POST /api/kitchen/prep-lists/commands/deactivate */
export const kitchenPrepListsCommandsDeactivate = (): string => "/api/kitchen/prep-lists/commands/deactivate";

/** POST /api/kitchen/prep-lists/commands/finalize */
export const kitchenPrepListsCommandsFinalize = (): string => "/api/kitchen/prep-lists/commands/finalize";

/** POST /api/kitchen/prep-lists/commands/mark-completed */
export const kitchenPrepListsCommandsMarkCompleted = (): string => "/api/kitchen/prep-lists/commands/mark-completed";

/** POST /api/kitchen/prep-lists/commands/update */
export const kitchenPrepListsCommandsUpdate = (): string => "/api/kitchen/prep-lists/commands/update";

/** POST /api/kitchen/prep-lists/commands/update-batch-multiplier */
export const kitchenPrepListsCommandsUpdateBatchMultiplier = (): string => "/api/kitchen/prep-lists/commands/update-batch-multiplier";

/** GET /api/kitchen/prep-lists/generate */
export const kitchenPrepListsGenerate = (): string => "/api/kitchen/prep-lists/generate";

/** PATCH /api/kitchen/prep-lists/items/:id */
export const kitchenPrepListsItems = (id: string): string => "/api/kitchen/prep-lists/items/:id".replace(":id", encodeURIComponent(id));

/** POST /api/kitchen/prep-lists/items/commands/create */
export const kitchenPrepListsItemsCommandsCreate = (): string => "/api/kitchen/prep-lists/items/commands/create";

/** POST /api/kitchen/prep-lists/items/commands/mark-completed */
export const kitchenPrepListsItemsCommandsMarkCompleted = (): string => "/api/kitchen/prep-lists/items/commands/mark-completed";

/** POST /api/kitchen/prep-lists/items/commands/mark-uncompleted */
export const kitchenPrepListsItemsCommandsMarkUncompleted = (): string => "/api/kitchen/prep-lists/items/commands/mark-uncompleted";

/** POST /api/kitchen/prep-lists/items/commands/update-prep-notes */
export const kitchenPrepListsItemsCommandsUpdatePrepNotes = (): string => "/api/kitchen/prep-lists/items/commands/update-prep-notes";

/** POST /api/kitchen/prep-lists/items/commands/update-quantity */
export const kitchenPrepListsItemsCommandsUpdateQuantity = (): string => "/api/kitchen/prep-lists/items/commands/update-quantity";

/** POST /api/kitchen/prep-lists/items/commands/update-station */
export const kitchenPrepListsItemsCommandsUpdateStation = (): string => "/api/kitchen/prep-lists/items/commands/update-station";

/** POST /api/kitchen/prep-lists/save */
export const kitchenPrepListsSave = (): string => "/api/kitchen/prep-lists/save";

/** POST /api/kitchen/prep-lists/save-db */
export const kitchenPrepListsSaveDb = (): string => "/api/kitchen/prep-lists/save-db";

/** POST /api/kitchen/prep-methods/commands/create */
export const kitchenPrepMethodsCommandsCreate = (): string => "/api/kitchen/prep-methods/commands/create";

/** POST /api/kitchen/prep-methods/commands/deactivate */
export const kitchenPrepMethodsCommandsDeactivate = (): string => "/api/kitchen/prep-methods/commands/deactivate";

/** POST /api/kitchen/prep-methods/commands/update */
export const kitchenPrepMethodsCommandsUpdate = (): string => "/api/kitchen/prep-methods/commands/update";

/** GET /api/kitchen/prep-tasks */
export const kitchenPrepTasks = (): string => "/api/kitchen/prep-tasks";

/** POST /api/kitchen/prep-tasks/commands/cancel */
export const kitchenPrepTasksCommandsCancel = (): string => "/api/kitchen/prep-tasks/commands/cancel";

/** POST /api/kitchen/prep-tasks/commands/claim */
export const kitchenPrepTasksCommandsClaim = (): string => "/api/kitchen/prep-tasks/commands/claim";

/** POST /api/kitchen/prep-tasks/commands/complete */
export const kitchenPrepTasksCommandsComplete = (): string => "/api/kitchen/prep-tasks/commands/complete";

/** POST /api/kitchen/prep-tasks/commands/create */
export const kitchenPrepTasksCommandsCreate = (): string => "/api/kitchen/prep-tasks/commands/create";

/** POST /api/kitchen/prep-tasks/commands/reassign */
export const kitchenPrepTasksCommandsReassign = (): string => "/api/kitchen/prep-tasks/commands/reassign";

/** POST /api/kitchen/prep-tasks/commands/release */
export const kitchenPrepTasksCommandsRelease = (): string => "/api/kitchen/prep-tasks/commands/release";

/** POST /api/kitchen/prep-tasks/commands/start */
export const kitchenPrepTasksCommandsStart = (): string => "/api/kitchen/prep-tasks/commands/start";

/** POST /api/kitchen/prep-tasks/commands/update-quantity */
export const kitchenPrepTasksCommandsUpdateQuantity = (): string => "/api/kitchen/prep-tasks/commands/update-quantity";

/** GET /api/kitchen/preplist/list */
export const kitchenPreplistList = (): string => "/api/kitchen/preplist/list";

/** GET /api/kitchen/preplistitem/list */
export const kitchenPreplistitemList = (): string => "/api/kitchen/preplistitem/list";

/** GET /api/kitchen/preptask/list */
export const kitchenPreptaskList = (): string => "/api/kitchen/preptask/list";

/** POST /api/kitchen/recipe-ingredients/commands/create */
export const kitchenRecipeIngredientsCommandsCreate = (): string => "/api/kitchen/recipe-ingredients/commands/create";

/** POST /api/kitchen/recipe-ingredients/commands/update-quantity */
export const kitchenRecipeIngredientsCommandsUpdateQuantity = (): string => "/api/kitchen/recipe-ingredients/commands/update-quantity";

/** GET /api/kitchen/recipe/list */
export const kitchenRecipeList = (): string => "/api/kitchen/recipe/list";

/** GET /api/kitchen/recipeingredient/list */
export const kitchenRecipeingredientList = (): string => "/api/kitchen/recipeingredient/list";

/** GET /api/kitchen/recipes */
export const kitchenRecipes = (): string => "/api/kitchen/recipes";

/** GET /api/kitchen/recipes/:recipeId/cost */
export const kitchenRecipesCost = (recipeId: string): string => "/api/kitchen/recipes/:recipeId/cost".replace(":recipeId", encodeURIComponent(recipeId));

/** GET /api/kitchen/recipes/:recipeId/ingredients */
export const kitchenRecipesIngredients = (recipeId: string): string => "/api/kitchen/recipes/:recipeId/ingredients".replace(":recipeId", encodeURIComponent(recipeId));

/** POST, PATCH /api/kitchen/recipes/:recipeId/scale */
export const kitchenRecipesScale = (recipeId: string): string => "/api/kitchen/recipes/:recipeId/scale".replace(":recipeId", encodeURIComponent(recipeId));

/** GET /api/kitchen/recipes/:recipeId/steps */
export const kitchenRecipesSteps = (recipeId: string): string => "/api/kitchen/recipes/:recipeId/steps".replace(":recipeId", encodeURIComponent(recipeId));

/** POST /api/kitchen/recipes/:recipeId/update-budgets */
export const kitchenRecipesUpdateBudgets = (recipeId: string): string => "/api/kitchen/recipes/:recipeId/update-budgets".replace(":recipeId", encodeURIComponent(recipeId));

/** GET /api/kitchen/recipes/:recipeId/versions */
export const kitchenRecipesVersions = (recipeId: string): string => "/api/kitchen/recipes/:recipeId/versions".replace(":recipeId", encodeURIComponent(recipeId));

/** POST /api/kitchen/recipes/commands/activate */
export const kitchenRecipesCommandsActivate = (): string => "/api/kitchen/recipes/commands/activate";

/** POST /api/kitchen/recipes/commands/create */
export const kitchenRecipesCommandsCreate = (): string => "/api/kitchen/recipes/commands/create";

/** POST /api/kitchen/recipes/commands/deactivate */
export const kitchenRecipesCommandsDeactivate = (): string => "/api/kitchen/recipes/commands/deactivate";

/** POST /api/kitchen/recipes/commands/update */
export const kitchenRecipesCommandsUpdate = (): string => "/api/kitchen/recipes/commands/update";

/** POST /api/kitchen/recipes/versions/commands/create */
export const kitchenRecipesVersionsCommandsCreate = (): string => "/api/kitchen/recipes/versions/commands/create";

/** GET /api/kitchen/recipeversion/list */
export const kitchenRecipeversionList = (): string => "/api/kitchen/recipeversion/list";

/** GET /api/kitchen/station/list */
export const kitchenStationList = (): string => "/api/kitchen/station/list";

/** GET /api/kitchen/stations */
export const kitchenStations = (): string => "/api/kitchen/stations";

/** POST /api/kitchen/stations/commands/activate */
export const kitchenStationsCommandsActivate = (): string => "/api/kitchen/stations/commands/activate";

/** POST /api/kitchen/stations/commands/assignTask */
export const kitchenStationsCommandsAssignTask = (): string => "/api/kitchen/stations/commands/assignTask";

/** POST /api/kitchen/stations/commands/create */
export const kitchenStationsCommandsCreate = (): string => "/api/kitchen/stations/commands/create";

/** POST /api/kitchen/stations/commands/deactivate */
export const kitchenStationsCommandsDeactivate = (): string => "/api/kitchen/stations/commands/deactivate";

/** POST /api/kitchen/stations/commands/removeTask */
export const kitchenStationsCommandsRemoveTask = (): string => "/api/kitchen/stations/commands/removeTask";

/** POST /api/kitchen/stations/commands/updateCapacity */
export const kitchenStationsCommandsUpdateCapacity = (): string => "/api/kitchen/stations/commands/updateCapacity";

/** POST /api/kitchen/stations/commands/updateEquipment */
export const kitchenStationsCommandsUpdateEquipment = (): string => "/api/kitchen/stations/commands/updateEquipment";

/** GET, POST /api/kitchen/tasks */
export const kitchenTasks = (): string => "/api/kitchen/tasks";

/** PATCH /api/kitchen/tasks/:id */
export const kitchenTasksById = (id: string): string => "/api/kitchen/tasks/:id".replace(":id", encodeURIComponent(id));

/** POST /api/kitchen/tasks/:id/claim */
export const kitchenTasksClaim = (id: string): string => "/api/kitchen/tasks/:id/claim".replace(":id", encodeURIComponent(id));

/** POST /api/kitchen/tasks/:id/claim-shadow-manifest */
export const kitchenTasksClaimShadowManifest = (id: string): string => "/api/kitchen/tasks/:id/claim-shadow-manifest".replace(":id", encodeURIComponent(id));

/** POST /api/kitchen/tasks/:id/release */
export const kitchenTasksRelease = (id: string): string => "/api/kitchen/tasks/:id/release".replace(":id", encodeURIComponent(id));

/** GET /api/kitchen/tasks/available */
export const kitchenTasksAvailable = (): string => "/api/kitchen/tasks/available";

/** GET /api/kitchen/tasks/my-tasks */
export const kitchenTasksMyTasks = (): string => "/api/kitchen/tasks/my-tasks";

/** GET /api/kitchen/tasks/sync-claims */
export const kitchenTasksSyncClaims = (): string => "/api/kitchen/tasks/sync-claims";

/** GET /api/kitchen/waste/entries */
export const kitchenWasteEntries = (): string => "/api/kitchen/waste/entries";

/** GET, PUT /api/kitchen/waste/entries/:id */
export const kitchenWasteEntriesById = (id: string): string => "/api/kitchen/waste/entries/:id".replace(":id", encodeURIComponent(id));

/** GET /api/kitchen/waste/reasons */
export const kitchenWasteReasons = (): string => "/api/kitchen/waste/reasons";

/** GET /api/kitchen/waste/reports */
export const kitchenWasteReports = (): string => "/api/kitchen/waste/reports";

/** GET /api/kitchen/waste/trends */
export const kitchenWasteTrends = (): string => "/api/kitchen/waste/trends";

/** GET /api/kitchen/waste/units */
export const kitchenWasteUnits = (): string => "/api/kitchen/waste/units";

/** GET /api/locations */
export const locations = (): string => "/api/locations";

/** GET /api/payroll/approvals */
export const payrollApprovals = (): string => "/api/payroll/approvals";

/** PUT /api/payroll/approvals/:approvalId */
export const payrollApprovalsByApprovalId = (approvalId: string): string => "/api/payroll/approvals/:approvalId".replace(":approvalId", encodeURIComponent(approvalId));

/** GET /api/payroll/approvals/history */
export const payrollApprovalsHistory = (): string => "/api/payroll/approvals/history";

/** GET /api/payroll/deductions */
export const payrollDeductions = (): string => "/api/payroll/deductions";

/** POST /api/payroll/export/quickbooks */
export const payrollExportQuickbooks = (): string => "/api/payroll/export/quickbooks";

/** POST /api/payroll/generate */
export const payrollGenerate = (): string => "/api/payroll/generate";

/** GET /api/payroll/periods */
export const payrollPeriods = (): string => "/api/payroll/periods";

/** GET /api/payroll/reports/:periodId */
export const payrollReports = (periodId: string): string => "/api/payroll/reports/:periodId".replace(":periodId", encodeURIComponent(periodId));

/** GET /api/payroll/runs */
export const payrollRuns = (): string => "/api/payroll/runs";

/** GET /api/payroll/runs/:runId */
export const payrollRunsByRunId = (runId: string): string => "/api/payroll/runs/:runId".replace(":runId", encodeURIComponent(runId));

/** POST /api/sales-reporting/generate */
export const salesReportingGenerate = (): string => "/api/sales-reporting/generate";

/** GET /api/shipments */
export const shipments = (): string => "/api/shipments";

/** GET /api/shipments/:id */
export const shipmentsById = (id: string): string => "/api/shipments/:id".replace(":id", encodeURIComponent(id));

/** GET, POST /api/shipments/:id/items */
export const shipmentsItems = (id: string): string => "/api/shipments/:id/items".replace(":id", encodeURIComponent(id));

/** PUT, DELETE /api/shipments/:id/items/:itemId */
export const shipmentsItemsById = (id: string, itemId: string): string => "/api/shipments/:id/items/:itemId".replace(":id", encodeURIComponent(id)).replace(":itemId", encodeURIComponent(itemId));

/** GET /api/shipments/:id/status */
export const shipmentsStatus = (id: string): string => "/api/shipments/:id/status".replace(":id", encodeURIComponent(id));

/** POST /api/shipments/shipment-items/commands/create */
export const shipmentsShipmentItemsCommandsCreate = (): string => "/api/shipments/shipment-items/commands/create";

/** POST /api/shipments/shipment-items/commands/update-received */
export const shipmentsShipmentItemsCommandsUpdateReceived = (): string => "/api/shipments/shipment-items/commands/update-received";

/** POST /api/shipments/shipment/commands/cancel */
export const shipmentsShipmentCommandsCancel = (): string => "/api/shipments/shipment/commands/cancel";

/** POST /api/shipments/shipment/commands/create */
export const shipmentsShipmentCommandsCreate = (): string => "/api/shipments/shipment/commands/create";

/** POST /api/shipments/shipment/commands/mark-delivered */
export const shipmentsShipmentCommandsMarkDelivered = (): string => "/api/shipments/shipment/commands/mark-delivered";

/** POST /api/shipments/shipment/commands/schedule */
export const shipmentsShipmentCommandsSchedule = (): string => "/api/shipments/shipment/commands/schedule";

/** POST /api/shipments/shipment/commands/ship */
export const shipmentsShipmentCommandsShip = (): string => "/api/shipments/shipment/commands/ship";

/** POST /api/shipments/shipment/commands/start-preparing */
export const shipmentsShipmentCommandsStartPreparing = (): string => "/api/shipments/shipment/commands/start-preparing";

/** POST /api/shipments/shipment/commands/update */
export const shipmentsShipmentCommandsUpdate = (): string => "/api/shipments/shipment/commands/update";

/** GET /api/staff/availability */
export const staffAvailability = (): string => "/api/staff/availability";

/** GET, PATCH /api/staff/availability/:id */
export const staffAvailabilityById = (id: string): string => "/api/staff/availability/:id".replace(":id", encodeURIComponent(id));

/** POST /api/staff/availability/batch */
export const staffAvailabilityBatch = (): string => "/api/staff/availability/batch";

/** GET /api/staff/availability/employees */
export const staffAvailabilityEmployees = (): string => "/api/staff/availability/employees";

/** GET, POST /api/staff/budgets */
export const staffBudgets = (): string => "/api/staff/budgets";

/** GET, PUT /api/staff/budgets/:id */
export const staffBudgetsById = (id: string): string => "/api/staff/budgets/:id".replace(":id", encodeURIComponent(id));

/** GET, POST /api/staff/budgets/alerts */
export const staffBudgetsAlerts = (): string => "/api/staff/budgets/alerts";

/** GET /api/staff/employees */
export const staffEmployees = (): string => "/api/staff/employees";

/** GET, PUT /api/staff/employees/:id */
export const staffEmployeesById = (id: string): string => "/api/staff/employees/:id".replace(":id", encodeURIComponent(id));

/** POST /api/staff/employees/commands/create */
export const staffEmployeesCommandsCreate = (): string => "/api/staff/employees/commands/create";

/** POST /api/staff/employees/commands/deactivate */
export const staffEmployeesCommandsDeactivate = (): string => "/api/staff/employees/commands/deactivate";

/** POST /api/staff/employees/commands/terminate */
export const staffEmployeesCommandsTerminate = (): string => "/api/staff/employees/commands/terminate";

/** POST /api/staff/employees/commands/update */
export const staffEmployeesCommandsUpdate = (): string => "/api/staff/employees/commands/update";

/** POST /api/staff/employees/commands/update-role */
export const staffEmployeesCommandsUpdateRole = (): string => "/api/staff/employees/commands/update-role";

/** GET /api/staff/schedules */
export const staffSchedules = (): string => "/api/staff/schedules";

/** POST /api/staff/schedules/commands/close */
export const staffSchedulesCommandsClose = (): string => "/api/staff/schedules/commands/close";

/** POST /api/staff/schedules/commands/create */
export const staffSchedulesCommandsCreate = (): string => "/api/staff/schedules/commands/create";

/** POST /api/staff/schedules/commands/release */
export const staffSchedulesCommandsRelease = (): string => "/api/staff/schedules/commands/release";

/** POST /api/staff/schedules/commands/update */
export const staffSchedulesCommandsUpdate = (): string => "/api/staff/schedules/commands/update";

/** GET /api/staff/shifts */
export const staffShifts = (): string => "/api/staff/shifts";

/** GET, PUT, DELETE /api/staff/shifts/:shiftId */
export const staffShiftsByShiftId = (shiftId: string): string => "/api/staff/shifts/:shiftId".replace(":shiftId", encodeURIComponent(shiftId));

/** GET /api/staff/shifts/:shiftId/assignment-suggestions */
export const staffShiftsAssignmentSuggestions = (shiftId: string): string => "/api/staff/shifts/:shiftId/assignment-suggestions".replace(":shiftId", encodeURIComponent(shiftId));

/** GET /api/staff/shifts/available-employees */
export const staffShiftsAvailableEmployees = (): string => "/api/staff/shifts/available-employees";

/** POST /api/staff/shifts/bulk-assignment */
export const staffShiftsBulkAssignment = (): string => "/api/staff/shifts/bulk-assignment";

/** POST /api/staff/shifts/bulk-assignment-suggestions */
export const staffShiftsBulkAssignmentSuggestions = (): string => "/api/staff/shifts/bulk-assignment-suggestions";

/** POST /api/staff/shifts/commands/create */
export const staffShiftsCommandsCreate = (): string => "/api/staff/shifts/commands/create";

/** POST /api/staff/shifts/commands/remove */
export const staffShiftsCommandsRemove = (): string => "/api/staff/shifts/commands/remove";

/** POST /api/staff/shifts/commands/update */
export const staffShiftsCommandsUpdate = (): string => "/api/staff/shifts/commands/update";

/** GET /api/staff/time-off/requests */
export const staffTimeOffRequests = (): string => "/api/staff/time-off/requests";

/** GET, PATCH /api/staff/time-off/requests/:id */
export const staffTimeOffRequestsById = (id: string): string => "/api/staff/time-off/requests/:id".replace(":id", encodeURIComponent(id));

/** GET /api/timecards */
export const timecards = (): string => "/api/timecards";

/** GET /api/timecards/:id */
export const timecardsById = (id: string): string => "/api/timecards/:id".replace(":id", encodeURIComponent(id));

/** GET /api/timecards/bulk */
export const timecardsBulk = (): string => "/api/timecards/bulk";

/** POST /api/timecards/edit-requests/commands/approve */
export const timecardsEditRequestsCommandsApprove = (): string => "/api/timecards/edit-requests/commands/approve";

/** POST /api/timecards/edit-requests/commands/create */
export const timecardsEditRequestsCommandsCreate = (): string => "/api/timecards/edit-requests/commands/create";

/** POST /api/timecards/edit-requests/commands/reject */
export const timecardsEditRequestsCommandsReject = (): string => "/api/timecards/edit-requests/commands/reject";

/** POST /api/timecards/entries/commands/add-entry */
export const timecardsEntriesCommandsAddEntry = (): string => "/api/timecards/entries/commands/add-entry";

/** POST /api/timecards/entries/commands/clock-in */
export const timecardsEntriesCommandsClockIn = (): string => "/api/timecards/entries/commands/clock-in";

/** POST /api/timecards/entries/commands/clock-out */
export const timecardsEntriesCommandsClockOut = (): string => "/api/timecards/entries/commands/clock-out";

/** GET /api/user-preferences */
export const userPreferences = (): string => "/api/user-preferences";

// ---------------------------------------------------------------------------
// Route pattern list (for dev-time validation)
// ---------------------------------------------------------------------------

/** All known route patterns. Used by apiFetch dev guard. */
export const ROUTE_PATTERNS: readonly string[] = [
  "/api/accounting/accounts",
  "/api/accounting/accounts/:id",
  "/api/administrative/chat/threads",
  "/api/administrative/chat/threads/:threadId",
  "/api/administrative/chat/threads/:threadId/messages",
  "/api/administrative/tasks",
  "/api/administrative/tasks/:id",
  "/api/ai/suggestions",
  "/api/ai/summaries/:eventId",
  "/api/analytics/events/profitability",
  "/api/analytics/finance",
  "/api/analytics/kitchen",
  "/api/analytics/staff/employees/:employeeId",
  "/api/analytics/staff/summary",
  "/api/collaboration/auth",
  "/api/collaboration/notifications/commands/create",
  "/api/collaboration/notifications/commands/mark-dismissed",
  "/api/collaboration/notifications/commands/mark-read",
  "/api/collaboration/notifications/commands/remove",
  "/api/collaboration/workflows/commands/activate",
  "/api/collaboration/workflows/commands/create",
  "/api/collaboration/workflows/commands/deactivate",
  "/api/collaboration/workflows/commands/update",
  "/api/command-board",
  "/api/command-board/:boardId",
  "/api/command-board/:boardId/cards",
  "/api/command-board/:boardId/cards/:cardId",
  "/api/command-board/:boardId/connections",
  "/api/command-board/:boardId/connections/:connectionId",
  "/api/command-board/:boardId/draft",
  "/api/command-board/:boardId/groups",
  "/api/command-board/:boardId/groups/:groupId",
  "/api/command-board/:boardId/groups/:groupId/cards",
  "/api/command-board/:boardId/replay",
  "/api/command-board/boards/commands/activate",
  "/api/command-board/boards/commands/create",
  "/api/command-board/boards/commands/deactivate",
  "/api/command-board/boards/commands/update",
  "/api/command-board/cards/commands/create",
  "/api/command-board/cards/commands/move",
  "/api/command-board/cards/commands/remove",
  "/api/command-board/cards/commands/resize",
  "/api/command-board/cards/commands/update",
  "/api/command-board/connections/commands/create",
  "/api/command-board/connections/commands/remove",
  "/api/command-board/groups/commands/create",
  "/api/command-board/groups/commands/remove",
  "/api/command-board/groups/commands/update",
  "/api/command-board/layouts",
  "/api/command-board/layouts/:layoutId",
  "/api/command-board/layouts/commands/create",
  "/api/command-board/layouts/commands/remove",
  "/api/command-board/layouts/commands/update",
  "/api/conflicts/detect",
  "/api/crm/client-contacts/commands/create",
  "/api/crm/client-contacts/commands/remove",
  "/api/crm/client-contacts/commands/set-primary",
  "/api/crm/client-contacts/commands/update",
  "/api/crm/client-interactions/commands/complete",
  "/api/crm/client-interactions/commands/create",
  "/api/crm/client-interactions/commands/update",
  "/api/crm/client-preferences/commands/create",
  "/api/crm/client-preferences/commands/remove",
  "/api/crm/client-preferences/commands/update",
  "/api/crm/clients",
  "/api/crm/clients/:id",
  "/api/crm/clients/:id/contacts",
  "/api/crm/clients/:id/events",
  "/api/crm/clients/:id/interactions",
  "/api/crm/clients/:id/interactions/:interactionId",
  "/api/crm/clients/:id/preferences",
  "/api/crm/clients/commands/archive",
  "/api/crm/clients/commands/create",
  "/api/crm/clients/commands/reactivate",
  "/api/crm/clients/commands/update",
  "/api/crm/leads/commands/archive",
  "/api/crm/leads/commands/convert-to-client",
  "/api/crm/leads/commands/create",
  "/api/crm/leads/commands/disqualify",
  "/api/crm/leads/commands/update",
  "/api/crm/proposal-line-items/commands/create",
  "/api/crm/proposal-line-items/commands/remove",
  "/api/crm/proposal-line-items/commands/update",
  "/api/crm/proposals",
  "/api/crm/proposals/:id",
  "/api/crm/proposals/:id/send",
  "/api/crm/proposals/commands/accept",
  "/api/crm/proposals/commands/create",
  "/api/crm/proposals/commands/mark-viewed",
  "/api/crm/proposals/commands/reject",
  "/api/crm/proposals/commands/send",
  "/api/crm/proposals/commands/update",
  "/api/crm/proposals/commands/withdraw",
  "/api/crm/venues",
  "/api/crm/venues/:id",
  "/api/crm/venues/:id/events",
  "/api/cron/idempotency-cleanup",
  "/api/events",
  "/api/events/:eventId/export/csv",
  "/api/events/:eventId/guests",
  "/api/events/:eventId/warnings",
  "/api/events/allergens/check",
  "/api/events/allergens/warnings/acknowledge",
  "/api/events/battle-boards",
  "/api/events/battle-boards/:boardId",
  "/api/events/battle-boards/commands/add-dish",
  "/api/events/battle-boards/commands/create",
  "/api/events/battle-boards/commands/finalize",
  "/api/events/battle-boards/commands/open",
  "/api/events/battle-boards/commands/remove-dish",
  "/api/events/battle-boards/commands/start-voting",
  "/api/events/battle-boards/commands/vote",
  "/api/events/budget-line-items/commands/create",
  "/api/events/budget-line-items/commands/remove",
  "/api/events/budget-line-items/commands/update",
  "/api/events/budgets",
  "/api/events/budgets/:id",
  "/api/events/budgets/:id/line-items",
  "/api/events/budgets/:id/line-items/:lineItemId",
  "/api/events/budgets/commands/approve",
  "/api/events/budgets/commands/create",
  "/api/events/budgets/commands/finalize",
  "/api/events/budgets/commands/update",
  "/api/events/catering-orders/commands/cancel",
  "/api/events/catering-orders/commands/confirm",
  "/api/events/catering-orders/commands/create",
  "/api/events/catering-orders/commands/mark-complete",
  "/api/events/catering-orders/commands/start-prep",
  "/api/events/catering-orders/commands/update",
  "/api/events/contracts",
  "/api/events/contracts/:id",
  "/api/events/contracts/:id/document",
  "/api/events/contracts/:id/send",
  "/api/events/contracts/:id/signature",
  "/api/events/contracts/:id/signatures",
  "/api/events/contracts/:id/status",
  "/api/events/contracts/expiring",
  "/api/events/documents/parse",
  "/api/events/event/commands/archive",
  "/api/events/event/commands/cancel",
  "/api/events/event/commands/confirm",
  "/api/events/event/commands/create",
  "/api/events/event/commands/finalize",
  "/api/events/event/commands/unfinalize",
  "/api/events/event/commands/update",
  "/api/events/event/commands/update-date",
  "/api/events/event/commands/update-guest-count",
  "/api/events/event/commands/update-location",
  "/api/events/export/csv",
  "/api/events/guests/:guestId",
  "/api/events/import/server-to-server",
  "/api/events/imports/:importId",
  "/api/events/profitability/commands/create",
  "/api/events/profitability/commands/recalculate",
  "/api/events/profitability/commands/update",
  "/api/events/reports",
  "/api/events/reports/:reportId",
  "/api/events/reports/commands/approve",
  "/api/events/reports/commands/complete",
  "/api/events/reports/commands/create",
  "/api/events/reports/commands/submit",
  "/api/events/summaries/commands/create",
  "/api/events/summaries/commands/refresh",
  "/api/events/summaries/commands/update",
  "/api/inventory/alerts/subscribe",
  "/api/inventory/cycle-count/audit-logs",
  "/api/inventory/cycle-count/records/:id",
  "/api/inventory/cycle-count/records/commands/create",
  "/api/inventory/cycle-count/records/commands/update",
  "/api/inventory/cycle-count/records/commands/verify",
  "/api/inventory/cycle-count/sessions",
  "/api/inventory/cycle-count/sessions/:sessionId",
  "/api/inventory/cycle-count/sessions/:sessionId/finalize",
  "/api/inventory/cycle-count/sessions/:sessionId/records",
  "/api/inventory/cycle-count/sessions/:sessionId/variance-reports",
  "/api/inventory/cycle-count/sessions/commands/cancel",
  "/api/inventory/cycle-count/sessions/commands/complete",
  "/api/inventory/cycle-count/sessions/commands/create",
  "/api/inventory/cycle-count/sessions/commands/finalize",
  "/api/inventory/cycle-count/sessions/commands/start",
  "/api/inventory/cycle-count/variance-reports/commands/approve",
  "/api/inventory/cycle-count/variance-reports/commands/create",
  "/api/inventory/cycle-count/variance-reports/commands/review",
  "/api/inventory/forecasts",
  "/api/inventory/forecasts/alerts",
  "/api/inventory/forecasts/batch",
  "/api/inventory/items",
  "/api/inventory/items/:id",
  "/api/inventory/purchase-order-items/commands/create",
  "/api/inventory/purchase-order-items/commands/remove",
  "/api/inventory/purchase-order-items/commands/update",
  "/api/inventory/purchase-orders",
  "/api/inventory/purchase-orders/:id",
  "/api/inventory/purchase-orders/:id/complete",
  "/api/inventory/purchase-orders/:id/items/:itemId/quality",
  "/api/inventory/purchase-orders/:id/items/:itemId/quantity",
  "/api/inventory/purchase-orders/commands/approve",
  "/api/inventory/purchase-orders/commands/cancel",
  "/api/inventory/purchase-orders/commands/create",
  "/api/inventory/purchase-orders/commands/mark-ordered",
  "/api/inventory/purchase-orders/commands/mark-received",
  "/api/inventory/purchase-orders/commands/reject",
  "/api/inventory/purchase-orders/commands/submit",
  "/api/inventory/reorder-suggestions",
  "/api/inventory/stock-levels",
  "/api/inventory/stock-levels/adjust",
  "/api/inventory/stock-levels/locations",
  "/api/inventory/stock-levels/transactions",
  "/api/inventory/suppliers/commands/create",
  "/api/inventory/suppliers/commands/deactivate",
  "/api/inventory/suppliers/commands/update",
  "/api/inventory/transactions/commands/create",
  "/api/kitchen/ai/bulk-generate/prep-tasks",
  "/api/kitchen/ai/bulk-generate/prep-tasks/save",
  "/api/kitchen/allergens/detect-conflicts",
  "/api/kitchen/allergens/update-dish",
  "/api/kitchen/allergens/warnings",
  "/api/kitchen/containers/commands/create",
  "/api/kitchen/containers/commands/deactivate",
  "/api/kitchen/containers/commands/update",
  "/api/kitchen/dish/list",
  "/api/kitchen/dishes",
  "/api/kitchen/dishes/commands/create",
  "/api/kitchen/dishes/commands/update-lead-time",
  "/api/kitchen/dishes/commands/update-pricing",
  "/api/kitchen/ingredient/list",
  "/api/kitchen/ingredients",
  "/api/kitchen/ingredients/commands/create",
  "/api/kitchen/ingredients/commands/update-allergens",
  "/api/kitchen/inventory/commands/adjust",
  "/api/kitchen/inventory/commands/consume",
  "/api/kitchen/inventory/commands/create",
  "/api/kitchen/inventory/commands/release-reservation",
  "/api/kitchen/inventory/commands/reserve",
  "/api/kitchen/inventory/commands/restock",
  "/api/kitchen/inventory/commands/waste",
  "/api/kitchen/inventoryitem/list",
  "/api/kitchen/kitchen-tasks/commands/add-tag",
  "/api/kitchen/kitchen-tasks/commands/cancel",
  "/api/kitchen/kitchen-tasks/commands/claim",
  "/api/kitchen/kitchen-tasks/commands/complete",
  "/api/kitchen/kitchen-tasks/commands/create",
  "/api/kitchen/kitchen-tasks/commands/reassign",
  "/api/kitchen/kitchen-tasks/commands/release",
  "/api/kitchen/kitchen-tasks/commands/remove-tag",
  "/api/kitchen/kitchen-tasks/commands/start",
  "/api/kitchen/kitchen-tasks/commands/update-complexity",
  "/api/kitchen/kitchen-tasks/commands/update-priority",
  "/api/kitchen/manifest/dishes",
  "/api/kitchen/manifest/dishes/:dishId/pricing",
  "/api/kitchen/manifest/prep-lists",
  "/api/kitchen/manifest/recipes",
  "/api/kitchen/manifest/recipes/:recipeId/activate",
  "/api/kitchen/manifest/recipes/:recipeId/deactivate",
  "/api/kitchen/manifest/recipes/:recipeId/metadata",
  "/api/kitchen/manifest/recipes/:recipeId/restore",
  "/api/kitchen/manifest/recipes/:recipeId/versions",
  "/api/kitchen/menu/list",
  "/api/kitchen/menudish/list",
  "/api/kitchen/menus",
  "/api/kitchen/menus/commands/activate",
  "/api/kitchen/menus/commands/create",
  "/api/kitchen/menus/commands/deactivate",
  "/api/kitchen/menus/commands/update",
  "/api/kitchen/menus/dishes/commands/create",
  "/api/kitchen/overrides",
  "/api/kitchen/prep-comments/commands/create",
  "/api/kitchen/prep-comments/commands/resolve",
  "/api/kitchen/prep-comments/commands/soft-delete",
  "/api/kitchen/prep-comments/commands/unresolve",
  "/api/kitchen/prep-lists",
  "/api/kitchen/prep-lists/:id",
  "/api/kitchen/prep-lists/autogenerate/process",
  "/api/kitchen/prep-lists/commands/activate",
  "/api/kitchen/prep-lists/commands/cancel",
  "/api/kitchen/prep-lists/commands/create",
  "/api/kitchen/prep-lists/commands/deactivate",
  "/api/kitchen/prep-lists/commands/finalize",
  "/api/kitchen/prep-lists/commands/mark-completed",
  "/api/kitchen/prep-lists/commands/update",
  "/api/kitchen/prep-lists/commands/update-batch-multiplier",
  "/api/kitchen/prep-lists/generate",
  "/api/kitchen/prep-lists/items/:id",
  "/api/kitchen/prep-lists/items/commands/create",
  "/api/kitchen/prep-lists/items/commands/mark-completed",
  "/api/kitchen/prep-lists/items/commands/mark-uncompleted",
  "/api/kitchen/prep-lists/items/commands/update-prep-notes",
  "/api/kitchen/prep-lists/items/commands/update-quantity",
  "/api/kitchen/prep-lists/items/commands/update-station",
  "/api/kitchen/prep-lists/save",
  "/api/kitchen/prep-lists/save-db",
  "/api/kitchen/prep-methods/commands/create",
  "/api/kitchen/prep-methods/commands/deactivate",
  "/api/kitchen/prep-methods/commands/update",
  "/api/kitchen/prep-tasks",
  "/api/kitchen/prep-tasks/commands/cancel",
  "/api/kitchen/prep-tasks/commands/claim",
  "/api/kitchen/prep-tasks/commands/complete",
  "/api/kitchen/prep-tasks/commands/create",
  "/api/kitchen/prep-tasks/commands/reassign",
  "/api/kitchen/prep-tasks/commands/release",
  "/api/kitchen/prep-tasks/commands/start",
  "/api/kitchen/prep-tasks/commands/update-quantity",
  "/api/kitchen/preplist/list",
  "/api/kitchen/preplistitem/list",
  "/api/kitchen/preptask/list",
  "/api/kitchen/recipe-ingredients/commands/create",
  "/api/kitchen/recipe-ingredients/commands/update-quantity",
  "/api/kitchen/recipe/list",
  "/api/kitchen/recipeingredient/list",
  "/api/kitchen/recipes",
  "/api/kitchen/recipes/:recipeId/cost",
  "/api/kitchen/recipes/:recipeId/ingredients",
  "/api/kitchen/recipes/:recipeId/scale",
  "/api/kitchen/recipes/:recipeId/steps",
  "/api/kitchen/recipes/:recipeId/update-budgets",
  "/api/kitchen/recipes/:recipeId/versions",
  "/api/kitchen/recipes/commands/activate",
  "/api/kitchen/recipes/commands/create",
  "/api/kitchen/recipes/commands/deactivate",
  "/api/kitchen/recipes/commands/update",
  "/api/kitchen/recipes/versions/commands/create",
  "/api/kitchen/recipeversion/list",
  "/api/kitchen/station/list",
  "/api/kitchen/stations",
  "/api/kitchen/stations/commands/activate",
  "/api/kitchen/stations/commands/assignTask",
  "/api/kitchen/stations/commands/create",
  "/api/kitchen/stations/commands/deactivate",
  "/api/kitchen/stations/commands/removeTask",
  "/api/kitchen/stations/commands/updateCapacity",
  "/api/kitchen/stations/commands/updateEquipment",
  "/api/kitchen/tasks",
  "/api/kitchen/tasks/:id",
  "/api/kitchen/tasks/:id/claim",
  "/api/kitchen/tasks/:id/claim-shadow-manifest",
  "/api/kitchen/tasks/:id/release",
  "/api/kitchen/tasks/available",
  "/api/kitchen/tasks/my-tasks",
  "/api/kitchen/tasks/sync-claims",
  "/api/kitchen/waste/entries",
  "/api/kitchen/waste/entries/:id",
  "/api/kitchen/waste/reasons",
  "/api/kitchen/waste/reports",
  "/api/kitchen/waste/trends",
  "/api/kitchen/waste/units",
  "/api/locations",
  "/api/payroll/approvals",
  "/api/payroll/approvals/:approvalId",
  "/api/payroll/approvals/history",
  "/api/payroll/deductions",
  "/api/payroll/export/quickbooks",
  "/api/payroll/generate",
  "/api/payroll/periods",
  "/api/payroll/reports/:periodId",
  "/api/payroll/runs",
  "/api/payroll/runs/:runId",
  "/api/sales-reporting/generate",
  "/api/shipments",
  "/api/shipments/:id",
  "/api/shipments/:id/items",
  "/api/shipments/:id/items/:itemId",
  "/api/shipments/:id/status",
  "/api/shipments/shipment-items/commands/create",
  "/api/shipments/shipment-items/commands/update-received",
  "/api/shipments/shipment/commands/cancel",
  "/api/shipments/shipment/commands/create",
  "/api/shipments/shipment/commands/mark-delivered",
  "/api/shipments/shipment/commands/schedule",
  "/api/shipments/shipment/commands/ship",
  "/api/shipments/shipment/commands/start-preparing",
  "/api/shipments/shipment/commands/update",
  "/api/staff/availability",
  "/api/staff/availability/:id",
  "/api/staff/availability/batch",
  "/api/staff/availability/employees",
  "/api/staff/budgets",
  "/api/staff/budgets/:id",
  "/api/staff/budgets/alerts",
  "/api/staff/employees",
  "/api/staff/employees/:id",
  "/api/staff/employees/commands/create",
  "/api/staff/employees/commands/deactivate",
  "/api/staff/employees/commands/terminate",
  "/api/staff/employees/commands/update",
  "/api/staff/employees/commands/update-role",
  "/api/staff/schedules",
  "/api/staff/schedules/commands/close",
  "/api/staff/schedules/commands/create",
  "/api/staff/schedules/commands/release",
  "/api/staff/schedules/commands/update",
  "/api/staff/shifts",
  "/api/staff/shifts/:shiftId",
  "/api/staff/shifts/:shiftId/assignment-suggestions",
  "/api/staff/shifts/available-employees",
  "/api/staff/shifts/bulk-assignment",
  "/api/staff/shifts/bulk-assignment-suggestions",
  "/api/staff/shifts/commands/create",
  "/api/staff/shifts/commands/remove",
  "/api/staff/shifts/commands/update",
  "/api/staff/time-off/requests",
  "/api/staff/time-off/requests/:id",
  "/api/timecards",
  "/api/timecards/:id",
  "/api/timecards/bulk",
  "/api/timecards/edit-requests/commands/approve",
  "/api/timecards/edit-requests/commands/create",
  "/api/timecards/edit-requests/commands/reject",
  "/api/timecards/entries/commands/add-entry",
  "/api/timecards/entries/commands/clock-in",
  "/api/timecards/entries/commands/clock-out",
  "/api/user-preferences",
] as const;

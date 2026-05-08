import { describe, expect, it } from "vitest";
import { getRequiredScope } from "@/lib/scope-guard";
import { API_SCOPES } from "@/lib/api-scopes";

describe("getRequiredScope", () => {
	describe("events domain", () => {
		it("maps GET /api/events to read:events", () => {
			expect(getRequiredScope("/api/events", "GET")).toBe(
				API_SCOPES.EVENTS_READ,
			);
		});

		it("maps POST /api/events to write:events", () => {
			expect(getRequiredScope("/api/events", "POST")).toBe(
				API_SCOPES.EVENTS_WRITE,
			);
		});

		it("maps PUT /api/events/123 to write:events", () => {
			expect(getRequiredScope("/api/events/123", "PUT")).toBe(
				API_SCOPES.EVENTS_WRITE,
			);
		});

		it("maps DELETE /api/events/123 to write:events", () => {
			expect(getRequiredScope("/api/events/123", "DELETE")).toBe(
				API_SCOPES.EVENTS_WRITE,
			);
		});
	});

	describe("kitchen domain", () => {
		it("maps GET /api/kitchen/prep-lists to read:kitchen", () => {
			expect(getRequiredScope("/api/kitchen/prep-lists", "GET")).toBe(
				API_SCOPES.KITCHEN_READ,
			);
		});

		it("maps POST /api/kitchen/prep-lists to write:kitchen", () => {
			expect(getRequiredScope("/api/kitchen/prep-lists", "POST")).toBe(
				API_SCOPES.KITCHEN_WRITE,
			);
		});

		it("maps GET /api/dish to read:kitchen", () => {
			expect(getRequiredScope("/api/dish", "GET")).toBe(
				API_SCOPES.KITCHEN_READ,
			);
		});

		it("maps GET /api/recipe to read:kitchen", () => {
			expect(getRequiredScope("/api/recipe", "GET")).toBe(
				API_SCOPES.KITCHEN_READ,
			);
		});

		it("maps GET /api/menu to read:kitchen", () => {
			expect(getRequiredScope("/api/menu", "GET")).toBe(
				API_SCOPES.KITCHEN_READ,
			);
		});
	});

	describe("inventory domain", () => {
		it("maps GET /api/inventory/items to read:inventory", () => {
			expect(getRequiredScope("/api/inventory/items", "GET")).toBe(
				API_SCOPES.INVENTORY_READ,
			);
		});

		it("maps POST /api/inventory/items to write:inventory", () => {
			expect(getRequiredScope("/api/inventory/items", "POST")).toBe(
				API_SCOPES.INVENTORY_WRITE,
			);
		});

		it("maps GET /api/logistics/routes to read:inventory", () => {
			expect(getRequiredScope("/api/logistics/routes", "GET")).toBe(
				API_SCOPES.INVENTORY_READ,
			);
		});
	});

	describe("staff domain", () => {
		it("maps GET /api/staff to read:staff", () => {
			expect(getRequiredScope("/api/staff", "GET")).toBe(
				API_SCOPES.STAFF_READ,
			);
		});

		it("maps POST /api/staffing/recommendations to write:staff", () => {
			expect(
				getRequiredScope("/api/staffing/recommendations", "POST"),
			).toBe(API_SCOPES.STAFF_WRITE);
		});
	});

	describe("CRM domain", () => {
		it("maps GET /api/crm/clients to read:crm", () => {
			expect(getRequiredScope("/api/crm/clients", "GET")).toBe(
				API_SCOPES.CRM_READ,
			);
		});

		it("maps POST /api/client to write:crm", () => {
			expect(getRequiredScope("/api/client", "POST")).toBe(
				API_SCOPES.CRM_WRITE,
			);
		});
	});

	describe("finance domain", () => {
		it("maps GET /api/accounting/payments to read:finance", () => {
			expect(getRequiredScope("/api/accounting/payments", "GET")).toBe(
				API_SCOPES.FINANCE_READ,
			);
		});

		it("maps POST /api/payroll/reports to write:finance", () => {
			expect(getRequiredScope("/api/payroll/reports", "POST")).toBe(
				API_SCOPES.FINANCE_WRITE,
			);
		});
	});

	describe("admin routes", () => {
		it("maps /api/settings/* to admin scope regardless of method", () => {
			expect(getRequiredScope("/api/settings/api-keys", "GET")).toBe(
				API_SCOPES.ADMIN,
			);
			expect(getRequiredScope("/api/settings/audit-log", "GET")).toBe(
				API_SCOPES.ADMIN,
			);
		});

		it("maps /api/integrations/* to admin scope", () => {
			expect(getRequiredScope("/api/integrations/webhooks", "GET")).toBe(
				API_SCOPES.ADMIN,
			);
		});
	});

	describe("unmapped routes", () => {
		it("returns null for unknown routes", () => {
			expect(getRequiredScope("/api/unknown", "GET")).toBeNull();
		});

		it("returns null for /api/health routes", () => {
			expect(getRequiredScope("/api/health", "GET")).toBeNull();
		});
	});

	describe("case sensitivity", () => {
		it("treats method case-insensitively", () => {
			expect(getRequiredScope("/api/events", "get")).toBe(
				API_SCOPES.EVENTS_READ,
			);
			expect(getRequiredScope("/api/events", "post")).toBe(
				API_SCOPES.EVENTS_WRITE,
			);
		});
	});
});

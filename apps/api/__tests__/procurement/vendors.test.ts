/**
 * Procurement Vendors API Integration Tests
 *
 * Tests vendor list (with search/filtering and catalog counts),
 * vendor detail (with contacts and ratings), create, and update.
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listVendors } from "@/app/api/procurement/vendors/list/route";
import { GET as getVendor } from "@/app/api/procurement/vendors/[id]/route";
import { POST as createVendor } from "@/app/api/procurement/vendors/commands/create/route";
import { POST as updateVendor } from "@/app/api/procurement/vendors/commands/update/route";

// Mock dependencies
vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// Import mocked modules
import { auth } from "@repo/auth/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

// Test constants
const TEST_TENANT_ID = "a0000000-0000-4000-a000-000000000003";
const TEST_ORG_ID = "org-vendor-test";
const TEST_USER_ID = "user-clerk-vendor";
const TEST_VENDOR_ID = "e0000000-0000-4000-e000-000000000001";

// Helper to create a mock request
function createMockRequest(
  url: string,
  options: RequestInit = {}
): NextRequest {
  if (options.body && !options.headers) {
    options.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(
    new URL(url, "http://localhost:3000"),
    options as ConstructorParameters<typeof NextRequest>[1]
  );
}

function setupAuth() {
  vi.mocked(auth).mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_USER_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
}

// Mock Decimal-like performanceRating
function createMockDecimal(value: number) {
  return {
    toNumber: () => value,
    toString: () => String(value),
    valueOf: () => value,
  };
}

// Mock vendor factory matching the SupplierRow type expected by list route
function createMockVendor(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_VENDOR_ID,
    supplier_number: "VND-0001",
    name: "Acme Supplies",
    contact_person: "John Doe",
    email: "john@acme.com",
    phone: "555-0100",
    payment_terms: "NET_30",
    addressLine1: "123 Main St",
    addressLine2: null,
    city: "Springfield",
    state: "IL",
    postalCode: "62701",
    country: "US",
    taxId: "12-3456789",
    website: "https://acme.com",
    performanceRating: createMockDecimal(4.5),
    notes: null,
    tags: ["preferred", "food"],
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    _count: {
      vendorContacts: 2,
      vendorCatalogs: 15,
    },
    ...overrides,
  };
}

describe("Procurement Vendors API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ================================================================
  // GET /api/procurement/vendors (list)
  // ================================================================
  describe("GET /api/procurement/vendors (list)", () => {
    it("should return list of vendors with contact and catalog counts", async () => {
      const mockVendors = [
        createMockVendor({
          id: "vnd-001",
          name: "Acme Supplies",
          _count: { vendorContacts: 2, vendorCatalogs: 15 },
        }),
        createMockVendor({
          id: "vnd-002",
          name: "Beta Foods",
          _count: { vendorContacts: 1, vendorCatalogs: 8 },
        }),
      ];

      setupAuth();
      vi.mocked(database.inventorySupplier.findMany).mockResolvedValue(
        mockVendors as never
      );

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendors"
      );
      const response = await listVendors(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.vendors).toHaveLength(2);
      expect(data.vendors[0].name).toBe("Acme Supplies");
      expect(data.vendors[0].contact_count).toBe(2);
      expect(data.vendors[0].catalog_item_count).toBe(15);
    });

    it("should map vendor fields to snake_case", async () => {
      setupAuth();
      vi.mocked(database.inventorySupplier.findMany).mockResolvedValue([
        createMockVendor(),
      ] as never);

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendors"
      );
      const response = await listVendors(request);
      const data = await response.json();

      const vendor = data.vendors[0];
      expect(vendor.id).toBe(TEST_VENDOR_ID);
      expect(vendor.supplier_number).toBe("VND-0001");
      expect(vendor.contact_person).toBe("John Doe");
      expect(vendor.payment_terms).toBe("NET_30");
      expect(vendor.address_line1).toBe("123 Main St");
      expect(vendor.postal_code).toBe("62701");
      expect(vendor.tax_id).toBe("12-3456789");
      expect(vendor.performance_rating).toBe(4.5);
    });

    it("should filter by search query", async () => {
      setupAuth();
      vi.mocked(database.inventorySupplier.findMany).mockResolvedValue([]);

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendors?search=acme"
      );
      await listVendors(request);

      expect(database.inventorySupplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            OR: expect.arrayContaining([
              { name: { contains: "acme", mode: "insensitive" } },
            ]),
          }),
        })
      );
    });

    it("should enforce tenant isolation", async () => {
      setupAuth();
      vi.mocked(database.inventorySupplier.findMany).mockResolvedValue([]);

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendors"
      );
      await listVendors(request);

      expect(database.inventorySupplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          }),
        })
      );
    });

    it("should exclude soft-deleted vendors", async () => {
      setupAuth();
      vi.mocked(database.inventorySupplier.findMany).mockResolvedValue([]);

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendors"
      );
      await listVendors(request);

      expect(database.inventorySupplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        })
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: null,
        userId: null,
      } as never);

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendors"
      );
      const response = await listVendors(request);

      expect(response.status).toBe(401);
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_USER_ID,
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendors"
      );
      const response = await listVendors(request);

      expect(response.status).toBe(400);
    });

    it("should order vendors by name ascending", async () => {
      setupAuth();
      vi.mocked(database.inventorySupplier.findMany).mockResolvedValue([]);

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendors"
      );
      await listVendors(request);

      expect(database.inventorySupplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: "asc" },
        })
      );
    });
  });

  // ================================================================
  // GET /api/procurement/vendors/[id] (detail)
  // ================================================================
  describe("GET /api/procurement/vendors/[id] (detail)", () => {
    it("should return vendor detail with contacts and ratings", async () => {
      const mockVendor = createMockVendor();
      const mockContacts = [
        {
          id: "contact-001",
          tenantId: TEST_TENANT_ID,
          supplierId: TEST_VENDOR_ID,
          contactName: "Jane Smith",
          contactEmail: "jane@acme.com",
          contactPhone: "555-0101",
          contactRole: "Sales Rep",
          isPrimary: true,
          notes: null,
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
        },
      ];
      const mockRatings = [
        {
          id: "rating-001",
          tenantId: TEST_TENANT_ID,
          supplierId: TEST_VENDOR_ID,
          category: "quality",
          rating: 5,
          comment: "Excellent quality",
          ratedBy: TEST_USER_ID,
          createdAt: new Date("2026-01-15"),
          updatedAt: new Date("2026-01-15"),
          tenant: { name: "Test Org" },
        },
      ];

      setupAuth();
      vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue(
        mockVendor as never
      );
      vi.mocked(database.vendorContact.findMany).mockResolvedValue(
        mockContacts as never
      );
      vi.mocked(database.vendorRating.findMany).mockResolvedValue(
        mockRatings as never
      );
      vi.mocked(database.vendorCatalog.count).mockResolvedValue(15);

      const request = createMockRequest(
        `http://localhost:3000/api/procurement/vendors/${TEST_VENDOR_ID}`
      );
      const response = await getVendor(request, {
        params: Promise.resolve({ id: TEST_VENDOR_ID }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.vendor.id).toBe(TEST_VENDOR_ID);
      expect(data.vendor.name).toBe("Acme Supplies");
      expect(data.contacts).toHaveLength(1);
      expect(data.contacts[0].contact_name).toBe("Jane Smith");
      expect(data.contacts[0].is_primary).toBe(true);
      expect(data.ratings).toHaveLength(1);
      expect(data.ratings[0].rating).toBe(5);
      expect(data.ratings[0].rated_by_name).toBe("Test Org");
      expect(data.catalogItemCount).toBe(15);
    });

    it("should return 404 when vendor not found", async () => {
      setupAuth();
      vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue(
        null as never
      );

      const request = createMockRequest(
        `http://localhost:3000/api/procurement/vendors/${TEST_VENDOR_ID}`
      );
      const response = await getVendor(request, {
        params: Promise.resolve({ id: TEST_VENDOR_ID }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.message).toBe("Vendor not found");
    });

    it("should enforce tenant isolation in detail query", async () => {
      setupAuth();
      vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue(
        null as never
      );

      const request = createMockRequest(
        `http://localhost:3000/api/procurement/vendors/${TEST_VENDOR_ID}`
      );
      await getVendor(request, {
        params: Promise.resolve({ id: TEST_VENDOR_ID }),
      });

      expect(database.inventorySupplier.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            id: TEST_VENDOR_ID,
          }),
        })
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: null,
        userId: null,
      } as never);

      const request = createMockRequest(
        `http://localhost:3000/api/procurement/vendors/${TEST_VENDOR_ID}`
      );
      const response = await getVendor(request, {
        params: Promise.resolve({ id: TEST_VENDOR_ID }),
      });

      expect(response.status).toBe(401);
    });
  });

  // ================================================================
  // POST /api/procurement/vendors/commands/create
  // ================================================================
  describe("POST create vendor", () => {
    it("should create a vendor with required fields", async () => {
      const createdVendor = {
        id: "new-vnd-001",
        supplier_number: "VND-0001",
        name: "New Vendor Corp",
        contact_person: "Alice",
        email: "alice@newvendor.com",
        phone: "555-0200",
        payment_terms: "NET_30",
        createdAt: new Date("2026-01-15"),
      };

      setupAuth();
      vi.mocked(database.inventorySupplier.count).mockResolvedValue(0);
      vi.mocked(database.inventorySupplier.create).mockResolvedValue(
        createdVendor as never
      );

      const body = {
        name: "New Vendor Corp",
        contactPerson: "Alice",
        email: "alice@newvendor.com",
        phone: "555-0200",
      };

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendors/commands/create",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await createVendor(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.vendor.name).toBe("New Vendor Corp");
      expect(data.vendor.supplier_number).toBe("VND-0001");
    });

    it("should pass tenantId when creating vendor", async () => {
      setupAuth();
      vi.mocked(database.inventorySupplier.count).mockResolvedValue(0);
      vi.mocked(database.inventorySupplier.create).mockResolvedValue({
        id: "new-vnd-001",
        supplier_number: "VND-0001",
        name: "Test",
        contact_person: null,
        email: null,
        phone: null,
        payment_terms: "NET_30",
        createdAt: new Date(),
      } as never);

      const body = { name: "Test" };
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendors/commands/create",
        { method: "POST", body: JSON.stringify(body) }
      );
      await createVendor(request);

      expect(database.inventorySupplier.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
          }),
        })
      );
    });

    it("should create vendor contact when contactPerson and email provided", async () => {
      const vendorId = "new-vnd-002";
      setupAuth();
      vi.mocked(database.inventorySupplier.count).mockResolvedValue(1);
      vi.mocked(database.inventorySupplier.create).mockResolvedValue({
        id: vendorId,
        supplier_number: "VND-0002",
        name: "Supplier With Contact",
        contact_person: "Bob",
        email: "bob@supplier.com",
        phone: null,
        payment_terms: "NET_30",
        createdAt: new Date(),
      } as never);
      vi.mocked(database.vendorContact.create).mockResolvedValue({} as never);

      const body = {
        name: "Supplier With Contact",
        contactPerson: "Bob",
        email: "bob@supplier.com",
      };
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendors/commands/create",
        { method: "POST", body: JSON.stringify(body) }
      );
      await createVendor(request);

      expect(database.vendorContact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            supplierId: vendorId,
            contactName: "Bob",
            isPrimary: true,
          }),
        })
      );
    });

    it("should NOT create vendor contact when only contactPerson is provided without email/phone", async () => {
      setupAuth();
      vi.mocked(database.inventorySupplier.count).mockResolvedValue(0);
      vi.mocked(database.inventorySupplier.create).mockResolvedValue({
        id: "new-vnd-003",
        supplier_number: "VND-0001",
        name: "No Email Vendor",
        contact_person: "Alice",
        email: null,
        phone: null,
        payment_terms: "NET_30",
        createdAt: new Date(),
      } as never);

      const body = { name: "No Email Vendor", contactPerson: "Alice" };
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendors/commands/create",
        { method: "POST", body: JSON.stringify(body) }
      );
      await createVendor(request);

      expect(database.vendorContact.create).not.toHaveBeenCalled();
    });

    it("should return 400 when name is missing", async () => {
      setupAuth();

      const body = { email: "test@test.com" };
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendors/commands/create",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await createVendor(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe("name is required");
    });

    it("should generate sequential supplier number", async () => {
      setupAuth();
      vi.mocked(database.inventorySupplier.count).mockResolvedValue(9);
      vi.mocked(database.inventorySupplier.create).mockResolvedValue({
        id: "new-vnd-010",
        supplier_number: "VND-0010",
        name: "Test",
        contact_person: null,
        email: null,
        phone: null,
        payment_terms: "NET_30",
        createdAt: new Date(),
      } as never);

      const body = { name: "Test" };
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendors/commands/create",
        { method: "POST", body: JSON.stringify(body) }
      );
      await createVendor(request);

      expect(database.inventorySupplier.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            supplier_number: "VND-0010",
          }),
        })
      );
    });

    it("should default payment_terms to NET_30 when not provided", async () => {
      setupAuth();
      vi.mocked(database.inventorySupplier.count).mockResolvedValue(0);
      vi.mocked(database.inventorySupplier.create).mockResolvedValue({
        id: "new-vnd-001",
        supplier_number: "VND-0001",
        name: "Test",
        contact_person: null,
        email: null,
        phone: null,
        payment_terms: "NET_30",
        createdAt: new Date(),
      } as never);

      const body = { name: "Test" };
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendors/commands/create",
        { method: "POST", body: JSON.stringify(body) }
      );
      await createVendor(request);

      expect(database.inventorySupplier.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            payment_terms: "NET_30",
          }),
        })
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: null,
        userId: null,
      } as never);

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendors/commands/create",
        { method: "POST", body: JSON.stringify({ name: "Test" }) }
      );
      const response = await createVendor(request);

      expect(response.status).toBe(401);
    });
  });

  // ================================================================
  // POST /api/procurement/vendors/commands/update
  // ================================================================
  describe("POST update vendor", () => {
    it("should update vendor fields", async () => {
      const existingVendor = createMockVendor();
      const updatedVendor = {
        ...existingVendor,
        name: "Updated Vendor Name",
        updatedAt: new Date("2026-02-01"),
      };

      setupAuth();
      vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue(
        existingVendor as never
      );
      vi.mocked(database.inventorySupplier.update).mockResolvedValue(
        updatedVendor as never
      );

      const body = {
        vendorId: TEST_VENDOR_ID,
        name: "Updated Vendor Name",
      };
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendors/commands/update",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await updateVendor(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.vendor.name).toBe("Updated Vendor Name");
    });

    it("should return 400 when vendorId is missing", async () => {
      setupAuth();

      const body = { name: "Updated Name" };
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendors/commands/update",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await updateVendor(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe("vendorId is required");
    });

    it("should return 404 when vendor not found", async () => {
      setupAuth();
      vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue(
        null as never
      );

      const body = { vendorId: TEST_VENDOR_ID, name: "Updated" };
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendors/commands/update",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await updateVendor(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.message).toBe("Vendor not found");
    });

    it("should enforce tenant isolation when checking vendor existence", async () => {
      setupAuth();
      vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue(
        null as never
      );

      const body = { vendorId: TEST_VENDOR_ID, name: "Updated" };
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendors/commands/update",
        { method: "POST", body: JSON.stringify(body) }
      );
      await updateVendor(request);

      expect(database.inventorySupplier.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            id: TEST_VENDOR_ID,
          }),
        })
      );
    });

    it("should pass performanceRating when provided", async () => {
      const existingVendor = createMockVendor();
      setupAuth();
      vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue(
        existingVendor as never
      );
      vi.mocked(database.inventorySupplier.update).mockResolvedValue({
        ...existingVendor,
        performanceRating: createMockDecimal(5),
        updatedAt: new Date("2026-02-01"),
      } as never);

      const body = {
        vendorId: TEST_VENDOR_ID,
        performanceRating: 5,
      };
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendors/commands/update",
        { method: "POST", body: JSON.stringify(body) }
      );
      await updateVendor(request);

      expect(database.inventorySupplier.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            performanceRating: 5,
          }),
        })
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: null,
        userId: null,
      } as never);

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendors/commands/update",
        {
          method: "POST",
          body: JSON.stringify({ vendorId: TEST_VENDOR_ID }),
        }
      );
      const response = await updateVendor(request);

      expect(response.status).toBe(401);
    });
  });
});

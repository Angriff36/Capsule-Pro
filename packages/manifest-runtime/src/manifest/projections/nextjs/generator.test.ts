/**
 * Smoke tests for Next.js projection generator.
 *
 * Tests verify the critical contract:
 * - Must use Prisma directly for reads (NOT runtime.query or runtime.get)
 * - Must include tenantId + deletedAt filtering (when enabled)
 * - Must handle entity not found errors
 */

import { describe, expect, it } from "vitest";
import { compileToIR } from "../../ir-compiler";
import { NextJsProjection } from "./generator";

describe("NextJsProjection", () => {
  const projection = new NextJsProjection();

  function firstCode(result: ReturnType<typeof projection.generate>): string {
    expect(result.artifacts.length).toBeGreaterThan(0);
    return result.artifacts[0].code;
  }

  describe("nextjs.route surface", () => {
    it("generates route with direct Prisma query (not runtime.query)", async () => {
      const source = `
        entity Recipe {
          property id: string
          property name: string
          property category: string?
        }
      `;

      const result = await compileToIR(source);
      expect(result.diagnostics).toHaveLength(0);
      expect(result.ir).not.toBeNull();

      const routeResult = projection.generate(result.ir!, {
        surface: "nextjs.route",
        entity: "Recipe",
      });

      const code = firstCode(routeResult);

      // Contract: Must use Prisma directly for reads
      expect(code).toContain("database.recipe.findMany");
      expect(code).not.toContain("runtime.query");
      expect(code).not.toContain("runtime.get");

      // Contract: Must filter by tenant (when enabled by default)
      expect(code).toContain("tenantId");
      expect(code).toContain("deletedAt: null");

      // Contract: Must have proper error handling
      expect(code).toContain("try {");
      expect(code).toContain("} catch (error)");
      expect(code).toContain("manifestErrorResponse");

      // Contract: Must have auth check
      expect(code).toContain("Unauthorized");

      // Contract: Must clamp pagination so a single hostile or buggy client
      // cannot request the entire table in one round trip. The generator owns
      // this — list routes are auto-generated from the Manifest IR, so the
      // bound has to live in the template (not in each route).
      expect(code).toContain("clampLimit");
      expect(code).toContain("clampOffset");
      expect(code).toContain("MAX_LIMIT = 200");
      expect(code).toContain("take: limit");
      expect(code).toContain("skip: offset");
      expect(code).toContain("limit, offset");

      expect(routeResult.diagnostics).toHaveLength(0);
    });

    it("returns error diagnostic if entity not found in IR", async () => {
      const source = "entity Recipe { property id: string }";
      const result = await compileToIR(source);

      expect(result.diagnostics).toHaveLength(0);

      const routeResult = projection.generate(result.ir!, {
        surface: "nextjs.route",
        entity: "NonExistent",
      });

      expect(routeResult.artifacts).toHaveLength(0);
      expect(routeResult.diagnostics).toHaveLength(1);
      expect(routeResult.diagnostics[0].severity).toBe("error");
      expect(routeResult.diagnostics[0].message).toContain(
        'Entity "NonExistent" not found'
      );
      expect(routeResult.diagnostics[0].entity).toBe("NonExistent");
    });

    it("returns error diagnostic if entity not provided", async () => {
      const source = "entity Recipe { property id: string }";
      const result = await compileToIR(source);

      const routeResult = projection.generate(result.ir!, {
        surface: "nextjs.route",
      });

      expect(routeResult.artifacts).toHaveLength(0);
      expect(routeResult.diagnostics).toHaveLength(1);
      expect(routeResult.diagnostics[0].severity).toBe("error");
      expect(routeResult.diagnostics[0].message).toContain("requires entity");
    });

    it("respects includeTenantFilter option", async () => {
      const source = `
        entity Recipe {
          property id: string
          property name: string
        }
      `;

      const result = await compileToIR(source);
      expect(result.ir).not.toBeNull();

      const noFilterResult = projection.generate(result.ir!, {
        surface: "nextjs.route",
        entity: "Recipe",
        options: { includeTenantFilter: false },
      });

      const noFilterCode = firstCode(noFilterResult);
      expect(noFilterCode).not.toContain("tenantId");

      const withFilterResult = projection.generate(result.ir!, {
        surface: "nextjs.route",
        entity: "Recipe",
      });

      const withFilterCode = firstCode(withFilterResult);
      expect(withFilterCode).toContain("tenantId");
      expect(withFilterCode).toContain("getTenantIdForOrg");
    });

    it("respects includeSoftDeleteFilter option", async () => {
      const source = `
        entity Recipe {
          property id: string
          property name: string
        }
      `;

      const result = await compileToIR(source);
      expect(result.ir).not.toBeNull();

      const noSoftDeleteResult = projection.generate(result.ir!, {
        surface: "nextjs.route",
        entity: "Recipe",
        options: { includeSoftDeleteFilter: false },
      });

      expect(firstCode(noSoftDeleteResult)).not.toContain("deletedAt");

      const withSoftDeleteResult = projection.generate(result.ir!, {
        surface: "nextjs.route",
        entity: "Recipe",
      });

      expect(firstCode(withSoftDeleteResult)).toContain("deletedAt");
    });

    it("supports different auth providers", async () => {
      const source = `
        entity Recipe {
          property id: string
        }
      `;

      const result = await compileToIR(source);
      expect(result.ir).not.toBeNull();

      const clerkResult = projection.generate(result.ir!, {
        surface: "nextjs.route",
        entity: "Recipe",
        options: { authProvider: "clerk" },
      });
      expect(firstCode(clerkResult)).toContain('from "@repo/auth/server"');
      expect(firstCode(clerkResult)).toContain(
        "const { orgId, userId } = await auth()"
      );

      const nextAuthResult = projection.generate(result.ir!, {
        surface: "nextjs.route",
        entity: "Recipe",
        options: { authProvider: "nextauth" },
      });
      expect(firstCode(nextAuthResult)).toContain("getServerSession");

      const noAuthResult = projection.generate(result.ir!, {
        surface: "nextjs.route",
        entity: "Recipe",
        options: { authProvider: "none" },
      });
      expect(firstCode(noAuthResult)).toContain("Auth disabled");
      expect(firstCode(noAuthResult)).toContain('const userId = "anonymous"');
    });

    it("respects custom import paths", async () => {
      const source = `
        entity Recipe {
          property id: string
        }
      `;

      const result = await compileToIR(source);
      expect(result.ir).not.toBeNull();

      const customPathsResult = projection.generate(result.ir!, {
        surface: "nextjs.route",
        entity: "Recipe",
        options: {
          databaseImportPath: "@myapp/db",
          authImportPath: "@myapp/auth",
          responseImportPath: "@myapp/responses",
        },
      });

      const code = firstCode(customPathsResult);
      expect(code).toContain('from "@myapp/db"');
      expect(code).toContain('from "@myapp/auth"');
      expect(code).toContain('from "@myapp/responses"');
    });

    it("respects custom tenant and soft delete property names", async () => {
      const source = `
        entity Recipe {
          property id: string
        }
      `;

      const result = await compileToIR(source);
      expect(result.ir).not.toBeNull();

      const customPropsResult = projection.generate(result.ir!, {
        surface: "nextjs.route",
        entity: "Recipe",
        options: {
          tenantIdProperty: "orgId",
          deletedAtProperty: "removedAt",
        },
      });

      const code = firstCode(customPropsResult);
      expect(code).toContain("orgId");
      expect(code).toContain("removedAt: null");
      expect(code).not.toContain("tenantId");
      expect(code).not.toContain("deletedAt");
    });
  });

  describe("nextjs.detail surface", () => {
    // These tests lock in the contract established by the 56th audit pass:
    // detail routes MUST emit `findFirst` (not `findUnique`) so the
    // soft-delete and tenant filters can coexist with the primary-key
    // filter without triggering Prisma's WhereUniqueInput type errors.
    // A regression to `findUnique` would silently break ~40 routes whose
    // models use compound unique keys like (tenantId, id).
    it("emits findFirst (not findUnique) for detail route", async () => {
      const source = `
        entity Recipe {
          property id: string
          property name: string
        }
      `;

      const result = await compileToIR(source);
      expect(result.diagnostics).toHaveLength(0);
      expect(result.ir).not.toBeNull();

      const detailResult = projection.generate(result.ir!, {
        surface: "nextjs.detail",
        entity: "Recipe",
      });

      const code = firstCode(detailResult);

      // Contract: Must use findFirst, not findUnique.
      // findUnique cannot accept arbitrary filters (deletedAt: null,
      // tenantId) alongside the unique key — Prisma's WhereUniqueInput
      // is strict. findFirst is the only call that lets the generator
      // stay schema-agnostic across all 97+ entities.
      expect(code).toContain("database.recipe.findFirst");
      expect(code).not.toContain("database.recipe.findUnique");
      expect(code).not.toContain("findUnique");

      // Contract: Must filter by id (primary key) inside the where.
      expect(code).toContain("id");

      // Contract: Must filter by tenant + soft-delete by default.
      expect(code).toContain("tenantId");
      expect(code).toContain("deletedAt: null");

      // Contract: Must handle not-found with a 404 response.
      expect(code).toContain("not found");
      expect(code).toContain("404");

      // Contract: Must have proper error handling.
      expect(code).toContain("try {");
      expect(code).toContain("} catch (error)");
      expect(code).toContain("manifestErrorResponse");

      // Contract: Must have auth check.
      expect(code).toContain("Unauthorized");

      expect(detailResult.diagnostics).toHaveLength(0);
    });

    it("emits findFirst regardless of entity name (lowerCamelCase delegate)", async () => {
      // Verifies the pattern holds when the Prisma delegate name is
      // derived from a multi-word entity name. The 56th pass uncovered
      // that camelCase model names also need findFirst — the rule must
      // not depend on entity-name shape.
      const source = `
        entity PrepTaskPlanWorkflow {
          property id: string
          property status: string
        }
      `;

      const result = await compileToIR(source);
      expect(result.diagnostics).toHaveLength(0);

      const detailResult = projection.generate(result.ir!, {
        surface: "nextjs.detail",
        entity: "PrepTaskPlanWorkflow",
      });

      const code = firstCode(detailResult);

      expect(code).toContain("database.prepTaskPlanWorkflow.findFirst");
      expect(code).not.toContain("findUnique");
    });

    it("returns error diagnostic if entity not found in IR", async () => {
      const source = "entity Recipe { property id: string }";
      const result = await compileToIR(source);

      const detailResult = projection.generate(result.ir!, {
        surface: "nextjs.detail",
        entity: "NonExistent",
      });

      expect(detailResult.artifacts).toHaveLength(0);
      expect(detailResult.diagnostics.length).toBeGreaterThanOrEqual(1);
      expect(detailResult.diagnostics.some((d) => d.severity === "error")).toBe(
        true
      );
    });

    it("returns error diagnostic if entity not provided", async () => {
      const source = "entity Recipe { property id: string }";
      const result = await compileToIR(source);

      const detailResult = projection.generate(result.ir!, {
        surface: "nextjs.detail",
      });

      expect(detailResult.artifacts).toHaveLength(0);
      expect(detailResult.diagnostics).toHaveLength(1);
      expect(detailResult.diagnostics[0].severity).toBe("error");
      expect(detailResult.diagnostics[0].code).toBe("MISSING_ENTITY");
    });

    it("respects custom tenantIdProperty and deletedAtProperty options", async () => {
      // Mirrors the equivalent nextjs.route test. Custom property names
      // must flow through to the findFirst where clause too — the
      // generator must NOT hardcode tenantId/deletedAt anywhere in the
      // detail path.
      const source = `
        entity Recipe {
          property id: string
          property name: string
        }
      `;

      const result = await compileToIR(source);

      const detailResult = projection.generate(result.ir!, {
        surface: "nextjs.detail",
        entity: "Recipe",
        options: {
          tenantIdProperty: "orgId",
          deletedAtProperty: "removedAt",
        },
      });

      const code = firstCode(detailResult);
      expect(code).toContain("findFirst");
      expect(code).toContain("orgId");
      expect(code).toContain("removedAt: null");
      expect(code).not.toContain("tenantId");
      expect(code).not.toContain("deletedAt");
    });
  });

  describe("ts.types surface", () => {
    it("generates TypeScript types from IR entities", async () => {
      const source = `
        entity Recipe {
          property required id: string
          property required name: string
          property category: string?
          property rating: number = 5
        }
      `;

      const result = await compileToIR(source);
      expect(result.ir).not.toBeNull();

      const typesResult = projection.generate(result.ir!, {
        surface: "ts.types",
      });

      const code = firstCode(typesResult);
      expect(code).toContain("export interface Recipe");
      expect(code).toContain("id: string;");
      expect(code).toContain("name: string;");
      expect(code).toContain("category?: string | null;");
      expect(code).toContain("rating?: number;");
    });
  });

  describe("ts.client surface", () => {
    it("generates client SDK functions", async () => {
      const source = `
        entity Recipe {
          property id: string
        }
      `;

      const result = await compileToIR(source);
      expect(result.ir).not.toBeNull();

      const clientResult = projection.generate(result.ir!, {
        surface: "ts.client",
      });

      const code = firstCode(clientResult);
      expect(code).toContain("export async function getRecipes()");
      expect(code).toContain("fetch(`/api/recipe`)");
    });
  });

  describe("nextjs.command surface", () => {
    const commandSource = `
      entity Recipe {
        property id: string
        property name: string

        command create(name: string) {
          guard name != ""
          mutate name = name
        }
      }
    `;

    it("generates POST handler that calls runtime.runCommand (not database)", async () => {
      const result = await compileToIR(commandSource);
      expect(result.diagnostics).toHaveLength(0);
      expect(result.ir).not.toBeNull();

      const commandResult = projection.generate(result.ir!, {
        surface: "nextjs.command",
        entity: "Recipe",
        command: "create",
      });

      const code = firstCode(commandResult);

      // Contract: Must call runtime.runCommand for the mutation, not direct DB writes
      expect(code).toContain("runtime.runCommand");
      expect(code).not.toContain("database.recipe");
      expect(code).not.toContain("findMany");
      expect(code).not.toContain("create(");
      expect(code).not.toContain("update(");

      // Contract: Must pass command name and entityName
      expect(code).toContain('"create"');
      expect(code).toContain('entityName: "Recipe"');

      // Contract: Must use createManifestRuntime with user context (including tenantId by default)
      expect(code).toContain("createManifestRuntime");
      expect(code).toContain("user: { id: _resolvedUser");

      // Contract: Must resolve user role for RBAC policy evaluation
      expect(code).toContain("database.user.findFirst");
      expect(code).toContain("role: _resolvedUser");

      // Contract: Must handle guard failure with 422
      expect(code).toContain("guardFailure");
      expect(code).toContain("422");

      // Contract: Must handle policy denial with 403
      expect(code).toContain("policyDenial");
      expect(code).toContain("403");

      // Contract: Must have auth check
      expect(code).toContain("Unauthorized");

      // Contract: Must be a POST handler
      expect(code).toContain("export async function POST");

      expect(commandResult.diagnostics).toHaveLength(0);
    });

    it("includes tenant lookup and passes tenantId to runtime context (default)", async () => {
      const result = await compileToIR(commandSource);
      expect(result.ir).not.toBeNull();

      const commandResult = projection.generate(result.ir!, {
        surface: "nextjs.command",
        entity: "Recipe",
        command: "create",
      });

      const code = firstCode(commandResult);

      // Tenant lookup must be present
      expect(code).toContain("getTenantIdForOrg");
      expect(code).toContain("tenantId");
      // Tenant must be passed into runtime context, not just body
      expect(code).toContain("tenantId: tenantId");
      // Tenant resolver import should be used for tenant lookup
      expect(code).toContain('from "@/app/lib/tenant"');
    });

    it("omits tenant lookup when includeTenantFilter is false", async () => {
      const result = await compileToIR(commandSource);
      expect(result.ir).not.toBeNull();

      const commandResult = projection.generate(result.ir!, {
        surface: "nextjs.command",
        entity: "Recipe",
        command: "create",
        options: { includeTenantFilter: false },
      });

      const code = firstCode(commandResult);
      expect(code).not.toContain("getTenantIdForOrg");
      // When includeTenantFilter is false, tenantId is still included but with a placeholder
      expect(code).toContain('tenantId: "__no_tenant__"');
    });

    it("returns error diagnostic if entity not found", async () => {
      const source = "entity Recipe { property id: string }";
      const result = await compileToIR(source);

      const commandResult = projection.generate(result.ir!, {
        surface: "nextjs.command",
        entity: "NonExistent",
        command: "create",
      });

      expect(commandResult.artifacts).toHaveLength(0);
      expect(commandResult.diagnostics).toHaveLength(1);
      expect(commandResult.diagnostics[0].severity).toBe("error");
      expect(commandResult.diagnostics[0].code).toBe("ENTITY_NOT_FOUND");
      expect(commandResult.diagnostics[0].message).toContain(
        'Entity "NonExistent" not found'
      );
    });

    it("returns error diagnostic if command not found", async () => {
      const source = "entity Recipe { property id: string }";
      const result = await compileToIR(source);

      const commandResult = projection.generate(result.ir!, {
        surface: "nextjs.command",
        entity: "Recipe",
        command: "nonExistentCommand",
      });

      expect(commandResult.artifacts).toHaveLength(0);
      expect(commandResult.diagnostics).toHaveLength(1);
      expect(commandResult.diagnostics[0].severity).toBe("error");
      expect(commandResult.diagnostics[0].code).toBe("COMMAND_NOT_FOUND");
      expect(commandResult.diagnostics[0].message).toContain(
        'Command "nonExistentCommand" not found'
      );
    });

    it("returns error diagnostic if entity not provided", async () => {
      const source = "entity Recipe { property id: string }";
      const result = await compileToIR(source);

      const commandResult = projection.generate(result.ir!, {
        surface: "nextjs.command",
        command: "create",
      });

      expect(commandResult.artifacts).toHaveLength(0);
      expect(commandResult.diagnostics[0].code).toBe("MISSING_ENTITY");
      expect(commandResult.diagnostics[0].message).toContain("requires entity");
    });

    it("returns error diagnostic if command not provided", async () => {
      const source = "entity Recipe { property id: string }";
      const result = await compileToIR(source);

      const commandResult = projection.generate(result.ir!, {
        surface: "nextjs.command",
        entity: "Recipe",
      });

      expect(commandResult.artifacts).toHaveLength(0);
      expect(commandResult.diagnostics[0].code).toBe("MISSING_COMMAND");
      expect(commandResult.diagnostics[0].message).toContain(
        "requires command"
      );
    });

    it("uses custom runtimeImportPath", async () => {
      const result = await compileToIR(commandSource);
      expect(result.ir).not.toBeNull();

      const commandResult = projection.generate(result.ir!, {
        surface: "nextjs.command",
        entity: "Recipe",
        command: "create",
        options: { runtimeImportPath: "@myapp/runtime" },
      });

      expect(firstCode(commandResult)).toContain('from "@myapp/runtime"');
    });

    it("supports different auth providers", async () => {
      const result = await compileToIR(commandSource);
      expect(result.ir).not.toBeNull();

      const clerkResult = projection.generate(result.ir!, {
        surface: "nextjs.command",
        entity: "Recipe",
        command: "create",
        options: { authProvider: "clerk" },
      });
      expect(firstCode(clerkResult)).toContain('from "@repo/auth/server"');

      const noAuthResult = projection.generate(result.ir!, {
        surface: "nextjs.command",
        entity: "Recipe",
        command: "create",
        options: { authProvider: "none" },
      });
      expect(firstCode(noAuthResult)).toContain("Auth disabled");
    });

    it("resolves user role for RBAC policy evaluation", async () => {
      const result = await compileToIR(commandSource);
      expect(result.ir).not.toBeNull();

      const commandResult = projection.generate(result.ir!, {
        surface: "nextjs.command",
        entity: "Recipe",
        command: "create",
      });

      const code = firstCode(commandResult);

      // Contract: Must import database for user lookup
      expect(code).toContain('import { database }');

      // Contract: Must resolve internal user by authUserId for role
      expect(code).toContain("database.user.findFirst");
      expect(code).toContain("authUserId: userId");

      // Contract: Must pass resolved role to runtime context
      expect(code).toContain("role: _resolvedUser");

      // Contract: Must fall back to Clerk userId when user not found
      expect(code).toContain("_resolvedUser?.id ?? userId");
    });

    it("omits instanceId for create commands", async () => {
      const result = await compileToIR(commandSource);
      expect(result.diagnostics).toHaveLength(0);
      expect(result.ir).not.toBeNull();

      const commandResult = projection.generate(result.ir!, {
        surface: "nextjs.command",
        entity: "Recipe",
        command: "create",
      });

      const code = firstCode(commandResult);

      // Contract: create commands must NOT include instanceId — the runtime
      // uses createInstance() when instanceId is absent + command is "create".
      expect(code).not.toContain("instanceId");
    });

    it("emits instanceId for non-create commands (update)", async () => {
      const updateSource = `
        entity Recipe {
          property id: string
          property name: string
          property status: string

          command update(name: string) {
            guard name != ""
            mutate name = name
          }
        }
      `;
      const result = await compileToIR(updateSource);
      expect(result.diagnostics).toHaveLength(0);
      expect(result.ir).not.toBeNull();

      const commandResult = projection.generate(result.ir!, {
        surface: "nextjs.command",
        entity: "Recipe",
        command: "update",
      });

      const code = firstCode(commandResult);

      // Contract: non-create commands MUST pass instanceId so the runtime
      // engine targets the correct entity for mutate/update actions.
      expect(code).toContain("instanceId");
      expect(code).toContain("body.id");
      expect(code).toContain('entityName: "Recipe"');
    });

    it("emits instanceId for approve-like commands", async () => {
      const approveSource = `
        entity Proposal {
          property id: string
          property status: string

          command approve() {
            mutate status = "approved"
          }
        }
      `;
      const result = await compileToIR(approveSource);
      expect(result.diagnostics).toHaveLength(0);
      expect(result.ir).not.toBeNull();

      const commandResult = projection.generate(result.ir!, {
        surface: "nextjs.command",
        entity: "Proposal",
        command: "approve",
      });

      const code = firstCode(commandResult);

      // Contract: approve/reject/submit etc. are instance-scoped and need instanceId
      expect(code).toContain("instanceId");
      expect(code).toContain("body.id");
    });

    it("artifact has correct id and pathHint", async () => {
      const result = await compileToIR(commandSource);
      expect(result.ir).not.toBeNull();

      const commandResult = projection.generate(result.ir!, {
        surface: "nextjs.command",
        entity: "Recipe",
        command: "create",
      });

      expect(commandResult.artifacts[0].id).toBe(
        "nextjs.command:Recipe.create"
      );
      expect(commandResult.artifacts[0].pathHint).toContain(
        "recipe/create/route.ts"
      );
    });
  });

  describe("projection metadata", () => {
    it("has correct name, description, and surfaces", () => {
      expect(projection.name).toBe("nextjs");
      expect(projection.description).toContain("Next.js App Router");
      expect(projection.surfaces).toContain("nextjs.route");
      expect(projection.surfaces).toContain("nextjs.command");
      expect(projection.surfaces).toContain("ts.types");
      expect(projection.surfaces).toContain("ts.client");
    });
  });
});

import { randomUUID } from "node:crypto";
import type { IrCommandLike } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IrBundle = any;

const FIXTURE_IDS: Record<string, string> = {
  tenantId: "smoke-tenant-00000000-0000-4000-8000-000000000001",
  eventId: "smoke-event-00000000-0000-4000-8000-000000000010",
  clientId: "smoke-client-00000000-0000-4000-8000-000000000020",
  staffMemberId: "smoke-staff-00000000-0000-4000-8000-000000000030",
  userId: "smoke-user-00000000-0000-4000-8000-000000000040",
  employeeId: "smoke-user-00000000-0000-4000-8000-000000000040",
  venueId: "smoke-venue-00000000-0000-4000-8000-000000000050",
  locationId: "smoke-loc-00000000-0000-4000-8000-000000000060",
  boardId: "smoke-board-00000000-0000-4000-8000-000000000070",
  menuId: "smoke-menu-00000000-0000-4000-8000-000000000080",
  dishId: "smoke-dish-00000000-0000-4000-8000-000000000090",
  recipeId: "smoke-recipe-00000000-0000-4000-8000-000000000091",
  vendorId: "smoke-vendor-00000000-0000-4000-8000-000000000092",
  inventoryItemId: "smoke-inv-00000000-0000-4000-8000-000000000093",
  payrollPeriodId: "smoke-period-00000000-0000-4000-8000-000000000094",
  payrollRunId: "smoke-run-00000000-0000-4000-8000-000000000095",
};

function firstEnumValue(ir: IrBundle, typeName: string): string | undefined {
  const enumDef = (ir.enums ?? []).find(
    (entry: { name: string }) => entry.name === typeName
  );
  const first = enumDef?.values?.[0];
  return typeof first?.name === "string" ? first.name : undefined;
}

function dummyForType(
  ir: IrBundle,
  typeName: string,
  paramName: string
): unknown {
  switch (typeName) {
    case "string":
      if (FIXTURE_IDS[paramName]) {
        return FIXTURE_IDS[paramName];
      }
      if (/Id$/i.test(paramName) || paramName.endsWith("_id")) {
        return randomUUID();
      }
      return `smoke-${paramName}`;
    case "number":
    case "int":
      return 1;
    case "boolean":
      return false;
    case "datetime":
      return Date.now();
    case "money":
    case "decimal":
      return 0;
    default: {
      const enumValue = firstEnumValue(ir, typeName);
      if (enumValue) {
        return enumValue;
      }
      return FIXTURE_IDS[paramName] ?? randomUUID();
    }
  }
}

export function buildCommandPayload(
  ir: IrBundle,
  cmd: IrCommandLike
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    id: randomUUID(),
    tenantId: FIXTURE_IDS.tenantId,
  };

  for (const param of cmd.parameters ?? []) {
    const typeName = param.type?.name ?? "string";
    body[param.name] = dummyForType(ir, typeName, param.name);
  }

  return body;
}

export function getSmokeFixtureIds(): Readonly<Record<string, string>> {
  return FIXTURE_IDS;
}

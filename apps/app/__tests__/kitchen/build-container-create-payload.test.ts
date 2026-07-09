/**
 * @vitest-environment node
 *
 * Pins Container.create UI payload to Manifest Zod contract:
 * name, containerType, locationId, sizeDescription, and all three
 * capacity numbers are always present (empty → "" / 0).
 */

import { describe, expect, it } from "vitest";
import { getCommandParamSchema } from "../../../../manifest/runtime/src/generated/command-param-schemas.generated";
import { buildContainerCreatePayload } from "../../app/(authenticated)/(operations)/kitchen/containers/build-container-create-payload";

const createSchema = getCommandParamSchema("Container", "create");

describe("buildContainerCreatePayload", () => {
  it("builds a body that passes Container.create Zod validation", () => {
    if (!createSchema) {
      throw new Error("Container.create param schema is missing");
    }

    const payload = buildContainerCreatePayload({
      name: "  Half Sheet Pan  ",
      containerType: "Sheet Pan",
      isReusable: true,
    });

    const parsed = createSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    expect(payload).toEqual({
      name: "Half Sheet Pan",
      containerType: "Sheet Pan",
      locationId: "",
      sizeDescription: "",
      capacityVolumeMl: 0,
      capacityWeightG: 0,
      capacityPortions: 0,
      isReusable: true,
    });
  });

  it("includes optional size and capacity when provided", () => {
    if (!createSchema) {
      throw new Error("Container.create param schema is missing");
    }

    const payload = buildContainerCreatePayload({
      name: "Hotel Pan",
      containerType: "Pan",
      sizeDescription: '  1/2 "  ',
      capacityVolumeMl: "2000",
      capacityWeightG: "500.5",
      capacityPortions: "12",
      isReusable: false,
    });

    expect(createSchema.safeParse(payload).success).toBe(true);
    expect(payload).toEqual({
      name: "Hotel Pan",
      containerType: "Pan",
      locationId: "",
      sizeDescription: '1/2 "',
      capacityVolumeMl: 2000,
      capacityWeightG: 500.5,
      capacityPortions: 12,
      isReusable: false,
    });
  });

  it("rejects the previously invalid UI payload shape", () => {
    if (!createSchema) {
      throw new Error("Container.create param schema is missing");
    }

    const legacyIncomplete = {
      name: "Half Sheet Pan",
      containerType: "Sheet Pan",
      isReusable: true,
    };

    expect(createSchema.safeParse(legacyIncomplete).success).toBe(false);
  });

  it("throws when name or container type is blank", () => {
    expect(() =>
      buildContainerCreatePayload({
        name: "   ",
        containerType: "Pan",
        isReusable: true,
      })
    ).toThrow(/name/i);

    expect(() =>
      buildContainerCreatePayload({
        name: "Pan",
        containerType: "",
        isReusable: true,
      })
    ).toThrow(/type/i);
  });
});

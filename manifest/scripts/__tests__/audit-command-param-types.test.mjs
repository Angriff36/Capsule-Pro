import { strict as assert } from "node:assert/strict";
import { describe, it } from "node:test";

import { checkOpenAPI } from "../audit-command-param-types.mjs";

function makePathOp({ required, field }) {
  return {
    post: {
      requestBody: {
        content: {
          "application/json": {
            schema: {
              required,
              properties: {
                description: field,
              },
            },
          },
        },
      },
    },
  };
}

describe("checkOpenAPI nullable required params", () => {
  it("accepts explicit null for Dish.update.description", () => {
    const violations = checkOpenAPI({
      entityName: "Dish",
      commandName: "update",
      paramName: "description",
      irType: "string",
      paramNullable: true,
      paramRequired: true,
      pathOp: makePathOp({
        required: ["description"],
        field: { type: ["string", "null"] },
      }),
    });

    assert.deepEqual(violations, []);
  });

  it("still requires the nullable param to be present", () => {
    const violations = checkOpenAPI({
      entityName: "Dish",
      commandName: "update",
      paramName: "description",
      irType: "string",
      paramNullable: true,
      paramRequired: true,
      pathOp: makePathOp({
        required: [],
        field: { type: ["string", "null"] },
      }),
    });

    assert.equal(violations.length, 1);
    assert.equal(violations[0].severity, "openapi_required_mismatch");
  });

  it("passes the nullable OpenAPI representation without weakening base-type checks", () => {
    const violations = checkOpenAPI({
      entityName: "Dish",
      commandName: "update",
      paramName: "description",
      irType: "string",
      paramNullable: true,
      paramRequired: true,
      pathOp: makePathOp({
        required: ["description"],
        field: { type: ["integer", "null"] },
      }),
    });

    assert.equal(violations.length, 1);
    assert.equal(violations[0].severity, "openapi_type_mismatch");
  });
});

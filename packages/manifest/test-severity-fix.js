// Quick test to verify severity fix
import { RuntimeEngine } from "./dist/runtime-engine.js";

const ir = {
  version: "v1",
  entities: [
    {
      name: "Task",
      properties: [
        {
          name: "id",
          type: { name: "string", nullable: false },
          modifiers: [],
        },
        {
          name: "priority",
          type: { name: "number", nullable: false },
          modifiers: [],
          defaultValue: { kind: "number", value: 1 },
        },
      ],
      constraints: [
        {
          name: "warnHighPriority",
          expression: {
            kind: "binary",
            operator: "<=",
            left: {
              kind: "member",
              object: { kind: "identifier", name: "self" },
              property: "priority",
            },
            right: { kind: "literal", value: { kind: "number", value: 5 } },
          },
          severity: "warn",
          message: "Priority is higher than recommended",
        },
        {
          name: "blockNegative",
          expression: {
            kind: "binary",
            operator: ">",
            left: {
              kind: "member",
              object: { kind: "identifier", name: "self" },
              property: "priority",
            },
            right: { kind: "literal", value: { kind: "number", value: 0 } },
          },
          severity: "block",
          message: "Priority must be positive",
        },
      ],
      relationships: [],
      computedProperties: [],
      commands: [],
    },
  ],
  commands: [],
  policies: [],
  events: [],
  stores: [{ entity: "Task", target: "memory", config: {} }],
};

const runtime = new RuntimeEngine(ir, {});

// Test 1: priority=10 should succeed (warn triggers but doesn't block)
console.log("\nTest 1: priority=10 (warn should not block)");
const result1 = await runtime.createInstance("Task", {
  id: "task-1",
  priority: 10,
});
console.log("Result:", result1 ? "SUCCESS ✓" : "FAILED ✗");

// Test 2: priority=-1 should fail (block triggers)
console.log("\nTest 2: priority=-1 (block should block)");
const result2 = await runtime.createInstance("Task", {
  id: "task-2",
  priority: -1,
});
console.log("Result:", result2 ? "FAILED ✗" : "SUCCESS (blocked) ✓");

console.log(
  "\nSeverity fix verification:",
  result1 && !result2 ? "PASSED ✓" : "FAILED ✗"
);

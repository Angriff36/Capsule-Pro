import { describe, it } from "vitest";
import { Parser } from "./parser";

describe("Constraint Parse Trace", () => {
  it("should trace constraint parsing for fixture 25", () => {
    const source = `
      entity Order {
        command updateStatus(newStatus: string) {
          constraint notCancelled: self.status != "cancelled" "Cannot update"
          mutate status = newStatus
        }
      }
    `;

    // Monkey-patch parseConstraint to add logging
    const parser = new Parser();
    const originalParseConstraint = (parser as any).parseConstraint.bind(
      parser
    );

    (parser as any).parseConstraint = function () {
      console.log("\n=== parseConstraint called ===");
      console.log("Current position:", (this as any).pos);
      console.log("Current token:", (this as any).current());

      const nextToken = (this as any).current();
      const nextNextToken = (this as any).tokens[(this as any).pos + 1];

      console.log(
        "nextToken:",
        nextToken ? `${nextToken.type}:${nextToken.value}` : "null"
      );
      console.log(
        "nextNextToken:",
        nextNextToken ? `${nextNextToken.type}:${nextNextToken.value}` : "null"
      );

      // Check the condition
      const isAnonymousConstraint =
        nextToken &&
        (nextToken.type === "NUMBER" ||
          nextToken.type === "STRING" ||
          nextToken.type === "OPERATOR" ||
          (nextToken.type === "PUNCTUATION" &&
            ["(", "[", "!", "+", "-"].includes(nextToken.value)) ||
          ((nextToken.type === "IDENTIFIER" || nextToken.type === "KEYWORD") &&
            nextNextToken &&
            nextNextToken.value !== ":" &&
            nextNextToken.value !== "{"));

      console.log("isAnonymousConstraint:", isAnonymousConstraint);

      return originalParseConstraint();
    };

    const { program, errors } = parser.parse(source);

    console.log("\n=== Results ===");
    console.log("Commands:", program.commands.length);
    console.log("Errors:", errors.length);
    if (errors.length > 0) {
      errors.forEach((e) =>
        console.log(
          `  - ${e.message} at ${e.position?.line}:${e.position?.column}`
        )
      );
    }
  });
});

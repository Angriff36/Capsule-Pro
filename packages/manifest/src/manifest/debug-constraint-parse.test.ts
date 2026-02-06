import { describe, it } from "vitest";
import { Lexer } from "./lexer";
import { Parser } from "./parser";

describe("Constraint Parse Debug", () => {
  it("should show token stream for fixture 25 line 11", () => {
    const source =
      'constraint notCancelled: self.status != "cancelled" "Cannot update cancelled order"';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    console.log("=== Tokens for: " + source.substring(0, 60) + " ===");
    tokens.forEach((t, i) => {
      console.log(
        `  ${i}: ${t.type.padEnd(12)} "${t.value}" at ${t.position.line}:${t.position.column}`
      );
    });
  });

  it("should show token stream for fixture 27 line 17", () => {
    const source =
      'constraint notLocked:block self.isLocked == false "Workflow instance is locked"';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    console.log("=== Tokens for: " + source.substring(0, 60) + " ===");
    tokens.forEach((t, i) => {
      console.log(
        `  ${i}: ${t.type.padEnd(12)} "${t.value}" at ${t.position.line}:${t.position.column}`
      );
    });
  });

  it("should parse fixture 25 constraint", () => {
    const source = `
      entity Order {
        command updateStatus(newStatus: string) {
          constraint notCancelled: self.status != "cancelled" "Cannot update cancelled order"
          mutate status = newStatus
        }
      }
    `;
    const parser = new Parser();
    const { program, errors } = parser.parse(source);

    console.log("\n=== Parse fixture 25 constraint ===");
    console.log("Commands:", program.commands.length);
    console.log("Errors:", errors.length);
    if (errors.length > 0) {
      errors.forEach((e) =>
        console.log(
          `  - ${e.message} at ${e.position?.line}:${e.position?.column}`
        )
      );
    }

    if (program.commands.length > 0) {
      console.log(
        "Command constraints:",
        program.commands[0].constraints?.length || 0
      );
    }
  });

  it("should parse fixture 27 constraint", () => {
    const source = `
      entity WorkflowInstance {
        command pause() {
          constraint notLocked:block self.isLocked == false "Workflow instance is locked"
          mutate status = "paused"
        }
      }
    `;
    const parser = new Parser();
    const { program, errors } = parser.parse(source);

    console.log("\n=== Parse fixture 27 constraint ===");
    console.log("Commands:", program.commands.length);
    console.log("Errors:", errors.length);
    if (errors.length > 0) {
      errors.forEach((e) =>
        console.log(
          `  - ${e.message} at ${e.position?.line}:${e.position?.column}`
        )
      );
    }

    if (program.commands.length > 0) {
      console.log(
        "Command constraints:",
        program.commands[0].constraints?.length || 0
      );
    }
  });
});

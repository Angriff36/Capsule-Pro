/**
 * Parser Unit Tests
 *
 * Tests the parsing behavior of the Manifest language parser.
 * Comprehensive coverage for all declaration types, expressions, and error handling.
 */

import { describe, expect, it } from "vitest";
import { Parser } from "./parser";

describe("Parser", () => {
  describe("Top-Level Program Structure", () => {
    it("should parse empty source", () => {
      const source = "";
      const { program, errors } = new Parser().parse(source);

      expect(program.modules).toHaveLength(0);
      expect(program.entities).toHaveLength(0);
      expect(program.commands).toHaveLength(0);
      expect(errors).toHaveLength(0);
    });

    it("should parse program with multiple top-level declarations", () => {
      const source = `
        entity User {}
        command greet() {}
        policy admin: user.role == "admin"
      `;
      const { program, errors } = new Parser().parse(source);

      expect(program.entities).toHaveLength(1);
      expect(program.commands).toHaveLength(1);
      expect(program.policies).toHaveLength(1);
      expect(errors).toHaveLength(0);
    });
  });

  describe("Entity Declarations", () => {
    it("should parse minimal entity", () => {
      const source = "entity User {}";
      const { program, errors } = new Parser().parse(source);

      expect(program.entities).toHaveLength(1);
      expect(program.entities[0].name).toBe("User");
      expect(errors).toHaveLength(0);
    });

    it("should parse entity with properties", () => {
      const source = `
        entity User {
          property name: string
          property age: number
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const user = program.entities[0];
      expect(user.properties).toHaveLength(2);
      expect(user.properties[0].name).toBe("name");
      expect(user.properties[0].dataType.name).toBe("string");
      expect(user.properties[1].name).toBe("age");
      expect(user.properties[1].dataType.name).toBe("number");
      expect(errors).toHaveLength(0);
    });

    it("should parse entity with property modifiers", () => {
      const source = `
        entity User {
          property required id: string
          property unique email: string
          property indexed name: string
          property private secret: string
          property readonly createdAt: number
          property optional nickname: string
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const user = program.entities[0];
      expect(user.properties).toHaveLength(6);
      expect(user.properties[0].modifiers).toEqual(["required"]);
      expect(user.properties[1].modifiers).toEqual(["unique"]);
      expect(user.properties[2].modifiers).toEqual(["indexed"]);
      expect(user.properties[3].modifiers).toEqual(["private"]);
      expect(user.properties[4].modifiers).toEqual(["readonly"]);
      expect(user.properties[5].modifiers).toEqual(["optional"]);
      expect(errors).toHaveLength(0);
    });

    it("should parse entity with multiple modifiers on single property", () => {
      const source = `
        entity User {
          property required unique indexed email: string
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const user = program.entities[0];
      expect(user.properties[0].modifiers).toEqual([
        "required",
        "unique",
        "indexed",
      ]);
      expect(errors).toHaveLength(0);
    });

    it("should parse entity with property default values", () => {
      const source = `
        entity User {
          property active: boolean = true
          property age: number = 18
          property name: string = "Anonymous"
          property role: string = null
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const user = program.entities[0];
      expect(user.properties[0].defaultValue).toEqual({
        type: "Literal",
        value: true,
        dataType: "boolean",
      });
      expect(user.properties[1].defaultValue).toEqual({
        type: "Literal",
        value: 18,
        dataType: "number",
      });
      expect(user.properties[2].defaultValue).toEqual({
        type: "Literal",
        value: "Anonymous",
        dataType: "string",
      });
      expect(user.properties[3].defaultValue).toEqual({
        type: "Literal",
        value: null,
        dataType: "null",
      });
      expect(errors).toHaveLength(0);
    });

    it("should parse entity with computed property", () => {
      const source = `
        entity User {
          computed fullName: string = firstName + " " + lastName
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const user = program.entities[0];
      expect(user.computedProperties).toHaveLength(1);
      expect(user.computedProperties[0].name).toBe("fullName");
      expect(user.computedProperties[0].dataType.name).toBe("string");
      expect(user.computedProperties[0].expression.type).toBe("BinaryOp");
      expect(errors).toHaveLength(0);
    });

    it("should parse entity with derived property alias", () => {
      const source = `
        entity User {
          derived fullName: string = firstName + " " + lastName
        }
      `;
      const { program, errors } = new Parser().parse(source);

      expect(program.entities[0].computedProperties[0].name).toBe("fullName");
      expect(errors).toHaveLength(0);
    });

    it("should extract dependencies from computed property", () => {
      const source = `
        entity Order {
          computed total: number = quantity * price + tax
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const total = program.entities[0].computedProperties[0];
      expect(total.dependencies).toEqual(["quantity", "price", "tax"]);
      expect(errors).toHaveLength(0);
    });

    it("should not extract reserved words as dependencies", () => {
      const source = `
        entity User {
          computed displayName: string = user.name + context.prefix
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const displayName = program.entities[0].computedProperties[0];
      expect(displayName.dependencies).toEqual([]);
      expect(errors).toHaveLength(0);
    });
  });

  describe("Relationships", () => {
    it("should parse hasMany relationship", () => {
      const source = `
        entity User {
          hasMany posts: Post
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const user = program.entities[0];
      expect(user.relationships).toHaveLength(1);
      expect(user.relationships[0].kind).toBe("hasMany");
      expect(user.relationships[0].name).toBe("posts");
      expect(user.relationships[0].target).toBe("Post");
      expect(errors).toHaveLength(0);
    });

    it("should parse hasOne relationship", () => {
      const source = `
        entity User {
          hasOne profile: Profile
        }
      `;
      const { program, errors } = new Parser().parse(source);

      expect(program.entities[0].relationships[0].kind).toBe("hasOne");
      expect(errors).toHaveLength(0);
    });

    it("should parse belongsTo relationship", () => {
      const source = `
        entity Post {
          belongsTo author: User
        }
      `;
      const { program, errors } = new Parser().parse(source);

      expect(program.entities[0].relationships[0].kind).toBe("belongsTo");
      expect(errors).toHaveLength(0);
    });

    it("should parse ref relationship", () => {
      const source = `
        entity Post {
          ref category: Category
        }
      `;
      const { program, errors } = new Parser().parse(source);

      expect(program.entities[0].relationships[0].kind).toBe("ref");
      expect(errors).toHaveLength(0);
    });

    it("should parse relationship with through clause", () => {
      const source = `
        entity Teacher {
          hasMany students: Student through assignments
        }
      `;
      const { program, errors } = new Parser().parse(source);

      expect(program.entities[0].relationships[0].through).toBe("assignments");
      expect(errors).toHaveLength(0);
    });

    it("should parse relationship with with clause", () => {
      const source = `
        entity Post {
          belongsTo author: User with authorId
        }
      `;
      const { program, errors } = new Parser().parse(source);

      expect(program.entities[0].relationships[0].foreignKey).toBe("authorId");
      expect(errors).toHaveLength(0);
    });
  });

  describe("Commands", () => {
    it("should parse minimal command", () => {
      const source = "command greet() {}";
      const { program, errors } = new Parser().parse(source);

      expect(program.commands).toHaveLength(1);
      expect(program.commands[0].name).toBe("greet");
      expect(program.commands[0].parameters).toHaveLength(0);
      expect(errors).toHaveLength(0);
    });

    it("should parse command with parameters", () => {
      const source = `
        command createUser(name: string, age: number) {}
      `;
      const { program, errors } = new Parser().parse(source);

      const cmd = program.commands[0];
      expect(cmd.parameters).toHaveLength(2);
      expect(cmd.parameters[0].name).toBe("name");
      expect(cmd.parameters[0].dataType.name).toBe("string");
      expect(cmd.parameters[0].required).toBe(true);
      expect(cmd.parameters[1].name).toBe("age");
      expect(cmd.parameters[1].dataType.name).toBe("number");
      expect(errors).toHaveLength(0);
    });

    it("should parse command with optional parameters", () => {
      const source = `
        command update(optional name: string, optional age: number) {}
      `;
      const { program, errors } = new Parser().parse(source);

      const cmd = program.commands[0];
      expect(cmd.parameters[0].required).toBe(false);
      expect(cmd.parameters[1].required).toBe(false);
      expect(errors).toHaveLength(0);
    });

    it("should parse command with parameter default values", () => {
      const source = `
        command greet(name: string = "World") {}
      `;
      const { program, errors } = new Parser().parse(source);

      const param = program.commands[0].parameters[0];
      expect(param.defaultValue).toEqual({
        type: "Literal",
        value: "World",
        dataType: "string",
      });
      expect(errors).toHaveLength(0);
    });

    it("should parse command with guards using when", () => {
      const source = `
        command deleteUser() {
          when user.role == "admin"
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const cmd = program.commands[0];
      expect(cmd.guards).toHaveLength(1);
      expect(cmd.guards?.[0].type).toBe("BinaryOp");
      expect(errors).toHaveLength(0);
    });

    it("should parse command with guards using guard keyword", () => {
      const source = `
        command deleteUser() {
          guard user.role == "admin"
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const cmd = program.commands[0];
      expect(cmd.guards).toHaveLength(1);
      expect(errors).toHaveLength(0);
    });

    it("should parse command with multiple guards", () => {
      const source = `
        command adminAction() {
          when user.role == "admin"
          when user.permissions contains "admin"
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const cmd = program.commands[0];
      expect(cmd.guards).toHaveLength(2);
      expect(errors).toHaveLength(0);
    });

    it("should parse command with actions", () => {
      const source = `
        command updateName(name: string) {
          mutate name = name
          emit nameUpdated
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const cmd = program.commands[0];
      // Parser adds emit to both actions array and emits array
      expect(cmd.actions).toHaveLength(2);
      expect(cmd.actions[0].kind).toBe("mutate");
      expect(cmd.actions[0].target).toBe("name");
      expect(cmd.actions[1].kind).toBe("emit");
      expect(cmd.emits).toEqual(["nameUpdated"]);
      expect(errors).toHaveLength(0);
    });

    it("should parse command with return type", () => {
      const source = `
        command getUser() returns string {}
      `;
      const { program, errors } = new Parser().parse(source);

      const cmd = program.commands[0];
      expect(cmd.returns).toBeDefined();
      expect(cmd.returns?.name).toBe("string");
      expect(errors).toHaveLength(0);
    });

    it("should parse command with inline action syntax", () => {
      const source = `
        command hello() => compute "Hello, World!"
      `;
      const { program, errors } = new Parser().parse(source);

      const cmd = program.commands[0];
      expect(cmd.actions).toHaveLength(1);
      expect(cmd.actions[0].kind).toBe("compute");
      expect(errors).toHaveLength(0);
    });

    it("should parse command with constraints", () => {
      const source = `
        command transfer(amount: number) {
          constraint amount > 0
          compute "Transfer complete"
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const cmd = program.commands[0];
      expect(cmd.constraints).toBeDefined();
      expect(cmd.constraints?.length).toBeGreaterThan(0);
      expect(errors).toHaveLength(0);
    });
  });

  describe("Constraints", () => {
    it("should parse inline constraint with default severity", () => {
      const source = `
        entity User {
          constraint age: self.age >= 18
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const constraint = program.entities[0].constraints[0];
      expect(constraint.name).toBe("age");
      expect(constraint.severity).toBe("block");
      expect(constraint.expression.type).toBe("BinaryOp");
      expect(errors).toHaveLength(0);
    });

    it("should parse inline constraint with ok severity", () => {
      const source = `
        entity User {
          constraint age:ok self.age >= 18
        }
      `;
      const { program, errors } = new Parser().parse(source);

      expect(program.entities[0].constraints[0].severity).toBe("ok");
      expect(errors).toHaveLength(0);
    });

    it("should parse inline constraint with warn severity", () => {
      const source = `
        entity User {
          constraint age:warn self.age >= 18
        }
      `;
      const { program, errors } = new Parser().parse(source);

      expect(program.entities[0].constraints[0].severity).toBe("warn");
      expect(errors).toHaveLength(0);
    });

    it("should parse inline constraint with block severity", () => {
      const source = `
        entity User {
          constraint age:block self.age >= 18
        }
      `;
      const { program, errors } = new Parser().parse(source);

      expect(program.entities[0].constraints[0].severity).toBe("block");
      expect(errors).toHaveLength(0);
    });

    it("should parse inline constraint with message", () => {
      const source = `
        entity User {
          constraint age: self.age >= 18 "Must be 18 or older"
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const constraint = program.entities[0].constraints[0];
      expect(constraint.message).toBe("Must be 18 or older");
      expect(errors).toHaveLength(0);
    });

    it("should parse overrideable constraint", () => {
      const source = `
        entity Order {
          constraint overrideable limit: self.amount <= 10000
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const constraint = program.entities[0].constraints[0];
      expect(constraint.overrideable).toBe(true);
      expect(errors).toHaveLength(0);
    });

    it("should parse constraint block with all fields", () => {
      const source = `
        entity Order {
          constraint limit {
            code: AMOUNT_LIMIT
            severity: warn
            expression: self.amount > 10000
            messageTemplate: "Amount {amount} exceeds limit"
            details: {
              maxAmount: 10000
              currentAmount: self.amount
            }
            overridePolicy: adminOverride
          }
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const constraint = program.entities[0].constraints[0];
      expect(constraint.name).toBe("limit");
      expect(constraint.code).toBe("AMOUNT_LIMIT");
      expect(constraint.severity).toBe("warn");
      expect(constraint.messageTemplate).toBe("Amount {amount} exceeds limit");
      expect(constraint.detailsMapping).toBeDefined();
      expect(constraint.overridePolicyRef).toBe("adminOverride");
      expect(errors).toHaveLength(0);
    });

    it("should parse constraint block with minimal fields", () => {
      const source = `
        entity User {
          constraint validAge {
            expression: self.age >= 18
          }
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const constraint = program.entities[0].constraints[0];
      expect(constraint.expression.type).toBe("BinaryOp");
      expect(constraint.severity).toBe("block"); // default
      expect(errors).toHaveLength(0);
    });

    it("should parse hybrid constraint syntax with messageTemplate", () => {
      const source = `
        entity Task {
          constraint warnOverdue:warn self.isOverdue and self.status != "done" {
            messageTemplate: "Task '{taskName}' is overdue by {daysOverdue} day(s)"
            details: {
              taskName: self.name
              dueDate: self.dueByDate
              daysOverdue: (now() - self.dueByDate) / 86400000
            }
          }
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const constraint = program.entities[0].constraints[0];
      expect(constraint.name).toBe("warnOverdue");
      expect(constraint.severity).toBe("warn");
      expect(constraint.expression.type).toBe("BinaryOp");
      expect(constraint.messageTemplate).toBe(
        "Task '{taskName}' is overdue by {daysOverdue} day(s)"
      );
      expect(constraint.detailsMapping).toBeDefined();
      expect(constraint.detailsMapping?.taskName).toBeDefined();
      expect(constraint.detailsMapping?.dueDate).toBeDefined();
      expect(constraint.detailsMapping?.daysOverdue).toBeDefined();
      expect(errors).toHaveLength(0);
    });

    it("should parse hybrid constraint syntax with overridePolicy", () => {
      const source = `
        entity Order {
          constraint limit:warn self.amount > 10000 {
            messageTemplate: "Amount exceeds limit"
            overridePolicy: adminOverride
          }
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const constraint = program.entities[0].constraints[0];
      expect(constraint.name).toBe("limit");
      expect(constraint.severity).toBe("warn");
      expect(constraint.messageTemplate).toBe("Amount exceeds limit");
      expect(constraint.overridePolicyRef).toBe("adminOverride");
      expect(errors).toHaveLength(0);
    });

    it("should parse hybrid constraint syntax with all block fields", () => {
      const source = `
        entity Task {
          constraint warnOverdue:warn self.isOverdue {
            messageTemplate: "Task is overdue"
            details: {
              taskName: self.name
              daysOverdue: 10
            }
            overridePolicy: managerOverride
          }
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const constraint = program.entities[0].constraints[0];
      expect(constraint.name).toBe("warnOverdue");
      expect(constraint.severity).toBe("warn");
      expect(constraint.messageTemplate).toBe("Task is overdue");
      expect(constraint.detailsMapping).toBeDefined();
      expect(constraint.overridePolicyRef).toBe("managerOverride");
      expect(errors).toHaveLength(0);
    });
  });

  describe("Behaviors and Triggers", () => {
    it("should parse behavior with on keyword", () => {
      const source = `
        entity User {
          on beforeCreate {
            mutate createdAt = now()
          }
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const user = program.entities[0];
      expect(user.behaviors).toHaveLength(1);
      expect(user.behaviors[0].name).toBe("beforeCreate");
      expect(user.behaviors[0].trigger.event).toBe("beforeCreate");
      expect(errors).toHaveLength(0);
    });

    it("should parse behavior with behavior keyword", () => {
      const source = `
        entity User {
          behavior on beforeCreate {
            mutate createdAt = now()
          }
        }
      `;
      const { program, errors } = new Parser().parse(source);

      expect(program.entities[0].behaviors).toHaveLength(1);
      expect(errors).toHaveLength(0);
    });

    it("should parse behavior with trigger parameters", () => {
      const source = `
        entity User {
          on beforeSave(oldValues) {
            compute changed
          }
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const trigger = program.entities[0].behaviors[0].trigger;
      expect(trigger.parameters).toEqual(["oldValues"]);
      expect(errors).toHaveLength(0);
    });

    it("should parse behavior with guards", () => {
      const source = `
        entity User {
          on beforeCreate when isVerified {
            mutate status = "active"
          }
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const behavior = program.entities[0].behaviors[0];
      expect(behavior.guards).toHaveLength(1);
      expect(errors).toHaveLength(0);
    });

    it("should parse behavior with inline action", () => {
      const source = `
        entity User {
          on beforeCreate => mutate createdAt = now()
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const behavior = program.entities[0].behaviors[0];
      expect(behavior.actions).toHaveLength(1);
      expect(behavior.actions[0].kind).toBe("mutate");
      expect(errors).toHaveLength(0);
    });
  });

  describe("Policies", () => {
    it("should parse policy with default action", () => {
      const source = 'policy adminOnly: user.role == "admin"';
      const { program, errors } = new Parser().parse(source);

      expect(program.policies).toHaveLength(1);
      expect(program.policies[0].action).toBe("all");
      expect(errors).toHaveLength(0);
    });

    it("should parse policy with explicit action", () => {
      const source = `
        policy admin: write user.role == "admin"
      `;
      const { program, errors } = new Parser().parse(source);

      expect(program.policies[0].action).toBe("write");
      expect(errors).toHaveLength(0);
    });

    it("should parse all policy actions", () => {
      const actions = ["read", "write", "delete", "execute", "all", "override"];
      for (const action of actions) {
        const source = `policy test ${action}: true`;
        const { program, errors } = new Parser().parse(source);
        expect(program.policies[0].action).toBe(action);
        expect(errors).toHaveLength(0);
      }
    });

    it("should parse policy with message", () => {
      const source = `
        policy adminOnly: user.role == "admin" "Admin access required"
      `;
      const { program, errors } = new Parser().parse(source);

      expect(program.policies[0].message).toBe("Admin access required");
      expect(errors).toHaveLength(0);
    });
  });

  describe("Stores", () => {
    it("should parse store with memory target", () => {
      const source = "store User in memory";
      const { program, errors } = new Parser().parse(source);

      expect(program.stores).toHaveLength(1);
      expect(program.stores[0].entity).toBe("User");
      expect(program.stores[0].target).toBe("memory");
      expect(errors).toHaveLength(0);
    });

    it("should parse store with localStorage target", () => {
      const source = "store User in localStorage";
      const { program, errors } = new Parser().parse(source);

      expect(program.stores[0].target).toBe("localStorage");
      expect(errors).toHaveLength(0);
    });

    it("should parse store with postgres target", () => {
      const source = "store User in postgres";
      const { program, errors } = new Parser().parse(source);

      expect(program.stores[0].target).toBe("postgres");
      expect(errors).toHaveLength(0);
    });

    it("should parse store with supabase target", () => {
      const source = "store User in supabase";
      const { program, errors } = new Parser().parse(source);

      expect(program.stores[0].target).toBe("supabase");
      expect(errors).toHaveLength(0);
    });

    it("should parse store with config", () => {
      const source = `
        store User in postgres {
          tableName: "users"
          schema: "public"
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const store = program.stores[0];
      expect(store.config).toBeDefined();
      expect(store.config?.tableName).toBeDefined();
      expect(store.config?.schema).toBeDefined();
      expect(errors).toHaveLength(0);
    });
  });

  describe("Events", () => {
    it("should parse event with default channel", () => {
      const source = "event UserCreated: {}";
      const { program, errors } = new Parser().parse(source);

      expect(program.events).toHaveLength(1);
      expect(program.events[0].name).toBe("UserCreated");
      expect(program.events[0].channel).toBe("UserCreated");
      expect(errors).toHaveLength(0);
    });

    it("should parse event with custom channel", () => {
      const source = 'event UserCreated: "user.events"';
      const { program, errors } = new Parser().parse(source);

      expect(program.events[0].channel).toBe("user.events");
      expect(errors).toHaveLength(0);
    });

    it("should parse event with payload fields", () => {
      const source = `
        event UserCreated: {
          userId: string
          name: string
          email: string
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const event = program.events[0];
      expect("fields" in event.payload).toBe(true);
      if ("fields" in event.payload) {
        expect(event.payload.fields).toHaveLength(3);
        expect(event.payload.fields[0].name).toBe("userId");
        expect(event.payload.fields[0].dataType.name).toBe("string");
      }
      expect(errors).toHaveLength(0);
    });

    it("should parse event with simple type payload", () => {
      const source = "event LoggedIn: string";
      const { program, errors } = new Parser().parse(source);

      const event = program.events[0];
      expect(event.payload).toEqual({
        type: "Type",
        name: "string",
        nullable: false,
      });
      expect(errors).toHaveLength(0);
    });
  });

  describe("Modules", () => {
    it("should parse empty module", () => {
      const source = "module TestModule {}";
      const { program, errors } = new Parser().parse(source);

      expect(program.modules).toHaveLength(1);
      expect(program.modules[0].name).toBe("TestModule");
      expect(program.modules[0].entities).toHaveLength(0);
      expect(errors).toHaveLength(0);
    });

    it("should parse module with entities", () => {
      const source = `
        module Users {
          entity User {}
          entity Admin {}
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const module = program.modules[0];
      expect(module.entities).toHaveLength(2);
      expect(module.entities[0].name).toBe("User");
      expect(module.entities[1].name).toBe("Admin");
      expect(errors).toHaveLength(0);
    });

    it("should parse module with mixed declarations", () => {
      const source = `
        module App {
          entity User {}
          command greet() {}
          policy admin: user.role == "admin"
          store User in memory
          event UserCreated: {}
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const module = program.modules[0];
      expect(module.entities).toHaveLength(1);
      expect(module.commands).toHaveLength(1);
      expect(module.policies).toHaveLength(1);
      expect(module.stores).toHaveLength(1);
      expect(module.events).toHaveLength(1);
      expect(errors).toHaveLength(0);
    });
  });

  describe("Flows", () => {
    it("should parse minimal flow", () => {
      const source = `
        flow processData(string) -> string {
          step: identity
        }
      `;
      const { program, errors } = new Parser().parse(source);

      expect(program.flows).toHaveLength(1);
      expect(program.flows[0].name).toBe("processData");
      expect(errors).toHaveLength(0);
    });

    it("should parse flow with multiple steps", () => {
      const source = `
        flow processData(input: string) -> string {
          step1: checkFormat
          step2: toUpper
          step3: persist
        }
      `;
      const { program, errors } = new Parser().parse(source);

      expect(program.flows[0].steps).toHaveLength(3);
      expect(errors).toHaveLength(0);
    });

    it("should parse flow step with condition", () => {
      const source = `
        flow process(string) -> string {
          validate when input != "": checkFormat
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const step = program.flows[0].steps[0];
      expect(step.condition).toBeDefined();
      expect(errors).toHaveLength(0);
    });
  });

  describe("Effects", () => {
    it("should parse http effect", () => {
      const source = `
        effect fetchUser: http {
          url: "https://api.example.com/users"
        }
      `;
      const { program, errors } = new Parser().parse(source);

      expect(program.effects).toHaveLength(1);
      expect(program.effects[0].kind).toBe("http");
      expect(errors).toHaveLength(0);
    });

    it("should parse storage effect", () => {
      const source = `
        effect saveFile: storage {
          path: "/data/files"
        }
      `;
      const { program, errors } = new Parser().parse(source);

      expect(program.effects[0].kind).toBe("storage");
      expect(errors).toHaveLength(0);
    });

    it("should parse timer effect", () => {
      const source = `
        effect scheduleEmail: timer {
          delay: 60000
        }
      `;
      const { program, errors } = new Parser().parse(source);

      expect(program.effects[0].kind).toBe("timer");
      expect(errors).toHaveLength(0);
    });

    it("should parse event effect", () => {
      const source = `
        effect emitEvent: event {
          channel: "events"
        }
      `;
      const { program, errors } = new Parser().parse(source);

      expect(program.effects[0].kind).toBe("event");
      expect(errors).toHaveLength(0);
    });

    it("should parse custom effect", () => {
      const source = `
        effect customEffect: custom {
          setting: "value"
        }
      `;
      const { program, errors } = new Parser().parse(source);

      expect(program.effects[0].kind).toBe("custom");
      expect(errors).toHaveLength(0);
    });
  });

  describe("Expose Declarations", () => {
    it("should parse expose with rest protocol", () => {
      const source = "expose User as rest";
      const { program, errors } = new Parser().parse(source);

      expect(program.exposures).toHaveLength(1);
      expect(program.exposures[0].entity).toBe("User");
      expect(program.exposures[0].protocol).toBe("rest");
      expect(program.exposures[0].name).toBe("user");
      expect(program.exposures[0].generateServer).toBe(false);
      expect(errors).toHaveLength(0);
    });

    it("should parse expose with graphql protocol", () => {
      const source = "expose User as graphql";
      const { program, errors } = new Parser().parse(source);

      expect(program.exposures[0].protocol).toBe("graphql");
      expect(errors).toHaveLength(0);
    });

    it("should parse expose with websocket protocol", () => {
      const source = "expose User as websocket";
      const { program, errors } = new Parser().parse(source);

      expect(program.exposures[0].protocol).toBe("websocket");
      expect(errors).toHaveLength(0);
    });

    it("should parse expose with function protocol", () => {
      const source = "expose User as function";
      const { program, errors } = new Parser().parse(source);

      expect(program.exposures[0].protocol).toBe("function");
      expect(errors).toHaveLength(0);
    });

    it("should parse expose with server flag", () => {
      const source = "expose User as rest server";
      const { program, errors } = new Parser().parse(source);

      expect(program.exposures[0].generateServer).toBe(true);
      expect(errors).toHaveLength(0);
    });

    it("should parse expose with custom name", () => {
      const source = 'expose User as rest "user-api"';
      const { program, errors } = new Parser().parse(source);

      expect(program.exposures[0].name).toBe("user-api");
      expect(errors).toHaveLength(0);
    });

    it("should parse expose with operations", () => {
      const source = `
        expose User as rest {
          create
          read
          update
          delete
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const expose = program.exposures[0];
      expect(expose.operations).toEqual(["create", "read", "update", "delete"]);
      expect(errors).toHaveLength(0);
    });

    it("should parse expose with middleware", () => {
      const source = `
        expose User as rest {
          middleware: auth
          create
          read
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const expose = program.exposures[0];
      expect(expose.middleware).toEqual(["auth"]);
      expect(errors).toHaveLength(0);
    });
  });

  describe("Compositions", () => {
    it("should parse minimal composition", () => {
      const source = `
        compose AppLayout {}
      `;
      const { program, errors } = new Parser().parse(source);

      expect(program.compositions).toHaveLength(1);
      expect(program.compositions[0].name).toBe("AppLayout");
      expect(errors).toHaveLength(0);
    });

    it("should parse composition with components", () => {
      const source = `
        compose AppLayout {
          UserList
          UserDetail
          UserForm
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const comp = program.compositions[0];
      expect(comp.components).toHaveLength(3);
      expect(comp.components[0].entity).toBe("UserList");
      expect(errors).toHaveLength(0);
    });

    it("should parse component with alias", () => {
      const source = `
        compose AppLayout {
          UserList as List
        }
      `;
      const { program, errors } = new Parser().parse(source);

      expect(program.compositions[0].components[0].alias).toBe("List");
      expect(errors).toHaveLength(0);
    });

    it("should parse composition with connections", () => {
      const source = `
        compose AppLayout {
          UserList
          UserDetail
          connect UserList.selected -> UserDetail.user
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const comp = program.compositions[0];
      expect(comp.connections).toHaveLength(1);
      expect(comp.connections[0].from.component).toBe("UserList");
      expect(comp.connections[0].from.output).toBe("selected");
      expect(comp.connections[0].to.component).toBe("UserDetail");
      expect(comp.connections[0].to.input).toBe("user");
      expect(errors).toHaveLength(0);
    });

    it("should parse connection with transform", () => {
      const source = `
        compose AppLayout {
          UserList
          UserDetail
          connect UserList.selected -> UserDetail.user with transformData
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const conn = program.compositions[0].connections[0];
      expect(conn.transform).toBeDefined();
      expect(errors).toHaveLength(0);
    });
  });

  describe("Entity Store Declaration", () => {
    it("should parse entity with store declaration", () => {
      const source = `
        entity User {
          store memory
        }
      `;
      const { program, errors } = new Parser().parse(source);

      expect(program.entities[0].store).toBe("memory");
      expect(errors).toHaveLength(0);
    });

    it("should parse entity with localStorage", () => {
      const source = `
        entity User {
          store localStorage
        }
      `;
      const { program, errors } = new Parser().parse(source);

      expect(program.entities[0].store).toBe("localStorage");
      expect(errors).toHaveLength(0);
    });
  });

  describe("Type Parsing", () => {
    it("should parse simple types", () => {
      const types = [
        "string",
        "number",
        "boolean",
        "any",
        "void",
        "list",
        "map",
      ];
      for (const typeName of types) {
        const source = `entity Test { property p: ${typeName} }`;
        const { program, errors } = new Parser().parse(source);
        expect(program.entities[0].properties[0].dataType.name).toBe(typeName);
        expect(errors).toHaveLength(0);
      }
    });

    it("should parse generic types", () => {
      const source = `
        entity Test {
          property items: list<string>
        }
      `;
      const { program, errors } = new Parser().parse(source);

      expect(program.entities).toHaveLength(1);
      expect(program.entities[0].properties).toBeDefined();
      expect(program.entities[0].properties).toHaveLength(1);
      const items = program.entities[0].properties[0].dataType;
      expect(items.name).toBe("list");
      expect(items.generic).toBeDefined();
      expect(items.generic?.name).toBe("string");
      expect(errors).toHaveLength(0);
    });

    it("should parse nullable types", () => {
      const source = `
        entity Test {
          property name: string?
          property age: number?
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const nameType = program.entities[0].properties[0].dataType;
      expect(nameType.nullable).toBe(true);
      expect(errors).toHaveLength(0);
    });

    it("should parse generic nullable types", () => {
      const source = `
        entity Test {
          property items: list<string>?
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const items = program.entities[0].properties[0].dataType;
      expect(items.nullable).toBe(true);
      expect(items.generic?.name).toBe("string");
      expect(errors).toHaveLength(0);
    });
  });

  describe("Expression Parsing - Literals", () => {
    it("should parse number literals", () => {
      const source = "command test() { compute 42 }";
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression;
      expect(expr).toEqual({ type: "Literal", value: 42, dataType: "number" });
      expect(errors).toHaveLength(0);
    });

    it("should parse decimal literals", () => {
      const source = "command test() { compute 3.14 }";
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression;
      expect(expr.value).toBe(3.14);
      expect(errors).toHaveLength(0);
    });

    it("should parse string literals", () => {
      const source = 'command test() { compute "hello" }';
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression;
      expect(expr).toEqual({
        type: "Literal",
        value: "hello",
        dataType: "string",
      });
      expect(errors).toHaveLength(0);
    });

    it("should parse boolean literals", () => {
      const source = "command test() { compute true }";
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression;
      expect(expr).toEqual({
        type: "Literal",
        value: true,
        dataType: "boolean",
      });
      expect(errors).toHaveLength(0);
    });

    it("should parse null literal", () => {
      const source = "command test() { compute null }";
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression;
      expect(expr).toEqual({ type: "Literal", value: null, dataType: "null" });
      expect(errors).toHaveLength(0);
    });
  });

  describe("Expression Parsing - Identifiers", () => {
    it("should parse simple identifiers", () => {
      const source = "command test() { compute name }";
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression;
      expect(expr).toEqual({ type: "Identifier", name: "name" });
      expect(errors).toHaveLength(0);
    });

    it("should parse self identifier", () => {
      const source = "command test() { compute self.name }";
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression as any;
      expect(expr.type).toBe("MemberAccess");
      expect((expr.object as any).name).toBe("self");
      expect(errors).toHaveLength(0);
    });

    it("should parse this identifier", () => {
      const source = "command test() { compute this.value }";
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression as any;
      expect((expr.object as any).name).toBe("this");
      expect(errors).toHaveLength(0);
    });

    it("should parse user identifier", () => {
      const source = "command test() { compute user.name }";
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression as any;
      expect((expr.object as any).name).toBe("user");
      expect(errors).toHaveLength(0);
    });

    it("should parse context identifier", () => {
      const source = "command test() { compute context }";
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression as any;
      expect(expr.name).toBe("context");
      expect(errors).toHaveLength(0);
    });
  });

  describe("Expression Parsing - Binary Operators", () => {
    it("should parse arithmetic operators", () => {
      const ops = ["+", "-", "*", "/", "%"];
      for (const op of ops) {
        const source = `command test() { compute 1 ${op} 2 }`;
        const { program, errors } = new Parser().parse(source);
        const expr = program.commands[0].actions[0].expression as any;
        expect(expr.type).toBe("BinaryOp");
        expect(expr.operator).toBe(op);
        expect(errors).toHaveLength(0);
      }
    });

    it("should parse comparison operators", () => {
      const ops = ["<", ">", "<=", ">="];
      for (const op of ops) {
        const source = `command test() { when 1 ${op} 2 }`;
        const { program, errors } = new Parser().parse(source);
        const guard = program.commands[0].guards?.[0] as any;
        expect(guard.type).toBe("BinaryOp");
        expect(guard.operator).toBe(op);
        expect(errors).toHaveLength(0);
      }
    });

    it("should parse equality operators", () => {
      const ops = ["==", "!="];
      for (const op of ops) {
        const source = `command test() { when 1 ${op} 2 }`;
        const { program, errors } = new Parser().parse(source);
        const guard = program.commands[0].guards?.[0] as any;
        expect(guard.type).toBe("BinaryOp");
        expect(guard.operator).toBe(op);
        expect(errors).toHaveLength(0);
      }
    });

    it("should parse logical operators", () => {
      const ops = ["&&", "||", "and", "or"];
      for (const op of ops) {
        const source = `command test() { when true ${op} false }`;
        const { program, errors } = new Parser().parse(source);
        const guard = program.commands[0].guards?.[0] as any;
        expect(guard.type).toBe("BinaryOp");
        expect(errors).toHaveLength(0);
      }
    });

    it("should parse keyword operators", () => {
      const ops = ["is", "in", "contains"];
      for (const op of ops) {
        const source = `command test() { when "a" ${op} "b" }`;
        const { program, errors } = new Parser().parse(source);
        const guard = program.commands[0].guards?.[0] as any;
        expect(guard.type).toBe("BinaryOp");
        expect(guard.operator).toBe(op);
        expect(errors).toHaveLength(0);
      }
    });

    it("should respect operator precedence for arithmetic", () => {
      const source = "command test() { compute 1 + 2 * 3 }";
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression as any;
      // Should be: (+ 1 (* 2 3))
      expect(expr.operator).toBe("+");
      expect(expr.right.operator).toBe("*");
      expect(errors).toHaveLength(0);
    });

    it("should respect operator precedence for comparison", () => {
      const source = "command test() { when 1 < 2 && 3 > 4 }";
      const { program, errors } = new Parser().parse(source);

      const guard = program.commands[0].guards?.[0] as any;
      // Should be: (&& (< 1 2) (> 3 4))
      expect(guard.operator).toBe("&&");
      expect(guard.left.operator).toBe("<");
      expect(guard.right.operator).toBe(">");
      expect(errors).toHaveLength(0);
    });
  });

  describe("Expression Parsing - Unary Operators", () => {
    it("should parse logical not", () => {
      const source = "command test() { when !true }";
      const { program, errors } = new Parser().parse(source);

      const guard = program.commands[0].guards?.[0] as any;
      expect(guard.type).toBe("UnaryOp");
      expect(guard.operator).toBe("!");
      expect(errors).toHaveLength(0);
    });

    it("should parse not keyword", () => {
      const source = "command test() { when not true }";
      const { program, errors } = new Parser().parse(source);

      const guard = program.commands[0].guards?.[0] as any;
      expect(guard.operator).toBe("not");
      expect(errors).toHaveLength(0);
    });

    it("should parse negation", () => {
      const source = "command test() { compute -42 }";
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression as any;
      expect(expr.type).toBe("UnaryOp");
      expect(expr.operator).toBe("-");
      expect(errors).toHaveLength(0);
    });
  });

  describe("Expression Parsing - Ternary", () => {
    it("should parse ternary conditional", () => {
      const source = 'command test() { compute true ? "yes" : "no" }';
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression as any;
      expect(expr.type).toBe("Conditional");
      expect(expr.condition).toEqual({
        type: "Literal",
        value: true,
        dataType: "boolean",
      });
      expect(errors).toHaveLength(0);
    });

    it("should parse nested ternary", () => {
      const source =
        'command test() { compute true ? false ? "a" : "b" : "c" }';
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression as any;
      expect(expr.type).toBe("Conditional");
      expect(expr.consequent.type).toBe("Conditional");
      expect(errors).toHaveLength(0);
    });
  });

  describe("Expression Parsing - Member Access", () => {
    it("should parse simple member access", () => {
      const source = "command test() { compute user.name }";
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression as any;
      expect(expr.type).toBe("MemberAccess");
      expect(expr.property).toBe("name");
      expect(errors).toHaveLength(0);
    });

    it("should parse chained member access", () => {
      const source = "command test() { compute user.profile.avatar }";
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression as any;
      expect(expr.type).toBe("MemberAccess");
      expect(expr.object.type).toBe("MemberAccess");
      expect(errors).toHaveLength(0);
    });

    it("should parse optional member access", () => {
      const source = "command test() { compute user?.name }";
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression as any;
      expect(expr.type).toBe("MemberAccess");
      expect(errors).toHaveLength(0);
    });

    it("should parse member access with keyword property", () => {
      const source = "command test() { compute user.entity }";
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression as any;
      expect(expr.property).toBe("entity");
      expect(errors).toHaveLength(0);
    });
  });

  describe("Expression Parsing - Arrays", () => {
    it("should parse empty array", () => {
      const source = "command test() { compute [] }";
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression;
      expect(expr).toEqual({ type: "Array", elements: [] });
      expect(errors).toHaveLength(0);
    });

    it("should parse array with elements", () => {
      const source = "command test() { compute [1, 2, 3] }";
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression as any;
      expect(expr.type).toBe("Array");
      expect(expr.elements).toHaveLength(3);
      expect(errors).toHaveLength(0);
    });

    it("should parse array with mixed types", () => {
      const source = 'command test() { compute [1, "two", true] }';
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression as any;
      expect(expr.elements).toHaveLength(3);
      expect(errors).toHaveLength(0);
    });
  });

  describe("Expression Parsing - Objects", () => {
    it("should parse empty object", () => {
      const source = "command test() { compute {} }";
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression;
      expect(expr).toEqual({ type: "Object", properties: [] });
      expect(errors).toHaveLength(0);
    });

    it("should parse object with properties", () => {
      const source = 'command test() { compute { name: "John", age: 30 } }';
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression as any;
      expect(expr.type).toBe("Object");
      expect(expr.properties).toHaveLength(2);
      expect(expr.properties[0].key).toBe("name");
      expect(errors).toHaveLength(0);
    });

    it("should parse object with keyword keys", () => {
      const source =
        'command test() { compute { entity: "User", command: "create" } }';
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression as any;
      expect(expr.properties[0].key).toBe("entity");
      expect(expr.properties[1].key).toBe("command");
      expect(errors).toHaveLength(0);
    });

    it("should parse nested objects", () => {
      const source = 'command test() { compute { user: { name: "John" } } }';
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression as any;
      expect(expr.properties[0].value.type).toBe("Object");
      expect(errors).toHaveLength(0);
    });
  });

  describe("Expression Parsing - Function Calls", () => {
    it("should parse simple function call", () => {
      const source = "command test() { compute now() }";
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression as any;
      expect(expr.type).toBe("Call");
      expect((expr.callee as any).name).toBe("now");
      expect(expr.arguments).toHaveLength(0);
      expect(errors).toHaveLength(0);
    });

    it("should parse function call with arguments", () => {
      const source = "command test() { compute uuid() }";
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression as any;
      expect(expr.type).toBe("Call");
      expect(errors).toHaveLength(0);
    });

    it("should parse chained member access then call", () => {
      const source = "command test() { compute user.getName() }";
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression as any;
      expect(expr.type).toBe("Call");
      expect(expr.callee.type).toBe("MemberAccess");
      expect(errors).toHaveLength(0);
    });
  });

  describe("Expression Parsing - Lambdas", () => {
    it("should parse lambda with single parameter", () => {
      const source = "command test() { compute (x) => x * 2 }";
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression as any;
      expect(expr.type).toBe("Lambda");
      expect(expr.parameters).toEqual(["x"]);
      expect(errors).toHaveLength(0);
    });

    it("should parse lambda with multiple parameters", () => {
      const source = "command test() { compute (x, y) => x + y }";
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression as any;
      expect(expr.parameters).toEqual(["x", "y"]);
      expect(errors).toHaveLength(0);
    });

    it("should parse lambda with complex body", () => {
      const source =
        'command test() { compute (x) => x > 0 ? "positive" : "non-positive" }';
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression as any;
      expect(expr.type).toBe("Lambda");
      expect(expr.body.type).toBe("Conditional");
      expect(errors).toHaveLength(0);
    });
  });

  describe("Expression Parsing - Parentheses", () => {
    it("should parse parenthesized expression", () => {
      const source = "command test() { compute (1 + 2) * 3 }";
      const { program, errors } = new Parser().parse(source);

      const expr = program.commands[0].actions[0].expression as any;
      expect(expr.operator).toBe("*");
      expect(expr.left.type).toBe("BinaryOp");
      expect(errors).toHaveLength(0);
    });
  });

  describe("Error Handling - Reserved Words", () => {
    it("should emit error for entity with reserved word name", () => {
      const source = "entity entity {}";
      const { program, errors } = new Parser().parse(source);

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("Reserved word");
      expect(errors[0].severity).toBe("error");
      // Parser should still create a placeholder entity
      expect(program.entities).toHaveLength(1);
    });

    it("should emit error for property with reserved word name", () => {
      const source = `
        entity User {
          property command: string
        }
      `;
      const { program, errors } = new Parser().parse(source);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.message.includes("Reserved word"))).toBe(
        true
      );
    });

    it("should emit error for command with reserved word name", () => {
      const source = "command entity() {}";
      const { program, errors } = new Parser().parse(source);

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("Reserved word");
      expect(program.commands).toHaveLength(1);
    });

    it("should allow keywords as object literal keys", () => {
      const source =
        'command test() { compute { entity: "User", command: "test" } }';
      const { program, errors } = new Parser().parse(source);

      expect(errors).toHaveLength(0);
    });

    it("should allow keywords as member access properties", () => {
      const source = "command test() { compute obj.entity }";
      const { program, errors } = new Parser().parse(source);

      expect(errors).toHaveLength(0);
    });
  });

  describe("Complex Manifest Syntax", () => {
    it("should parse complete entity with all features", () => {
      const source = `
        entity User {
          property required id: string = uuid()
          property name: string
          property email: string?
          property age: number = 18
          computed displayName: string = name + " (" + email + ")"
          hasMany posts: Post
          belongsTo organization: Organization
          on beforeCreate {
            mutate createdAt = now()
          }
          constraint email: email contains "@"
          command updateName(name: string) {
            when user.id == id
            mutate name = name
            emit nameUpdated
          }
          policy ownerOnly: user.id == id
          store memory
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const user = program.entities[0];
      expect(user.properties).toHaveLength(4);
      expect(user.computedProperties).toHaveLength(1);
      expect(user.relationships).toHaveLength(2);
      expect(user.behaviors).toHaveLength(1);
      expect(user.constraints).toHaveLength(1);
      expect(user.commands).toHaveLength(1);
      expect(user.policies).toHaveLength(1);
      expect(user.store).toBe("memory");
      expect(errors).toHaveLength(0);
    });

    it("should parse module with complete structure", () => {
      const source = `
        module Users {
          entity User {
            property required id: string
            property name: string
          }

          command createUser(name: string) {
            mutate id = uuid()
            mutate name = name
            emit UserCreated
          }

          event UserCreated: {
            userId: string
            name: string
          }

          policy adminOnly: user.role == "admin"

          store User in memory
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const module = program.modules[0];
      expect(module.entities).toHaveLength(1);
      expect(module.commands).toHaveLength(1);
      expect(module.events).toHaveLength(1);
      expect(module.policies).toHaveLength(1);
      expect(module.stores).toHaveLength(1);
      expect(errors).toHaveLength(0);
    });
  });

  describe("Actions", () => {
    it("should parse mutate action", () => {
      const source = `
        command test() {
          mutate value = 42
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const action = program.commands[0].actions[0];
      expect(action.kind).toBe("mutate");
      expect(action.target).toBe("value");
      expect(errors).toHaveLength(0);
    });

    it("should parse emit action", () => {
      const source = `
        command test() {
          emit TestEvent
        }
      `;
      const { program, errors } = new Parser().parse(source);

      // emit is stored in both emits array and as an action
      expect(program.commands[0].emits).toContain("TestEvent");
      expect(program.commands[0].actions).toHaveLength(1);
      expect(program.commands[0].actions[0].kind).toBe("emit");
      expect(errors).toHaveLength(0);
    });

    it("should parse compute action", () => {
      const source = `
        command test() {
          compute 42
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const action = program.commands[0].actions[0];
      expect(action.kind).toBe("compute");
      expect(errors).toHaveLength(0);
    });

    it("should parse compute with assignment", () => {
      const source = `
        command test() {
          compute result = 42
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const action = program.commands[0].actions[0];
      expect(action.kind).toBe("compute");
      expect(action.target).toBe("result");
      expect(errors).toHaveLength(0);
    });

    it("should parse effect action", () => {
      const source = `
        command test() {
          effect sendNotification
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const action = program.commands[0].actions[0];
      expect(action.kind).toBe("effect");
      expect(errors).toHaveLength(0);
    });

    it("should parse publish action", () => {
      const source = `
        command test() {
          publish testChannel
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const action = program.commands[0].actions[0];
      expect(action.kind).toBe("publish");
      expect(errors).toHaveLength(0);
    });

    it("should parse persist action", () => {
      const source = `
        command test() {
          persist
        }
      `;
      const { program, errors } = new Parser().parse(source);

      const action = program.commands[0].actions[0];
      expect(action.kind).toBe("persist");
      // persist action gets a null literal expression when no expression follows
      expect(action.expression).toEqual({
        type: "Literal",
        value: null,
        dataType: "null",
      });
      expect(errors).toHaveLength(0);
    });
  });
});

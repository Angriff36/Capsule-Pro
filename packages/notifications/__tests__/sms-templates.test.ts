import { describe, expect, it } from "vitest";
import {
  getAvailableTemplateTypes,
  getTemplateMetadata,
  renderSmsTemplate,
  renderSmsTemplateByType,
  SMS_TEMPLATES,
  validateTemplateData,
} from "../sms-templates";

describe("SMS Templates", () => {
  describe("renderSmsTemplate", () => {
    it("should render a template with simple placeholders", () => {
      const template = "Hello {{name}}, your shift is at {{time}}.";
      const data = { name: "John", time: "9:00 AM" };

      const result = renderSmsTemplate(template, data);

      expect(result).toBe("Hello John, your shift is at 9:00 AM.");
    });

    it("should handle missing placeholders gracefully", () => {
      const template = "Hello {{name}}, your shift is at {{time}}.";
      const data = { name: "John" };

      const result = renderSmsTemplate(template, data);

      expect(result).toBe("Hello John, your shift is at {{time}}.");
    });

    it("should handle numeric values", () => {
      const template = "You have {{count}} tasks due.";
      const data = { count: 5 };

      const result = renderSmsTemplate(template, data);

      expect(result).toBe("You have 5 tasks due.");
    });

    it("should handle repeated placeholders", () => {
      const template = "{{name}} - Reminder for {{name}}";
      const data = { name: "Alice" };

      const result = renderSmsTemplate(template, data);

      expect(result).toBe("Alice - Reminder for Alice");
    });
  });

  describe("renderSmsTemplateByType", () => {
    it("should render shift_reminder template", () => {
      const data = {
        shiftDate: "2024-01-15",
        shiftTime: "9:00 AM",
        location: "Main Office",
        companyName: "Acme Corp",
      };

      const result = renderSmsTemplateByType("shift_reminder", data);

      expect(result).toBe(
        "Shift Reminder: 2024-01-15 at 9:00 AM. Location: Main Office. Acme Corp"
      );
    });

    it("should render task_assignment template", () => {
      const data = {
        taskName: "Prepare catering order",
        dueDate: "2024-01-20",
        priority: "High",
        companyName: "Convoy",
      };

      const result = renderSmsTemplateByType("task_assignment", data);

      expect(result).toBe(
        "New Task: Prepare catering order due 2024-01-20. Priority: High. Convoy"
      );
    });

    it("should throw error for unknown template type", () => {
      expect(() => renderSmsTemplateByType("unknown_type", {})).toThrow(
        "Unknown SMS template type: unknown_type"
      );
    });
  });

  describe("validateTemplateData", () => {
    it("should return valid when all fields are provided", () => {
      const template = "Hello {{name}}, your code is {{code}}.";
      const data = { name: "John", code: "12345" };

      const result = validateTemplateData(template, data);

      expect(result.valid).toBe(true);
      expect(result.missingFields).toEqual([]);
    });

    it("should return missing fields when data is incomplete", () => {
      const template = "Hello {{name}}, your code is {{code}}.";
      const data = { name: "John" };

      const result = validateTemplateData(template, data);

      expect(result.valid).toBe(false);
      expect(result.missingFields).toEqual(["code"]);
    });

    it("should return missing fields for empty strings", () => {
      const template = "Hello {{name}}!";
      const data = { name: "" };

      const result = validateTemplateData(template, data);

      expect(result.valid).toBe(false);
      expect(result.missingFields).toEqual(["name"]);
    });
  });

  describe("getAvailableTemplateTypes", () => {
    it("should return all template types", () => {
      const types = getAvailableTemplateTypes();

      expect(types).toContain("urgent_update");
      expect(types).toContain("shift_reminder");
      expect(types).toContain("shift_assignment");
      expect(types).toContain("task_assignment");
      expect(types).toContain("task_reminder");
    });
  });

  describe("getTemplateMetadata", () => {
    it("should return template metadata for valid type", () => {
      const metadata = getTemplateMetadata("urgent_update");

      expect(metadata).not.toBeNull();
      expect(metadata?.type).toBe("urgent_update");
      expect(metadata?.description).toBe(
        "Urgent operational updates requiring immediate attention"
      );
    });

    it("should return null for unknown type", () => {
      const metadata = getTemplateMetadata("nonexistent");

      expect(metadata).toBeNull();
    });
  });

  describe("SMS_TEMPLATES constant", () => {
    it("should have all required templates", () => {
      const requiredTemplates = [
        "urgent_update",
        "shift_reminder",
        "shift_assignment",
        "task_assignment",
        "task_reminder",
        "clock_in_reminder",
        "schedule_change",
      ];

      for (const type of requiredTemplates) {
        expect(SMS_TEMPLATES[type]).toBeDefined();
        expect(SMS_TEMPLATES[type].template).toContain("{{");
      }
    });
  });
});

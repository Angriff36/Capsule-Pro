// src/types.ts
import { z } from "zod";
var normalizeSentryEventTags = (val) => {
  if (val === null || val === void 0) {
    return;
  }
  if (Array.isArray(val)) {
    const out = {};
    for (const pair of val) {
      if (Array.isArray(pair) && pair.length >= 2 && typeof pair[0] === "string") {
        out[pair[0]] = String(pair[1]);
      }
    }
    return out;
  }
  if (typeof val === "object") {
    const entries = Object.entries(val);
    const out = {};
    for (const [k, v] of entries) {
      out[k] = typeof v === "string" ? v : String(v);
    }
    return out;
  }
  return;
};
var sentryEventTagsSchema = z.preprocess(
  normalizeSentryEventTags,
  z.record(z.string(), z.string()).optional()
);
var normalizeIssueAlertSettings = (val) => {
  if (val === null || val === void 0) {
    return;
  }
  if (Array.isArray(val)) {
    const out = {};
    for (const item of val) {
      if (item && typeof item === "object" && "name" in item && "value" in item) {
        const row = item;
        out[row.name] = row.value;
      }
    }
    return out;
  }
  if (typeof val === "object") {
    return val;
  }
  return;
};
var issueAlertSettingsSchema = z.preprocess(
  normalizeIssueAlertSettings,
  z.record(z.string(), z.unknown()).optional()
);
var SentryIssueAlertSchema = z.object({
  action: z.literal("triggered"),
  data: z.object({
    event: z.object({
      event_id: z.string().optional(),
      url: z.url(),
      web_url: z.url(),
      issue_url: z.url(),
      issue_id: z.string(),
      type: z.string().optional(),
      message: z.string().optional(),
      title: z.string().optional(),
      culprit: z.string().optional(),
      timestamp: z.union([z.string(), z.number()]).optional(),
      environment: z.string().optional(),
      release: z.string().optional(),
      project: z.number().optional(),
      project_slug: z.string().optional(),
      project_name: z.string().optional(),
      exception: z.object({
        values: z.array(
          z.object({
            type: z.string().optional(),
            value: z.string().optional(),
            module: z.string().optional(),
            stacktrace: z.object({
              frames: z.array(
                z.object({
                  filename: z.string().optional(),
                  function: z.string().optional(),
                  lineno: z.number().optional(),
                  colno: z.number().optional(),
                  abs_path: z.string().optional()
                })
              ).optional()
            }).optional()
          })
        ).optional()
      }).optional(),
      context: z.record(z.string(), z.unknown()).optional(),
      tags: sentryEventTagsSchema
    }),
    triggered_rule: z.string(),
    issue_alert: z.object({
      title: z.string(),
      settings: issueAlertSettingsSchema
    }).optional()
  }),
  installation: z.object({
    uuid: z.string()
  }).optional(),
  actor: z.object({
    type: z.string(),
    id: z.string().optional(),
    name: z.string().optional()
  }).optional()
});
var DEFAULT_BLOCKED_PATTERNS = [
  /migrations?\//i,
  /\/migrations?\//i,
  /auth\//i,
  /\/auth\//i,
  /authentication\//i,
  /billing\//i,
  /\/billing\//i,
  /payment\//i,
  /\/payment\//i,
  /stripe\//i,
  /\/stripe\//i,
  /\.env/i,
  /secrets?\//i,
  /\/secrets?\//i,
  /credentials?\//i,
  /\/credentials?\//i
];
var isBlockedPath = (filePath, blockedPatterns = DEFAULT_BLOCKED_PATTERNS) => blockedPatterns.some((pattern) => pattern.test(filePath));

export {
  SentryIssueAlertSchema,
  DEFAULT_BLOCKED_PATTERNS,
  isBlockedPath
};
//# sourceMappingURL=chunk-CVVP5YMS.js.map
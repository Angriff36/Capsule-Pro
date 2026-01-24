Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictDetectionResultSchema =
  exports.ConflictSchema =
  exports.ConflictType =
  exports.ConflictSeverity =
    void 0;
const zod_1 = require("zod");
exports.ConflictSeverity = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
};
exports.ConflictType = {
  scheduling: "scheduling",
  resource: "resource",
  staff: "staff",
  inventory: "inventory",
  timeline: "timeline",
};
exports.ConflictSchema = zod_1.z.object({
  id: zod_1.z.string().uuid(),
  type: zod_1.z.enum(Object.values(exports.ConflictType)),
  severity: zod_1.z.enum(Object.values(exports.ConflictSeverity)),
  title: zod_1.z.string(),
  description: zod_1.z.string(),
  affectedEntities: zod_1.z.array(
    zod_1.z.object({
      type: zod_1.z.enum(["event", "task", "employee", "inventory"]),
      id: zod_1.z.string(),
      name: zod_1.z.string(),
    })
  ),
  suggestedAction: zod_1.z.string().optional(),
  createdAt: zod_1.z.date(),
});
exports.ConflictDetectionResultSchema = zod_1.z.object({
  conflicts: zod_1.z.array(exports.ConflictSchema),
  summary: zod_1.z.object({
    total: zod_1.z.number(),
    bySeverity: zod_1.z.record(
      zod_1.z.enum(Object.values(exports.ConflictSeverity)),
      zod_1.z.number()
    ),
    byType: zod_1.z.record(
      zod_1.z.enum(Object.values(exports.ConflictType)),
      zod_1.z.number()
    ),
  }),
  analyzedAt: zod_1.z.date(),
});

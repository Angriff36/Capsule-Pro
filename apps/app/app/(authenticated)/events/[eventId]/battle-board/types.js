Object.defineProperty(exports, "__esModule", { value: true });
exports.PRIORITY_ORDER =
  exports.TASK_STATUS_ICONS =
  exports.TASK_STATUS_COLORS =
    void 0;
exports.TASK_STATUS_COLORS = {
  not_started: "bg-slate-100 text-slate-700 border-slate-300",
  in_progress: "bg-blue-50 text-blue-700 border-blue-300",
  completed: "bg-green-50 text-green-700 border-green-300",
  delayed: "bg-red-50 text-red-700 border-red-300",
  blocked: "bg-orange-50 text-orange-700 border-orange-300",
};
exports.TASK_STATUS_ICONS = {
  not_started: "○",
  in_progress: "◐",
  completed: "●",
  delayed: "!",
  blocked: "⊘",
};
exports.PRIORITY_ORDER = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.DependencyLines = DependencyLines;
const react_1 = require("react");
const ROW_HEIGHT = 48;
function DependencyLines({
  tasks,
  eventDate,
  showDependencies,
  zoom,
  taskPositions,
}) {
  const dependencyPaths = (0, react_1.useMemo)(() => {
    if (!showDependencies || tasks.length === 0) {
      return [];
    }
    const paths = [];
    for (const task of tasks) {
      if (!task.dependencies || task.dependencies.length === 0) {
        continue;
      }
      for (const depId of task.dependencies) {
        const fromTask = tasks.find((t) => t.id === depId);
        const toTask = task;
        if (!fromTask) {
          continue;
        }
        const fromPos = taskPositions.get(fromTask.id);
        const toPos = taskPositions.get(toTask.id);
        if (!(fromPos && toPos)) {
          continue;
        }
        const fromX = fromPos.left + fromPos.width;
        const fromY = fromPos.top + fromPos.height / 2;
        const toX = toPos.left;
        const toY = toPos.top + toPos.height / 2;
        const midX = fromX + (toX - fromX) / 2;
        const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
        paths.push({
          id: `${fromTask.id}-${toTask.id}`,
          d: path,
          fromTask,
          toTask,
        });
      }
    }
    return paths;
  }, [tasks, showDependencies, taskPositions]);
  if (!showDependencies || dependencyPaths.length === 0) {
    return null;
  }
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        width: `${24 * 60 * 4 * (zoom / 100)}px`,
        height: `${tasks.length * ROW_HEIGHT + 100}px`,
      }}
    >
      {dependencyPaths.map((path) => {
        const toPos = taskPositions.get(path.toTask.id);
        return (
          <g key={path.id}>
            <path
              className="transition-all duration-200"
              d={path.d}
              fill="none"
              stroke="hsl(var(--primary) / 0.5)"
              strokeDasharray="4 2"
              strokeWidth="2"
            />
            {toPos && (
              <circle
                cx={toPos.left}
                cy={toPos.top + ROW_HEIGHT / 2}
                fill="hsl(var(--primary))"
                r="4"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

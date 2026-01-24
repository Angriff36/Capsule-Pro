"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.LivePresenceIndicator = void 0;
const suspense_1 = require("@liveblocks/react/suspense");
const react_1 = require("react");
function PresenceIndicator({ className = "" }) {
  const others = (0, suspense_1.useOthers)();
  if (others.length === 0) {
    return null;
  }
  return (
    <div
      className={`flex items-center gap-1 rounded-full border bg-background px-3 py-1.5 shadow-sm ${className}`}
    >
      <div className="flex -space-x-2">
        {others.map((other) => (
          <div
            className="h-8 w-8 rounded-full ring-2 ring-background"
            key={other.connectionId}
            style={{
              backgroundColor: other.info.color,
            }}
            title={other.info.name || other.id}
          >
            {other.info.avatar && (
              <img
                alt={other.info.name || other.id}
                className="h-full w-full rounded-full object-cover"
                src={other.info.avatar}
              />
            )}
          </div>
        ))}
      </div>
      <span className="text-muted-foreground text-xs">
        {others.length} {others.length === 1 ? "viewer" : "viewers"}
      </span>
    </div>
  );
}
exports.LivePresenceIndicator = (0, react_1.memo)(PresenceIndicator);

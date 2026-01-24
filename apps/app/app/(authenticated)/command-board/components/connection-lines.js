"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionLines = void 0;
const utils_1 = require("@repo/design-system/lib/utils");
const react_1 = require("react");
const types_1 = require("../types");
/**
 * ConnectionLines - Renders SVG connection lines between cards
 *
 * Shows relationships between entities with colored lines and relationship type indicators.
 * Lines update in real-time as cards move.
 */
exports.ConnectionLines = (0, react_1.memo)(function ConnectionLines({
  cards,
  connections,
  className,
  onConnectionClick,
  selectedConnectionId,
}) {
  const cardMap = (0, react_1.useMemo)(() => {
    const map = new Map();
    for (const card of cards) {
      map.set(card.id, card);
    }
    return map;
  }, [cards]);
  const renderConnection = (connection) => {
    const fromCard = cardMap.get(connection.fromCardId);
    const toCard = cardMap.get(connection.toCardId);
    if (!fromCard) {
      return null;
    }
    if (!toCard) {
      return null;
    }
    if (!connection.visible) {
      return null;
    }
    const fromBox = {
      x: fromCard.position.x,
      y: fromCard.position.y,
      width: fromCard.position.width,
      height: fromCard.position.height,
    };
    const toBox = {
      x: toCard.position.x,
      y: toCard.position.y,
      width: toCard.position.width,
      height: toCard.position.height,
    };
    const fromCenter = {
      x: fromBox.x + fromBox.width / 2,
      y: fromBox.y + fromBox.height / 2,
    };
    const toCenter = {
      x: toBox.x + toBox.width / 2,
      y: toBox.y + toBox.height / 2,
    };
    const startPoint = (0, types_1.calculateAnchorPoint)(fromBox, toCenter);
    const endPoint = (0, types_1.calculateAnchorPoint)(toBox, fromCenter);
    const midPoint = (0, types_1.calculateMidPoint)(startPoint, endPoint);
    const pathData = (0, types_1.calculateCurvePath)(startPoint, endPoint, 0.3);
    const config = (() => {
      switch (connection.relationshipType) {
        case "client_to_event":
          return {
            label: "has",
            color: "#3b82f6",
            dashArray: undefined,
            strokeWidth: 2,
          };
        case "event_to_task":
          return {
            label: "includes",
            color: "#10b981",
            dashArray: undefined,
            strokeWidth: 2,
          };
        case "task_to_employee":
          return {
            label: "assigned",
            color: "#f59e0b",
            dashArray: "5,5",
            strokeWidth: 2,
          };
        case "event_to_inventory":
          return {
            label: "uses",
            color: "#8b5cf6",
            dashArray: undefined,
            strokeWidth: 2,
          };
        default:
          return {
            label: "related",
            color: "#6b7280",
            dashArray: "4,4",
            strokeWidth: 1.5,
          };
      }
    })();
    const isSelected = connection.id === selectedConnectionId;
    const markerId = `arrowhead-${connection.id}`;
    const markerUrl = `url(#${markerId})`;
    const labelText = connection.label || config.label;
    return (
      <g
        onClick={() => onConnectionClick?.(connection.id)}
        onKeyDown={(e) => {
          const isEnter = e.key === "Enter";
          const isSpace = e.key === " ";
          if (isEnter || isSpace) {
            e.preventDefault();
            onConnectionClick?.(connection.id);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <title>
          Connection from {fromCard.title} to {toCard.title}: {config.label}
        </title>
        <defs>
          <marker
            id={markerId}
            markerHeight="10"
            markerUnits="strokeWidth"
            markerWidth="10"
            orient="auto"
            refX="9"
            refY="3"
          >
            <path
              d="M0,0 L0,6 L9,3 z"
              fill={config.color}
              fillOpacity={isSelected ? "1" : "0.7"}
            />
          </marker>
        </defs>

        <path
          d={pathData}
          fill="none"
          markerEnd={markerUrl}
          stroke={config.color}
          strokeDasharray={config.dashArray}
          strokeLinecap="round"
          strokeWidth={config.strokeWidth}
          style={{
            opacity: isSelected ? 1 : 0.7,
            transition: "opacity 0.2s, stroke-width 0.2s",
          }}
        />

        {isSelected && (
          <path
            d={pathData}
            fill="none"
            stroke={config.color}
            strokeWidth={config.strokeWidth + 4}
            style={{
              filter: "blur(4px)",
              opacity: 0.3,
            }}
          />
        )}

        <g
          style={{
            transition: "transform 0.2s",
          }}
        >
          <rect
            fill="background"
            height="20"
            rx="4"
            stroke={config.color}
            strokeWidth={1}
            style={{
              fillOpacity: 0.95,
            }}
            width={labelText.length * 8 + 12}
            x={midPoint.x - (labelText.length * 8 + 12) / 2}
            y={midPoint.y - 10}
          />
          <text
            dominantBaseline="middle"
            fill={config.color}
            fontSize="11"
            textAnchor="middle"
            x={midPoint.x}
            y={midPoint.y}
          >
            {labelText}
          </text>
        </g>
      </g>
    );
  };
  return (
    <svg
      aria-label="Connection lines between cards"
      className={(0, utils_1.cn)(
        "absolute inset-0 pointer-events-none",
        className
      )}
      height="4000"
      width="4000"
      xmlns="http://www.w3.org/2000/svg"
    >
      {connections.map((connection) => renderConnection(connection))}
    </svg>
  );
});

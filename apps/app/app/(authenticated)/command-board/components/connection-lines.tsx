"use client";

import { cn } from "@repo/design-system/lib/utils";
import { memo, useMemo } from "react";
import type { CardConnection, CommandBoardCard } from "../types";
import {
  calculateAnchorPoint,
  calculateCurvePath,
  calculateMidPoint,
} from "../types";

interface ConnectionLinesProps {
  cards: CommandBoardCard[];
  connections: CardConnection[];
  className?: string;
  onConnectionClick?: (connectionId: string) => void;
  onContextMenu?: (connectionId: string, x: number, y: number) => void;
  selectedConnectionId?: string;
}

/**
 * ConnectionLines - Renders SVG connection lines between cards
 *
 * Shows relationships between entities with colored lines and relationship type indicators.
 * Lines update in real-time as cards move.
 */
export const ConnectionLines = memo(function ConnectionLines({
  cards,
  connections,
  className,
  onConnectionClick,
  onContextMenu,
  selectedConnectionId,
}: ConnectionLinesProps) {
  const cardMap = useMemo(() => {
    const map = new Map<string, CommandBoardCard>();
    for (const card of cards) {
      map.set(card.id, card);
    }
    return map;
  }, [cards]);

  const renderConnection = (connection: CardConnection) => {
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

    const startPoint = calculateAnchorPoint(fromBox, toCenter);
    const endPoint = calculateAnchorPoint(toBox, fromCenter);
    const midPoint = calculateMidPoint(startPoint, endPoint);
    const pathData = calculateCurvePath(startPoint, endPoint, 0.3);

    const config = (() => {
      switch (connection.relationshipType) {
        case "client_to_event":
          return {
            label: "has",
            color: "#3b82f6",
            dashArray: undefined as string | undefined,
            strokeWidth: 2,
          };
        case "event_to_task":
          return {
            label: "includes",
            color: "#10b981",
            dashArray: undefined as string | undefined,
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
            dashArray: undefined as string | undefined,
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
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu?.(connection.id, e.clientX, e.clientY);
        }}
        onKeyDown={(e) => {
          const isEnter = e.key === "Enter";
          const isSpace = e.key === " ";
          if (isEnter || isSpace) {
            e.preventDefault();
            onConnectionClick?.(connection.id);
          }
        }}
        role="button"
        style={{ cursor: "pointer" }}
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
      className={cn("absolute inset-0 pointer-events-none", className)}
      height="4000"
      width="4000"
      xmlns="http://www.w3.org/2000/svg"
    >
      {connections.map((connection) => renderConnection(connection))}
    </svg>
  );
});

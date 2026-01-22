"use client";

import { memo } from "react";

type CursorProps = {
  x: number;
  y: number;
  color: string;
  name: string;
};

function Cursor({ x, y, color, name }: CursorProps) {
  return (
    <div
      className="pointer-events-none fixed z-50 transition-transform duration-75"
      style={{
        transform: `translate(${x}px, ${y}px)`,
      }}
    >
      <svg
        fill="none"
        height="24"
        style={{
          filter: "drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.3))",
        }}
        viewBox="0 0 24 24"
        width="24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5.65376 12.4563L1.65376 2.45626C1.44824 1.95048 1.95048 1.44824 2.45626 1.65376L12.4563 5.65376C12.8469 5.81393 13.0392 6.26078 12.9127 6.66316L10.4127 14.1632C10.298 14.5283 9.88266 14.7106 9.53326 14.5633L7.03326 13.5633C6.88919 13.5013 6.72583 13.5013 6.58176 13.5633L4.08176 14.5633C3.73236 14.7106 3.317 14.5283 3.20226 14.1632L0.702257 6.66316C0.575811 6.26078 0.768085 5.81393 1.1587 5.65376L5.65376 12.4563Z"
          fill={color}
        />
      </svg>
      <div
        className="mt-1 ml-4 rounded px-2 py-1 text-white text-xs"
        style={{
          backgroundColor: color,
        }}
      >
        {name}
      </div>
    </div>
  );
}

export const LiveCursor = memo(Cursor);

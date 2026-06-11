"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { EventBoardData, PaletteStaff } from "../actions";
import type { StaffConflict } from "../impact";
import type { BoardStatus } from "../templates";
import { DRAG_HINT, LeafBox, StaffLeafBody } from "./branch-leaf";

// ---------------------------------------------------------------------------
// Fixed coordinate system (SVG stretches to fill via preserveAspectRatio=none;
// leaf boxes use the same coords converted to percentages so they track it).
// ---------------------------------------------------------------------------

const VIEW_W = 1000;
const VIEW_H = 600;
const TRUNK_X = 500;
const TRUNK_TOP_Y = 70;
const TRUNK_BOTTOM_Y = 520;
const ELBOW_R = 14;

interface Slot {
  side: "left" | "right";
  /** y of the horizontal run off the trunk. */
  runY: number;
  /** x of the vertical run up into the leaf box. */
  elbowX: number;
  /** y of the leaf box top edge. */
  leafTopY: number;
}

/** Alternating left/right slots for non-battleboard branches, top to bottom. */
const SLOTS: Slot[] = [
  { side: "left", runY: 250, elbowX: 150, leafTopY: 110 },
  { side: "right", runY: 220, elbowX: 850, leafTopY: 80 },
  { side: "left", runY: 420, elbowX: 130, leafTopY: 290 },
  { side: "right", runY: 390, elbowX: 870, leafTopY: 260 },
];

/** Rounded-elbow connector: horizontal run, quarter arc, vertical run up. */
function elbowPath(slot: Slot): string {
  const endY = slot.leafTopY + 44; // tuck the line end under the leaf box
  const towardLeaf = slot.side === "left" ? ELBOW_R : -ELBOW_R;
  return [
    `M ${TRUNK_X} ${slot.runY}`,
    `H ${slot.elbowX + towardLeaf}`,
    `Q ${slot.elbowX} ${slot.runY} ${slot.elbowX} ${slot.runY - ELBOW_R}`,
    `V ${endY}`,
  ].join(" ");
}

/** Two strokes per path: wide glow under a thin line (the v2 reference look). */
function StrokedPath({ d, stroke }: { d: string; stroke: string }) {
  return (
    <>
      <path
        d={d}
        fill="none"
        opacity={0.18}
        stroke={stroke}
        strokeLinecap="round"
        strokeWidth={6}
      />
      <path
        d={d}
        fill="none"
        opacity={0.75}
        stroke={stroke}
        strokeLinecap="round"
        strokeWidth={2}
      />
    </>
  );
}

export interface TreeCanvasProps {
  status: BoardStatus;
  event: EventBoardData["event"];
  draftCards: EventBoardData["draftCards"];
  committedStaff: EventBoardData["committedStaff"];
  conflicts: StaffConflict[];
  paletteById: Map<string, PaletteStaff>;
  onRemoveDraft: (cardId: string) => void;
  removing: boolean;
  battleBoardHref: string;
}

export function TreeCanvas({
  status,
  event,
  draftCards,
  committedStaff,
  conflicts,
  paletteById,
  onRemoveDraft,
  removing,
  battleBoardHref,
}: TreeCanvasProps) {
  // Single-expansion: only one token shows its mini card at a time.
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const toggle = (key: string) =>
    setExpandedKey((current) => (current === key ? null : key));

  const staffDrafts = useMemo(
    () =>
      draftCards.filter(
        (c) =>
          c.envelope.draftState === "draft" &&
          c.envelope.draftAction.kind === "assign-staff"
      ),
    [draftCards]
  );
  const conflictByCard = useMemo(
    () => new Map(conflicts.map((c) => [c.cardId, c.with])),
    [conflicts]
  );

  const battleboard = status.branches.find(
    (b) => b.key === "battleboard" && b.requirement !== "excluded"
  );
  const slotted = status.branches
    .filter((b) => b.requirement !== "excluded" && b.key !== "battleboard")
    .slice(0, SLOTS.length)
    .map((branch, i) => ({ branch, slot: SLOTS[i] }));
  const excluded = status.branches.filter((b) => b.requirement === "excluded");

  const dateLabel = new Date(event.eventDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="relative h-full min-h-[520px] w-full">
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      >
        <defs>
          {/* userSpaceOnUse: a perfectly vertical stroke has a zero-width bounding
              box, so objectBoundingBox gradients degenerate to a solid color. */}
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id="etb-opal"
            x1="500"
            x2="500"
            y1="520"
            y2="70"
          >
            <stop offset="0" stopColor="#a78bfa" />
            <stop offset=".5" stopColor="#67e8f9" />
            <stop offset="1" stopColor="#f0abfc" />
          </linearGradient>
          {slotted.map(({ branch, slot }) => (
            <linearGradient
              id={`etb-g-${branch.key}`}
              key={branch.key}
              x1={slot.side === "left" ? "1" : "0"}
              x2={slot.side === "left" ? "0" : "1"}
              y1="1"
              y2="0"
            >
              <stop offset="0" stopColor="#a78bfa" />
              <stop offset="1" stopColor={branch.color} />
            </linearGradient>
          ))}
          {battleboard && (
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="etb-g-battleboard"
              x1="500"
              x2="500"
              y1="70"
              y2="46"
            >
              <stop offset="0" stopColor="#a78bfa" />
              <stop offset="1" stopColor={battleboard.color} />
            </linearGradient>
          )}
        </defs>
        <StrokedPath
          d={`M ${TRUNK_X} ${TRUNK_BOTTOM_Y} V ${TRUNK_TOP_Y}`}
          stroke="url(#etb-opal)"
        />
        {slotted.map(({ branch, slot }) => (
          <StrokedPath
            d={elbowPath(slot)}
            key={branch.key}
            stroke={`url(#etb-g-${branch.key})`}
          />
        ))}
        {battleboard && (
          <StrokedPath
            d={`M ${TRUNK_X} ${TRUNK_TOP_Y} V 46`}
            stroke="url(#etb-g-battleboard)"
          />
        )}
      </svg>

      {/* Event hub */}
      <div className="absolute bottom-3 left-1/2 z-10 w-56 -translate-x-1/2 rounded-xl border-[1.5px] border-violet-400/80 bg-violet-400/10 px-3 py-2 text-center shadow-[0_0_16px_rgba(167,139,250,0.3)]">
        <p className="truncate text-sm font-semibold">{event.title}</p>
        <p className="text-xs text-muted-foreground">
          {dateLabel} · {event.guestCount} guests
          {event.venueName && (
            <>
              <br />
              {event.venueName}
            </>
          )}
        </p>
      </div>

      {battleboard && (
        <LeafBox
          branch={battleboard}
          className="left-1/2 top-[1%] w-44 -translate-x-1/2"
        >
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="text-muted-foreground">
              {battleboard.have} committed
            </span>
            <Link
              className="font-medium text-primary hover:underline"
              href={battleBoardHref}
            >
              open ↗
            </Link>
          </div>
        </LeafBox>
      )}

      {slotted.map(({ branch, slot }) => (
        <LeafBox
          branch={branch}
          key={branch.key}
          style={{
            top: `${(slot.leafTopY / VIEW_H) * 100}%`,
            ...(slot.side === "left" ? { left: "2%" } : { right: "2%" }),
            width: "27%",
            minWidth: 180,
            maxWidth: 300,
          }}
        >
          {branch.key === "staff" ? (
            <StaffLeafBody
              committedStaff={committedStaff}
              conflictByCard={conflictByCard}
              expandedKey={expandedKey}
              onRemoveDraft={onRemoveDraft}
              paletteById={paletteById}
              removing={removing}
              staffDrafts={staffDrafts}
              toggle={toggle}
            />
          ) : branch.state === "missing" &&
            branch.requirement === "required" ? (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              {DRAG_HINT[branch.key]}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              {branch.have} committed
            </p>
          )}
        </LeafBox>
      ))}

      {excluded.length > 0 && (
        <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1.5">
          {excluded.map((branch) => (
            <div
              className="w-36 rounded-lg border-[1.5px] border-dotted border-muted-foreground/50 p-2 opacity-40"
              id={`branch-leaf-${branch.key}`}
              key={branch.key}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide">
                {branch.label}
              </p>
              <p className="text-[10px] text-muted-foreground">
                not in this template
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

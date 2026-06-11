"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { EventBoardData, PaletteStaff } from "../actions";
import type { StaffConflict } from "../impact";
import type { BoardStatus, BranchStatus } from "../templates";
import { LeafBox, MenuLeafBody, StaffLeafBody } from "./branch-leaf";

// ---------------------------------------------------------------------------
// Fixed coordinate system (SVG stretches to fill via preserveAspectRatio=none;
// leaf boxes use the same coords converted to percentages so they track it).
// ---------------------------------------------------------------------------

const VIEW_W = 1000;
const VIEW_H = 600;
const TRUNK_X = 500;
const TRUNK_TOP_Y = 84;
const TRUNK_BOTTOM_Y = 524;
const ELBOW_R = 16;

interface Slot {
  /** x of the vertical run up into the leaf box. */
  elbowX: number;
  /** y of the leaf box top edge. */
  leafTopY: number;
  /** y of the horizontal run off the trunk. */
  runY: number;
  side: "left" | "right";
}

/** Alternating left/right slots for non-battleboard branches, top to bottom. */
const SLOTS: Slot[] = [
  { side: "left", runY: 232, elbowX: 168, leafTopY: 88 },
  { side: "right", runY: 204, elbowX: 832, leafTopY: 60 },
  { side: "left", runY: 414, elbowX: 150, leafTopY: 272 },
  { side: "right", runY: 386, elbowX: 850, leafTopY: 244 },
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
        strokeWidth={7}
      />
      <path
        d={d}
        fill="none"
        opacity={0.75}
        stroke={stroke}
        strokeLinecap="round"
        strokeWidth={2.5}
      />
    </>
  );
}

function BattleBoardLeafBody({
  battleBoards,
  eventId,
}: {
  battleBoards: EventBoardData["battleBoards"];
  eventId: string;
}) {
  if (battleBoards.length === 0) {
    return (
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-muted-foreground">none yet</span>
        <Link
          className="font-medium text-primary hover:underline"
          href={`/events/battle-boards/new?eventId=${eventId}`}
        >
          create ↗
        </Link>
      </div>
    );
  }
  const [first, ...rest] = battleBoards;
  return (
    <div className="space-y-0.5 text-[11px]">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-muted-foreground">
          {first.name}
        </span>
        <Link
          className="shrink-0 font-medium text-primary hover:underline"
          href={`/events/battle-boards/${first.id}`}
        >
          open ↗
        </Link>
      </div>
      {rest.length > 0 && (
        <Link
          className="block text-muted-foreground hover:text-primary hover:underline"
          href="/events/battle-boards"
        >
          +{rest.length} more
        </Link>
      )}
    </div>
  );
}

function VehiclesLeafBody({ branch }: { branch: BranchStatus }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="text-muted-foreground">
        {branch.have === 0
          ? "no delivery routes yet"
          : `${branch.have} delivery route${branch.have === 1 ? "" : "s"}`}
      </span>
      <Link
        className="shrink-0 font-medium text-primary hover:underline"
        href="/logistics/routes"
      >
        manage ↗
      </Link>
    </div>
  );
}

export interface TreeCanvasProps {
  battleBoards: EventBoardData["battleBoards"];
  committedDishes: EventBoardData["committedDishes"];
  committedStaff: EventBoardData["committedStaff"];
  conflicts: StaffConflict[];
  draftCards: EventBoardData["draftCards"];
  /** Kind of the palette item currently being dragged, for target highlighting. */
  dragKind: "staff" | "dish" | null;
  event: EventBoardData["event"];
  onRemoveDraft: (cardId: string) => void;
  paletteById: Map<string, PaletteStaff>;
  removing: boolean;
  status: BoardStatus;
}

export function TreeCanvas({
  status,
  event,
  draftCards,
  committedStaff,
  committedDishes,
  battleBoards,
  conflicts,
  paletteById,
  onRemoveDraft,
  removing,
  dragKind,
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
  const dishDrafts = useMemo(
    () =>
      draftCards.filter(
        (c) =>
          c.envelope.draftState === "draft" &&
          c.envelope.draftAction.kind === "add-dish"
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

  const leafHighlight = (key: BranchStatus["key"]): boolean =>
    (key === "staff" && dragKind === "staff") ||
    (key === "menu" && dragKind === "dish");

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
            y1={String(TRUNK_BOTTOM_Y)}
            y2={String(TRUNK_TOP_Y)}
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
              y1={String(TRUNK_TOP_Y)}
              y2="48"
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
            d={`M ${TRUNK_X} ${TRUNK_TOP_Y} V 48`}
            stroke="url(#etb-g-battleboard)"
          />
        )}
      </svg>

      {/* Event hub */}
      <div className="absolute bottom-5 left-1/2 z-10 w-60 -translate-x-1/2 rounded-xl border-[1.5px] border-violet-400/80 bg-violet-400/10 px-3 py-2 text-center shadow-[0_0_16px_rgba(167,139,250,0.3)]">
        <p className="truncate font-semibold text-sm">{event.title}</p>
        <p className="text-muted-foreground text-xs">
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
          className="top-[2%] left-1/2 w-52 -translate-x-1/2"
        >
          <BattleBoardLeafBody battleBoards={battleBoards} eventId={event.id} />
        </LeafBox>
      )}

      {slotted.map(({ branch, slot }) => (
        <LeafBox
          branch={branch}
          highlight={leafHighlight(branch.key)}
          key={branch.key}
          style={{
            top: `${(slot.leafTopY / VIEW_H) * 100}%`,
            ...(slot.side === "left" ? { left: "3%" } : { right: "3%" }),
            width: "26%",
            minWidth: 200,
            maxWidth: 320,
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
          ) : branch.key === "menu" ? (
            <MenuLeafBody
              committedDishes={committedDishes}
              dishDrafts={dishDrafts}
              onRemoveDraft={onRemoveDraft}
              removing={removing}
            />
          ) : branch.key === "vehicles" ? (
            <VehiclesLeafBody branch={branch} />
          ) : (
            // Equipment: no event↔equipment data model exists yet — say so
            // plainly instead of a dead drag hint.
            <p className="text-[11px] text-muted-foreground">
              not tracked per event yet
            </p>
          )}
        </LeafBox>
      ))}

      {excluded.length > 0 && (
        <div className="absolute right-5 bottom-5 z-10 flex flex-col gap-1.5">
          {excluded.map((branch) => (
            <div
              className="w-36 rounded-lg border-[1.5px] border-muted-foreground/50 border-dotted p-2 opacity-40"
              id={`branch-leaf-${branch.key}`}
              key={branch.key}
            >
              <p className="font-semibold text-[10px] uppercase tracking-wide">
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

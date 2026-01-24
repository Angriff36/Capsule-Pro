"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.AvatarStack = void 0;
const hooks_1 = require("@repo/collaboration/hooks");
const avatar_1 = require("@repo/design-system/components/ui/avatar");
const tooltip_1 = require("@repo/design-system/components/ui/tooltip");
const PresenceAvatar = ({ info }) => (
  <tooltip_1.Tooltip delayDuration={0}>
    <tooltip_1.TooltipTrigger>
      <avatar_1.Avatar className="h-7 w-7 bg-secondary ring-1 ring-background">
        <avatar_1.AvatarImage alt={info?.name} src={info?.avatar} />
        <avatar_1.AvatarFallback className="text-xs">
          {info?.name?.slice(0, 2)}
        </avatar_1.AvatarFallback>
      </avatar_1.Avatar>
    </tooltip_1.TooltipTrigger>
    <tooltip_1.TooltipContent collisionPadding={4}>
      <p>{info?.name ?? "Unknown"}</p>
    </tooltip_1.TooltipContent>
  </tooltip_1.Tooltip>
);
const AvatarStack = () => {
  const others = (0, hooks_1.useOthers)();
  const self = (0, hooks_1.useSelf)();
  const hasMoreUsers = others.length > 3;
  return (
    <div className="flex items-center -space-x-1 px-4">
      {others.slice(0, 3).map(({ connectionId, info }) => (
        <PresenceAvatar info={info} key={connectionId} />
      ))}

      {hasMoreUsers && (
        <PresenceAvatar
          info={{
            name: `+${others.length - 3}`,
            color: "var(--color-muted-foreground)",
          }}
        />
      )}

      {self && <PresenceAvatar info={self.info} />}
    </div>
  );
};
exports.AvatarStack = AvatarStack;

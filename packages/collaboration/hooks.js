var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? (o, m, k, k2) => {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get() {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : (o, m, k, k2) => {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __exportStar =
  (this && this.__exportStar) ||
  ((m, exports) => {
    for (var p in m)
      if (p !== "default" && !Object.hasOwn(exports, p))
        __createBinding(exports, m, p);
  });
Object.defineProperty(exports, "__esModule", { value: true });
exports.useOtherCursors =
  exports.useCommandBoardPresence =
  exports.LivePresenceIndicator =
  exports.LiveCursors =
    void 0;
__exportStar(require("@liveblocks/react/suspense"), exports);
var live_cursors_1 = require("./live-cursors");
Object.defineProperty(exports, "LiveCursors", {
  enumerable: true,
  get() {
    return live_cursors_1.LiveCursors;
  },
});
var live_presence_indicator_1 = require("./live-presence-indicator");
Object.defineProperty(exports, "LivePresenceIndicator", {
  enumerable: true,
  get() {
    return live_presence_indicator_1.LivePresenceIndicator;
  },
});
var use_command_board_presence_1 = require("./use-command-board-presence");
Object.defineProperty(exports, "useCommandBoardPresence", {
  enumerable: true,
  get() {
    return use_command_board_presence_1.useCommandBoardPresence;
  },
});
Object.defineProperty(exports, "useOtherCursors", {
  enumerable: true,
  get() {
    return use_command_board_presence_1.useOtherCursors;
  },
});

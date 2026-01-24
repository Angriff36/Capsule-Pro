"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Room = void 0;
const client_1 = require("@liveblocks/client");
const suspense_1 = require("@liveblocks/react/suspense");
const Room = ({ id, children, authEndpoint, fallback, ...props }) => (
  <suspense_1.LiveblocksProvider authEndpoint={authEndpoint} {...props}>
    <suspense_1.RoomProvider
      id={id}
      initialPresence={{
        cursor: null,
        selectedCardId: null,
        isDragging: false,
      }}
      initialStorage={() => ({ cards: new client_1.LiveMap() })}
    >
      <suspense_1.ClientSideSuspense fallback={fallback}>
        {children}
      </suspense_1.ClientSideSuspense>
    </suspense_1.RoomProvider>
  </suspense_1.LiveblocksProvider>
);
exports.Room = Room;

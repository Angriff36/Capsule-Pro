// Define Liveblocks types for your application
// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      cursor: { x: number; y: number } | null;
      selectedCardId: string | null;
      isDragging: boolean;
    };

    // The Storage tree for the room, for useMutation, useStorage, etc.
    Storage: {
      projections: import("@liveblocks/client").LiveMap<
        string,
        {
          id: string;
          x: number;
          y: number;
          width: number;
          height: number;
          zIndex: number;
        }
      >;
    };

    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        name?: string;
        avatar?: string;
        color: string;
      };
    };

    // Custom events, for useBroadcastEvent, useEventListener
    RoomEvent:
      | {
          type: "PROJECTION_MOVED";
          projectionId: string;
          x: number;
          y: number;
        }
      | {
          type: "PROJECTION_ADDED";
          projectionId: string;
        }
      | {
          type: "PROJECTION_REMOVED";
          projectionId: string;
        }
      | {
          type: "BOARD_REFRESHED";
        };

    // Custom metadata set on threads, for useThreads, useCreateThread, etc.
    ThreadMetadata: {};

    // Custom room info set with resolveRoomsInfo, for useRoomInfo
    RoomInfo: {
      title?: string;
    };
  }
}

export {};

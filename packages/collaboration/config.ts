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
      cards: import("@liveblocks/client").LiveMap<
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
          type: "CARD_ADDED";
          cardId: string;
        }
      | {
          type: "CARD_DELETED";
          cardId: string;
        }
      | {
          type: "CARD_UPDATED";
          cardId: string;
        }
      | {
          type: "CARD_MOVED";
          cardId: string;
          x: number;
          y: number;
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

declare global {
  interface Liveblocks {
    Presence: {
      cursor: {
        x: number;
        y: number;
      } | null;
      selectedCardId: string | null;
      isDragging: boolean;
    };
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
    UserMeta: {
      id: string;
      info: {
        name?: string;
        avatar?: string;
        color: string;
      };
    };
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
    ThreadMetadata: {};
    RoomInfo: {
      title?: string;
    };
  }
}
export {};
//# sourceMappingURL=config.d.ts.map

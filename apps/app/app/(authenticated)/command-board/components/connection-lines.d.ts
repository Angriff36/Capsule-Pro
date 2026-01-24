import type { CardConnection, CommandBoardCard } from "../types";
type ConnectionLinesProps = {
  cards: CommandBoardCard[];
  connections: CardConnection[];
  className?: string;
  onConnectionClick?: (connectionId: string) => void;
  selectedConnectionId?: string;
};
/**
 * ConnectionLines - Renders SVG connection lines between cards
 *
 * Shows relationships between entities with colored lines and relationship type indicators.
 * Lines update in real-time as cards move.
 */
export declare const ConnectionLines: import("react").NamedExoticComponent<ConnectionLinesProps>;
//# sourceMappingURL=connection-lines.d.ts.map

import type { PrepListGenerationResult } from "./actions";
type PrepListClientProps = {
  eventId: string;
  initialPrepList: PrepListGenerationResult | null;
  availableEvents: Array<{
    id: string;
    title: string;
    eventDate: Date;
    guestCount: number;
  }>;
};
export declare function PrepListClient({
  eventId,
  initialPrepList,
  availableEvents,
}: PrepListClientProps): import("react").JSX.Element;
//# sourceMappingURL=prep-list-client.d.ts.map

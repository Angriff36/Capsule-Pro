import { type StaffMember, type TimelineTask } from "../types";
type TimelineProps = {
  eventId: string;
  eventDate: Date;
  initialTasks: TimelineTask[];
  initialStaff: StaffMember[];
};
export declare function Timeline({
  eventId,
  eventDate,
  initialTasks,
  initialStaff,
}: TimelineProps): import("react").JSX.Element;
//# sourceMappingURL=timeline.d.ts.map

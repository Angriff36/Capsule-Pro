import type { TimelineTask } from "../types";
type DependencyLinesProps = {
  tasks: TimelineTask[];
  eventDate: Date;
  showDependencies: boolean;
  zoom: number;
  taskPositions: Map<
    string,
    {
      left: number;
      top: number;
      width: number;
      height: number;
    }
  >;
};
export declare function DependencyLines({
  tasks,
  eventDate,
  showDependencies,
  zoom,
  taskPositions,
}: DependencyLinesProps): import("react").JSX.Element | null;
//# sourceMappingURL=dependency-lines.d.ts.map

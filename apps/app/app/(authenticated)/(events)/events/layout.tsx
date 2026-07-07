import type { ReactNode } from "react";

interface EventsLayoutProperties {
  readonly children: ReactNode;
}

const EventsLayout = ({ children }: EventsLayoutProperties) => <>{children}</>;

export default EventsLayout;

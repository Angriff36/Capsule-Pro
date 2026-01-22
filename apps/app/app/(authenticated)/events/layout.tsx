import type { ReactNode } from "react";

type EventsLayoutProperties = {
  readonly children: ReactNode;
};

const EventsLayout = ({ children }: EventsLayoutProperties) => <>{children}</>;

export default EventsLayout;

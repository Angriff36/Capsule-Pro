"use client";

import * as React from "react";

interface EventsWizardContextValue {
  isOpen: boolean;
  openWizard: () => void;
  closeWizard: () => void;
}

const EventsWizardContext = React.createContext<
  EventsWizardContextValue | undefined
>(undefined);

export function EventsWizardProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  const openWizard = React.useCallback(() => setIsOpen(true), []);
  const closeWizard = React.useCallback(() => setIsOpen(false), []);

  return (
    <EventsWizardContext.Provider value={{ isOpen, openWizard, closeWizard }}>
      {children}
    </EventsWizardContext.Provider>
  );
}

export function useEventsWizard() {
  const context = React.useContext(EventsWizardContext);
  if (!context) {
    throw new Error(
      "useEventsWizard must be used within an EventsWizardProvider"
    );
  }
  return context;
}

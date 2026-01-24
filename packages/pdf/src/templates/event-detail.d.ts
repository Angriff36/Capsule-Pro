import type React from "react";
type EventDetailPDFProps = {
  data: {
    event: {
      id: string;
      name: string;
      date: Date | string;
      type: string;
      status: string;
      guestCount: number;
      venue: string | null;
      address: string | null;
      budget: number | null;
      notes: string | null;
      tags: string[];
    };
    dishes?: Array<{
      name: string;
      servings: number;
      instructions: string | null;
    }>;
    tasks?: Array<{
      title: string;
      assignee: string | null;
      startTime: string;
      endTime: string;
      status: string;
      priority: string;
      notes: string | null;
    }>;
    guests?: Array<{
      name: string;
      dietaryRestrictions: string | null;
      mealChoice: string | null;
      tableNumber: string | null;
    }>;
    staff?: Array<{
      name: string;
      role: string | null;
      assignments: number;
    }>;
    metadata: {
      generatedAt: Date;
      generatedBy: string;
      version: string;
    };
  };
};
export declare const EventDetailPDF: React.FC<EventDetailPDFProps>;
//# sourceMappingURL=event-detail.d.ts.map

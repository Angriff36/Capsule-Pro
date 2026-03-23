"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  CakeIcon,
  Building2Icon,
  HeartIcon,
  PartyPopperIcon,
  UsersIcon,
  BriefcaseIcon,
  GraduationCapIcon,
  StarIcon,
} from "lucide-react";

export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  eventType: string;
  defaultGuestCount: number;
  defaultServiceStyle: string;
  defaultDuration: number; // hours
  suggestedStaffRatio: string;
  defaultMenuSuggestions: string[];
  defaultStaffing: {
    servers: number;
    bartenders: number;
    chefs: number;
    setupCrew: number;
  };
  tags: string[];
  category: "social" | "corporate" | "specialty";
}

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: "wedding-reception",
    name: "Wedding Reception",
    description: "Full-service wedding catering with cocktail hour, dinner service, and late-night snacks",
    icon: <HeartIcon className="h-6 w-6" />,
    eventType: "wedding",
    defaultGuestCount: 150,
    defaultServiceStyle: "plated",
    defaultDuration: 6,
    suggestedStaffRatio: "1 server per 15 guests",
    defaultMenuSuggestions: [
      "Cocktail hour appetizers (6-8 passed items)",
      "Salad course",
      "Entree with two protein options",
      "Wedding cake cutting",
      "Late-night snack station",
    ],
    defaultStaffing: {
      servers: 10,
      bartenders: 3,
      chefs: 4,
      setupCrew: 6,
    },
    tags: ["premium", "full-service", "celebration"],
    category: "social",
  },
  {
    id: "corporate-lunch",
    name: "Corporate Lunch",
    description: "Business lunch with professional presentation and efficient service",
    icon: <Building2Icon className="h-6 w-6" />,
    eventType: "corporate",
    defaultGuestCount: 50,
    defaultServiceStyle: "buffet",
    defaultDuration: 2,
    suggestedStaffRatio: "1 server per 25 guests",
    defaultMenuSuggestions: [
      "Assorted sandwiches and wraps",
      "Side salads (2 options)",
      "Fresh fruit platter",
      "Assorted beverages",
      "Dessert selection",
    ],
    defaultStaffing: {
      servers: 2,
      bartenders: 0,
      chefs: 1,
      setupCrew: 2,
    },
    tags: ["professional", "efficient", "business"],
    category: "corporate",
  },
  {
    id: "birthday-party",
    name: "Birthday Party",
    description: "Celebratory event with festive food and fun presentation",
    icon: <CakeIcon className="h-6 w-6" />,
    eventType: "birthday",
    defaultGuestCount: 40,
    defaultServiceStyle: "buffet",
    defaultDuration: 4,
    suggestedStaffRatio: "1 server per 20 guests",
    defaultMenuSuggestions: [
      "Party appetizers",
      "Main dish options",
      "Birthday cake",
      "Party favors/snacks",
      "Beverage station",
    ],
    defaultStaffing: {
      servers: 2,
      bartenders: 1,
      chefs: 1,
      setupCrew: 2,
    },
    tags: ["celebration", "casual", "fun"],
    category: "social",
  },
  {
    id: "holiday-party",
    name: "Holiday Party",
    description: "Festive seasonal celebration with themed menu and decor",
    icon: <PartyPopperIcon className="h-6 w-6" />,
    eventType: "holiday",
    defaultGuestCount: 75,
    defaultServiceStyle: "stations",
    defaultDuration: 4,
    suggestedStaffRatio: "1 server per 20 guests",
    defaultMenuSuggestions: [
      "Seasonal appetizer stations",
      "Carving station",
      "Holiday-themed desserts",
      "Specialty cocktails",
      "Late-night snacks",
    ],
    defaultStaffing: {
      servers: 4,
      bartenders: 2,
      chefs: 2,
      setupCrew: 4,
    },
    tags: ["seasonal", "festive", "celebration"],
    category: "social",
  },
  {
    id: "conference-catering",
    name: "Conference Catering",
    description: "Multi-day conference with breakfast, lunch, and break services",
    icon: <UsersIcon className="h-6 w-6" />,
    eventType: "conference",
    defaultGuestCount: 200,
    defaultServiceStyle: "buffet",
    defaultDuration: 8,
    suggestedStaffRatio: "1 server per 30 guests",
    defaultMenuSuggestions: [
      "Continental breakfast",
      "Morning break (coffee, pastries)",
      "Buffet lunch with dietary options",
      "Afternoon break (snacks, beverages)",
      "Dinner service (if applicable)",
    ],
    defaultStaffing: {
      servers: 7,
      bartenders: 1,
      chefs: 3,
      setupCrew: 4,
    },
    tags: ["multi-day", "professional", "large-scale"],
    category: "corporate",
  },
  {
    id: "business-dinner",
    name: "Business Dinner",
    description: "Executive dining experience with refined service and presentation",
    icon: <BriefcaseIcon className="h-6 w-6" />,
    eventType: "corporate",
    defaultGuestCount: 25,
    defaultServiceStyle: "plated",
    defaultDuration: 3,
    suggestedStaffRatio: "1 server per 5 guests",
    defaultMenuSuggestions: [
      "Passed hors d'oeuvres",
      "First course (soup or salad)",
      "Entree with premium proteins",
      "Dessert course",
      "Coffee and digestifs",
    ],
    defaultStaffing: {
      servers: 5,
      bartenders: 1,
      chefs: 2,
      setupCrew: 2,
    },
    tags: ["premium", "executive", "refined"],
    category: "corporate",
  },
  {
    id: "graduation-party",
    name: "Graduation Party",
    description: "Celebratory event honoring academic achievement",
    icon: <GraduationCapIcon className="h-6 w-6" />,
    eventType: "graduation",
    defaultGuestCount: 60,
    defaultServiceStyle: "buffet",
    defaultDuration: 4,
    suggestedStaffRatio: "1 server per 20 guests",
    defaultMenuSuggestions: [
      "Graduation-themed appetizers",
      "Main buffet with variety",
      "Celebration cake",
      "Photo booth snacks",
      "Refreshment station",
    ],
    defaultStaffing: {
      servers: 3,
      bartenders: 1,
      chefs: 1,
      setupCrew: 3,
    },
    tags: ["celebration", "milestone", "casual"],
    category: "social",
  },
  {
    id: "vip-event",
    name: "VIP/Exclusive Event",
    description: "High-end experience with white-glove service and premium offerings",
    icon: <StarIcon className="h-6 w-6" />,
    eventType: "vip",
    defaultGuestCount: 30,
    defaultServiceStyle: "plated",
    defaultDuration: 4,
    suggestedStaffRatio: "1 server per 4 guests",
    defaultMenuSuggestions: [
      "Chef's choice amuse-bouche",
      "Multi-course tasting menu",
      "Wine pairings",
      "Premium dessert selection",
      "After-dinner cordials",
    ],
    defaultStaffing: {
      servers: 8,
      bartenders: 2,
      chefs: 3,
      setupCrew: 3,
    },
    tags: ["premium", "exclusive", "white-glove"],
    category: "specialty",
  },
];

interface EventTemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: EventTemplate) => void;
}

const categoryColors = {
  social: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  corporate: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  specialty: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export function EventTemplateSelector({
  open,
  onOpenChange,
  onSelectTemplate,
}: EventTemplateSelectorProps) {
  const groupedTemplates = EVENT_TEMPLATES.reduce(
    (acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = [];
      }
      acc[template.category].push(template);
      return acc;
    },
    {} as Record<string, EventTemplate[]>
  );

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>Choose an Event Template</DialogTitle>
          <DialogDescription>
            Select a template to pre-populate your event with recommended settings,
            menu suggestions, and staffing levels. You can customize everything after.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {Object.entries(groupedTemplates).map(([category, templates]) => (
            <div key={category}>
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-lg capitalize">
                {category === "social" && <HeartIcon className="h-5 w-5" />}
                {category === "corporate" && <Building2Icon className="h-5 w-5" />}
                {category === "specialty" && <StarIcon className="h-5 w-5" />}
                {category} Events
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {templates.map((template) => (
                  <Card
                    className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                    key={template.id}
                    onClick={() => {
                      onSelectTemplate(template);
                      onOpenChange(false);
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">
                            {template.icon}
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              {template.name}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {template.defaultGuestCount} guests •{" "}
                              {template.defaultDuration}h •{" "}
                              {template.defaultServiceStyle}
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {template.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {template.tags.map((tag) => (
                          <Badge
                            className="text-xs"
                            key={tag}
                            variant="secondary"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Staffing:</span>{" "}
                        {template.suggestedStaffRatio}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Start from Scratch
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function getTemplateDefaults(template: EventTemplate) {
  return {
    templateId: template.id,
    eventType: template.eventType,
    guestCount: template.defaultGuestCount,
    serviceStyle: template.defaultServiceStyle,
    duration: template.defaultDuration,
    menuSuggestions: template.defaultMenuSuggestions,
    staffing: template.defaultStaffing,
    tags: template.tags,
  };
}

/**
 * Get menu suggestions for a given template ID.
 * Returns null if template ID is not found.
 */
export function getTemplateMenuSuggestions(templateId: string | null): string[] | null {
  if (!templateId) {
    return null;
  }
  const template = EVENT_TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    return null;
  }
  return template.defaultMenuSuggestions;
}

/**
 * Get full template by ID.
 * Returns null if template ID is not found.
 */
export function getTemplateById(templateId: string | null): EventTemplate | null {
  if (!templateId) {
    return null;
  }
  return EVENT_TEMPLATES.find((t) => t.id === templateId) ?? null;
}

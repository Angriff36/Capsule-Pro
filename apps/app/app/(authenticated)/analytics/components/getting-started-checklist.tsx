"use client";

import {
  type ChecklistItem,
  GettingStartedChecklist,
} from "@repo/design-system/components/blocks/getting-started-checklist";
import { useCallback } from "react";

interface GettingStartedChecklistWrapperProps {
  /** Whether the user has at least one event */
  hasEvents: boolean;
  /** Whether the user has at least one client */
  hasClients: boolean;
  /** Whether the user has at least one inventory item */
  hasInventory: boolean;
  /** Whether the user has at least one recipe */
  hasRecipes: boolean;
  /** Whether the user has invited team members */
  hasTeamMembers: boolean;
}

export default function GettingStartedChecklistWrapper({
  hasEvents,
  hasClients,
  hasInventory,
  hasRecipes,
  hasTeamMembers,
}: GettingStartedChecklistWrapperProps) {
  const items: ChecklistItem[] = [
    {
      id: "add-client",
      label: "Add your first client",
      description:
        "Start building your client database to manage events and relationships",
      href: "/crm/clients/new",
      completed: hasClients,
    },
    {
      id: "create-event",
      label: "Create your first event",
      description:
        "Set up an event with details like date, guest count, and venue",
      href: "/events/new",
      completed: hasEvents,
    },
    {
      id: "add-inventory",
      label: "Add inventory items",
      description:
        "Track stock levels and costs for your ingredients and supplies",
      href: "/inventory/items",
      completed: hasInventory,
    },
    {
      id: "add-recipe",
      label: "Create a recipe",
      description: "Standardize dishes and calculate accurate food costs",
      href: "/recipes/new",
      completed: hasRecipes,
    },
    {
      id: "invite-team",
      label: "Invite your team",
      description:
        "Add team members to collaborate on events, prep tasks, and more",
      href: "/settings/team",
      completed: hasTeamMembers,
    },
  ];

  const allCompleted = items.every((item) => item.completed);

  // Don't show if all items are completed
  if (allCompleted) {
    return null;
  }

  const handleShareProgress = useCallback(
    async (itemsToShare: ChecklistItem[]): Promise<string | null> => {
      try {
        const response = await fetch("/api/onboarding/progress/share", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: itemsToShare.map((item) => ({
              id: item.id,
              label: item.label,
              completed: item.completed,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create share link");
        }

        const data = await response.json();
        const baseUrl = window.location.origin;
        return `${baseUrl}${data.data.shareUrl}`;
      } catch (error) {
        console.error("Error sharing progress:", error);
        return null;
      }
    },
    []
  );

  return (
    <GettingStartedChecklist
      defaultOpen={true}
      items={items}
      onShareProgress={handleShareProgress}
      showShareButton={true}
      subtitle="Complete these tasks to get the most out of Capsule"
      title="Getting Started"
    />
  );
}

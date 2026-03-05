"use server";

/**
 * Communication Preferences Server Actions
 *
 * Server actions for managing client communication preferences
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type {
  CommunicationChannel,
  CommunicationContentType,
  CommunicationFrequency,
  CommunicationPreferences,
  DayOfWeek,
  TimePreference,
} from "@repo/database";
import { defaultCommunicationPreferences } from "@repo/database";
import { revalidatePath } from "next/cache";
import { invariant } from "@/app/lib/invariant";
import { getTenantId } from "@/app/lib/tenant";

/**
 * Get communication preferences for a client
 */
export async function getClientCommunicationPreferences(
  clientId: string
): Promise<CommunicationPreferences> {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(clientId, "Client ID is required");

  // Verify client exists
  const client = await database.client.findFirst({
    where: {
      AND: [{ tenantId }, { id: clientId }, { deletedAt: null }],
    },
  });

  invariant(client, "Client not found");

  // Get communication preferences
  const preferences = await database.clientPreference.findFirst({
    where: {
      AND: [
        { tenantId },
        { clientId },
        { preferenceType: "communication" },
        { preferenceKey: "communication.full" },
        { deletedAt: null },
      ],
    },
  });

  if (preferences?.preferenceValue) {
    try {
      const parsed =
        typeof preferences.preferenceValue === "string"
          ? JSON.parse(preferences.preferenceValue)
          : preferences.preferenceValue;
      return parsed as CommunicationPreferences;
    } catch {
      // If parsing fails, return defaults
    }
  }

  // Return default preferences
  return defaultCommunicationPreferences;
}

/**
 * Update full communication preferences for a client
 */
export async function updateClientCommunicationPreferences(
  clientId: string,
  preferences: CommunicationPreferences
): Promise<CommunicationPreferences> {
  const { orgId, userId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(clientId, "Client ID is required");

  // Verify client exists
  const client = await database.client.findFirst({
    where: {
      AND: [{ tenantId }, { id: clientId }, { deletedAt: null }],
    },
  });

  invariant(client, "Client not found");

  // Check if preferences already exist
  const existing = await database.clientPreference.findFirst({
    where: {
      AND: [
        { tenantId },
        { clientId },
        { preferenceType: "communication" },
        { preferenceKey: "communication.full" },
        { deletedAt: null },
      ],
    },
  });

  if (existing) {
    // Update existing preference via Manifest runtime
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/crm/client-preferences/commands/update`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: existing.id,
          preferenceValue: JSON.stringify(preferences),
          notes: preferences.notes || "",
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Failed to update preferences");
    }
  } else {
    // Create new preference via Manifest runtime
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/crm/client-preferences/commands/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId,
          preferenceType: "communication",
          preferenceKey: "communication.full",
          preferenceValue: JSON.stringify(preferences),
          notes: preferences.notes || "",
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Failed to create preferences");
    }
  }

  revalidatePath(`/crm/clients/${clientId}`);

  return preferences;
}

/**
 * Update global opt-out status
 */
export async function updateClientGlobalOptOut(
  clientId: string,
  optOut: boolean
): Promise<CommunicationPreferences> {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const preferences = await getClientCommunicationPreferences(clientId);

  preferences.global.optOut = optOut;
  if (optOut) {
    preferences.global.optOutAt = new Date().toISOString();
  } else {
    delete preferences.global.optOutAt;
  }

  return updateClientCommunicationPreferences(clientId, preferences);
}

/**
 * Update channel enabled status
 */
export async function updateClientChannelEnabled(
  clientId: string,
  channel: CommunicationChannel,
  enabled: boolean
): Promise<CommunicationPreferences> {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const preferences = await getClientCommunicationPreferences(clientId);

  preferences[channel].enabled = enabled;

  return updateClientCommunicationPreferences(clientId, preferences);
}

/**
 * Update channel frequency
 */
export async function updateClientChannelFrequency(
  clientId: string,
  channel: CommunicationChannel,
  frequency: CommunicationFrequency
): Promise<CommunicationPreferences> {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const preferences = await getClientCommunicationPreferences(clientId);

  preferences[channel].frequency = frequency;

  return updateClientCommunicationPreferences(clientId, preferences);
}

/**
 * Update channel content types
 */
export async function updateClientChannelContentTypes(
  clientId: string,
  channel: CommunicationChannel,
  contentTypes: CommunicationContentType[]
): Promise<CommunicationPreferences> {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const preferences = await getClientCommunicationPreferences(clientId);

  preferences[channel].contentTypes = contentTypes;

  return updateClientCommunicationPreferences(clientId, preferences);
}

/**
 * Update channel timing preferences
 */
export async function updateClientChannelTiming(
  clientId: string,
  channel: CommunicationChannel,
  timing: TimePreference
): Promise<CommunicationPreferences> {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const preferences = await getClientCommunicationPreferences(clientId);

  preferences[channel].timing = timing;

  return updateClientCommunicationPreferences(clientId, preferences);
}

/**
 * Update channel allowed days
 */
export async function updateClientChannelAllowedDays(
  clientId: string,
  channel: CommunicationChannel,
  allowedDays: DayOfWeek[]
): Promise<CommunicationPreferences> {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const preferences = await getClientCommunicationPreferences(clientId);

  preferences[channel].allowedDays = allowedDays;

  return updateClientCommunicationPreferences(clientId, preferences);
}

/**
 * Update preferred channels order
 */
export async function updateClientPreferredChannels(
  clientId: string,
  preferredChannels: CommunicationChannel[]
): Promise<CommunicationPreferences> {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const preferences = await getClientCommunicationPreferences(clientId);

  preferences.global.preferredChannels = preferredChannels;

  return updateClientCommunicationPreferences(clientId, preferences);
}

/**
 * Reset client communication preferences to defaults
 */
export async function resetClientCommunicationPreferences(
  clientId: string
): Promise<CommunicationPreferences> {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  return updateClientCommunicationPreferences(
    clientId,
    defaultCommunicationPreferences
  );
}

/**
 * Check if communication is allowed for a client and content type
 */
export async function isCommunicationAllowed(
  clientId: string,
  contentType: CommunicationContentType
): Promise<boolean> {
  const preferences = await getClientCommunicationPreferences(clientId);

  // Check global opt-out
  if (preferences.global.optOut) {
    return false;
  }

  // Check each preferred channel
  for (const channel of preferences.global.preferredChannels || []) {
    if (preferences[channel].enabled) {
      if (preferences[channel].contentTypes.includes(contentType)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get the best channel for a content type
 */
export async function getBestChannelForContentType(
  clientId: string,
  contentType: CommunicationContentType
): Promise<CommunicationChannel | null> {
  const preferences = await getClientCommunicationPreferences(clientId);

  // Check global opt-out
  if (preferences.global.optOut) {
    return null;
  }

  // Check preferred channels in order
  for (const channel of preferences.global.preferredChannels || []) {
    if (
      preferences[channel].enabled &&
      preferences[channel].contentTypes.includes(contentType)
    ) {
      return channel;
    }
  }

  return null;
}

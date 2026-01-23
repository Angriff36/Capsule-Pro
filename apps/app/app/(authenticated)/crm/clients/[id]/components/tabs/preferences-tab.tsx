"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { TagIcon } from "lucide-react";

interface PreferencesTabProps {
  client: {
    preferences: Array<{
      id: string;
      preferenceType: string;
      preferenceKey: string;
      preferenceValue: unknown;
      notes: string | null;
    }>;
  };
}

export function PreferencesTab({ client }: PreferencesTabProps) {
  const formatValue = (value: unknown): string => {
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const groupedPreferences = client.preferences.reduce(
    (acc, pref) => {
      if (!acc[pref.preferenceType]) {
        acc[pref.preferenceType] = [];
      }
      acc[pref.preferenceType].push(pref);
      return acc;
    },
    {} as Record<string, typeof client.preferences>
  );

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">
        Client Preferences ({client.preferences.length})
      </h2>

      {client.preferences.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <TagIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No preferences set</h3>
            <p className="text-muted-foreground">
              Preferences can be added to track client-specific requirements and
              settings.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedPreferences).map(([type, prefs]) => (
            <div key={type}>
              <h3 className="text-lg font-medium mb-3 capitalize">{type}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prefs.map((pref) => (
                  <Card key={pref.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="secondary">{pref.preferenceKey}</Badge>
                      </div>
                      <div className="text-sm font-mono bg-muted p-2 rounded">
                        {formatValue(pref.preferenceValue)}
                      </div>
                      {pref.notes && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {pref.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.PreferencesTab = PreferencesTab;
const badge_1 = require("@repo/design-system/components/ui/badge");
const card_1 = require("@repo/design-system/components/ui/card");
const lucide_react_1 = require("lucide-react");
function PreferencesTab({ client }) {
  const formatValue = (value) => {
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };
  const groupedPreferences = client.preferences.reduce((acc, pref) => {
    if (!acc[pref.preferenceType]) {
      acc[pref.preferenceType] = [];
    }
    acc[pref.preferenceType].push(pref);
    return acc;
  }, {});
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">
        Client Preferences ({client.preferences.length})
      </h2>

      {client.preferences.length === 0 ? (
        <card_1.Card>
          <card_1.CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <lucide_react_1.TagIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No preferences set</h3>
            <p className="text-muted-foreground">
              Preferences can be added to track client-specific requirements and
              settings.
            </p>
          </card_1.CardContent>
        </card_1.Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedPreferences).map(([type, prefs]) => (
            <div key={type}>
              <h3 className="text-lg font-medium mb-3 capitalize">{type}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prefs.map((pref) => (
                  <card_1.Card key={pref.id}>
                    <card_1.CardContent className="py-4">
                      <div className="flex items-start justify-between mb-2">
                        <badge_1.Badge variant="secondary">
                          {pref.preferenceKey}
                        </badge_1.Badge>
                      </div>
                      <div className="text-sm font-mono bg-muted p-2 rounded">
                        {formatValue(pref.preferenceValue)}
                      </div>
                      {pref.notes && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {pref.notes}
                        </p>
                      )}
                    </card_1.CardContent>
                  </card_1.Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
export declare function PreferencesTab({
  client,
}: PreferencesTabProps): import("react").JSX.Element;
//# sourceMappingURL=preferences-tab.d.ts.map

"use client";

import { useState } from "react";
import { AutoSaveIndicator } from "./auto-save-indicator";

export function AutoSaveIndicatorExample() {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(new Date());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleSaveNow = () => {
    setIsSaving(true);
    // Simulate save operation
    setTimeout(() => {
      setIsSaving(false);
      setLastSavedAt(new Date());
      setHasUnsavedChanges(false);
    }, 1500);
  };

  // Simulate user typing
  const handleSimulateChanges = () => {
    setHasUnsavedChanges(true);
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Auto Save Indicator Example</h1>

      {/* Main Auto Save Indicator */}
      <AutoSaveIndicator
        isSaving={isSaving}
        lastSavedAt={lastSavedAt}
        hasUnsavedChanges={hasUnsavedChanges}
        onSaveNow={handleSaveNow}
      />

      {/* Controls to demonstrate different states */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={handleSimulateChanges}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Make unsaved changes
          </button>
          <button
            onClick={() => setHasUnsavedChanges(false)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            disabled={!hasUnsavedChanges}
          >
            Mark as saved
          </button>
          <button
            onClick={() => setLastSavedAt(null)}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear last saved time
          </button>
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <p>Current state:</p>
          <ul className="list-disc pl-5">
            <li>Saving: {isSaving ? "true" : "false"}</li>
            <li>Has unsaved changes: {hasUnsavedChanges ? "true" : "false"}</li>
            <li>Last saved: {lastSavedAt ? lastSavedAt.toLocaleString() : "Never"}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
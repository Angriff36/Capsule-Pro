"use client";

import { UploadIcon } from "lucide-react";
import { useSmartImport } from "./smart-import-provider";

/** Sits above the Next.js dev badge (bottom-left) and stays visible over page chrome. */
export function SmartImportFab() {
  const { openImport } = useSmartImport();

  return (
    <button
      aria-label="Open smart import"
      className="fixed bottom-20 left-6 z-[200] flex h-14 items-center gap-2.5 rounded-full border-2 border-primary/20 bg-primary px-5 text-primary-foreground shadow-2xl transition-transform hover:scale-[1.03] active:scale-[0.98]"
      onClick={openImport}
      type="button"
    >
      <UploadIcon className="h-6 w-6 shrink-0" />
      <span className="font-semibold text-sm tracking-wide">Import</span>
    </button>
  );
}

"use client";

import { UploadIcon } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { SmartImportDialog } from "./smart-import-dialog";

interface SmartImportContextValue {
  addFiles: (files: FileList | File[]) => void;
  openImport: () => void;
}

const SmartImportContext = createContext<SmartImportContextValue | null>(null);

export function useSmartImport() {
  const context = useContext(SmartImportContext);
  if (!context) {
    throw new Error("useSmartImport must be used within SmartImportProvider");
  }
  return context;
}

interface SmartImportProviderProps {
  readonly children: ReactNode;
}

const ALLOWED_EXTENSIONS = [
  ".csv",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".txt",
];

function isAllowedFile(file: File): boolean {
  const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
  return ALLOWED_EXTENSIONS.includes(ext);
}

export function SmartImportProvider({ children }: SmartImportProviderProps) {
  const [open, setOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const addFiles = useCallback((input: FileList | File[]) => {
    const incoming = Array.from(input).filter(isAllowedFile);
    if (incoming.length === 0) {
      return;
    }
    setPendingFiles((prev) => [...prev, ...incoming]);
    setOpen(true);
  }, []);

  const openImport = useCallback(() => {
    setOpen(true);
  }, []);

  useEffect(() => {
    let dragDepth = 0;

    const onDragEnter = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) {
        return;
      }
      event.preventDefault();
      dragDepth += 1;
      setDragActive(true);
    };

    const onDragLeave = (event: DragEvent) => {
      event.preventDefault();
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) {
        setDragActive(false);
      }
    };

    const onDragOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) {
        return;
      }
      event.preventDefault();
    };

    const onDrop = (event: DragEvent) => {
      event.preventDefault();
      dragDepth = 0;
      setDragActive(false);
      if (event.dataTransfer?.files?.length) {
        addFiles(event.dataTransfer.files);
      }
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);

    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [addFiles]);

  const value = useMemo(
    () => ({
      addFiles,
      openImport,
    }),
    [addFiles, openImport]
  );

  return (
    <SmartImportContext.Provider value={value}>
      {children}
      {dragActive && (
        <div className="pointer-events-none fixed inset-0 z-[150] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="rounded-xl border-2 border-dashed border-primary bg-background/90 px-8 py-6 text-center shadow-lg">
            <UploadIcon className="mx-auto mb-3 h-10 w-10 text-primary" />
            <p className="font-medium text-lg">Drop to import</p>
            <p className="text-muted-foreground text-sm">
              Recipes, events, ingredients, prep lists — we&apos;ll detect the
              format
            </p>
          </div>
        </div>
      )}
      <SmartImportDialog
        files={pendingFiles}
        onClear={() => setPendingFiles([])}
        onClose={() => setOpen(false)}
        open={open}
      />
    </SmartImportContext.Provider>
  );
}

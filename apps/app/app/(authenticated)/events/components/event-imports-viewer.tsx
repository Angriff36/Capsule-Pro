"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { useMemo, useState } from "react";
import { apiFetch, apiUrl } from "@/app/lib/api";

interface ImportFile {
  id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  created_at: Date;
}

type CsvRow = string[];

const parseCsv = (input: string): CsvRow[] => {
  const rows: CsvRow[] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    if (row.some((value) => value.trim().length > 0)) {
      rows.push(row);
    }
    row = [];
  };

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const nextChar = input[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      pushField();
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      pushField();
      pushRow();
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }

  return rows;
};

export const EventImportsViewer = ({ imports }: { imports: ImportFile[] }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<CsvRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  const current = useMemo(
    () => imports.find((file) => file.id === openId) ?? null,
    [imports, openId]
  );

  const handleOpen = async (file: ImportFile) => {
    setOpenId(file.id);
    setCsvData(null);

    if (!file.mime_type.includes("csv")) {
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch(
        `/api/events/imports/${file.id}?inline=1`
      );
      const text = await response.text();
      setCsvData(parseCsv(text));
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setOpenId(null);
    setCsvData(null);
  };

  return (
    <>
      <div className="grid gap-3">
        {imports.map((file) => (
          <div
            className="flex flex-wrap items-center justify-between gap-4 rounded-lg border px-4 py-3"
            key={file.id}
          >
            <div className="flex flex-col">
              <span className="font-medium">{file.file_name}</span>
              <span className="text-muted-foreground text-xs">
                {file.mime_type} · {(file.file_size / 1024).toFixed(1)} KB
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleOpen(file)}
                size="sm"
                variant="secondary"
              >
                View
              </Button>
              <Button asChild size="sm" variant="ghost">
                <a href={apiUrl(`/api/events/imports/${file.id}`)}>Download</a>
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Dialog onOpenChange={close} open={Boolean(current)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{current?.file_name}</DialogTitle>
          </DialogHeader>
          {(() => {
            if (!current) {
              return null;
            }

            if (current.mime_type.includes("pdf")) {
              return (
                <iframe
                  className="h-[70vh] w-full rounded-md border"
                  src={apiUrl(`/api/events/imports/${current.id}?inline=1`)}
                  title={current.file_name}
                />
              );
            }

            if (current.mime_type.startsWith("image/")) {
              return (
                <div className="flex max-h-[70vh] w-full items-center justify-center overflow-auto rounded-md border p-4">
                  <img
                    alt={current.file_name}
                    className="max-h-[65vh] w-auto rounded-md"
                    src={apiUrl(`/api/events/imports/${current.id}?inline=1`)}
                  />
                </div>
              );
            }

            if (loading) {
              return (
                <div className="flex h-[40vh] items-center justify-center">
                  <Spinner />
                </div>
              );
            }

            return (
              <ScrollArea className="h-[70vh] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {(csvData?.[0] ?? []).map((header) => (
                        <TableHead key={header}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(csvData ?? []).slice(1).map((row, rowIndex) => (
                      <TableRow key={`${rowIndex}-${row.join("-")}`}>
                        {row.map((value) => (
                          <TableCell key={`${rowIndex}-${value}`}>
                            {value}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
};

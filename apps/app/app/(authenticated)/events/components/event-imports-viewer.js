"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.EventImportsViewer = void 0;
const button_1 = require("@repo/design-system/components/ui/button");
const dialog_1 = require("@repo/design-system/components/ui/dialog");
const scroll_area_1 = require("@repo/design-system/components/ui/scroll-area");
const spinner_1 = require("@repo/design-system/components/ui/spinner");
const table_1 = require("@repo/design-system/components/ui/table");
const react_1 = require("react");
const parseCsv = (input) => {
  const rows = [];
  let field = "";
  let row = [];
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
const EventImportsViewer = ({ imports }) => {
  const [openId, setOpenId] = (0, react_1.useState)(null);
  const [csvData, setCsvData] = (0, react_1.useState)(null);
  const [loading, setLoading] = (0, react_1.useState)(false);
  const current = (0, react_1.useMemo)(
    () => imports.find((file) => file.id === openId) ?? null,
    [imports, openId]
  );
  const handleOpen = async (file) => {
    setOpenId(file.id);
    setCsvData(null);
    if (!file.mime_type.includes("csv")) {
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/events/imports/${file.id}?inline=1`);
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
              <button_1.Button
                onClick={() => handleOpen(file)}
                size="sm"
                variant="secondary"
              >
                View
              </button_1.Button>
              <button_1.Button asChild size="sm" variant="ghost">
                <a href={`/api/events/imports/${file.id}`}>Download</a>
              </button_1.Button>
            </div>
          </div>
        ))}
      </div>
      <dialog_1.Dialog onOpenChange={close} open={Boolean(current)}>
        <dialog_1.DialogContent className="max-w-4xl">
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>{current?.file_name}</dialog_1.DialogTitle>
          </dialog_1.DialogHeader>
          {(() => {
            if (!current) {
              return null;
            }
            if (current.mime_type.includes("pdf")) {
              return (
                <iframe
                  className="h-[70vh] w-full rounded-md border"
                  src={`/api/events/imports/${current.id}?inline=1`}
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
                    src={`/api/events/imports/${current.id}?inline=1`}
                  />
                </div>
              );
            }
            if (loading) {
              return (
                <div className="flex h-[40vh] items-center justify-center">
                  <spinner_1.Spinner />
                </div>
              );
            }
            return (
              <scroll_area_1.ScrollArea className="h-[70vh] rounded-md border">
                <table_1.Table>
                  <table_1.TableHeader>
                    <table_1.TableRow>
                      {(csvData?.[0] ?? []).map((header) => (
                        <table_1.TableHead key={header}>
                          {header}
                        </table_1.TableHead>
                      ))}
                    </table_1.TableRow>
                  </table_1.TableHeader>
                  <table_1.TableBody>
                    {(csvData ?? []).slice(1).map((row, rowIndex) => (
                      <table_1.TableRow key={`${rowIndex}-${row.join("-")}`}>
                        {row.map((value) => (
                          <table_1.TableCell key={`${rowIndex}-${value}`}>
                            {value}
                          </table_1.TableCell>
                        ))}
                      </table_1.TableRow>
                    ))}
                  </table_1.TableBody>
                </table_1.Table>
              </scroll_area_1.ScrollArea>
            );
          })()}
        </dialog_1.DialogContent>
      </dialog_1.Dialog>
    </>
  );
};
exports.EventImportsViewer = EventImportsViewer;

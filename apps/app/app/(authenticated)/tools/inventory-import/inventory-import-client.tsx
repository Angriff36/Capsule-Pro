"use client";

import { Upload } from "lucide-react";
import { useCallback, useState } from "react";
import * as XLSX from "xlsx";

interface PreviewRow {
  category: string;
  item_number: string;
  name: string;
  price: string;
  quantity: string;
  tags: string;
}

type ImportState = "idle" | "preview" | "importing" | "done" | "error";

export function InventoryImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [state, setState] = useState<ImportState>("idle");
  const [result, setResult] = useState<{
    created: number;
    updated: number;
    errors: number;
    total: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (
      dropped &&
      (dropped.name.endsWith(".xlsx") || dropped.name.endsWith(".xls"))
    ) {
      processFile(dropped);
    } else {
      setErrorMsg("Drop a .xlsx or .xls file");
      setState("error");
    }
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) {
        processFile(selected);
      }
    },
    []
  );

  async function processFile(f: File) {
    setFile(f);
    setErrorMsg("");
    setResult(null);

    const arrayBuffer = await f.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const wb = XLSX.read(buffer, { type: "array", cellDates: true });
    const ws = wb.Sheets["Inventory"];

    if (!ws) {
      setErrorMsg("Sheet 'Inventory' not found");
      setState("error");
      return;
    }

    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
    }) as unknown[][];

    if (raw.length < 5) {
      setErrorMsg("File has no data rows");
      setState("error");
      return;
    }

    const headers = raw[3];
    const colIndex: Record<string, number> = {};
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i] ?? "").trim();
      if (h) {
        colIndex[h] = i;
      }
    }

    const rows: PreviewRow[] = [];
    for (let i = 4; i < Math.min(raw.length, 9); i++) {
      const row = raw[i];
      const productId = String(row[colIndex["Product ID"]] ?? "").trim();
      if (!productId || productId === "undefined" || productId === "null") {
        continue;
      }

      const name = String(row[colIndex["Title"]] ?? "").trim();
      const primaryCat = String(row[colIndex["Primary Category"]] ?? "").trim();
      const subCat = String(row[colIndex["Sub Category"]] ?? "").trim();
      const category = primaryCat || subCat || "Uncategorized";

      const inStock = row[colIndex["In Stock"]] ?? "";
      const flatFee = row[colIndex["Flat Fee Price"]] ?? "";

      const tagKeys = [
        "Attr::Color",
        "Attr::Material",
        "Attr::Size",
        "Attr::Style",
        "Attr::Shape",
        "Attr::Type",
      ];
      const tags: string[] = [];
      for (const key of tagKeys) {
        const val = row[colIndex[key]];
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          tags.push(String(val).trim());
        }
      }

      rows.push({
        item_number: productId,
        name: name || productId,
        category,
        quantity: String(inStock),
        price: String(flatFee),
        tags: tags.join(", ") || "—",
      });
    }

    setPreview(rows);
    setState("preview");
  }

  async function handleImport() {
    if (!file) {
      return;
    }
    setState("importing");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/inventory/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data);
        setState("done");
      } else {
        setErrorMsg(data.error ?? "Import failed");
        setState("error");
      }
    } catch {
      setErrorMsg("Network error during import");
      setState("error");
    }
  }

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        className="cursor-pointer rounded-lg border-2 border-white/20 border-dashed p-12 text-center transition-colors hover:border-white/40"
        onClick={() => document.getElementById("file-input")?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto mb-4 h-10 w-10 text-white/40" />
        <p className="text-sm text-white/70">
          Drag and drop your Goodshuffle export (.xlsx) here, or click to browse
        </p>
        <input
          accept=".xlsx,.xls"
          className="hidden"
          id="file-input"
          onChange={handleFileInput}
          type="file"
        />
      </div>

      {/* File selected */}
      {file && state !== "idle" && (
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
          <div>
            <p className="font-medium text-white">{file.name}</p>
            <p className="text-sm text-white/50">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <button
            className="text-sm text-white/50 transition-colors hover:text-white"
            onClick={() => {
              setState("idle");
              setFile(null);
              setPreview([]);
              setResult(null);
              setErrorMsg("");
            }}
          >
            Remove
          </button>
        </div>
      )}

      {/* Error */}
      {state === "error" && errorMsg && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-red-400 text-sm">{errorMsg}</p>
        </div>
      )}

      {/* Preview table */}
      {state === "preview" && preview.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="mb-1 font-medium text-sm text-white/70">
              Preview (first 5 rows)
            </h3>
            <p className="text-white/40 text-xs">
              {preview.length} rows shown from file
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-white/10 border-b">
                  <th className="py-2 pr-4 text-left font-medium text-white/50">
                    Product ID
                  </th>
                  <th className="py-2 pr-4 text-left font-medium text-white/50">
                    Name
                  </th>
                  <th className="py-2 pr-4 text-left font-medium text-white/50">
                    Category
                  </th>
                  <th className="py-2 pr-4 text-right font-medium text-white/50">
                    Qty
                  </th>
                  <th className="py-2 pr-4 text-right font-medium text-white/50">
                    Price
                  </th>
                  <th className="py-2 text-left font-medium text-white/50">
                    Tags
                  </th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr className="border-white/5 border-b" key={i}>
                    <td className="py-2 pr-4 font-mono text-white/70">
                      {row.item_number}
                    </td>
                    <td className="py-2 pr-4 text-white">{row.name}</td>
                    <td className="py-2 pr-4 text-white/70">{row.category}</td>
                    <td className="py-2 pr-4 text-right text-white/70">
                      {row.quantity}
                    </td>
                    <td className="py-2 pr-4 text-right text-white/70">
                      ${row.price}
                    </td>
                    <td className="py-2 text-white/50 text-xs">{row.tags}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            className="rounded-md bg-white px-6 py-2 font-medium text-black transition-colors hover:bg-white/90"
            onClick={handleImport}
          >
            Import {preview.length} items
          </button>
        </div>
      )}

      {/* Importing spinner */}
      {state === "importing" && (
        <div className="flex items-center gap-3 text-white/70">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
          <span className="text-sm">Importing...</span>
        </div>
      )}

      {/* Done */}
      {state === "done" && result && (
        <div className="space-y-2 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <p className="font-medium text-green-400">Import complete</p>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-white/50">Total</p>
              <p className="font-mono text-white">{result.total}</p>
            </div>
            <div>
              <p className="text-white/50">Created</p>
              <p className="font-mono text-green-400">{result.created}</p>
            </div>
            <div>
              <p className="text-white/50">Updated</p>
              <p className="font-mono text-yellow-400">{result.updated}</p>
            </div>
            <div>
              <p className="text-white/50">Errors</p>
              <p className="font-mono text-red-400">{result.errors}</p>
            </div>
          </div>
          <button
            className="mt-2 text-sm text-white/50 transition-colors hover:text-white"
            onClick={() => {
              setState("idle");
              setFile(null);
              setPreview([]);
              setResult(null);
            }}
          >
            Import another file
          </button>
        </div>
      )}
    </div>
  );
}

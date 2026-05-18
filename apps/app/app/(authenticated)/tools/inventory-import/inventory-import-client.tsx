"use client";

import { useCallback, useState } from "react";
import { Upload } from "lucide-react";
import * as XLSX from "xlsx";

interface PreviewRow {
  item_number: string;
  name: string;
  category: string;
  quantity: string;
  price: string;
  tags: string;
}

type ImportState = "idle" | "preview" | "importing" | "done" | "error";

export function InventoryImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [state, setState] = useState<ImportState>("idle");
  const [result, setResult] = useState<{ created: number; updated: number; errors: number; total: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.name.endsWith(".xlsx") || dropped.name.endsWith(".xls"))) {
      processFile(dropped);
    } else {
      setErrorMsg("Drop a .xlsx or .xls file");
      setState("error");
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) processFile(selected);
  }, []);

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

    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][];

    if (raw.length < 5) {
      setErrorMsg("File has no data rows");
      setState("error");
      return;
    }

    const headers = raw[3];
    const colIndex: Record<string, number> = {};
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i] ?? "").trim();
      if (h) colIndex[h] = i;
    }

    const rows: PreviewRow[] = [];
    for (let i = 4; i < Math.min(raw.length, 9); i++) {
      const row = raw[i];
      const productId = String(row[colIndex["Product ID"]] ?? "").trim();
      if (!productId || productId === "undefined" || productId === "null") continue;

      const name = String(row[colIndex["Title"]] ?? "").trim();
      const primaryCat = String(row[colIndex["Primary Category"]] ?? "").trim();
      const subCat = String(row[colIndex["Sub Category"]] ?? "").trim();
      const category = primaryCat || subCat || "Uncategorized";

      const inStock = row[colIndex["In Stock"]] ?? "";
      const flatFee = row[colIndex["Flat Fee Price"]] ?? "";

      const tagKeys = ["Attr::Color", "Attr::Material", "Attr::Size", "Attr::Style", "Attr::Shape", "Attr::Type"];
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
    if (!file) return;
    setState("importing");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/inventory/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Import failed");
        setState("error");
      } else {
        setResult(data);
        setState("done");
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
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-white/20 rounded-lg p-12 text-center hover:border-white/40 transition-colors cursor-pointer"
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <Upload className="mx-auto h-10 w-10 text-white/40 mb-4" />
        <p className="text-white/70 text-sm">
          Drag and drop your Goodshuffle export (.xlsx) here, or click to browse
        </p>
        <input
          id="file-input"
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {/* File selected */}
      {file && state !== "idle" && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-white">{file.name}</p>
            <p className="text-sm text-white/50">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button
            onClick={() => { setState("idle"); setFile(null); setPreview([]); setResult(null); setErrorMsg(""); }}
            className="text-sm text-white/50 hover:text-white transition-colors"
          >
            Remove
          </button>
        </div>
      )}

      {/* Error */}
      {state === "error" && errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400 text-sm">{errorMsg}</p>
        </div>
      )}

      {/* Preview table */}
      {state === "preview" && preview.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-white/70 mb-1">Preview (first 5 rows)</h3>
            <p className="text-xs text-white/40">{preview.length} rows shown from file</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 pr-4 text-white/50 font-medium">Product ID</th>
                  <th className="text-left py-2 pr-4 text-white/50 font-medium">Name</th>
                  <th className="text-left py-2 pr-4 text-white/50 font-medium">Category</th>
                  <th className="text-right py-2 pr-4 text-white/50 font-medium">Qty</th>
                  <th className="text-right py-2 pr-4 text-white/50 font-medium">Price</th>
                  <th className="text-left py-2 text-white/50 font-medium">Tags</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-2 pr-4 font-mono text-white/70">{row.item_number}</td>
                    <td className="py-2 pr-4 text-white">{row.name}</td>
                    <td className="py-2 pr-4 text-white/70">{row.category}</td>
                    <td className="py-2 pr-4 text-right text-white/70">{row.quantity}</td>
                    <td className="py-2 pr-4 text-right text-white/70">${row.price}</td>
                    <td className="py-2 text-white/50 text-xs">{row.tags}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleImport}
            className="bg-white text-black font-medium px-6 py-2 rounded-md hover:bg-white/90 transition-colors"
          >
            Import {preview.length} items
          </button>
        </div>
      )}

      {/* Importing spinner */}
      {state === "importing" && (
        <div className="flex items-center gap-3 text-white/70">
          <div className="h-5 w-5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
          <span className="text-sm">Importing...</span>
        </div>
      )}

      {/* Done */}
      {state === "done" && result && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-2">
          <p className="text-green-400 font-medium">Import complete</p>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-white/50">Total</p>
              <p className="text-white font-mono">{result.total}</p>
            </div>
            <div>
              <p className="text-white/50">Created</p>
              <p className="text-green-400 font-mono">{result.created}</p>
            </div>
            <div>
              <p className="text-white/50">Updated</p>
              <p className="text-yellow-400 font-mono">{result.updated}</p>
            </div>
            <div>
              <p className="text-white/50">Errors</p>
              <p className="text-red-400 font-mono">{result.errors}</p>
            </div>
          </div>
          <button
            onClick={() => { setState("idle"); setFile(null); setPreview([]); setResult(null); }}
            className="text-sm text-white/50 hover:text-white transition-colors mt-2"
          >
            Import another file
          </button>
        </div>
      )}
    </div>
  );
}
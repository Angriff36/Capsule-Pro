"use client";

import { Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react"
import { useEffect, useState } from "react";

// Print View — the global `@media print` rules in app/styles.css strip the nav,
// sidebar, and chrome; this just triggers the browser print dialog. That dialog's
// "Save as PDF" destination covers PDF export too, so there is no separate path.

export function PrintViewButton({
  className,
  label = "Print View",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <button
      className={
        className ??
        "no-print inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-sm hover:bg-primary/90"
      }
      onClick={() => window.print()}
      type="button"
    >
      <Printer className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

// Footer shown only when printing: a QR code that takes field staff (phone in
// hand, no laptop) back to the live entity. `path` is app-relative; resolved
// against the current origin after mount to keep the absolute URL out of SSR
// markup (avoids a hydration mismatch on the QR value).
export function PrintFooter({
  path,
  caption,
}: {
  path: string;
  caption: string;
}) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}${path}`;

  return (
    <footer className="mt-8 hidden items-center gap-4 border-black border-t pt-4 print:flex">
      <QRCodeSVG size={88} value={url || path} />
      <div className="text-xs">
        <p className="font-medium">Scan to open the live version</p>
        <p>{caption}</p>
        <p className="break-all text-[10px]">{url || path}</p>
      </div>
    </footer>
  );
}

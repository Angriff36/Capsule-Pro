"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface BarcodeScannerProps {
  onError?: (error: string) => void;
  onScan: (barcode: string) => void;
}

export function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(
    null
  );
  const lastScannedRef = useRef<string | null>(null);
  const containerId = "barcode-scanner-container";

  const startScanning = useCallback(async () => {
    if (scannerRef.current?.isScanning) {
      return;
    }

    try {
      setError(null);
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
        },
        (decodedText) => {
          if (decodedText === lastScannedRef.current) {
            return;
          }
          lastScannedRef.current = decodedText;
          setLastScannedBarcode(decodedText);
          onScan(decodedText);
        },
        () => {}
      );

      setIsScanning(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start camera";
      setError(message);
      onError?.(message);
    }
  }, [onScan, onError]);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  useEffect(
    () => () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    },
    []
  );

  return (
    <div className="space-y-4">
      <div
        className="mx-auto min-h-[300px] w-full max-w-md overflow-hidden rounded-lg bg-muted"
        id={containerId}
      />

      {error && <p className="text-center text-destructive text-sm">{error}</p>}

      <div className="flex justify-center gap-2">
        {isScanning ? (
          <Button onClick={stopScanning} variant="outline">
            <Square className="mr-2 h-4 w-4" />
            Stop Scanner
          </Button>
        ) : (
          <Button onClick={startScanning}>
            <Camera className="mr-2 h-4 w-4" />
            Start Scanner
          </Button>
        )}
      </div>
      {lastScannedBarcode && (
        <p className="text-center text-muted-foreground text-sm">
          Last scanned:{" "}
          <span className="font-medium font-mono text-foreground">
            {lastScannedBarcode}
          </span>
        </p>
      )}
    </div>
  );
}

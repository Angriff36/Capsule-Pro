"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@repo/design-system/components/ui/button";
import { Camera, Square } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
}

export function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const containerId = "barcode-scanner-container";

  const startScanning = useCallback(async () => {
    if (scannerRef.current?.isScanning) return;

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
          if (decodedText === lastScannedRef.current) return;
          lastScannedRef.current = decodedText;
          setLastScannedBarcode(decodedText);
          onScan(decodedText);
        },
        () => {}
      );

      setIsScanning(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start camera";
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

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div
        id={containerId}
        className="w-full max-w-md mx-auto bg-muted rounded-lg overflow-hidden min-h-[300px]"
      />

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      <div className="flex justify-center gap-2">
        {!isScanning ? (
          <Button onClick={startScanning}>
            <Camera className="h-4 w-4 mr-2" />
            Start Scanner
          </Button>
        ) : (
          <Button variant="outline" onClick={stopScanning}>
            <Square className="h-4 w-4 mr-2" />
            Stop Scanner
          </Button>
        )}
      </div>
      {lastScannedBarcode && (
        <p className="text-sm text-center text-muted-foreground">
          Last scanned: <span className="font-mono font-medium text-foreground">{lastScannedBarcode}</span>
        </p>
      )}
    </div>
  );
}

/**
 * @module SignaturePad
 * @intent Canvas-based signature capture component
 * @responsibility Render drawing canvas, capture signature data, handle clear/save/cancel actions
 * @domain Events
 * @tags signature, canvas, input
 * @canonical true
 */

"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { CheckIcon, PenIcon, RefreshCwIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type SignaturePadProps = {
  onSave: (
    signatureData: string,
    signerName: string,
    signerEmail?: string
  ) => void;
  onCancel: () => void;
  requireEmail?: boolean;
};

export function SignaturePad({
  onSave,
  onCancel,
  requireEmail = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [error, setError] = useState("");

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Set default styles
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getCoordinates = useCallback((event: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();

    let clientX: number;
    let clientY: number;

    if ("touches" in event) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const startDrawing = useCallback(
    (
      event:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>
    ) => {
      event.preventDefault();
      setIsDrawing(true);
      setError("");

      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      const coords = getCoordinates(event.nativeEvent);
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    },
    [getCoordinates]
  );

  const draw = useCallback(
    (
      event:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>
    ) => {
      event.preventDefault();

      if (!isDrawing) {
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      const coords = getCoordinates(event.nativeEvent);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      setHasSignature(true);
    },
    [isDrawing, getCoordinates]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setError("");
  }, []);

  const handleSave = useCallback(() => {
    if (!hasSignature) {
      setError("Please provide a signature");
      return;
    }

    if (!signerName.trim()) {
      setError("Please enter the signer's name");
      return;
    }

    if (requireEmail && !signerEmail.trim()) {
      setError("Please enter the signer's email");
      return;
    }

    if (
      requireEmail &&
      signerEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signerEmail)
    ) {
      setError("Please enter a valid email address");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const signatureData = canvas.toDataURL("image/png");
    onSave(signatureData, signerName.trim(), signerEmail.trim() || undefined);
  }, [hasSignature, signerName, signerEmail, requireEmail, onSave]);

  const handleCancel = useCallback(() => {
    clearCanvas();
    setSignerName("");
    setSignerEmail("");
    setError("");
    onCancel();
  }, [clearCanvas, onCancel]);

  return (
    <div className="flex flex-col gap-4">
      {/* Signer Information */}
      <div className="grid gap-3">
        <div className="grid gap-2">
          <Label htmlFor="signer-name">Signer Name *</Label>
          <Input
            id="signer-name"
            onChange={(e) => {
              setSignerName(e.target.value);
              setError("");
            }}
            placeholder="Enter full name"
            value={signerName}
          />
        </div>

        {requireEmail && (
          <div className="grid gap-2">
            <Label htmlFor="signer-email">Signer Email *</Label>
            <Input
              id="signer-email"
              onChange={(e) => {
                setSignerEmail(e.target.value);
                setError("");
              }}
              placeholder="email@example.com"
              type="email"
              value={signerEmail}
            />
          </div>
        )}
      </div>

      {/* Signature Canvas */}
      <div className="grid gap-2">
        <Label>Signature *</Label>
        <div className="relative aspect-[2/1] cursor-crosshair rounded-lg border-2 border-dashed border-input bg-background transition hover:border-primary/50">
          <canvas
            className="absolute inset-0 h-full w-full"
            onMouseDown={startDrawing}
            onMouseLeave={stopDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onTouchEnd={stopDrawing}
            onTouchMove={draw}
            onTouchStart={startDrawing}
            ref={canvasRef}
          />
          {!hasSignature && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <PenIcon className="mx-auto mb-2 size-8 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">
                  Sign here using mouse or touch
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            disabled={!hasSignature}
            onClick={clearCanvas}
            size="sm"
            variant="outline"
          >
            <RefreshCwIcon className="mr-2 size-4" />
            Clear
          </Button>
          <p className="text-muted-foreground text-sm">
            {hasSignature ? "Signature captured" : "Draw signature above"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleCancel} size="sm" variant="outline">
            <XIcon className="mr-2 size-4" />
            Cancel
          </Button>
          <Button disabled={!hasSignature} onClick={handleSave} size="sm">
            <CheckIcon className="mr-2 size-4" />
            Save Signature
          </Button>
        </div>
      </div>
    </div>
  );
}

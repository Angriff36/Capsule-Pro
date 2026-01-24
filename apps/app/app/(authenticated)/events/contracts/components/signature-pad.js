/**
 * @module SignaturePad
 * @intent Canvas-based signature capture component
 * @responsibility Render drawing canvas, capture signature data, handle clear/save/cancel actions
 * @domain Events
 * @tags signature, canvas, input
 * @canonical true
 */
"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.SignaturePad = SignaturePad;
const button_1 = require("@repo/design-system/components/ui/button");
const input_1 = require("@repo/design-system/components/ui/input");
const label_1 = require("@repo/design-system/components/ui/label");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
function SignaturePad({ onSave, onCancel, requireEmail = false }) {
  const canvasRef = (0, react_1.useRef)(null);
  const [isDrawing, setIsDrawing] = (0, react_1.useState)(false);
  const [hasSignature, setHasSignature] = (0, react_1.useState)(false);
  const [signerName, setSignerName] = (0, react_1.useState)("");
  const [signerEmail, setSignerEmail] = (0, react_1.useState)("");
  const [error, setError] = (0, react_1.useState)("");
  // Initialize canvas
  (0, react_1.useEffect)(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
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
  const getCoordinates = (0, react_1.useCallback)((event) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX;
    let clientY;
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
  const startDrawing = (0, react_1.useCallback)(
    (event) => {
      event.preventDefault();
      setIsDrawing(true);
      setError("");
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const coords = getCoordinates(event.nativeEvent);
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    },
    [getCoordinates]
  );
  const draw = (0, react_1.useCallback)(
    (event) => {
      event.preventDefault();
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const coords = getCoordinates(event.nativeEvent);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      setHasSignature(true);
    },
    [isDrawing, getCoordinates]
  );
  const stopDrawing = (0, react_1.useCallback)(() => {
    setIsDrawing(false);
  }, []);
  const clearCanvas = (0, react_1.useCallback)(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setError("");
  }, []);
  const handleSave = (0, react_1.useCallback)(() => {
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
    if (!canvas) return;
    const signatureData = canvas.toDataURL("image/png");
    onSave(signatureData, signerName.trim(), signerEmail.trim() || undefined);
  }, [hasSignature, signerName, signerEmail, requireEmail, onSave]);
  const handleCancel = (0, react_1.useCallback)(() => {
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
          <label_1.Label htmlFor="signer-name">Signer Name *</label_1.Label>
          <input_1.Input
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
            <label_1.Label htmlFor="signer-email">Signer Email *</label_1.Label>
            <input_1.Input
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
        <label_1.Label>Signature *</label_1.Label>
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
                <lucide_react_1.PenIcon className="mx-auto mb-2 size-8 text-muted-foreground/30" />
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
          <button_1.Button
            disabled={!hasSignature}
            onClick={clearCanvas}
            size="sm"
            variant="outline"
          >
            <lucide_react_1.RefreshCwIcon className="mr-2 size-4" />
            Clear
          </button_1.Button>
          <p className="text-muted-foreground text-sm">
            {hasSignature ? "Signature captured" : "Draw signature above"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button_1.Button onClick={handleCancel} size="sm" variant="outline">
            <lucide_react_1.XIcon className="mr-2 size-4" />
            Cancel
          </button_1.Button>
          <button_1.Button
            disabled={!hasSignature}
            onClick={handleSave}
            size="sm"
          >
            <lucide_react_1.CheckIcon className="mr-2 size-4" />
            Save Signature
          </button_1.Button>
        </div>
      </div>
    </div>
  );
}

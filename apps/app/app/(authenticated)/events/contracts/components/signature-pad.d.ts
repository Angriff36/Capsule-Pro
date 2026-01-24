/**
 * @module SignaturePad
 * @intent Canvas-based signature capture component
 * @responsibility Render drawing canvas, capture signature data, handle clear/save/cancel actions
 * @domain Events
 * @tags signature, canvas, input
 * @canonical true
 */
type SignaturePadProps = {
  onSave: (
    signatureData: string,
    signerName: string,
    signerEmail?: string
  ) => void;
  onCancel: () => void;
  requireEmail?: boolean;
};
export declare function SignaturePad({
  onSave,
  onCancel,
  requireEmail,
}: SignaturePadProps): import("react").JSX.Element;
//# sourceMappingURL=signature-pad.d.ts.map

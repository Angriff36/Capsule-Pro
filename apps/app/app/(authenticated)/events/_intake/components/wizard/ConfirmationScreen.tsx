import { ArrowRight, Check, CheckCircle, Copy } from "lucide-react";
import { useState } from "react";
import type { PriceEstimate } from "../../types/wizard";
import { formatCurrency } from "../../utils/webhookPayload";

interface Props {
  aiSummary: string;
  contactName: string;
  email: string;
  emailDraft: string;
  estimate: PriceEstimate;
  onReset: () => void;
}

export default function ConfirmationScreen({
  contactName,
  email,
  estimate,
  aiSummary,
  emailDraft,
  onReset,
}: Props) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#faf8f5] px-4 py-12">
      <div className="w-full max-w-2xl text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle className="h-8 w-8 text-emerald-500" />
        </div>

        <h1 className="mb-3 font-light text-3xl text-stone-800 tracking-tight md:text-4xl">
          Thank you, {contactName || "there"}
        </h1>
        <p className="mb-2 text-lg text-stone-500">
          Your inquiry has been submitted successfully.
        </p>
        <p className="mb-8 text-sm text-stone-400">
          We will follow up at{" "}
          <strong className="text-stone-600">{email}</strong> within 1 business
          day.
        </p>

        <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-6 text-left shadow-sm">
          <div className="mb-2 font-medium text-stone-400 text-xs uppercase tracking-wider">
            Your Estimated Range
          </div>
          <div className="mb-2 font-light text-2xl text-stone-800">
            {formatCurrency(estimate.low)} &ndash;{" "}
            {formatCurrency(estimate.high)}
          </div>
          <p className="text-stone-400 text-xs">
            Non-binding estimate. Final pricing confirmed after consultation.
          </p>
        </div>

        {aiSummary && (
          <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-6 text-left shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-medium text-stone-400 text-xs uppercase tracking-wider">
                Lead Summary
              </span>
              <button
                className="flex items-center gap-1 text-stone-400 text-xs transition-colors hover:text-stone-600"
                onClick={() => handleCopy(aiSummary, "summary")}
              >
                {copiedField === "summary" ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copiedField === "summary" ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="whitespace-pre-line text-sm text-stone-600 leading-relaxed">
              {aiSummary}
            </p>
          </div>
        )}

        {emailDraft && (
          <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-6 text-left shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-medium text-stone-400 text-xs uppercase tracking-wider">
                Follow-Up Email Draft
              </span>
              <button
                className="flex items-center gap-1 text-stone-400 text-xs transition-colors hover:text-stone-600"
                onClick={() => handleCopy(emailDraft, "email")}
              >
                {copiedField === "email" ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copiedField === "email" ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="whitespace-pre-line text-sm text-stone-600 leading-relaxed">
              {emailDraft}
            </p>
          </div>
        )}

        <button
          className="inline-flex items-center gap-2 rounded-lg bg-stone-800 px-6 py-3 font-medium text-sm text-white shadow-lg transition-all hover:bg-stone-700 hover:shadow-xl"
          onClick={onReset}
        >
          Submit Another Inquiry
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

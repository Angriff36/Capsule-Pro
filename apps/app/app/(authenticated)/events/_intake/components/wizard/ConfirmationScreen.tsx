import { CheckCircle, ArrowRight, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import type { PriceEstimate } from '../../types/wizard';
import { formatCurrency } from '../../utils/webhookPayload';

interface Props {
  contactName: string;
  email: string;
  estimate: PriceEstimate;
  aiSummary: string;
  emailDraft: string;
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
    <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 mb-6">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>

        <h1 className="text-3xl md:text-4xl font-light text-stone-800 tracking-tight mb-3">
          Thank you, {contactName || 'there'}
        </h1>
        <p className="text-stone-500 text-lg mb-2">
          Your inquiry has been submitted successfully.
        </p>
        <p className="text-stone-400 text-sm mb-8">
          We will follow up at <strong className="text-stone-600">{email}</strong> within 1 business day.
        </p>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 text-left mb-6 shadow-sm">
          <div className="text-xs uppercase tracking-wider text-stone-400 font-medium mb-2">
            Your Estimated Range
          </div>
          <div className="text-2xl font-light text-stone-800 mb-2">
            {formatCurrency(estimate.low)} &ndash; {formatCurrency(estimate.high)}
          </div>
          <p className="text-xs text-stone-400">
            Non-binding estimate. Final pricing confirmed after consultation.
          </p>
        </div>

        {aiSummary && (
          <div className="bg-white rounded-2xl border border-stone-200 p-6 text-left mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider text-stone-400 font-medium">
                Lead Summary
              </span>
              <button
                onClick={() => handleCopy(aiSummary, 'summary')}
                className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1 transition-colors"
              >
                {copiedField === 'summary' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedField === 'summary' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">
              {aiSummary}
            </p>
          </div>
        )}

        {emailDraft && (
          <div className="bg-white rounded-2xl border border-stone-200 p-6 text-left mb-8 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider text-stone-400 font-medium">
                Follow-Up Email Draft
              </span>
              <button
                onClick={() => handleCopy(emailDraft, 'email')}
                className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1 transition-colors"
              >
                {copiedField === 'email' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedField === 'email' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">
              {emailDraft}
            </p>
          </div>
        )}

        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium
            bg-stone-800 text-white hover:bg-stone-700 transition-all shadow-lg hover:shadow-xl"
        >
          Submit Another Inquiry
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

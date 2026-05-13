import type { WizardFormData, PriceEstimate } from '../types/wizard';

interface SubmitResult {
  leadId: string;
  aiSummary: string;
  emailDraft: string;
}

export async function submitLead(
  data: WizardFormData,
  estimate: PriceEstimate
): Promise<SubmitResult> {
  const response = await fetch('/api/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ formData: data, estimate }),
  });

  const result = (await response.json().catch(() => ({}))) as Partial<SubmitResult> & {
    error?: string;
  };

  if (!response.ok || !result.leadId) {
    throw new Error(result.error || 'Failed to save lead');
  }

  return {
    leadId: result.leadId,
    aiSummary: result.aiSummary || '',
    emailDraft: result.emailDraft || '',
  };
}

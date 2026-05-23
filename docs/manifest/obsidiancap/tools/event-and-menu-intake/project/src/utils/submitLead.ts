import { supabase } from '../lib/supabase';
import type { WizardFormData, PriceEstimate } from '../types/wizard';
import { buildWebhookPayload, formatCurrency } from './webhookPayload';

interface SubmitResult {
  leadId: string;
  aiSummary: string;
  emailDraft: string;
}

export async function submitLead(
  data: WizardFormData,
  estimate: PriceEstimate
): Promise<SubmitResult> {
  const { data: lead, error } = await supabase
    .from('event_leads')
    .insert({
      email: data.email,
      contact_name: data.contactName,
      phone: data.phone,
      company: data.company,
      event_name: data.eventName,
      occasion_type: data.occasionType,
      vibe_description: data.vibeDescription,
      event_format: data.eventFormat,
      guest_count: data.guestCount,
      guest_count_certainty: data.guestCountCertainty,
      service_style: data.serviceStyle,
      course_count: data.courseCount,
      cuisine_preferences: data.cuisinePreferences,
      dietary_needs: data.dietaryNeeds,
      dietary_percentage: data.dietaryPercentage,
      menu_notes: data.menuNotes,
      staffing_level: data.staffingLevel,
      staffing_notes: data.staffingNotes,
      bar_service: data.barService,
      rentals_needed: data.rentalsNeeded,
      add_ons: data.addOns,
      event_date: data.eventDate || null,
      date_flexibility: data.dateFlexibility,
      venue_type: data.venueType,
      city: data.city,
      venue_name: data.venueName,
      budget_range: data.budgetRange,
      referral_source: data.referralSource,
      additional_notes: data.additionalNotes,
      estimated_low: estimate.low,
      estimated_high: estimate.high,
      status: 'new',
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to save lead: ${error.message}`);

  const leadId = lead.id;

  let aiSummary = '';
  let emailDraft = '';

  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lead-summary`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        formData: data,
        estimate: {
          low: formatCurrency(estimate.low),
          high: formatCurrency(estimate.high),
        },
      }),
    });

    if (response.ok) {
      const result = await response.json();
      aiSummary = result.summary || '';
      emailDraft = result.emailDraft || '';

      await supabase
        .from('event_leads')
        .update({
          ai_summary: aiSummary,
          email_draft: emailDraft,
          payload_json: buildWebhookPayload(data, estimate, leadId, aiSummary, emailDraft),
        })
        .eq('id', leadId);
    }
  } catch {
    // AI summary is non-critical, proceed without it
  }

  if (!aiSummary) {
    const payload = buildWebhookPayload(data, estimate, leadId, '', '');
    await supabase
      .from('event_leads')
      .update({ payload_json: payload })
      .eq('id', leadId);
  }

  return { leadId, aiSummary, emailDraft };
}

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FormData {
  contactName: string;
  email: string;
  company: string;
  eventName: string;
  occasionType: string;
  vibeDescription: string;
  eventFormat: string;
  guestCount: number;
  guestCountCertainty: string;
  serviceStyle: string;
  courseCount: number;
  cuisinePreferences: string[];
  dietaryNeeds: string[];
  dietaryPercentage: string;
  menuNotes: string;
  staffingLevel: string;
  staffingNotes: string;
  barService: string;
  rentalsNeeded: string[];
  addOns: string[];
  eventDate: string;
  dateFlexibility: string;
  venueType: string;
  city: string;
  venueName: string;
  budgetRange: string;
  referralSource: string;
  additionalNotes: string;
}

function buildSummary(data: FormData, estimate: { low: string; high: string }): string {
  const lines: string[] = [];

  lines.push(`LEAD: ${data.contactName || "Unknown"}${data.company ? ` (${data.company})` : ""}`);
  lines.push(`Email: ${data.email}`);
  lines.push("");

  const occasion = data.occasionType?.replace(/-/g, " ") || "Unspecified";
  lines.push(`EVENT: ${data.eventName || occasion}`);
  if (data.vibeDescription) lines.push(`Vibe: ${data.vibeDescription}`);
  lines.push(
    `Format: ${data.eventFormat?.replace(/-/g, " ") || "TBD"} | ~${data.guestCount} guests (${data.guestCountCertainty || "uncertain"})`
  );
  lines.push(
    `Service: ${data.serviceStyle?.replace(/-/g, " ") || "TBD"}${data.courseCount ? ` / ${data.courseCount} courses` : ""}`
  );

  if (data.cuisinePreferences?.length > 0) {
    lines.push(`Cuisine: ${data.cuisinePreferences.join(", ")}`);
  }
  if (data.dietaryNeeds?.length > 0) {
    lines.push(
      `Dietary: ${data.dietaryNeeds.join(", ")}${data.dietaryPercentage ? ` (~${data.dietaryPercentage} of guests)` : ""}`
    );
  }
  if (data.menuNotes) lines.push(`Menu notes: ${data.menuNotes}`);

  lines.push(
    `Staffing: ${data.staffingLevel?.replace(/-/g, " ") || "TBD"}`
  );
  if (data.staffingNotes) lines.push(`Staffing notes: ${data.staffingNotes}`);

  lines.push(`Bar: ${data.barService?.replace(/-/g, " ") || "None"}`);
  if (data.rentalsNeeded?.length > 0) {
    lines.push(
      `Rentals: ${data.rentalsNeeded.map((r) => r.replace(/-/g, " ")).join(", ")}`
    );
  }
  if (data.addOns?.length > 0) {
    lines.push(
      `Add-ons: ${data.addOns.map((a) => a.replace(/-/g, " ")).join(", ")}`
    );
  }

  const logParts: string[] = [];
  if (data.eventDate) logParts.push(data.eventDate);
  if (data.venueType) logParts.push(data.venueType.replace(/-/g, " "));
  if (data.venueName) logParts.push(data.venueName);
  if (data.city) logParts.push(data.city);
  if (logParts.length > 0) lines.push(`Location: ${logParts.join(" | ")}`);
  if (data.dateFlexibility) lines.push(`Date flexibility: ${data.dateFlexibility}`);

  if (data.budgetRange) lines.push(`Client budget: ${data.budgetRange}`);
  lines.push(`System estimate: ${estimate.low} - ${estimate.high} (non-binding)`);

  if (data.referralSource) lines.push(`Referral: ${data.referralSource}`);
  if (data.additionalNotes) lines.push(`Notes: ${data.additionalNotes}`);

  return lines.join("\n");
}

function buildEmailDraft(data: FormData, estimate: { low: string; high: string }): string {
  const name = data.contactName?.split(" ")[0] || "there";
  const occasion = data.occasionType?.replace(/-/g, " ") || "upcoming event";
  const guestCount = data.guestCount || "your";

  return `Hi ${name},

Thank you for reaching out about your ${occasion}! We are excited to learn more about your vision${data.vibeDescription ? ` — "${data.vibeDescription}" sounds wonderful` : ""}.

Based on the details you shared — ${guestCount} guests, ${data.serviceStyle?.replace(/-/g, " ") || "your preferred"} service${data.city ? ` in ${data.city}` : ""} — we have put together a preliminary estimate in the range of ${estimate.low} to ${estimate.high}. Please note this is a starting point, and we will refine it as we learn more about your needs.

I would love to schedule a quick call to discuss your event in more detail. Are you available this week for a 15-minute conversation?

Looking forward to helping make your event exceptional.

Warm regards,
[Your Name]
[Your Title]`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { formData, estimate } = await req.json();

    const summary = buildSummary(formData, estimate);
    const emailDraft = buildEmailDraft(formData, estimate);

    return new Response(
      JSON.stringify({ summary, emailDraft }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to generate summary", details: String(error) }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

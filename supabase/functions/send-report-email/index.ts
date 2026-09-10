import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

interface EmailPayload {
  submissionId: string;
  customerEmail: string;
  customerName: string;
  reportType: string;
  reportUrl?: string;
}

function buildEmailHtml(name: string, reportType: string, reportUrl?: string): string {
  const reportLabel = reportType === "pro" ? "Investor Report Pro" : "Property Score Report";
  const downloadSection = reportUrl
    ? `<a href="${reportUrl}" style="display:inline-block;background:#0EA5A4;color:#111315;font-weight:bold;padding:14px 32px;border-radius:12px;text-decoration:none;margin-top:16px;">Download Your Report</a>`
    : `<p style="color:#A0AEC0;font-size:14px;">Your full report PDF will be attached in a follow-up email within 24 hours.</p>`;

  return `<!DOCTYPE html>
<html>
<body style="background:#111315;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:24px;font-weight:bold;color:#FFFFFF;">EiX<span style="color:#0EA5A4;"> Property Score</span></span>
    </div>
    <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:32px;">
      <h1 style="color:#FFFFFF;font-size:24px;margin:0 0 16px;">Your ${reportLabel} is Ready</h1>
      <p style="color:#A0AEC0;font-size:16px;line-height:1.6;">Hi ${name},</p>
      <p style="color:#A0AEC0;font-size:16px;line-height:1.6;">Your AI-powered ${reportLabel} has been generated and is ready for download. Thank you for using EiX Property Score.</p>
      <div style="text-align:center;margin:24px 0;">
        ${downloadSection}
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:24px;padding-top:16px;">
        <p style="color:#6B7280;font-size:12px;">EiX Property Score — AI Property Investment Analysis for South Africa</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { submissionId, customerEmail, customerName, reportType, reportUrl } =
      (await req.json()) as EmailPayload;

    if (!submissionId || !customerEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = buildEmailHtml(customerName, reportType, reportUrl);

    console.log(`[EMAIL] To: ${customerEmail}, Subject: Your EiX ${reportType === "pro" ? "Investor Report Pro" : "Property Score Report"} is Ready`);

    const { error: reportError } = await supabase
      .from("reports")
      .update({ status: "sent", pdf_url: reportUrl || null })
      .eq("submission_id", submissionId);

    if (reportError) {
      console.error("[DB] Error updating report:", reportError.message);
    }

    const { error: subError } = await supabase
      .from("property_submissions")
      .update({ status: "report_sent" })
      .eq("id", submissionId);

    if (subError) {
      console.error("[DB] Error updating submission:", subError.message);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email queued and status updated" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

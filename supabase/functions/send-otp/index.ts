/// <reference path="../_shared/deno.d.ts" />
export {};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { success: false, message: "Method not allowed" });
  }

  try {
    const { phone } = await req.json();

    if (typeof phone !== "string" || !/^[6-9]\d{9}$/.test(phone)) {
      return json(400, { success: false, message: "Enter a valid 10-digit mobile number." });
    }

    const authKey = Deno.env.get("MSG91_AUTH_KEY");
    const templateId = Deno.env.get("MSG91_TEMPLATE_ID");

    if (!authKey || !templateId) {
      return json(500, { success: false, message: "OTP provider is not configured." });
    }

    const url = new URL("https://control.msg91.com/api/v5/otp");
    url.search = new URLSearchParams({
      template_id: templateId,
      mobile: `91${phone}`,
      authkey: authKey,
      otp_length: "6",
      otp_expiry: "5",
    }).toString();

    const response = await fetch(url, { method: "POST" });
    const data = await response.json();

    if (!response.ok || data?.type !== "success") {
      return json(response.ok ? 400 : response.status, {
        success: false,
        message: data?.message || "Failed to send OTP.",
        provider: data,
      });
    }

    return json(200, {
      success: true,
      message: data?.message || "OTP sent successfully.",
      requestId: data?.request_id ?? data?.reqId ?? data?.requestId ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return json(500, { success: false, message });
  }
});

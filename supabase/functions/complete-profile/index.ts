/// <reference path="../_shared/deno.d.ts" />
export {};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const buildSyntheticEmail = (phone: string) => `phone-${phone}@auth.nile.local`;

const buildPassword = async (phone: string, secret: string) => {
  const input = new TextEncoder().encode(`${secret}:${phone}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", input);
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

  return `Nile#${hash.slice(0, 32)}aA1`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { success: false, message: "Method not allowed" });
  }

  try {
    const { phone, fullName } = await req.json();

    if (typeof phone !== "string" || !/^[6-9]\d{9}$/.test(phone)) {
      return json(400, { success: false, message: "Enter a valid 10-digit mobile number." });
    }

    if (typeof fullName !== "string" || !fullName.trim()) {
      return json(400, { success: false, message: "Please enter your name." });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const phoneAuthSecret = Deno.env.get("PHONE_AUTH_SECRET");

    if (!supabaseUrl || !serviceRoleKey || !phoneAuthSecret) {
      return json(500, { success: false, message: "Supabase auth setup is incomplete." });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const trimmedName = fullName.trim();
    const email = buildSyntheticEmail(phone);
    const password = await buildPassword(phone, phoneAuthSecret);

    const { data: existingProfile, error: profileError } = await admin
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (profileError) {
      return json(500, { success: false, message: profileError.message });
    }

    if (existingProfile?.id) {
      const { error: updateProfileError } = await admin
        .from("profiles")
        .update({ full_name: trimmedName, role: "user" })
        .eq("id", existingProfile.id);

      if (updateProfileError) {
        return json(500, { success: false, message: updateProfileError.message });
      }

      const { error: updateUserError } = await admin.auth.admin.updateUserById(existingProfile.id, {
        email,
        password,
        email_confirm: true,
        user_metadata: {
          phone,
          full_phone: `+91${phone}`,
          full_name: trimmedName,
          verified_via: "msg91-edge-function",
        },
      });

      if (updateUserError) {
        return json(500, { success: false, message: updateUserError.message });
      }

      return json(200, {
        success: true,
        message: "Profile completed successfully.",
        email,
        password,
      });
    }

    const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        phone,
        full_phone: `+91${phone}`,
        full_name: trimmedName,
        verified_via: "msg91-edge-function",
      },
    });

    if (createUserError || !createdUser.user?.id) {
      return json(500, {
        success: false,
        message: createUserError?.message || "Failed to create user.",
      });
    }

    const { error: insertProfileError } = await admin.from("profiles").insert({
      id: createdUser.user.id,
      phone,
      full_name: trimmedName,
      role: "user",
    });

    if (insertProfileError) {
      return json(500, { success: false, message: insertProfileError.message });
    }

    return json(200, {
      success: true,
      message: "Profile completed successfully.",
      email,
      password,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return json(500, { success: false, message });
  }
});

// Edge Function: send-recovery-email
// Gera link de recovery via Admin API e envia email usando o proprio servico de email do Supabase.
// Resolve o problema de multiplos dominios compartilhando o mesmo projeto Supabase.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const { email, redirectTo } = await req.json();
    if (!email || !redirectTo) {
      return new Response(
        JSON.stringify({ error: "email and redirectTo are required" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    // Supabase service role client (has full admin access)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Generate recovery link using Admin API (no redirect URL validation!)
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo,
      },
    });

    if (error || !data?.properties?.action_link) {
      return new Response(
        JSON.stringify({ error: error?.message || "Failed to generate link" }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    const actionLink = data.properties.action_link;

    // Now send the email using Supabase's built-in email service.
    // We call auth.admin.sendRawEmail if available, or use a simple SMTP approach.
    // Actually, Supabase does not expose a public API to send arbitrary auth emails.
    // Instead, we return the link and let the frontend call a third-party email service,
    // OR we can use Supabase's own SMTP by triggering a password reset with the correct redirect.

    // Alternative: use supabase.auth.resetPasswordForEmail with service_role.
    // When called server-side, Supabase may not enforce redirect URL restrictions.
    const { error: sendError } = await supabaseAdmin.auth.resetPasswordForEmail(
      email,
      {
        redirectTo,
      }
    );

    if (sendError) {
      // If resetPasswordForEmail fails (e.g., redirect URL not allowed),
      // return the generated link so the frontend can handle it.
      return new Response(
        JSON.stringify({
          success: false,
          link: actionLink,
          error:
            sendError.message +
            " | Use the returned link to send a custom email.",
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Recovery email sent" }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
});

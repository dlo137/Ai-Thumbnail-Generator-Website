import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:5173";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PlanId = "weekly" | "monthly" | "yearly";

// Stripe's Node http client relies on Node-only APIs unavailable in Deno's
// edge runtime — createFetchHttpClient() is Stripe's documented Deno-safe
// alternative.
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

function getPriceIds(): Record<PlanId, string> {
  return {
    weekly: Deno.env.get("STRIPE_PRICE_WEEKLY")!,
    monthly: Deno.env.get("STRIPE_PRICE_MONTHLY")!,
    yearly: Deno.env.get("STRIPE_PRICE_YEARLY")!,
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // User-scoped client — forwards the caller's JWT so getUser() resolves
    // against their actual session instead of needing the service role key.
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || !user.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: { planId?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const planId = body.planId as PlanId | undefined;
    const priceIds = getPriceIds();

    if (!planId || !(planId in priceIds) || !priceIds[planId]) {
      return new Response(JSON.stringify({ error: "Unrecognized planId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceIds[planId], quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email,
      success_url: `${SITE_URL}/?checkout=success`,
      cancel_url: `${SITE_URL}/pricing?checkout=canceled`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    // Log the real Stripe/internal error server-side only — the client only
    // ever sees a generic message, never the raw error object.
    console.error("create-checkout-session error:", err);
    return new Response(JSON.stringify({ error: "Failed to start checkout. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

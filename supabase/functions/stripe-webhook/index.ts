import { serve } from "https://deno.land/std/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

type PlanId = "weekly" | "monthly" | "yearly";

// Amount granted per plan. Weekly/monthly are per-cycle allotments (reset on
// every renewal); yearly is the full year's credits granted once, upfront,
// at initial purchase — not accrued monthly.
const PLAN_CREDITS: Record<PlanId, number> = {
  weekly: 10,
  monthly: 75,
  yearly: 1080,
};

function getPriceIds(): Record<PlanId, string> {
  return {
    weekly: Deno.env.get("STRIPE_PRICE_WEEKLY")!,
    monthly: Deno.env.get("STRIPE_PRICE_MONTHLY")!,
    yearly: Deno.env.get("STRIPE_PRICE_YEARLY")!,
  };
}

function planIdFromPriceId(priceId: string | undefined): PlanId | null {
  if (!priceId) return null;
  const priceIds = getPriceIds();
  const match = (Object.entries(priceIds) as [PlanId, string][]).find(([, id]) => id === priceId);
  return match ? match[0] : null;
}

// Sets (not adds to) the user's credit balance for the given plan grant, and
// records it in credits_ledger for audit + idempotency. `stripeEventId` is
// UNIQUE on credits_ledger — Stripe retries webhook deliveries, so a second
// delivery of the same event hits a unique-violation on insert and is
// treated as "already processed" rather than double-granting credits.
async function grantCredits(
  admin: SupabaseClient,
  userId: string,
  planId: PlanId,
  reason: string,
  stripeEventId: string
): Promise<void> {
  const amount = PLAN_CREDITS[planId];

  const { error: ledgerError } = await admin
    .from("credits_ledger")
    .insert({ user_id: userId, amount, reason, stripe_event_id: stripeEventId });

  if (ledgerError) {
    if (ledgerError.code === "23505") {
      // Unique violation on stripe_event_id — this event was already
      // processed by a prior webhook delivery. Skip re-granting.
      console.log(`Event ${stripeEventId} already processed, skipping credit grant.`);
      return;
    }
    throw new Error(`Failed to write credits_ledger: ${ledgerError.message}`);
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      credits_current: amount,
      credits_max: amount,
      last_credit_reset: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileError) {
    throw new Error(`Failed to update profile credits: ${profileError.message}`);
  }
}

async function handleCheckoutSessionCompleted(admin: SupabaseClient, event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const userId = session.client_reference_id;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  if (!userId || !customerId || !subscriptionId) {
    console.error("checkout.session.completed missing required fields", {
      userId,
      customerId,
      subscriptionId,
    });
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price?.id;
  const planId = planIdFromPriceId(priceId);

  if (!planId) {
    console.error("checkout.session.completed: could not resolve planId from price", priceId);
    return;
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      stripe_customer_id: customerId,
      is_pro_version: true,
      subscription_plan: planId,
      subscription_start_date: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileError) {
    throw new Error(`Failed to update profile after checkout: ${profileError.message}`);
  }

  const { error: subError } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscriptionId,
      plan_id: planId,
      status: "active",
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    },
    { onConflict: "stripe_subscription_id" }
  );

  if (subError) {
    throw new Error(`Failed to upsert subscription row: ${subError.message}`);
  }

  await grantCredits(admin, userId, planId, `checkout.session.completed (${planId})`, event.id);
}

async function handleInvoicePaid(admin: SupabaseClient, event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;

  // The very first invoice on a new subscription is already fully handled by
  // checkout.session.completed above — only renewal invoices land here.
  if (invoice.billing_reason === "subscription_create") return;

  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!subscriptionId) {
    console.error("invoice.paid missing subscription id");
    return;
  }

  const { data: subRow, error: subLookupError } = await admin
    .from("subscriptions")
    .select("user_id, plan_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (subLookupError || !subRow) {
    console.error("invoice.paid: no matching subscriptions row for", subscriptionId, subLookupError);
    return;
  }

  const planId = subRow.plan_id as PlanId;
  await grantCredits(admin, subRow.user_id, planId, `invoice.paid renewal (${planId})`, event.id);
}

async function handleSubscriptionUpdated(admin: SupabaseClient, event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const priceId = subscription.items.data[0]?.price?.id;
  const planId = planIdFromPriceId(priceId);

  const status: "active" | "past_due" | "canceled" =
    subscription.status === "active"
      ? "active"
      : subscription.status === "past_due"
        ? "past_due"
        : "canceled";

  const { error } = await admin
    .from("subscriptions")
    .update({
      status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      ...(planId ? { plan_id: planId } : {}),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    throw new Error(`Failed to sync subscription update: ${error.message}`);
  }
}

async function handleSubscriptionDeleted(admin: SupabaseClient, event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const { error } = await admin
    .from("subscriptions")
    .update({ status: "canceled" })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    throw new Error(`Failed to mark subscription canceled: ${error.message}`);
  }
}

async function handleInvoicePaymentFailed(admin: SupabaseClient, event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!subscriptionId) return;

  const { error } = await admin
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    throw new Error(`Failed to mark subscription past_due: ${error.message}`);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok");
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), { status: 400 });
  }

  // Signature verification needs the exact raw bytes Stripe signed — never
  // JSON.parse before this, even accidentally via a logging helper.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    // constructEventAsync (not the sync constructEvent) — Deno's crypto APIs
    // are async-only, and Stripe's SDK requires the async variant on any
    // runtime without Node's synchronous crypto.
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(admin, event);
        break;
      case "invoice.paid":
        await handleInvoicePaid(admin, event);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(admin, event);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(admin, event);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(admin, event);
        break;
      default:
        // Unhandled event type — 200 so Stripe doesn't keep retrying it.
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    // Handler errors DO get a non-2xx so Stripe retries — unlike unhandled
    // event *types* above, a thrown error here means we recognized the event
    // but failed to process it (DB write failed, etc.), which is worth a retry.
    console.error(`Error processing ${event.type} (${event.id}):`, err);
    return new Response(JSON.stringify({ error: "Webhook handler failed" }), { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});

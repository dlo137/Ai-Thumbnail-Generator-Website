import { supabase } from '../lib/supabase';

export type PlanId = 'weekly' | 'monthly' | 'yearly';

// sessionStorage key used to carry "which plan did the user want to
// subscribe to" across the login/sign-up redirect — set by PricingPage when
// a signed-out user clicks Subscribe, read back by AuthPage (email/password)
// and AuthCallback (Google OAuth) once a real session exists.
export const PENDING_PLAN_KEY = 'pending_plan';

// Creates a Stripe Checkout session for the given plan and returns its URL.
// Always re-checks for a live session right before calling — callers don't
// need to have already confirmed one exists.
export async function createCheckoutUrl(planId: PlanId): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('You must be logged in to subscribe.');
  }

  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { planId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) throw new Error(error.message);
  if (!data?.url) throw new Error('No checkout URL returned.');
  return data.url;
}

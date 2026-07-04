-- New signups previously got credits_current/credits_max = 0 (the prior
-- column default), meaning their very first ("free teaser") generation would
-- have been blocked by the new insufficient-credits gate in generate-thumbnail.
-- Bumping the default to 1 grants exactly one free credit at signup — enough
-- for the teaser, then correctly 0 until they subscribe. Only affects rows
-- inserted after this migration; existing users' balances are untouched.
alter table public.profiles
  alter column credits_current set default 1,
  alter column credits_max set default 1;

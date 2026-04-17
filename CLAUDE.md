# Kaimetric - Claude Code Context

## Tech Stack
- **Frontend**: Single-file React app (`src/App.js`), no JSX extension, all inline styles
- **Backend**: Supabase (project ID: `jfyexedcjgerahuumyqu`)
- **Hosting**: Netlify, auto-deploys on push to `kaimetric` branch
- **Payments**: Stripe (live mode), Payment Link for $79/mo subscription
- **Landing Page**: Separate repo (`kaimetric-landing`), static HTML, hosted on Netlify at kaimetric.com

## Deployed URLs
- **App**: https://kaimetric.netlify.app (kaimetric branch)
- **Landing Page**: https://kaimetric.com (kaimetric-landing repo, main branch)
- **Wilmington Strength (Matt's gym app)**: deployed from main branch

## Repos
- **App + Backend**: `wilmingtonstrength/Perfromance-Tracking` (kaimetric branch)
- **Landing Page**: `wilmingtonstrength/kaimetric-landing` (main branch)
- Both auto-deploy via Netlify on push

## Supabase
- **Project ID**: jfyexedcjgerahuumyqu
- **Tables**: gyms, gym_users, athletes, test_results, custom_tests, test_presets
- **RLS**: Enabled on all tables, scoped by gym_id via `get_user_gym_id()` helper function
- **Admin email**: mattsecrest58@gmail.com (bypasses RLS on gyms/gym_users for admin dashboard)
- **Edge Functions**: stripe-webhook, notify-admin

## Stripe
- **Publishable Key**: pk_live_51TMU15BFztzdIdDcFIBb8aJYeA8r7p4fcYo1KKWl2Dbmo7y8S5J1I5FB5O9V0MsPgePVLOVZjCV6dCZI4Y2YCUAO00Kp8tRtmF
- **Product ID**: prod_ULAsVsm3syMBEo
- **Payment Link**: https://buy.stripe.com/9B6dR8gKPbBK1Ny9io8EM00i
- **Pricing**: $79/month, 14-day free trial (handled in app, not Stripe)
- **Trial logic**: App checks `trial_started_at` or `created_at` on gyms table, 14-day window
- **Paywall**: Shows after trial expires, links to Stripe Payment Link with `client_reference_id=gymId`
- **Webhook**: Supabase Edge Function at `/functions/v1/stripe-webhook`

## Analytics (GTM + GA4)
- **GTM Container ID**: GTM-MNM8TX92
- **GA4 Measurement ID**: G-VYVB68C6YF
- GTM installed on both landing page and app
- Events tracked via dataLayer pushes:
  - `cta_click` (landing page CTA clicks)
  - `signup_started` (signup tab clicked)
  - `signup_completed` (gym created in onboarding)
  - `trial_activated` (first login after signup)
  - `first_athlete_added` (first athlete created)
  - `subscription_started` (Stripe webhook, via GA4 Measurement Protocol)

## UTM Tracking
- Landing page captures UTM params from URL, stores in sessionStorage
- UTMs appended to CTA links so they carry to the app
- App captures UTMs and saves to gyms table on signup
- Columns: utm_source, utm_medium, utm_campaign, utm_content, utm_term
- Naming convention:
  - utm_source: youtube | meta | google
  - utm_medium: cpc | retargeting | organic
  - utm_campaign: launch_apr26
  - utm_content: talking_head_v1 | screen_record_v1 | youth_summer_v1

## Critical Rules
- ALWAYS output complete .js files, never partial snippets, never .jsx
- Never break existing functionality when adding features
- All styles are inline (no separate CSS files)
- Multi-tenant: everything scoped by gym_id from Supabase auth
- Never use dashes in consumer-facing text (reads as AI-generated)
- Commit and push after each working feature so it auto-deploys
- Admin email (mattsecrest58@gmail.com) bypasses trial/subscription checks

## How to Deploy
- **App**: Push to `kaimetric` branch on `wilmingtonstrength/Perfromance-Tracking`
- **Landing Page**: Push to `main` branch on `wilmingtonstrength/kaimetric-landing`
- Both auto-deploy via Netlify within ~30 seconds of push
- No local build step needed, Netlify handles it

## Supabase Edge Functions
- Deploy via Supabase CLI: `supabase functions deploy stripe-webhook`
- Requires env vars: STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY, GA4_API_SECRET

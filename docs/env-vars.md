# Environment Variables for Sprite

This document describes the required environment variables for running the Sprite application.

## Required Environment Variables

Copy these to your `.env.local` file for local development:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe 
STRIPE_SECRET_KEY=sk_test_your_test_key
STRIPE_PUBLIC_KEY=pk_test_your_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_STRIPE_PRICE_MONTHLY=price_your_monthly_price_id
NEXT_PUBLIC_STRIPE_PRICE_ANNUAL=price_your_annual_price_id

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Stripe Setup Checklist

1. Create a Stripe account if you don't already have one
2. Set up your branding in Stripe Dashboard > Settings > Branding
3. Create your product (Sprite Pro) with two prices:
   - Monthly plan: $99/month
   - Annual plan: $1000/year
4. Copy the price IDs to your environment variables
5. Get your API keys from Stripe Dashboard > Developers > API keys
6. For local development, run `stripe listen --forward-to localhost:3000/api/webhook/stripe` to get your webhook secret

## Production Deployment

For production, add these environment variables to your hosting platform (Vercel):

1. Update Stripe webhook endpoint to your production URL
2. Replace test keys with production keys
3. Make sure to update price IDs if different in production 
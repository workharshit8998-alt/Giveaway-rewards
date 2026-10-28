# Trigger Rewards

Responsive multi-page static website with a small Vercel serverless API and Supabase event logging.

## Pages
- `index.html` — Home
- `rewards.html` — Categories and demo submission
- `how-it-works.html` — Explanation
- `faq.html` — FAQ
- `contact.html` — contact-form preview only

## Supabase + Vercel setup
Set these **private Vercel environment variables** for Production (and Preview if needed):
- `SUPABASE_URL` — Supabase project API URL
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role/secret key; server-side only, never prefix it with `NEXT_PUBLIC_` and never put it in GitHub.

The `api/demo-event.js` endpoint saves only a fixed category and timestamp to `public.trigger_demo_events`. The table has RLS enabled and no public access. The endpoint does not store entered labels or collect IP addresses in app code.

## Discord bot connection
Repository: https://github.com/workharshit8998-alt/discord-catch-bot
Add the same two private variables above to the bot host, alongside the existing `DISCORD_BOT_TOKEN`. Then restart/redeploy the bot. The admin-only `/demo-stats` command reads the latest category events from Supabase.

## Important disclosure
This is a front-end demo only. It does not deliver real rewards or validate codes. The contact form is still a preview and does not send/save messages. Hosting providers may process request metadata under their own policies.

## Deploy
Static HTML/CSS/JavaScript plus Vercel's `api/` function. No frontend build command required.
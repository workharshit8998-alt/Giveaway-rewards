# Trigger Rewards

Responsive multi-page static website with a Vercel serverless API and Supabase demo-event logging.

## Pages
- `index.html` — Home
- `rewards.html` — Categories and demo submission
- `how-it-works.html` — Explanation
- `faq.html` — FAQ
- `contact.html` — contact-form preview only

## Dedicated Supabase project
Trigger Rewards uses a separate project, so the Alt Generator database is not used by this site:
- Dashboard: https://supabase.com/dashboard/project/rhhvpyeowumfludgjcnw
- API URL: `https://rhhvpyeowumfludgjcnw.supabase.co`
- Table: `public.trigger_demo_events`

## Vercel environment variables
Set these as private Vercel project environment variables:
- `SUPABASE_URL` — `https://rhhvpyeowumfludgjcnw.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` — private service-role/secret key for this dedicated project. Server-side only; never prefix it with `NEXT_PUBLIC_` and never put it in GitHub.

The `api/demo-event.js` endpoint saves only a fixed category and timestamp to `public.trigger_demo_events`. The table has RLS enabled and no public access. The endpoint does not store entered labels or collect IP addresses in app code.

## Discord bot connection
Repository: https://github.com/workharshit8998-alt/discord-catch-bot
Add the same two private variables above to the bot host, alongside the existing `DISCORD_BOT_TOKEN`. Then restart/redeploy the bot. The admin-only `/demo-stats` command reads the latest category events from Supabase.

## Important disclosure
This is a front-end demo only. It does not deliver real rewards or validate codes. The contact form is still a preview and does not send/save messages. Hosting providers may process request metadata under their own policies.

## Deploy
Static HTML/CSS/JavaScript plus Vercel's `api/` function. No frontend build command required.
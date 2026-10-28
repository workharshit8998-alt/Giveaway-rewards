# Trigger Rewards — Prototype

A mobile-friendly, dark/gold category-selection demo for YouTube-themed, Minecraft-themed, and OTT-themed options.

## Important disclosure

**This prototype does not provide any real rewards.** It does not verify codes, collect IP addresses, contact a database, or connect to a Discord bot. The demo form accepts text only to demonstrate the UI and starts a 72-hour countdown in the current browser's local storage.

The local timer is not secure: it can be cleared or changed by the visitor and does not enforce a server-side cooldown.

## Deploy on Vercel

This is a static site. Import this repository into Vercel and set the project root to the repository root. No build command is required; the output directory is `.`.

## Future production work

Before adding code management or persistent cooldowns, build a server-side API with authenticated Discord-bot administration, server-side code validation, database-enforced claim limits, rate limiting, and a clear privacy notice. Do not store raw IP addresses longer than necessary. Keep the no-reward disclosure visible to visitors.
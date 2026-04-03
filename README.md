# Purdue Intramurals Sports Status Board

This project is moving from prototype to public-ready foundation. It keeps the sport-first public board and admin dashboard, while adding a real backend path with Supabase for shared live data and secure admin authentication.

## What it does now

- Public-facing live sports status board
- High-priority red global banner
- Admin dashboard for sport status edits
- Archive and restore seasonal sports
- One-click all-sport actions for alert, cancel, and reactivate
- Modal flow for adding sports
- Supabase-ready shared data and admin auth path
- Local fallback for development before backend setup is complete

## Local setup

```bash
npm install
npm run dev
```

Create a `.env.local` file from `.env.example`:

```bash
cp .env.example .env.local
```

Then add:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Supabase setup

1. Create a Supabase project.
2. Open the SQL editor.
3. Run [schema.sql](/Users/jasonlyu/Documents/IM_Website_Project/supabase/schema.sql).
4. In Supabase Auth, create the shared supervisor account you want staff to use.
5. Copy the project URL and anon key into `.env.local`.

If you already set up Supabase earlier, rerun the updated schema now so the new `audit_log` table and `updated_by` fields are created.

This keeps the shared admin password inside Supabase Auth instead of exposing it in frontend environment variables.

## Deployment path

Recommended production stack:

- Frontend hosting: `Vercel`
- Shared data + auth: `Supabase`
- Custom domain: later, after initial testing

## Vercel deployment

Vercel supports Vite projects directly, so this app does not need special build tooling to deploy. Vercel's Vite guide says you can deploy a Vite project by running `vercel` from the project root or by importing the Git repo in the dashboard. It also notes that environment variable changes only apply to new deployments after redeploying. See:

- [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [Project settings](https://vercel.com/docs/project-configuration/project-settings)
- [Environment variables](https://vercel.com/docs/environment-variables)
- [Managing environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables)
- [Working with domains](https://vercel.com/docs/projects/domains/working-with-domains)

### What to put into Vercel

Add these environment variables in your Vercel project settings:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Recommended deployment flow

1. Push this repo to GitHub.
2. Import the repo into Vercel.
3. Let Vercel auto-detect the framework as `Vite`.
4. Confirm the build command is `npm run build`.
5. Confirm the output directory is `dist`.
6. Add the Supabase environment variables in Vercel Project Settings.
7. Trigger a production deployment.
8. Test the `vercel.app` URL first.
9. Add a custom domain after the public workflow feels stable.

### Important production note

Your current auth model uses a shared supervisor account in Supabase Auth. That is much safer than putting a shared password into frontend environment variables, but for long-term production use I still recommend moving to individual staff accounts and adding an audit log.

## Plain-English architecture

- `React + Vite` renders the website people visit.
- `Supabase` stores shared sport data and the global banner.
- `Supabase Auth` handles admin sign-in securely.
- `Vercel` hosts the website publicly on the internet.

That means:

- public users read shared sports data
- admins sign in and update shared sports data
- all devices see the same current information

## Reliability roadmap

### Phase 1: Shared foundation

- Supabase sports table
- Supabase banner table
- Shared admin login
- Public deployment

### Phase 2: Operational safety

- audit log for updates
- last-updated-by display
- rollback / undo support
- stronger admin protections

### Phase 3: Product expansion

- improved mobile polish
- sport ordering controls
- richer facility-impact details
- weather integrations
- future notifications

## Current note

If Supabase is not configured yet, the app still falls back to local demo-style data so development can continue. Once configured, the same UI becomes a real shared operational tool.

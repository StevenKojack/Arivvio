# Arivvio

Arivio is building the Airbnb for events: planners create an event, compare nearby venues and providers, build a quote cart, request quotes, and eventually book.

## Run Locally

Use the Windows launcher:

```cmd
start-dev.cmd
```

Or run:

```cmd
npm run dev
```

Open:

```text
http://127.0.0.1:3000
```

## Supabase Setup

The app is wired for Supabase, but you still need to create the Supabase project and add keys locally.

1. Create a Supabase project at `https://supabase.com`.
2. Open Project Settings -> API.
3. Copy:
   - Project URL
   - anon public key
4. Create `.env.local` in this folder:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

5. In Supabase, open SQL Editor.
6. Paste and run:

```text
supabase/schema.sql
```

7. Restart the dev server.

Once configured, these flows can persist data:

- `/auth/signup`
- `/auth/login`
- `/plan`
- `/account`
- `/events/[id]`
- `/vendor/onboarding`

## Mapbox Setup

Arivio uses Mapbox GL for the marketplace command-center map. Without a Mapbox
key, the marketplace falls back to a local mock map with real provider
coordinates and interactive pins.

To enable real map imagery:

1. Create a Mapbox account at `https://www.mapbox.com`.
2. Create or copy a public access token.
3. Add these values to `.env.local`:

```env
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_public_mapbox_token
NEXT_PUBLIC_MAPBOX_STYLE_ID=mapbox/light-v11
```

The current implementation supports pan, drag, zoom, hoverable pins, clickable
pins, selected vendor state, and carted vendor state. Address search uses
Mapbox geocoding when the public token is available and falls back to curated
demo suggestions when it is not.

## Current Backend Scope

Implemented:

- Supabase client helpers
- Database schema
- Auth pages
- Profile creation
- Saved events
- Account dashboard
- Event detail page
- Vendor onboarding starter flow

Not implemented yet:

- Stripe payments
- Real geocoding
- Real drive-time API
- File uploads
- Production admin dashboard

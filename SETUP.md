# Figuritas – Setup Guide

## Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

---

## 1. Supabase Setup

### a. Create the schema
1. Open your Supabase project → SQL Editor
2. Paste and run the contents of `supabase/schema.sql`

### b. Seed initial data
1. In the SQL Editor, paste and run `supabase/seed.sql`
   - This creates all 7 World Cup albums (2002–2026)
   - Seeds the complete 2006 Germany album with real player names
   - Other albums will show placeholder stickers until you add real data

### c. Enable Email Auth
1. Go to Authentication → Providers → Email
2. Make sure Email is enabled
3. Optionally disable "Confirm email" for development

---

## 2. App Configuration

Copy the environment file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Find these in your Supabase dashboard → Project Settings → API.

---

## 3. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 4. Build for Production

```bash
npm run build
npm run preview   # test the production build locally
```

Deploy the `dist/` folder to any static host (Vercel, Netlify, Cloudflare Pages, etc.).

---

## 5. Adding Sticker Data

The app works with partial data. For any album, you can:

**Option A: SQL insert**
Add rows to the `stickers` table following the format in `seed.sql`.

**Option B: Supabase Table Editor**
Use the Supabase dashboard Table Editor to add stickers manually.

Categories: `team`, `player`, `badge`, `stadium`, `special`, `gold`, `other`

Missing stickers (gap between defined rows and `total_stickers`) are auto-filled as placeholder chips in the UI.

---

## PWA Install

On mobile Chrome/Safari:
- Open the app URL
- Tap "Add to Home Screen"

The app works fully offline after first load, with changes syncing when you reconnect.

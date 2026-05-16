# 🕌 NasheedHub

A production-grade Spotify-style nasheed streaming platform built with **Next.js 14**, **Supabase**, and deployed on **Vercel**.

---

## ✨ Features

- 🎵 **Stream nasheeds** with a full-featured audio player (play/pause, skip, shuffle, repeat, volume)
- 🔍 **Search** by title, artist, or album with real-time results
- ❤️ **Like songs** and build personal playlists
- 📚 **Library** with liked songs, playlists, and listening history
- 🔐 **Full authentication** — email/password + Google OAuth, email verification, protected routes
- 🤖 **Automated scraper** to import nasheeds from external sources
- 📱 **Responsive** — works on mobile, tablet, and desktop
- ⚡ **Production-grade** — RLS policies, triggers, full-text search, play count tracking

---

## 🏗️ Tech Stack

| Layer       | Technology                    |
|-------------|-------------------------------|
| Frontend    | Next.js 14 (App Router)       |
| Styling     | Tailwind CSS + custom CSS vars|
| Database    | PostgreSQL via Supabase        |
| Auth        | Supabase Auth (JWT + RLS)     |
| State       | Zustand (player store)        |
| Deployment  | Vercel                        |
| Scraper     | Python 3.10+ / yt-dlp         |

---

## 🚀 Setup Guide

### 1. Clone the repo

```bash
git clone https://github.com/you/nasheed-hub.git
cd nasheed-hub
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a name, strong password, and region closest to your users
3. Wait ~2 minutes for provisioning

### 3. Run the database schema

1. In your Supabase dashboard → **SQL Editor**
2. Paste the contents of `supabase/schema.sql`
3. Click **Run**

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase → Settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from the same page (anon/public key)
- `SUPABASE_SERVICE_ROLE_KEY` — service_role key (keep this secret!)

### 5. Enable Google OAuth (optional)

1. Supabase dashboard → **Authentication** → **Providers** → Google → Enable
2. Create OAuth credentials at [console.cloud.google.com](https://console.cloud.google.com)
3. Add your Supabase callback URL as an authorized redirect URI

### 6. Run locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 🤖 Importing Nasheeds

### Option A: CSV import (easiest)

Create a CSV file with these columns:

```csv
title,audio_url,artist,album,cover_url,language,duration,tags
Tala Al Badru Alayna,https://example.com/tala.mp3,Maher Zain,Platinum Edition,...,Arabic,240,"nasheed,classic"
```

Then run:

```bash
cd scripts
pip install requests beautifulsoup4 supabase python-dotenv yt-dlp mutagen
python scraper.py --source csv --file my_nasheeds.csv
```

### Option B: Automated web scraper

```bash
# Scrape from IslamicFinder
python scraper.py --source islamicfinder --limit 100

# Dry run (don't import, just preview)
python scraper.py --source islamicfinder --limit 20 --dry-run
```

### Option C: YouTube playlist (for content you own/have rights to)

```bash
python scraper.py --source youtube-playlist --url "https://youtube.com/playlist?list=YOUR_PLAYLIST_ID" --limit 50
```

> ⚠️ **Important:** Only import nasheeds you have the rights to use. Respect copyright and content creators.

---

## 🚢 Deploying to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → import your repo
3. Add environment variables (same as `.env.local`) in Vercel's dashboard
4. Deploy!

Vercel will automatically deploy on every push to `main`.

---

## 📁 Project Structure

```
nasheed-hub/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx         # Login page
│   │   └── signup/page.tsx        # Signup page
│   ├── (main)/
│   │   ├── layout.tsx             # Sidebar + player shell
│   │   ├── page.tsx               # Home / discover
│   │   ├── search/page.tsx        # Search
│   │   └── library/page.tsx       # User library
│   ├── auth/callback/route.ts     # OAuth callback
│   └── globals.css                # Global styles + CSS vars
├── components/
│   ├── player/AudioPlayer.tsx     # Full audio player
│   └── ui/
│       ├── Sidebar.tsx            # Navigation sidebar
│       └── NasheedCard.tsx        # Track card (grid + list)
├── context/
│   └── playerStore.ts             # Zustand audio state
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Browser Supabase client
│   │   ├── server.ts              # Server Supabase client
│   │   └── middleware.ts          # Auth session refresh
│   └── types.ts                   # TypeScript types
├── supabase/
│   └── schema.sql                 # Full DB schema + RLS
├── scripts/
│   └── scraper.py                 # Nasheed importer
├── middleware.ts                  # Route protection
└── .env.example                   # Env vars template
```

---

## 🔒 Security

- **Row Level Security (RLS)** on all user tables — users can only access their own data
- **JWT authentication** via Supabase Auth
- **Server-side session refresh** via middleware
- **Email verification** required before login
- **Service role key** never exposed to the browser
- Password requirements enforced on signup

---

## 🛠️ Adding Features

### Add an admin panel
Create `app/(admin)/` with a check for `profile.is_admin === true`.

### Add audio storage (host your own files)
Use **Supabase Storage** — create a bucket called `nasheeds` (public), upload MP3s, and use the public URL as `audio_url`.

### Add push notifications
Integrate [OneSignal](https://onesignal.com) or Supabase Realtime for new nasheed alerts.

---

## 📜 License

MIT — free to use, modify, and distribute.

---

*Built with ❤️ for the Muslim community. May Allah accept it.*

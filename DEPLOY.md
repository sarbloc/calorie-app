# Deployment Guide

## Prerequisites
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Fill in your Supabase credentials in `.env`:
   - `VITE_SUPABASE_URL` — Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — Your Supabase anon/public key

## Build

```bash
npm install
npm run build
```

This creates a static `dist/` folder ready for hosting.

---

## Option A: Vercel (Recommended)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Set environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

Or connect your GitHub repo for automatic deployments.

---

## Option B: GitHub Pages

1. Add a `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          build_dir: dist
```

2. Push to `main` branch — the workflow handles the rest.

3. Enable GitHub Pages in repo Settings → Pages → Source: `gh-pages` branch.

---

## Telegram Mini App

To use as a Telegram Mini App:

1. Go to [@BotFather](https://t.me/botfather) in Telegram
2. Create/select your bot
3. Use `/newapp` to set your Mini App URL
4. Point it to your deployed URL (e.g., `https://username.github.io/calorie-app/`)

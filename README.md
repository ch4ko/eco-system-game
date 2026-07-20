# 🌍 Eco-System Board Game — Web App

Companion app for a board game where each team has three eco-system values —
**Trust**, **Environment**, **Economic** (0–10 each). Teams submit their scores
plus their richest player; the host reveals the **real-world countries whose
profiles match** and shows the rich-player card.

## Features
- **Team Submit** page: team name, three sliders (0–10) with a live total (max 30),
  and a free-text richest-person name + money.
- **Host Dashboard**: live list of every submitted team.
- **Reveal** view: the 4 closest countries (by Euclidean distance across the 3
  values), each with an archetype and a similarity %, plus the rich-player card.
- ~40 hand-authored countries in `data/countries.js` — edit freely to taste.
- Zero build step. Pure HTML/CSS/JS. Submissions saved in the browser (localStorage).

## Run locally
Just open `index.html` in a browser. Or serve it (recommended, so routing/paths behave):

```bash
# Python (already installed on most machines)
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy to Vercel (`your-name.vercel.app`)
`*.vercel.app` is the free subdomain Vercel gives every project.

**Option A — GitHub (auto-redeploys on every push):**
1. Push this folder to a GitHub repo.
2. Go to https://vercel.com → sign in with GitHub → **Add New → Project** → import the repo.
3. Framework preset: **Other** (it's a static site). Click **Deploy**.
4. You get `https://<your-name>.vercel.app`. Every push redeploys automatically.

**Option B — CLI (fastest):**
```bash
npm i -g vercel     # one-time
vercel              # from this folder; follow the prompts
vercel --prod       # promote to your production *.vercel.app URL
```

Free (Hobby) tier is plenty for a company event.

## How the matching works
Each team's `(trust, environment, economic)` is compared to every country using
straight-line (Euclidean) distance. The 4 smallest distances are shown, closest
first. Similarity % = `1 − distance / maxPossibleDistance`.

## Editing the country data
Open `data/countries.js` and add/adjust entries:
```js
{ name: "Portugal", flag: "🇵🇹", trust: 6, environment: 7, economic: 6, archetype: "The Steady Riser" }
```
Scores are game-flavor (not official indices) — tune them so matches feel fun.

## Multi-device sync (optional)
By default each device keeps its own list in localStorage. Perfect for **kiosk
mode**: run the app on one laptop/tablet that teams take turns entering on, and
the host reveals from the same device.

If you need team phones to submit to a shared host screen, add a small backend:
- **Supabase** (easiest, no server code): create a `teams` table, drop in the
  `@supabase/supabase-js` client, and swap the `load/save` functions in `app.js`
  for Supabase reads/writes with a realtime subscription.
- **Vercel KV / Postgres**: add a serverless route under `/api` and call it from
  `load/save`. Requires converting to a small Next.js or API-routes project.

## Files
| File | Purpose |
|------|---------|
| `index.html` | App shell + nav |
| `styles.css` | Styling |
| `data/countries.js` | Country reference dataset |
| `app.js` | Routing, storage, matching, rendering |
| `vercel.json` | Static deploy config |
| `note.txt` | Original idea + reviewed plan |
# eco-system-game

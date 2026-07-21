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

## Multi-device sync (phone → host screen)
The app now syncs through **Supabase** (free, no server code — your Vercel free
account is untouched). Team phones submit and the host screen updates live.

If you leave the keys in `data/config.js` blank, the app falls back to
single-device **localStorage** mode (kiosk: one device enters and reveals).

### One-time setup (~2 minutes)
1. Create a free account at https://supabase.com and make a new project.
2. In the project, open **SQL Editor** and run this:

   ```sql
   create table teams (
     id      text primary key,
     data    jsonb not null,
     created int8  not null
   );
   -- This is a fun party game, so allow anonymous read/write:
   alter table teams enable row level security;
   create policy "public read"   on teams for select using (true);
   create policy "public insert" on teams for insert with check (true);
   create policy "public delete" on teams for delete using (true);
   ```

3. Enable realtime for the table: **Database → Replication** (or **Realtime**)
   → add the `teams` table so the host screen refreshes automatically.
4. Open **Project Settings → API** and copy the **Project URL** and the
   **anon public** key.
5. Paste them into `data/config.js`:

   ```js
   window.SB_URL = "https://YOUR-PROJECT.supabase.co";
   window.SB_KEY = "eyJhbGci...your anon public key...";
   ```

6. Commit + push (or `vercel --prod`). Now every device sees the same list.

> The **anon public** key is safe to ship in the browser — that's what it's for.
> Because anyone with the link can write, keep the URL private to your event and
> use the Host **Clear all** button to reset between rounds.

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

# TaskFlow Planner

A clean task planner with **Projects**, **Today Schedule**, **Calendar day details**, and **Phone sync via GitHub Gist**.

## ✨ Features

### Tasks / Today
- Add tasks with title, notes, project, date, time, repeat, and color.
- Create/select projects (School, Work, Personal, etc.).
- Custom repeat weekdays (example: Monday + Wednesday).
- Search by task, notes, or project.

### Calendar
- Completion color shading for each day.
- Unfinished task color dots on each calendar day.
- Click/tap any day to see:
  - tasks done,
  - tasks pending.

### Settings
- Themes: Light (white), Dark (black), Light Gray, Dark Gray.
- Text size control.
- Navigation position for Today/Calendar/Settings tabs: top, bottom, left, or right (**default: left**).
- Navigation buttons are bigger by default, with a settings button to make them smaller.
- Main accent + calendar color presets + custom.
- Always fullscreen toggle + fullscreen button + quick button to enable auto-fullscreen on startup.

### Phone sync (GitHub Gist)
- Optional cross-device sync using one private Gist.
- Works across laptop + phone with same gist/token.

---

## 🔄 How to enable phone sync (GitHub)

1. Create a **GitHub personal access token** with `gist` permission.
2. Create a **private gist** with one file named `taskflow-sync.json` (content can be `{}`).
3. In app → **Settings → Phone sync (GitHub)**:
   - paste Token,
   - paste Gist ID,
   - click **Test**,
   - click **Pull now** (optional),
   - enable **Auto sync on changes**.
4. On phone, open same app and use same token + gist id.

Now edits on one device can sync to the other with Push/Pull (or Auto sync).

---

## 🚀 Run locally

### Laptop
```bash
python3 -m http.server 4173
```
Open: <http://localhost:4173>

### Phone (same Wi‑Fi)
```bash
python3 -m http.server 4173 --bind 0.0.0.0
```
Then open: `http://YOUR_LAPTOP_IP:4173`



## 🌐 Publish to GitHub Pages

1. Push this repo to GitHub.
2. In GitHub repo settings, open **Pages** and set source to **GitHub Actions**.
3. Push to branch `work` (or `main`/`master`).
4. The workflow `.github/workflows/deploy-pages.yml` deploys the site automatically.

After deploy, your app URL will be shown in the Actions run.

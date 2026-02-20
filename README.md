# TaskFlow Planner

A clean task planner web app with **Projects**, **Today Schedule**, **Calendar**, and **Settings**.

## ✨ Features

### Tasks / Today
- Add tasks with title, notes, project, date, time, repeat, and color.
- Create and assign tasks to **Projects** (ex: School, Work, Personal).
- Custom repeat by weekday (ex: Monday + Friday).
- Search by task title, notes, or project.
- Mark done / undo and delete tasks.

### Calendar
- Monthly calendar with completion shading.
- Shows **unfinished task colors** on each day so you can spot what is pending.
- Previous / next month navigation.

### Settings
- Themes: Light, Dark, Light Gray, Dark Gray.
- Text size controls (Tiny → XXL).
- Main accent color presets + custom color.
- Calendar low/high color presets + custom color.
- Always-fullscreen toggle + fullscreen enter/exit button.

### Data
- Auto-save in browser localStorage.
- Export/import JSON backup.

---

## 🚀 Run locally

### Laptop
```bash
python3 -m http.server 4173
```
Open: <http://localhost:4173>

### Phone (same Wi-Fi)
```bash
python3 -m http.server 4173 --bind 0.0.0.0
```
Then open: `http://YOUR_LAPTOP_IP:4173`

---

## 📁 Tech
- Vanilla HTML/CSS/JavaScript (no build step).
- Single-page tabbed UI.

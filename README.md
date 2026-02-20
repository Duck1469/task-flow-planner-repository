# TaskFlow Planner

A responsive 3-page to-do planner with a more structured phone-style layout:
- **Today**: add/search/complete tasks, time blocks, repeat rules, color tags.
- **Calendar**: monthly completion heatmap.
- **Settings**: theme, text size, and completion colors.

## Run locally

### On your laptop
```bash
python3 -m http.server 4173
```
Open: <http://localhost:4173>

### On your phone (same Wi-Fi)
1. Start server on all interfaces:
```bash
python3 -m http.server 4173 --bind 0.0.0.0
```
2. Find your laptop IP (example `192.168.1.23`).
3. Open on phone: `http://YOUR_IP:4173`

## Data and sync
- Progress is saved automatically in browser `localStorage`.
- Use **Export** and **Import** for manual cross-device transfer.

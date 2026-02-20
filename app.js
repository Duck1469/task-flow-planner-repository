const STORE_KEY = "taskflow-data-v1";
const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const state = {
  tasks: [],
  settings: {
    theme: "light",
    fontSize: 16,
    lowColor: "#ef4444",
    highColor: "#22c55e",
  },
  viewDate: new Date(),
  customWeekdays: [1, 3, 5],
};

const el = (id) => document.getElementById(id);
const fmtDate = (d) => new Date(d).toISOString().slice(0, 10);
const todayKey = () => fmtDate(new Date());

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const value = clean.length === 3 ? clean.split("").map((x) => x + x).join("") : clean;
  const n = parseInt(value, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mixColor(low, high, ratio) {
  const a = hexToRgb(low);
  const b = hexToRgb(high);
  const r = Math.round(a.r + (b.r - a.r) * ratio);
  const g = Math.round(a.g + (b.g - a.g) * ratio);
  const bl = Math.round(a.b + (b.b - a.b) * ratio);
  return `rgb(${r}, ${g}, ${bl})`;
}

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify({ tasks: state.tasks, settings: state.settings }));
}

function load() {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state.tasks = parsed.tasks || [];
    state.settings = { ...state.settings, ...(parsed.settings || {}) };
  } catch {
    // ignore invalid storage
  }
}

function appliesOnDate(task, dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const start = new Date(`${task.date}T00:00:00`);
  if (d < start) return false;
  if (task.repeat === "none") return task.date === dateStr;
  if (task.repeat === "daily") return true;
  if (task.repeat === "weekly") return d.getDay() === start.getDay();
  if (task.repeat === "monthly") return d.getDate() === start.getDate();
  if (task.repeat === "custom") return (task.weekdays || []).includes(d.getDay());
  return false;
}

function isCompleted(task, dateStr) {
  return !!task.completedDates?.includes(dateStr);
}

function tasksForDate(dateStr) {
  return state.tasks.filter((t) => appliesOnDate(t, dateStr));
}

function completionScore(dateStr) {
  const items = tasksForDate(dateStr);
  if (!items.length) return 0;
  const done = items.filter((t) => isCompleted(t, dateStr)).length;
  return done / items.length;
}

function renderTabs() {
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      el(btn.dataset.tab).classList.add("active");
      if (btn.dataset.tab === "calendar") renderCalendar();
    };
  });
}

function renderWeekdayChips() {
  const wrap = el("customDays");
  wrap.innerHTML = "";
  days.forEach((day, i) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `chip ${state.customWeekdays.includes(i) ? "active" : ""}`;
    chip.textContent = day;
    chip.onclick = () => {
      if (state.customWeekdays.includes(i)) {
        state.customWeekdays = state.customWeekdays.filter((x) => x !== i);
      } else {
        state.customWeekdays.push(i);
      }
      renderWeekdayChips();
    };
    wrap.appendChild(chip);
  });
}

function renderTasks() {
  const list = el("taskList");
  const q = el("taskSearch").value.toLowerCase().trim();
  const date = todayKey();
  const items = tasksForDate(date)
    .filter((t) => !q || t.title.toLowerCase().includes(q) || (t.notes || "").toLowerCase().includes(q))
    .sort((a, b) => a.start.localeCompare(b.start));

  el("todaySummary").textContent = `${items.filter((t) => isCompleted(t, date)).length}/${items.length} completed`;

  list.innerHTML = "";
  if (!items.length) {
    list.innerHTML = `<p class="muted">No tasks for today. Add one above.</p>`;
    return;
  }

  const tpl = el("taskTemplate");
  items.forEach((task) => {
    const node = tpl.content.cloneNode(true);
    node.querySelector(".dot").style.background = task.color;
    node.querySelector(".task-title").textContent = task.title;
    const every = task.repeat === "none" ? "" : ` · ${task.repeat}`;
    node.querySelector(".task-meta").textContent = `${task.start}–${task.end}${every}${task.notes ? ` · ${task.notes}` : ""}`;

    const completeBtn = node.querySelector(".completeBtn");
    completeBtn.textContent = isCompleted(task, date) ? "Undo" : "Done";
    completeBtn.onclick = () => {
      task.completedDates = task.completedDates || [];
      if (isCompleted(task, date)) {
        task.completedDates = task.completedDates.filter((d) => d !== date);
      } else {
        task.completedDates.push(date);
      }
      save();
      renderTasks();
      renderCalendar();
    };

    node.querySelector(".deleteBtn").onclick = () => {
      if (!confirm("Delete this task?")) return;
      state.tasks = state.tasks.filter((t) => t.id !== task.id);
      save();
      renderTasks();
      renderCalendar();
    };

    list.appendChild(node);
  });
}

function renderCalendar() {
  const date = state.viewDate;
  const year = date.getFullYear();
  const month = date.getMonth();
  el("monthLabel").textContent = date.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const grid = el("calendarGrid");
  grid.innerHTML = "";
  days.forEach((d) => {
    const h = document.createElement("div");
    h.className = "muted";
    h.textContent = d;
    grid.appendChild(h);
  });

  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < startPad; i++) {
    const empty = document.createElement("div");
    grid.appendChild(empty);
  }

  for (let day = 1; day <= totalDays; day++) {
    const key = fmtDate(new Date(year, month, day));
    const score = completionScore(key);
    const cell = document.createElement("article");
    cell.className = "day-cell";
    cell.style.background = score ? mixColor(state.settings.lowColor, state.settings.highColor, score) : "transparent";
    cell.innerHTML = `<span class="day-number">${day}</span><span class="day-score">${Math.round(score * 100)}%</span>`;
    grid.appendChild(cell);
  }
}

function applySettings() {
  document.body.classList.toggle("dark", state.settings.theme === "dark");
  document.body.style.fontSize = `${state.settings.fontSize}px`;
}

function setupHandlers() {
  el("date").value = todayKey();

  el("taskForm").onsubmit = (e) => {
    e.preventDefault();
    const start = el("startTime").value;
    const end = el("endTime").value;
    if (end <= start) return alert("End time must be after start time.");

    const repeat = el("repeat").value;
    const task = {
      id: crypto.randomUUID(),
      title: el("title").value.trim(),
      notes: el("notes").value.trim(),
      date: el("date").value,
      start,
      end,
      repeat,
      weekdays: repeat === "custom" ? [...state.customWeekdays] : [],
      color: el("color").value,
      completedDates: [],
    };
    if (!task.title) return;
    state.tasks.push(task);
    save();
    e.target.reset();
    el("date").value = todayKey();
    el("color").value = "#3b82f6";
    renderTasks();
    renderCalendar();
  };

  el("repeat").onchange = (e) => {
    const custom = e.target.value === "custom";
    el("customDays").classList.toggle("hidden", !custom);
  };

  el("taskSearch").oninput = renderTasks;
  el("quickAddBtn").onclick = () => el("title").focus();

  el("prevMonth").onclick = () => {
    state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() - 1, 1);
    renderCalendar();
  };
  el("nextMonth").onclick = () => {
    state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() + 1, 1);
    renderCalendar();
  };

  el("theme").value = state.settings.theme;
  el("fontSize").value = String(state.settings.fontSize);
  el("lowColor").value = state.settings.lowColor;
  el("highColor").value = state.settings.highColor;

  el("saveSettings").onclick = () => {
    state.settings.theme = el("theme").value;
    state.settings.fontSize = Number(el("fontSize").value);
    state.settings.lowColor = el("lowColor").value;
    state.settings.highColor = el("highColor").value;
    save();
    applySettings();
    renderCalendar();
    alert("Settings saved.");
  };

  el("exportBtn").onclick = () => {
    const blob = new Blob([JSON.stringify({ tasks: state.tasks, settings: state.settings }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "taskflow-backup.json";
    a.click();
  };

  el("importFile").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        state.tasks = parsed.tasks || [];
        state.settings = { ...state.settings, ...(parsed.settings || {}) };
        save();
        applySettings();
        renderTasks();
        renderCalendar();
        alert("Imported successfully.");
      } catch {
        alert("Invalid backup file.");
      }
    };
    reader.readAsText(file);
  };

  el("clearBtn").onclick = () => {
    if (!confirm("Clear all tasks and settings?")) return;
    localStorage.removeItem(STORE_KEY);
    state.tasks = [];
    state.settings = { theme: "light", fontSize: 16, lowColor: "#ef4444", highColor: "#22c55e" };
    applySettings();
    renderTasks();
    renderCalendar();
  };
}

load();
renderTabs();
renderWeekdayChips();
setupHandlers();
applySettings();
renderTasks();
renderCalendar();

const STORE_KEY = "taskflow-data-v4";
const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PRESETS = {
  main: ["#2563eb", "#7c3aed", "#0ea5e9", "#14b8a6", "#f97316"],
  task: ["#3b82f6", "#a855f7", "#06b6d4", "#22c55e", "#f97316", "#ef4444"],
  low: ["#ef4444", "#f97316", "#eab308", "#f43f5e"],
  high: ["#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6"],
};

const state = {
  tasks: [],
  settings: {
    theme: "light",
    fontSize: 16,
    mainColor: "#2563eb",
    lowColor: "#ef4444",
    highColor: "#22c55e",
    fullscreenDefault: true,
  },
  viewDate: new Date(),
  customWeekdays: [1, 3, 5],
  taskColor: "#3b82f6",
};

const el = (id) => document.getElementById(id);

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatHour(timeValue) {
  const [h, m] = timeValue.split(":").map(Number);
  const dt = new Date();
  dt.setHours(h, m, 0, 0);
  return dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

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
  const raw = localStorage.getItem(STORE_KEY)
    || localStorage.getItem("taskflow-data-v3")
    || localStorage.getItem("taskflow-data-v2")
    || localStorage.getItem("taskflow-data-v1");
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state.tasks = parsed.tasks || [];
    state.settings = { ...state.settings, ...(parsed.settings || {}) };
    state.taskColor = state.settings.mainColor || state.taskColor;
  } catch {
    // ignore invalid saved data
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
      document.querySelectorAll(`.tab[data-tab="${btn.dataset.tab}"]`).forEach((t) => t.classList.add("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      el(btn.dataset.tab).classList.add("active");
      if (btn.dataset.tab === "calendar") renderCalendar();
    };
  });
}

function renderColorPresets(containerId, colors, selectedColor, customInputId, onSelect) {
  const container = el(containerId);
  container.innerHTML = "";
  colors.forEach((color) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `color-preset ${selectedColor.toLowerCase() === color.toLowerCase() ? "active" : ""}`;
    btn.style.background = color;
    btn.title = color;
    btn.onclick = () => onSelect(color);
    container.appendChild(btn);
  });

  const customBtn = document.createElement("button");
  customBtn.type = "button";
  customBtn.className = "color-preset custom-preset";
  customBtn.title = "Custom color";
  customBtn.textContent = "+";
  customBtn.onclick = () => el(customInputId).classList.toggle("hidden");
  container.appendChild(customBtn);
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
      if (state.customWeekdays.includes(i)) state.customWeekdays = state.customWeekdays.filter((x) => x !== i);
      else state.customWeekdays.push(i);
      renderWeekdayChips();
    };
    wrap.appendChild(chip);
  });
}

function renderTasks() {
  const list = el("taskList");
  const q = el("taskSearch").value.toLowerCase().trim();
  const date = localDateKey();
  const items = tasksForDate(date)
    .filter((t) => !q || t.title.toLowerCase().includes(q) || (t.notes || "").toLowerCase().includes(q))
    .sort((a, b) => a.start.localeCompare(b.start));

  el("todaySummary").textContent = `${items.filter((t) => isCompleted(t, date)).length} / ${items.length}`;

  list.innerHTML = "";
  if (!items.length) {
    list.innerHTML = `<p class="muted">No tasks yet for today. Tap + Add task to create one.</p>`;
    return;
  }

  const tpl = el("taskTemplate");
  items.forEach((task) => {
    const node = tpl.content.cloneNode(true);
    const completed = isCompleted(task, date);

    node.querySelector(".dot").style.background = task.color;
    node.querySelector(".task-title").textContent = task.title;
    node.querySelector(".task-meta").textContent = task.notes || "No notes";
    node.querySelector(".task-time").textContent = `${formatHour(task.start)} - ${formatHour(task.end)}`;
    node.querySelector(".task-repeat").textContent = task.repeat === "none" ? "One time" : `Repeats ${task.repeat}`;

    const item = node.querySelector(".task-item");
    if (completed) item.classList.add("completed");

    const completeBtn = node.querySelector(".completeBtn");
    completeBtn.textContent = completed ? "Undo" : "Done";
    completeBtn.onclick = () => {
      task.completedDates = task.completedDates || [];
      if (isCompleted(task, date)) task.completedDates = task.completedDates.filter((d) => d !== date);
      else task.completedDates.push(date);
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
  for (let i = 0; i < startPad; i++) grid.appendChild(document.createElement("div"));

  for (let day = 1; day <= totalDays; day++) {
    const key = localDateKey(new Date(year, month, day));
    const score = completionScore(key);
    const cell = document.createElement("article");
    cell.className = "day-cell";
    cell.style.background = score ? mixColor(state.settings.lowColor, state.settings.highColor, score) : "transparent";
    cell.innerHTML = `<span class="day-number">${day}</span><span class="day-score muted">${Math.round(score * 100)}%</span>`;
    grid.appendChild(cell);
  }
}

function applySettings() {
  document.body.classList.remove("light", "dark", "light-gray", "dark-gray");
  document.body.classList.add(state.settings.theme);
  document.body.style.fontSize = `${state.settings.fontSize}px`;
  document.documentElement.style.setProperty("--primary", state.settings.mainColor);
}

async function enterFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    // Browser may block without user gesture.
  }
}

function setupPresetUI() {
  renderColorPresets("taskColorPresets", PRESETS.task, state.taskColor, "taskCustomColorInput", (color) => {
    state.taskColor = color;
    el("taskCustomColorInput").value = color;
    setupPresetUI();
  });
  renderColorPresets("mainColorPresets", PRESETS.main, state.settings.mainColor, "mainCustomColorInput", (color) => {
    state.settings.mainColor = color;
    el("mainCustomColorInput").value = color;
    applySettings();
    setupPresetUI();
  });
  renderColorPresets("lowColorPresets", PRESETS.low, state.settings.lowColor, "lowCustomColorInput", (color) => {
    state.settings.lowColor = color;
    el("lowCustomColorInput").value = color;
    renderCalendar();
    setupPresetUI();
  });
  renderColorPresets("highColorPresets", PRESETS.high, state.settings.highColor, "highCustomColorInput", (color) => {
    state.settings.highColor = color;
    el("highCustomColorInput").value = color;
    renderCalendar();
    setupPresetUI();
  });
}

function setupHandlers() {
  el("date").value = localDateKey();
  el("theme").value = state.settings.theme;
  el("fontSize").value = String(state.settings.fontSize);
  el("fullscreenDefault").checked = state.settings.fullscreenDefault;
  el("taskCustomColorInput").value = state.taskColor;
  el("mainCustomColorInput").value = state.settings.mainColor;
  el("lowCustomColorInput").value = state.settings.lowColor;
  el("highCustomColorInput").value = state.settings.highColor;

  setupPresetUI();

  el("toggleAddTaskBtn").onclick = () => {
    el("taskFormCard").classList.remove("hidden");
    el("title").focus();
  };
  el("closeTaskFormBtn").onclick = () => el("taskFormCard").classList.add("hidden");

  el("enterFullscreenNow").onclick = enterFullscreen;

  el("taskCustomColorInput").oninput = (e) => {
    state.taskColor = e.target.value;
    setupPresetUI();
  };
  el("mainCustomColorInput").oninput = (e) => {
    state.settings.mainColor = e.target.value;
    applySettings();
    setupPresetUI();
  };
  el("lowCustomColorInput").oninput = (e) => {
    state.settings.lowColor = e.target.value;
    renderCalendar();
    setupPresetUI();
  };
  el("highCustomColorInput").oninput = (e) => {
    state.settings.highColor = e.target.value;
    renderCalendar();
    setupPresetUI();
  };

  el("taskForm").onsubmit = (e) => {
    e.preventDefault();
    const start = el("startTime").value;
    const end = el("endTime").value;
    if (!start || !end || end <= start) return alert("End time must be after start time.");

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
      color: state.taskColor,
      completedDates: [],
    };

    if (!task.title) return;
    state.tasks.push(task);
    save();

    e.target.reset();
    el("date").value = localDateKey();
    el("repeat").value = "none";
    el("customDays").classList.add("hidden");
    el("taskFormCard").classList.add("hidden");

    renderTasks();
    renderCalendar();
  };

  el("repeat").onchange = (e) => el("customDays").classList.toggle("hidden", e.target.value !== "custom");
  el("taskSearch").oninput = renderTasks;

  el("prevMonth").onclick = () => {
    state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() - 1, 1);
    renderCalendar();
  };
  el("nextMonth").onclick = () => {
    state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() + 1, 1);
    renderCalendar();
  };

  el("saveSettings").onclick = async () => {
    state.settings.theme = el("theme").value;
    state.settings.fontSize = Number(el("fontSize").value);
    state.settings.fullscreenDefault = el("fullscreenDefault").checked;
    save();
    applySettings();
    renderCalendar();
    if (state.settings.fullscreenDefault) await enterFullscreen();
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
        state.taskColor = state.settings.mainColor;
        save();
        applySettings();
        setupHandlers();
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
    state.settings = {
      theme: "light",
      fontSize: 16,
      mainColor: "#2563eb",
      lowColor: "#ef4444",
      highColor: "#22c55e",
      fullscreenDefault: true,
    };
    state.taskColor = "#3b82f6";
    applySettings();
    setupPresetUI();
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
if (state.settings.fullscreenDefault) enterFullscreen();

const STORE_KEY = "taskflow-data-v5";
const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PRESETS = {
  main: ["#2563eb", "#1d4ed8", "#7c3aed", "#9333ea", "#0ea5e9", "#14b8a6", "#22c55e", "#eab308", "#f97316", "#ef4444", "#ec4899", "#06b6d4"],
  task: ["#3b82f6", "#a855f7", "#06b6d4", "#22c55e", "#f97316", "#ef4444"],
  low: ["#ef4444", "#f97316", "#eab308", "#f43f5e"],
  high: ["#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6"],
};

const state = {
  tasks: [],
  projects: ["General"],
  settings: {
    theme: "light",
    fontSize: 16,
    mainColor: "#2563eb",
    lowColor: "#ef4444",
    highColor: "#22c55e",
    fullscreenForever: false,
  },
  viewDate: new Date(),
  customWeekdays: [1, 5],
  taskColor: "#3b82f6",
};

const el = (id) => document.getElementById(id);

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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
  localStorage.setItem(STORE_KEY, JSON.stringify({ tasks: state.tasks, projects: state.projects, settings: state.settings }));
}

function load() {
  const raw = localStorage.getItem(STORE_KEY)
    || localStorage.getItem("taskflow-data-v4")
    || localStorage.getItem("taskflow-data-v3")
    || localStorage.getItem("taskflow-data-v2")
    || localStorage.getItem("taskflow-data-v1");
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state.tasks = parsed.tasks || [];
    state.projects = parsed.projects?.length ? parsed.projects : ["General"];
    state.settings = { ...state.settings, ...(parsed.settings || {}) };
    if (state.settings.fullscreenDefault !== undefined && state.settings.fullscreenForever === undefined) state.settings.fullscreenForever = !!state.settings.fullscreenDefault;
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
  return items.filter((t) => isCompleted(t, dateStr)).length / items.length;
}

function getUnfinishedColors(dateStr) {
  return [...new Set(tasksForDate(dateStr).filter((t) => !isCompleted(t, dateStr)).map((t) => t.color))];
}

function renderTabs() {
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(`.tab[data-tab="${btn.dataset.tab}"]`).forEach((t) => t.classList.add("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      el(btn.dataset.tab).classList.add("active");
      if (btn.dataset.tab === "calendar") renderCalendar();
      if (btn.dataset.tab === "settings") updateFullscreenToggleLabel();
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
    btn.onclick = () => onSelect(color);
    container.appendChild(btn);
  });
  const customBtn = document.createElement("button");
  customBtn.type = "button";
  customBtn.className = "color-preset custom-preset";
  customBtn.textContent = "+";
  customBtn.onclick = () => el(customInputId).classList.toggle("hidden");
  container.appendChild(customBtn);
}

function renderProjectSelect() {
  const select = el("projectSelect");
  select.innerHTML = "";
  state.projects.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    select.appendChild(opt);
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
      if (state.customWeekdays.includes(i)) state.customWeekdays = state.customWeekdays.filter((x) => x !== i);
      else state.customWeekdays.push(i);
      renderWeekdayChips();
    };
    wrap.appendChild(chip);
  });
}

function renderTasks() {
  const q = el("taskSearch").value.toLowerCase().trim();
  const list = el("taskList");
  const date = localDateKey();
  const items = tasksForDate(date)
    .filter((t) => !q || t.title.toLowerCase().includes(q) || (t.notes || "").toLowerCase().includes(q) || (t.project || "").toLowerCase().includes(q))
    .sort((a, b) => a.start.localeCompare(b.start));

  el("todaySummary").textContent = `${items.filter((t) => isCompleted(t, date)).length} / ${items.length}`;
  list.innerHTML = "";

  if (!items.length) {
    list.innerHTML = `<p class="muted">No tasks for today. Add one with + Add task.</p>`;
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
    node.querySelector(".task-repeat").textContent = task.repeat === "custom"
      ? `Custom: ${(task.weekdays || []).map((d) => days[d]).join(", ")}`
      : (task.repeat === "none" ? "One time" : `Repeats ${task.repeat}`);
    node.querySelector(".project-badge").textContent = task.project || "General";

    const item = node.querySelector(".task-item");
    if (completed) item.classList.add("completed");

    const completeBtn = node.querySelector(".completeBtn");
    completeBtn.textContent = completed ? "Undo" : "Done";
    completeBtn.onclick = () => {
      task.completedDates = task.completedDates || [];
      if (completed) task.completedDates = task.completedDates.filter((d) => d !== date);
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
    const colors = getUnfinishedColors(key).slice(0, 8);

    const cell = document.createElement("article");
    cell.className = "day-cell";
    cell.style.background = score ? mixColor(state.settings.lowColor, state.settings.highColor, score) : "transparent";

    const colorsMarkup = colors.length
      ? `<div class="day-colors">${colors.map((c) => `<span class="mini-dot" style="background:${c}"></span>`).join("")}</div>`
      : `<span class="day-score muted">All done</span>`;

    cell.innerHTML = `<span class="day-number">${day}</span>${colorsMarkup}`;
    grid.appendChild(cell);
  }
}

function applySettings() {
  document.body.classList.remove("light", "dark", "light-gray", "dark-gray");
  document.body.classList.add(state.settings.theme);
  document.body.style.fontSize = `${state.settings.fontSize}px`;
  document.documentElement.style.setProperty("--primary", state.settings.mainColor);
}

function updateFullscreenToggleLabel() {
  const btn = el("fullscreenToggleBtn");
  if (!btn) return;
  btn.textContent = document.fullscreenElement ? "Exit fullscreen" : "Enter fullscreen";
}

async function enterFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
  } catch {
    // user gesture/browser policy
  }
  updateFullscreenToggleLabel();
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    // user gesture/browser policy
  }
  updateFullscreenToggleLabel();
}

function setupPresetUI() {
  renderColorPresets("taskColorPresets", PRESETS.task, state.taskColor, "taskCustomColorInput", (c) => {
    state.taskColor = c;
    el("taskCustomColorInput").value = c;
    setupPresetUI();
  });
  renderColorPresets("mainColorPresets", PRESETS.main, state.settings.mainColor, "mainCustomColorInput", (c) => {
    state.settings.mainColor = c;
    el("mainCustomColorInput").value = c;
    applySettings();
    setupPresetUI();
  });
  renderColorPresets("lowColorPresets", PRESETS.low, state.settings.lowColor, "lowCustomColorInput", (c) => {
    state.settings.lowColor = c;
    el("lowCustomColorInput").value = c;
    renderCalendar();
    setupPresetUI();
  });
  renderColorPresets("highColorPresets", PRESETS.high, state.settings.highColor, "highCustomColorInput", (c) => {
    state.settings.highColor = c;
    el("highCustomColorInput").value = c;
    renderCalendar();
    setupPresetUI();
  });
}

function setupHandlers() {
  el("date").value = localDateKey();
  el("theme").value = state.settings.theme;
  el("fontSize").value = String(state.settings.fontSize);
  el("fullscreenForever").checked = state.settings.fullscreenForever;
  el("taskCustomColorInput").value = state.taskColor;
  el("mainCustomColorInput").value = state.settings.mainColor;
  el("lowCustomColorInput").value = state.settings.lowColor;
  el("highCustomColorInput").value = state.settings.highColor;

  renderProjectSelect();
  renderWeekdayChips();
  setupPresetUI();

  el("toggleAddTaskBtn").onclick = () => {
    el("taskFormCard").classList.remove("hidden");
    el("title").focus();
  };
  el("closeTaskFormBtn").onclick = () => el("taskFormCard").classList.add("hidden");

  el("repeat").onchange = (e) => {
    el("customDays").classList.toggle("hidden", e.target.value !== "custom");
  };

  el("fullscreenToggleBtn").onclick = toggleFullscreen;
  updateFullscreenToggleLabel();

  el("taskCustomColorInput").oninput = (e) => { state.taskColor = e.target.value; setupPresetUI(); };
  el("mainCustomColorInput").oninput = (e) => { state.settings.mainColor = e.target.value; applySettings(); setupPresetUI(); };
  el("lowCustomColorInput").oninput = (e) => { state.settings.lowColor = e.target.value; renderCalendar(); setupPresetUI(); };
  el("highCustomColorInput").oninput = (e) => { state.settings.highColor = e.target.value; renderCalendar(); setupPresetUI(); };

  el("taskSearch").oninput = renderTasks;

  el("taskForm").onsubmit = (e) => {
    e.preventDefault();
    const start = el("startTime").value;
    const end = el("endTime").value;
    if (!start || !end || end <= start) return alert("End time must be after start time.");

    const newProject = el("projectInput").value.trim();
    if (newProject && !state.projects.includes(newProject)) state.projects.push(newProject);
    const chosenProject = newProject || el("projectSelect").value || "General";

    const repeat = el("repeat").value;
    const task = {
      id: crypto.randomUUID(),
      title: el("title").value.trim(),
      notes: el("notes").value.trim(),
      project: chosenProject,
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

    renderProjectSelect();
    renderTasks();
    renderCalendar();
  };

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
    state.settings.fullscreenForever = el("fullscreenForever").checked;
    save();
    applySettings();
    renderCalendar();
    if (state.settings.fullscreenForever) await enterFullscreen();
    alert("Settings saved.");
  };

  el("exportBtn").onclick = () => {
    const blob = new Blob([JSON.stringify({ tasks: state.tasks, projects: state.projects, settings: state.settings }, null, 2)], { type: "application/json" });
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
        state.projects = parsed.projects?.length ? parsed.projects : ["General"];
        state.settings = { ...state.settings, ...(parsed.settings || {}) };
    if (state.settings.fullscreenDefault !== undefined && state.settings.fullscreenForever === undefined) state.settings.fullscreenForever = !!state.settings.fullscreenDefault;
        state.taskColor = state.settings.mainColor;
        save();
        applySettings();
        renderProjectSelect();
        setupPresetUI();
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
    state.projects = ["General"];
    state.settings = {
      theme: "light",
      fontSize: 16,
      mainColor: "#2563eb",
      lowColor: "#ef4444",
      highColor: "#22c55e",
      fullscreenForever: false,
    };
    state.taskColor = "#3b82f6";
    applySettings();
    renderProjectSelect();
    setupPresetUI();
    renderTasks();
    renderCalendar();
  };
}

load();
applySettings();
renderTabs();
setupHandlers();
renderTasks();
renderCalendar();
if (state.settings.fullscreenForever) enterFullscreen();
document.addEventListener("fullscreenchange", () => {
  updateFullscreenToggleLabel();
  if (!document.fullscreenElement && state.settings.fullscreenForever) enterFullscreen();
});

const STORE_KEY = "taskflow-data-v6";
const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SYNC_FILE = "taskflow-sync.json";

const PRESETS = {
  main: ["#2563eb", "#1d4ed8", "#7c3aed", "#9333ea", "#0ea5e9", "#14b8a6", "#22c55e", "#eab308", "#f97316", "#ef4444", "#ec4899", "#06b6d4"],
  task: ["#3b82f6", "#1d4ed8", "#a855f7", "#7c3aed", "#06b6d4", "#14b8a6", "#22c55e", "#84cc16", "#eab308", "#f59e0b", "#f97316", "#ef4444", "#ec4899", "#f43f5e"],
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
    bgEffect: "solid",
    weekStart: "sun",
    scheduleStyle: "agenda",
    calendarProject: "all",
    calendarPendingOnly: false,
    allowPastCalendarEdit: true,
    fullscreenForever: false,
    sync: { token: "", gistId: "", auto: false },
    navPosition: "left",
    navSize: "big",
  },
  viewDate: new Date(),
  selectedCalendarDate: null,
  customWeekdays: [1, 3],
  taskColor: "#3b82f6",
  editingTaskId: null,
  taskFilter: "all",
  taskSort: "time",
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
  const n = parseInt(clean.length === 3 ? clean.split("").map((x) => x + x).join("") : clean, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mixColor(low, high, ratio) {
  const a = hexToRgb(low);
  const b = hexToRgb(high);
  return `rgb(${Math.round(a.r + (b.r - a.r) * ratio)}, ${Math.round(a.g + (b.g - a.g) * ratio)}, ${Math.round(a.b + (b.b - a.b) * ratio)})`;
}

function packData() {
  return { tasks: state.tasks, projects: state.projects, settings: state.settings };
}

function applyData(data) {
  state.tasks = data.tasks || [];
  state.projects = data.projects?.length ? data.projects : ["General"];
  state.settings = { ...state.settings, ...(data.settings || {}) };
  if (state.settings.fullscreenDefault !== undefined && state.settings.fullscreenForever === undefined) {
    state.settings.fullscreenForever = !!state.settings.fullscreenDefault;
  }
  if (!state.settings.bgEffect) state.settings.bgEffect = "solid";
  if (!state.settings.weekStart) state.settings.weekStart = "sun";
  if (!state.settings.scheduleStyle) state.settings.scheduleStyle = "agenda";
  if (!state.settings.calendarProject) state.settings.calendarProject = "all";
  if (state.settings.calendarPendingOnly === undefined) state.settings.calendarPendingOnly = false;
  if (state.settings.allowPastCalendarEdit === undefined) state.settings.allowPastCalendarEdit = true;
  if (!state.settings.navPosition) state.settings.navPosition = "left";
  if (!state.settings.navSize) state.settings.navSize = "big";
  state.taskColor = state.settings.mainColor || state.taskColor;
}

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(packData()));
}

function load() {
  const raw = localStorage.getItem(STORE_KEY)
    || localStorage.getItem("taskflow-data-v5")
    || localStorage.getItem("taskflow-data-v4")
    || localStorage.getItem("taskflow-data-v3")
    || localStorage.getItem("taskflow-data-v2")
    || localStorage.getItem("taskflow-data-v1");
  if (!raw) return;
  try { applyData(JSON.parse(raw)); } catch { /* ignore */ }
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

function calendarTasksForDate(dateStr) {
  const project = el("calendarProjectFilter")?.value || state.settings.calendarProject || "all";
  const pendingOnly = !!el("calendarOnlyPending")?.checked;
  return tasksForDate(dateStr).filter((t) => {
    if (project !== "all" && (t.project || "General") !== project) return false;
    if (pendingOnly && isCompleted(t, dateStr)) return false;
    return true;
  });
}

function completionScore(dateStr) {
  const items = tasksForDate(dateStr);
  if (!items.length) return 0;
  return items.filter((t) => isCompleted(t, dateStr)).length / items.length;
}

function unfinishedColors(dateStr) {
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
    const b = document.createElement("button");
    b.type = "button";
    b.className = `color-preset ${selectedColor.toLowerCase() === color.toLowerCase() ? "active" : ""}`;
    b.style.background = color;
    b.onclick = () => onSelect(color);
    container.appendChild(b);
  });
  const custom = document.createElement("button");
  custom.type = "button";
  custom.className = "color-preset custom-preset";
  custom.textContent = "+";
  custom.onclick = () => el(customInputId).classList.toggle("hidden");
  container.appendChild(custom);
}

function renderProjectSelect() {
  const select = el("projectSelect");
  const current = select.value;
  select.innerHTML = "";
  state.projects.forEach((project) => {
    const o = document.createElement("option");
    o.value = project;
    o.textContent = project;
    select.appendChild(o);
  });
  if (current && state.projects.includes(current)) select.value = current;
}

function renderCalendarProjectFilter() {
  const select = el("calendarProjectFilter");
  if (!select) return;
  const current = state.settings.calendarProject || "all";
  select.innerHTML = '<option value="all">Calendar: All projects</option>';
  state.projects.forEach((project) => {
    const opt = document.createElement("option");
    opt.value = project;
    opt.textContent = `Calendar: ${project}`;
    select.appendChild(opt);
  });
  select.value = (current === "all" || state.projects.includes(current)) ? current : "all";
  state.settings.calendarProject = select.value;
}

function renderProjectManager() {
  const wrap = el("projectManagerList");
  if (!wrap) return;
  wrap.innerHTML = "";
  state.projects.forEach((project) => {
    const row = document.createElement("div");
    row.className = "project-row";

    const nameInput = document.createElement("input");
    nameInput.className = "input";
    nameInput.value = project;
    nameInput.maxLength = 50;

    const renameBtn = document.createElement("button");
    renameBtn.className = "btn small";
    renameBtn.textContent = "Save";
    renameBtn.onclick = async () => {
      const nextName = nameInput.value.trim();
      if (!nextName) return alert("Project name cannot be empty.");
      const duplicate = state.projects.find((p) => p.toLowerCase() === nextName.toLowerCase() && p !== project);
      if (duplicate) return alert("Project name already exists.");
      state.projects = state.projects.map((p) => (p === project ? nextName : p));
      state.tasks.forEach((t) => { if (t.project === project) t.project = nextName; });
      save();
      renderProjectSelect();
      renderCalendarProjectFilter();
      renderProjectManager();
      renderTasks();
      renderCalendar();
      if (state.settings.sync.auto) await pushSync();
    };

    const delBtn = document.createElement("button");
    delBtn.className = "btn small danger";
    delBtn.textContent = "Delete";
    delBtn.disabled = project === "General";
    delBtn.onclick = async () => {
      if (project === "General") return;
      if (!confirm(`Delete project "${project}"? Tasks will move to General.`)) return;
      state.projects = state.projects.filter((p) => p !== project);
      state.tasks.forEach((t) => { if (t.project === project) t.project = "General"; });
      save();
      renderProjectSelect();
      renderCalendarProjectFilter();
      renderProjectManager();
      renderTasks();
      renderCalendar();
      if (state.settings.sync.auto) await pushSync();
    };

    row.appendChild(nameInput);
    row.appendChild(renameBtn);
    row.appendChild(delBtn);
    wrap.appendChild(row);
  });
}

function renderCustomDaysSummary() {
  const summary = el("customDaysSummary");
  if (!summary) return;
  if (!state.customWeekdays.length) {
    summary.textContent = "Pick at least one weekday (example: Monday + Wednesday).";
    return;
  }
  summary.textContent = `Will repeat on: ${state.customWeekdays.map((d) => days[d]).join(", ")}`;
}

function renderWeekdayChips() {
  const wrap = el("customDays");
  wrap.innerHTML = "";
  days.forEach((day, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = day;
    opt.selected = state.customWeekdays.includes(i);
    wrap.appendChild(opt);
  });
  renderCustomDaysSummary();
  const repeatEl = el("repeat");
  const isCustom = repeatEl && repeatEl.value === "custom";
  el("customDaysWrap").classList.toggle("hidden", !isCustom);
  el("customDaysSummary").classList.toggle("hidden", !isCustom);
}

function renderTasks() {
  const q = el("taskSearch").value.toLowerCase().trim();
  const list = el("taskList");
  const date = localDateKey();
  const filter = el("taskFilter")?.value || state.taskFilter;
  const sortBy = el("taskSort")?.value || state.taskSort;
  state.taskFilter = filter;
  state.taskSort = sortBy;

  const items = tasksForDate(date)
    .filter((t) => !q || [t.title, t.notes, t.project].join(" ").toLowerCase().includes(q))
    .filter((t) => {
      if (filter === "done") return isCompleted(t, date);
      if (filter === "pending") return !isCompleted(t, date);
      return true;
    })
    .sort((a, b) => {
      if ((b.pinned ? 1 : 0) !== (a.pinned ? 1 : 0)) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      const prio = { high: 3, medium: 2, low: 1 };
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "project") return (a.project || "").localeCompare(b.project || "");
      if (sortBy === "priority") return (prio[b.priority || "medium"] || 2) - (prio[a.priority || "medium"] || 2);
      return a.start.localeCompare(b.start);
    });

  const doneCount = items.filter((t) => isCompleted(t, date)).length;
  el("todaySummary").textContent = `${doneCount} / ${items.length}`;
  el("remainingSummary").textContent = `${Math.max(items.length - doneCount, 0)} left`;
  el("todayProgress").style.width = `${items.length ? Math.round((doneCount / items.length) * 100) : 0}%`;
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
    node.querySelector(".task-time").textContent = task.allDay ? "All day" : `${formatHour(task.start)} - ${formatHour(task.end)}`;
    node.querySelector(".task-repeat").textContent = task.repeat === "custom"
      ? `Custom: ${(task.weekdays || []).map((d) => days[d]).join(", ")}`
      : (task.repeat === "none" ? "One time" : `Repeats ${task.repeat}`);
    node.querySelector(".project-badge").textContent = task.project || "General";
    const pr = task.priority || "medium";
    const prEl = node.querySelector(".priority-badge");
    prEl.textContent = `Priority: ${pr}`;
    prEl.classList.add(pr);
    if (completed) node.querySelector(".task-item").classList.add("completed");
    if (task.pinned) node.querySelector(".task-item").classList.add("pinned");

    node.querySelector(".pinBtn").textContent = task.pinned ? "Unpin" : "Pin";
    node.querySelector(".pinBtn").onclick = async () => {
      task.pinned = !task.pinned;
      save();
      renderTasks();
      if (state.settings.sync.auto) await pushSync();
    };

    node.querySelector(".editBtn").onclick = () => {
      state.editingTaskId = task.id;
      el("taskFormCard").classList.remove("hidden");
      el("title").value = task.title || "";
      el("notes").value = task.notes || "";
      el("date").value = task.date || localDateKey();
      el("repeat").value = task.repeat || "none";
      state.customWeekdays = [...(task.weekdays || [1, 3])];
      renderWeekdayChips();
      el("startTime").value = task.start || "";
      el("endTime").value = task.end || "";
      el("allDay").checked = !!task.allDay;
      el("startTime").disabled = !!task.allDay;
      el("endTime").disabled = !!task.allDay;
      el("startTime").required = !task.allDay;
      el("endTime").required = !task.allDay;
      el("timeRow").classList.toggle("hidden", !!task.allDay);
      if (state.projects.includes(task.project)) el("projectSelect").value = task.project;
      el("projectInput").value = "";
      el("priority").value = task.priority || "medium";
      state.taskColor = task.color || state.taskColor;
      setupPresetUI();
      el("title").focus();
    };

    node.querySelector(".duplicateBtn").onclick = async () => {
      const dup = {
        ...task,
        id: crypto.randomUUID(),
        title: `${task.title} (copy)`,
        pinned: false,
        completedDates: [],
      };
      state.tasks.push(dup);
      save();
      renderTasks();
      renderCalendar();
      if (state.settings.sync.auto) await pushSync();
    };

    const doneBtn = node.querySelector(".completeBtn");
    doneBtn.textContent = completed ? "Undo" : "Done";
    doneBtn.onclick = async () => {
      task.completedDates = task.completedDates || [];
      if (isCompleted(task, date)) task.completedDates = task.completedDates.filter((d) => d !== date);
      else task.completedDates.push(date);
      save();
      renderTasks();
      renderCalendar();
      if (state.settings.sync.auto) await pushSync();
    };

    node.querySelector(".deleteBtn").onclick = async () => {
      if (!confirm("Delete this task?")) return;
      state.tasks = state.tasks.filter((t) => t.id !== task.id);
      save();
      renderTasks();
      renderCalendar();
      if (state.settings.sync.auto) await pushSync();
    };

    list.appendChild(node);
  });
}

function renderCalendarDayPanel(dateStr) {
  state.selectedCalendarDate = dateStr;
  const title = el("calendarDayTitle");
  const panel = el("calendarDayTasks");
  const items = calendarTasksForDate(dateStr).sort((a, b) => a.start.localeCompare(b.start));
  title.textContent = new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  panel.innerHTML = "";
  if (!items.length) {
    panel.innerHTML = `<p class="muted">No tasks for this day.</p>`;
    return;
  }

  items.forEach((task) => {
    const row = document.createElement("article");
    row.className = "task-item";
    row.innerHTML = `<div class="time-col"><span class="task-time">${task.allDay ? "All day" : `${formatHour(task.start)} - ${formatHour(task.end)}`}</span></div>
      <div class="task-main"><div class="row align-start"><span class="dot" style="background:${task.color}"></span><div><h4 class="task-title">${task.title}</h4><p class="muted task-meta">${task.project || "General"} · ${isCompleted(task, dateStr) ? "Done" : "Pending"}</p></div></div></div>`;
    if (isCompleted(task, dateStr)) row.classList.add("completed");

    if (state.settings.allowPastCalendarEdit) {
      const controls = document.createElement("div");
      controls.className = "row gap8 mt8 wrap";

      const doneBtn = document.createElement("button");
      doneBtn.className = "btn small";
      doneBtn.type = "button";
      doneBtn.textContent = isCompleted(task, dateStr) ? "Undo" : "Done";
      doneBtn.onclick = async () => {
        task.completedDates = task.completedDates || [];
        if (isCompleted(task, dateStr)) task.completedDates = task.completedDates.filter((d) => d !== dateStr);
        else task.completedDates.push(dateStr);
        save();
        renderTasks();
        renderCalendar();
        if (state.settings.sync.auto) await pushSync();
      };

      const editBtn = document.createElement("button");
      editBtn.className = "btn small";
      editBtn.type = "button";
      editBtn.textContent = "Edit";
      editBtn.onclick = () => {
        document.querySelector('.tab[data-tab="tasks"]').click();
        state.editingTaskId = task.id;
        el("taskFormCard").classList.remove("hidden");
        el("title").value = task.title || "";
        el("notes").value = task.notes || "";
        el("date").value = task.date || localDateKey();
        el("repeat").value = task.repeat || "none";
        state.customWeekdays = [...(task.weekdays || [1, 3])];
        renderWeekdayChips();
        el("startTime").value = task.start || "";
        el("endTime").value = task.end || "";
        el("allDay").checked = !!task.allDay;
        el("startTime").disabled = !!task.allDay;
        el("endTime").disabled = !!task.allDay;
        el("startTime").required = !task.allDay;
        el("endTime").required = !task.allDay;
        el("timeRow").classList.toggle("hidden", !!task.allDay);
        if (state.projects.includes(task.project)) el("projectSelect").value = task.project;
        el("projectInput").value = "";
        el("priority").value = task.priority || "medium";
        state.taskColor = task.color || state.taskColor;
        setupPresetUI();
      };

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn small danger";
      deleteBtn.type = "button";
      deleteBtn.textContent = "Delete";
      deleteBtn.onclick = async () => {
        if (!confirm("Delete this task?")) return;
        state.tasks = state.tasks.filter((t) => t.id !== task.id);
        save();
        renderTasks();
        renderCalendar();
        if (state.settings.sync.auto) await pushSync();
      };

      controls.appendChild(doneBtn);
      controls.appendChild(editBtn);
      controls.appendChild(deleteBtn);
      row.querySelector(".task-main").appendChild(controls);
    }

    panel.appendChild(row);
  });
}

function updateCalendarNow() {
  const now = new Date();
  const label = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const node = el("calendarNow");
  if (node) node.textContent = `Now: ${label} · ${time}`;
}

function renderCalendar() {
  const date = state.viewDate;
  const year = date.getFullYear();
  const month = date.getMonth();
  el("monthLabel").textContent = date.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const grid = el("calendarGrid");
  grid.innerHTML = "";
  const orderedDays = state.settings.weekStart === "mon" ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
  orderedDays.forEach((dayIndex) => {
    const h = document.createElement("div");
    h.className = "muted";
    h.textContent = days[dayIndex];
    grid.appendChild(h);
  });

  const first = new Date(year, month, 1);
  const startPad = orderedDays.indexOf(first.getDay());
  const totalDays = new Date(year, month + 1, 0).getDate();
  for (let i = 0; i < startPad; i++) grid.appendChild(document.createElement("div"));

  for (let day = 1; day <= totalDays; day++) {
    const key = localDateKey(new Date(year, month, day));
    const dayItems = calendarTasksForDate(key);
    const completed = dayItems.filter((t) => isCompleted(t, key)).length;
    const score = dayItems.length ? completed / dayItems.length : 0;
    const colors = [...new Set(dayItems.filter((t) => !isCompleted(t, key)).map((t) => t.color))].slice(0, 8);
    const cell = document.createElement("article");
    cell.className = "day-cell";
    if (key === localDateKey()) cell.classList.add("today");
    cell.style.background = score ? mixColor(state.settings.lowColor, state.settings.highColor, score) : "transparent";
    cell.innerHTML = `<span class="day-number">${day}</span><div class="day-colors">${colors.map((c) => `<span class='mini-dot' style='background:${c}'></span>`).join("")}</div>`;
    cell.onclick = () => renderCalendarDayPanel(key);
    grid.appendChild(cell);
  }

  const selected = state.selectedCalendarDate || localDateKey(new Date(year, month, 1));
  renderCalendarDayPanel(selected);
  updateCalendarNow();
}


function applySettings() {
  document.body.classList.remove("light", "dark", "light-gray", "dark-gray");
  document.body.classList.remove("effect-solid", "effect-sunset", "effect-ocean", "effect-aurora");
  document.body.classList.remove("schedule-agenda", "schedule-cards", "schedule-compact");
  document.body.classList.add(state.settings.theme);
  document.body.classList.add(`effect-${state.settings.bgEffect || "solid"}`);
  document.body.classList.add(`schedule-${state.settings.scheduleStyle || "agenda"}`);
  document.body.style.fontSize = `${state.settings.fontSize}px`;
  document.documentElement.style.setProperty("--primary", state.settings.mainColor);
  document.body.classList.remove("nav-down", "nav-up", "nav-left", "nav-right");
  document.body.classList.add(`nav-${state.settings.navPosition || "left"}`);
  document.body.classList.toggle("nav-compact", state.settings.navSize === "small");
}

function updateFullscreenToggleLabel() {
  const btn = el("fullscreenToggleBtn");
  if (!btn) return;
  btn.textContent = document.fullscreenElement ? "Exit fullscreen" : "Enter fullscreen";
}

async function enterFullscreen() {
  try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); } catch {}
  updateFullscreenToggleLabel();
}

function setupFullscreenAutoRetry() {
  if (!state.settings.fullscreenForever) return;
  const retry = () => {
    if (state.settings.fullscreenForever && !document.fullscreenElement) enterFullscreen();
  };
  document.addEventListener("pointerdown", retry, { once: true });
  document.addEventListener("keydown", retry, { once: true });
}

function ensureFullscreenIfEnabled() {
  if (!state.settings.fullscreenForever) return;
  enterFullscreen();
  setupFullscreenAutoRetry();
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {}
  updateFullscreenToggleLabel();
}

function syncStatus(msg) { el("syncStatus").textContent = msg; }

async function pushSync() {
  const { token, gistId } = state.settings.sync;
  if (!token || !gistId) return syncStatus("Set token + gist id first.");
  const body = { files: { [SYNC_FILE]: { content: JSON.stringify(packData(), null, 2) } } };
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    body: JSON.stringify(body),
  });
  syncStatus(res.ok ? "Pushed to GitHub sync." : `Push failed (${res.status}).`);
}

async function pullSync() {
  const { token, gistId } = state.settings.sync;
  if (!token || !gistId) return syncStatus("Set token + gist id first.");
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return syncStatus(`Pull failed (${res.status}).`);
  const gist = await res.json();
  const file = gist.files?.[SYNC_FILE];
  if (!file?.content) return syncStatus(`No ${SYNC_FILE} in gist.`);
  try {
    applyData(JSON.parse(file.content));
    save();
    applySettings();
    renderProjectSelect();
    renderCalendarProjectFilter();
    setupPresetUI();
    renderTasks();
    renderCalendar();
    syncStatus("Pulled from GitHub sync.");
  } catch {
    syncStatus("Sync file is invalid JSON.");
  }
}

async function testSync() {
  const { token, gistId } = state.settings.sync;
  if (!token || !gistId) return syncStatus("Set token + gist id first.");
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  syncStatus(res.ok ? "Sync connected ✅" : `Sync test failed (${res.status})`);
}

function setupPresetUI() {
  renderColorPresets("taskColorPresets", PRESETS.task, state.taskColor, "taskCustomColorInput", (c) => {
    state.taskColor = c; el("taskCustomColorInput").value = c; setupPresetUI();
  });
  renderColorPresets("mainColorPresets", PRESETS.main, state.settings.mainColor, "mainCustomColorInput", (c) => {
    state.settings.mainColor = c; el("mainCustomColorInput").value = c; applySettings(); setupPresetUI();
  });
  renderColorPresets("lowColorPresets", PRESETS.low, state.settings.lowColor, "lowCustomColorInput", (c) => {
    state.settings.lowColor = c; el("lowCustomColorInput").value = c; renderCalendar(); setupPresetUI();
  });
  renderColorPresets("highColorPresets", PRESETS.high, state.settings.highColor, "highCustomColorInput", (c) => {
    state.settings.highColor = c; el("highCustomColorInput").value = c; renderCalendar(); setupPresetUI();
  });
}

function setupHandlers() {
  el("date").value = localDateKey();
  el("theme").value = state.settings.theme;
  el("bgEffect").value = state.settings.bgEffect || "solid";
  el("weekStart").value = state.settings.weekStart || "sun";
  el("scheduleStyle").value = state.settings.scheduleStyle || "agenda";
  el("fontSize").value = String(state.settings.fontSize);
  el("navPosition").value = state.settings.navPosition || "left";
  el("fullscreenForever").checked = state.settings.fullscreenForever;
  el("taskCustomColorInput").value = state.taskColor;
  el("mainCustomColorInput").value = state.settings.mainColor;
  el("lowCustomColorInput").value = state.settings.lowColor;
  el("highCustomColorInput").value = state.settings.highColor;
  el("syncToken").value = state.settings.sync.token || "";
  el("syncGistId").value = state.settings.sync.gistId || "";
  el("syncAuto").checked = !!state.settings.sync.auto;
  el("calendarOnlyPending").checked = !!state.settings.calendarPendingOnly;
  el("allowPastCalendarEdit").checked = !!state.settings.allowPastCalendarEdit;
  el("taskFilter").value = state.taskFilter;
  el("taskSort").value = state.taskSort;
  el("toggleNavSizeBtn").textContent = state.settings.navSize === "small" ? "Make buttons bigger" : "Make buttons smaller";

  renderProjectSelect();
  renderCalendarProjectFilter();
  renderProjectManager();
  renderWeekdayChips();
  setupPresetUI();

  el("toggleAddTaskBtn").onclick = () => {
    state.editingTaskId = null;
    el("taskFormCard").classList.remove("hidden");
    el("repeat").value = "custom";
    renderWeekdayChips();
    el("title").focus();
  };
  el("closeTaskFormBtn").onclick = () => el("taskFormCard").classList.add("hidden");
  el("repeat").onchange = (e) => {
    const custom = e.target.value === "custom";
    el("customDaysWrap").classList.toggle("hidden", !custom);
    el("customDaysSummary").classList.toggle("hidden", !custom);
    if (custom) renderCustomDaysSummary();
  };

  el("customDays").onchange = (e) => {
    state.customWeekdays = Array.from(e.target.selectedOptions).map((o) => Number(o.value));
    renderCustomDaysSummary();
  };

  el("allDay").onchange = (e) => {
    const allDay = e.target.checked;
    el("startTime").disabled = allDay;
    el("endTime").disabled = allDay;
    el("startTime").required = !allDay;
    el("endTime").required = !allDay;
    el("timeRow").classList.toggle("hidden", allDay);
    if (allDay) {
      el("startTime").value = "00:00";
      el("endTime").value = "23:59";
    } else {
      el("startTime").value = "";
      el("endTime").value = "";
    }
  };

  el("taskSearch").oninput = renderTasks;
  el("calendarProjectFilter").onchange = () => {
    state.settings.calendarProject = el("calendarProjectFilter").value;
    save();
    renderCalendar();
  };
  el("calendarOnlyPending").onchange = () => {
    state.settings.calendarPendingOnly = el("calendarOnlyPending").checked;
    save();
    renderCalendar();
  };
  el("taskFilter").onchange = renderTasks;
  el("taskSort").onchange = renderTasks;
  el("markAllDoneBtn").onclick = async () => {
    const today = localDateKey();
    let changed = false;
    tasksForDate(today).forEach((task) => {
      task.completedDates = task.completedDates || [];
      if (!task.completedDates.includes(today)) {
        task.completedDates.push(today);
        changed = true;
      }
    });
    if (!changed) return alert("All visible tasks are already marked done.");
    save();
    renderTasks();
    renderCalendar();
    if (state.settings.sync.auto) await pushSync();
  };
  el("clearDoneTodayBtn").onclick = async () => {
    const today = localDateKey();
    let changed = false;
    state.tasks.forEach((task) => {
      const before = task.completedDates?.length || 0;
      task.completedDates = (task.completedDates || []).filter((d) => d !== today);
      if ((task.completedDates?.length || 0) !== before) changed = true;
    });
    if (!changed) return alert("No completed tasks to clear for today.");
    save();
    renderTasks();
    renderCalendar();
    if (state.settings.sync.auto) await pushSync();
  };
  el("fullscreenToggleBtn").onclick = toggleFullscreen;
  updateFullscreenToggleLabel();

  el("enableAutoFullscreenBtn").onclick = async () => {
    state.settings.fullscreenForever = true;
    el("fullscreenForever").checked = true;
    save();
    ensureFullscreenIfEnabled();
    alert("Auto fullscreen enabled. It will try fullscreen each time you open the website.");
  };

  el("toggleNavSizeBtn").onclick = () => {
    state.settings.navSize = state.settings.navSize === "small" ? "big" : "small";
    el("toggleNavSizeBtn").textContent = state.settings.navSize === "small" ? "Make buttons bigger" : "Make buttons smaller";
    applySettings();
    save();
  };

  el("taskCustomColorInput").oninput = (e) => { state.taskColor = e.target.value; setupPresetUI(); };
  el("mainCustomColorInput").oninput = (e) => { state.settings.mainColor = e.target.value; applySettings(); setupPresetUI(); };
  el("lowCustomColorInput").oninput = (e) => { state.settings.lowColor = e.target.value; renderCalendar(); setupPresetUI(); };
  el("highCustomColorInput").oninput = (e) => { state.settings.highColor = e.target.value; renderCalendar(); setupPresetUI(); };

  el("syncPushBtn").onclick = pushSync;
  el("syncPullBtn").onclick = pullSync;
  el("syncTestBtn").onclick = testSync;

  el("taskForm").onsubmit = async (e) => {
    e.preventDefault();
    const allDay = el("allDay").checked;
    const start = allDay ? "00:00" : el("startTime").value;
    const end = allDay ? "23:59" : el("endTime").value;
    if (!allDay && (!start || !end || end <= start)) return alert("End time must be after start time.");

    const newProject = el("projectInput").value.trim();
    if (newProject && !state.projects.includes(newProject)) state.projects.push(newProject);
    const chosenProject = newProject || el("projectSelect").value || "General";

    const repeat = el("repeat").value;
    if (repeat === "custom" && !state.customWeekdays.length) return alert("Pick at least one custom weekday.");

    const task = {
      id: state.editingTaskId || crypto.randomUUID(),
      title: el("title").value.trim(),
      notes: el("notes").value.trim(),
      project: chosenProject,
      priority: el("priority").value,
      date: el("date").value,
      start,
      end,
      repeat,
      weekdays: repeat === "custom" ? [...state.customWeekdays] : [],
      allDay,
      color: state.taskColor,
      pinned: false,
      completedDates: [],
    };

    if (!task.title) return;
    if (state.editingTaskId) {
      state.tasks = state.tasks.map((t) => (t.id === state.editingTaskId
        ? { ...task, pinned: !!t.pinned, completedDates: t.completedDates || [] }
        : t));
    } else {
      state.tasks.push(task);
    }
    save();
    if (state.settings.sync.auto) await pushSync();

    e.target.reset();
    el("date").value = localDateKey();
    el("repeat").value = "custom";
    el("allDay").checked = false;
    el("priority").value = "medium";
    el("startTime").disabled = false;
    el("endTime").disabled = false;
    el("startTime").required = true;
    el("endTime").required = true;
    el("timeRow").classList.remove("hidden");
    renderWeekdayChips();
    el("taskFormCard").classList.add("hidden");
    state.editingTaskId = null;

    renderProjectSelect();
    renderCalendarProjectFilter();
    renderProjectManager();
    renderTasks();
    renderCalendar();
  };

  el("prevMonth").onclick = () => { state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() - 1, 1); renderCalendar(); };
  el("nextMonth").onclick = () => { state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() + 1, 1); renderCalendar(); };

  el("saveSettings").onclick = async () => {
    state.settings.theme = el("theme").value;
    state.settings.bgEffect = el("bgEffect").value;
    state.settings.weekStart = el("weekStart").value;
    state.settings.scheduleStyle = el("scheduleStyle").value;
    state.settings.fontSize = Number(el("fontSize").value);
    state.settings.navPosition = el("navPosition").value;
    state.settings.fullscreenForever = el("fullscreenForever").checked;
    state.settings.sync.token = el("syncToken").value.trim();
    state.settings.sync.gistId = el("syncGistId").value.trim();
    state.settings.sync.auto = el("syncAuto").checked;
    state.settings.calendarProject = el("calendarProjectFilter").value;
    state.settings.calendarPendingOnly = el("calendarOnlyPending").checked;
    state.settings.allowPastCalendarEdit = el("allowPastCalendarEdit").checked;
    save();
    applySettings();
    renderCalendar();
    ensureFullscreenIfEnabled();
    if (state.settings.sync.auto) await pushSync();
    alert("Settings saved.");
  };

  el("exportBtn").onclick = () => {
    const blob = new Blob([JSON.stringify(packData(), null, 2)], { type: "application/json" });
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
        applyData(JSON.parse(reader.result));
        save();
        applySettings();
        setupHandlers();
        renderTasks();
        renderCalendar();
        syncStatus("Imported successfully.");
      } catch {
        syncStatus("Invalid backup file.");
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
      bgEffect: "solid",
      weekStart: "sun",
      scheduleStyle: "agenda",
      calendarProject: "all",
      calendarPendingOnly: false,
      allowPastCalendarEdit: true,
      fullscreenForever: false,
      sync: { token: "", gistId: "", auto: false },
      navPosition: "left",
      navSize: "big",
    };
    state.taskColor = "#3b82f6";
    applySettings();
    setupHandlers();
    renderTasks();
    renderCalendar();
    syncStatus("Cleared.");
  };
}

load();
applySettings();
renderTabs();
setupHandlers();
renderTasks();
renderCalendar();
ensureFullscreenIfEnabled();
document.addEventListener("fullscreenchange", () => {
  updateFullscreenToggleLabel();
  if (!document.fullscreenElement && state.settings.fullscreenForever) ensureFullscreenIfEnabled();
});
updateCalendarNow();
setInterval(updateCalendarNow, 60000);

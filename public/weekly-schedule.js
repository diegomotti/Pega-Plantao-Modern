const weeklyMonth = document.querySelector("#weekly-month");
const weeklyDays = document.querySelector("#weekly-days");
const weeklySectors = document.querySelector("#weekly-sectors");
const weeklyEmpty = document.querySelector("#weekly-empty");
const sectorSearch = document.querySelector("#sector-search");
const shiftModal = document.querySelector("#create-shift-modal");
const shiftForm = document.querySelector("#create-shift-form");
const shiftNotice = document.querySelector("#shift-notice");
const shiftDate = document.querySelector("#shift-date");
const shiftSector = document.querySelector("#shift-sector");
const shiftRepeat = document.querySelector("#shift-repeat");
const shiftRepeatFields = document.querySelector("#shift-repeat-fields");

const sectors = ["Setor Omar Philips", "Setor Pediatria Delicada II"];
const exampleShifts = {
  1: [{ name: "Alfonso Calzoni", tone: "green", status: "◉" }],
  2: [
    { name: "Gretchen George", tone: "yellow", status: "◔" },
    { name: "Gretchen Dias", tone: "red", status: "◔" },
  ],
  3: [
    { name: "Alena Septimus", tone: "blue", status: "◉" },
    { name: "Nolan Lubin" },
    { name: "Hanna Donin" },
  ],
  4: [
    { name: "Chance Workman" },
    { name: "Kaylynn Vetrovs" },
    { name: "Tiana Herwitz" },
    { name: "Gretchen Vaccaro" },
  ],
  5: [{ name: "Aspen Korsgaard" }, { name: "Jaxson Rosser" }, { name: "Skylar Saris" }],
  6: [{ name: "Nolan Lubin" }, { name: "Nolan Lubin" }],
};

function startOfWeek(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  return start;
}

let today = new Date();
let weekStart = startOfWeek(today);

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatMonth(date) {
  const month = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", "");
  return `${month.charAt(0).toUpperCase()}${month.slice(1)}/${String(date.getFullYear()).slice(-2)}`;
}

function renderWeeklySchedule() {
  const todayKey = dateKey(today);
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return date;
  });
  const end = dates[6];
  weeklyMonth.textContent = formatMonth(weekStart);
  if (weekStart.getMonth() !== end.getMonth() || weekStart.getFullYear() !== end.getFullYear()) {
    weeklyMonth.textContent += ` – ${formatMonth(end)}`;
  }

  weeklyDays.replaceChildren(...dates.map((date) => {
    const day = document.createElement("div");
    day.className = "pp-weekly-day";
    const isToday = dateKey(date) === todayKey;
    day.classList.toggle("pp-weekly-day--highlight", isToday);
    if (isToday) day.setAttribute("aria-current", "date");
    day.setAttribute("aria-label", new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(date));
    const number = document.createElement("span");
    number.textContent = date.getDate();
    const weekday = document.createElement("small");
    weekday.textContent = new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", "");
    day.append(number, weekday);
    return day;
  }));

  const query = sectorSearch.value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const visibleSectors = sectors.filter((sector) =>
    sector.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(query)
  );
  weeklyEmpty.hidden = visibleSectors.length > 0;
  weeklySectors.replaceChildren(...visibleSectors.map((sector) => {
    const row = document.createElement("section");
    row.className = "pp-weekly-sector";
    row.setAttribute("aria-label", sector);

    const info = document.createElement("div");
    info.className = "pp-weekly-sector-info";
    const title = document.createElement("h2");
    title.className = "text-[13px] font-medium text-gray-800";
    title.textContent = sector;
    info.append(title);
    info.insertAdjacentHTML("beforeend", `
      <button type="button" class="pp-weekly-outline-btn" data-weekly-placeholder="Replicar">
        <pp-icon type="tools" name="copy" class="size-4"></pp-icon>Replicar
      </button>
      <div class="pp-weekly-restricted">
        <span>Visualização Restrita<br><button type="button" class="text-primary-500 hover:underline" data-weekly-placeholder="Configurações">Configurações</button></span>
        <pp-icon type="tools" name="eyeClosed" class="size-4"></pp-icon>
      </div>
    `);

    const columns = document.createElement("div");
    columns.className = "pp-weekly-row";
    dates.forEach((date) => {
      const key = dateKey(date);
      const column = document.createElement("div");
      column.className = "pp-weekly-column";
      column.classList.toggle("pp-weekly-column--highlight", key === todayKey);
      const add = document.createElement("button");
      add.type = "button";
      add.className = "pp-weekly-add";
      add.dataset.shiftDate = key;
      add.dataset.shiftSector = sector;
      add.setAttribute("aria-label", `Adicionar plantão em ${date.toLocaleDateString("pt-BR")}, ${sector}`);
      add.innerHTML = '<pp-icon type="tools" name="plus" class="size-4"></pp-icon>';
      column.append(add);
      (exampleShifts[(date.getDay() + 6) % 7] || []).forEach((shift) => {
        const card = document.createElement("div");
        card.className = "pp-weekly-shift";
        if (shift.tone) card.classList.add(`pp-weekly-shift--${shift.tone}`);
        const person = document.createElement("span");
        person.textContent = shift.name;
        if (shift.status) {
          const status = document.createElement("span");
          status.className = "block text-[13px] leading-3";
          status.setAttribute("aria-hidden", "true");
          status.textContent = shift.status;
          person.append(status);
        }
        const time = document.createElement("span");
        time.className = "pp-weekly-time";
        time.innerHTML = "19:00<br>07:00";
        card.append(person, time);
        column.append(card);
      });
      columns.append(column);
    });

    row.append(info, columns, document.createElement("div"));
    return row;
  }));
}

document.querySelector("#previous-week").addEventListener("click", () => {
  weekStart.setDate(weekStart.getDate() - 7);
  renderWeeklySchedule();
});
document.querySelector("#next-week").addEventListener("click", () => {
  weekStart.setDate(weekStart.getDate() + 7);
  renderWeeklySchedule();
});
sectorSearch.addEventListener("input", renderWeeklySchedule);
document.querySelector("main").addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const add = event.target.closest("[data-shift-date]");
  if (add) {
    shiftForm.reset();
    shiftDate.value = add.dataset.shiftDate;
    shiftSector.value = add.dataset.shiftSector;
    syncSelects(shiftForm);
    shiftRepeatFields.disabled = true;
    shiftNotice.hidden = true;
    selectShiftSection("informacoes");
    shiftModal.showModal();
    return;
  }
  const button = event.target.closest("[data-weekly-placeholder]");
  if (button) showToast(`${button.dataset.weeklyPlaceholder} — em construção.`);
});

function selectShiftSection(section) {
  shiftModal.querySelectorAll("[data-shift-section]").forEach((button) => {
    if (button.dataset.shiftSection === section) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });
  shiftModal.querySelector('[data-shift-panel="informacoes"]').hidden = section !== "informacoes";
  const otherSection = document.querySelector("#shift-other-section");
  otherSection.hidden = section === "informacoes";
  if (section !== "informacoes") {
    document.querySelector("#shift-other-title").textContent =
      shiftModal.querySelector(`[data-shift-section="${section}"] span`).textContent;
  }
}

shiftModal.querySelectorAll("[data-shift-section]").forEach((button) => {
  button.addEventListener("click", () => selectShiftSection(button.dataset.shiftSection));
});
shiftModal.querySelector("[data-shift-close]").addEventListener("click", () => shiftModal.close());
shiftModal.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || event.defaultPrevented) return;
  event.preventDefault();
  shiftModal.close();
});
shiftRepeat.addEventListener("change", () => {
  shiftRepeatFields.disabled = !shiftRepeat.checked;
});

function updateShiftDuration() {
  const start = document.querySelector("#shift-start-time").value;
  const end = document.querySelector("#shift-end-time").value;
  const duration = document.querySelector("#shift-duration");
  if (!start || !end) {
    duration.value = "";
    return;
  }
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const minutes = (endHour * 60 + endMinute - startHour * 60 - startMinute + 1440) % 1440;
  duration.value = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

shiftForm.addEventListener("input", (event) => {
  if (event.target.id === "shift-start-time" || event.target.id === "shift-end-time") updateShiftDuration();
});
shiftModal.querySelector("[data-shift-reset]").addEventListener("click", () => {
  shiftForm.reset();
  syncSelects(shiftForm);
  shiftRepeatFields.disabled = true;
  updateShiftDuration();
  shiftNotice.hidden = true;
});
shiftForm.addEventListener("submit", (event) => {
  event.preventDefault();
  shiftNotice.textContent = "A criação de plantões ainda não está disponível. Nenhum dado foi salvo.";
  shiftNotice.hidden = false;
});

renderWeeklySchedule();

let midnightTimer;
function refreshToday() {
  const now = new Date();
  if (dateKey(now) !== dateKey(today)) {
    if (dateKey(weekStart) === dateKey(startOfWeek(today))) {
      weekStart = startOfWeek(now);
    }
    today = now;
    renderWeeklySchedule();
  }
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  clearTimeout(midnightTimer);
  midnightTimer = setTimeout(refreshToday, nextMidnight.getTime() - now.getTime());
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshToday();
});
refreshToday();

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
const shiftPreview = document.querySelector("#shift-preview");
const SHIFT_PREVIEW_DELAY = 500;
let shiftPreviewTimer;
let shiftPreviewCard;
const weeklyPlace = document.querySelector("#weekly-place");
const weeklyPlaceTitle = document.querySelector("#weekly-place-title");
const weeklyShowCheckinout = document.querySelector("#weekly-show-checkinout");

const sectors = ["Setor Omar Philips", "Setor Pediatria Delicada II", "Setor UTI Neonatal", "Setor Cardiologia"];
const exampleShifts = {
  1: [{
      name: "Alfonso Calzoni",
      tone: "green",
      status: "done",
      checkin: "19:04",
      checkout: "07:02",
      comment: "Cheguei alguns minutos depois por causa do trânsito.",
    }],
  2: [
    { name: "Gretchen George", tone: "yellow", status: "undone" },
    { name: "Gretchen Dias", tone: "red", status: "alert", checkin: "19:41" },
  ],
  3: [
    { name: "Alena Septimus", tone: "blue", status: "waiting" },
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

/* Ícones de check-in dos cartões (Lumen DS, type "services"). */
const checkinStatus = {
  done: { icon: "checkinDone", label: "Check-in realizado" },
  undone: { icon: "checkinUndone", label: "Check-in não realizado" },
  alert: { icon: "checkinAlert", label: "Alerta no check-in" },
  waiting: { icon: "checkinWaiting", label: "Aguardando check-in" },
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

function shiftTypeName(shift) {
  return shift.type || "Plantão";
}

function renderWeeklySchedule() {
  hideShiftPreview();
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
      add.innerHTML = '<pp-icon type="services" name="add" class="size-5"></pp-icon>';
      column.append(add);
      const weekday = (date.getDay() + 6) % 7;
      const orderByType = document.querySelector('input[name="weekly-order"]:checked')?.value === "type";
      const dayShifts = (exampleShifts[weekday] || []).map((shift, index) => ({ shift, index }));
      if (orderByType) {
        dayShifts.sort((a, b) => shiftTypeName(a.shift).localeCompare(shiftTypeName(b.shift), "pt-BR"));
      }
      dayShifts.forEach(({ shift, index }) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "pp-weekly-shift";
        card.dataset.shiftEdit = `${weekday}:${index}`;
        card.dataset.shiftEditDate = key;
        card.dataset.shiftEditSector = sector;
        if (shift.tone) card.classList.add(`pp-weekly-shift--${shift.tone}`);
        const person = document.createElement("span");
        person.textContent = shift.name;
        const checkin = checkinStatus[shift.status];
        if (checkin) {
          const status = document.createElement("pp-icon");
          status.className = "pp-weekly-checkin";
          status.setAttribute("type", "services");
          status.setAttribute("name", checkin.icon);
          status.setAttribute("role", "img");
          status.setAttribute("aria-label", checkin.label);
          status.title = checkin.label;
          person.append(status);
        }
        if (weeklyShowCheckinout?.checked && (shift.checkin || shift.checkout)) {
          const times = document.createElement("small");
          times.className = "pp-weekly-checkinout";
          times.textContent = `E ${shift.checkin || "--:--"} · S ${shift.checkout || "--:--"}`;
          person.append(times);
        }
        const time = document.createElement("span");
        time.className = "pp-weekly-time";
        time.innerHTML = "19:00<br>07:00";
        card.setAttribute(
          "aria-label",
          `Alterar plantão de ${shift.name}, ${date.toLocaleDateString("pt-BR")}, 19:00 às 07:00${checkin ? `, ${checkin.label}` : ""}`
        );
        card.append(person, time);
        column.append(card);
      });
      columns.append(column);
    });

    row.append(info, columns, document.createElement("div"));
    return row;
  }));
}

/* ------------------------------------------- calendário (ícone do período) */
/* Igual à escala atual: o ícone de calendário abre um mês; escolher um dia
   leva a escala para a semana dele. Teclado: setas mudam o dia, PageUp/
   PageDown o mês, Home/End o início/fim da semana, Enter escolhe. */
const datePicker = document.querySelector("#weekly-date-picker");
const datePickerTitle = document.querySelector("#weekly-date-picker-title");
const datePickerBody = datePicker?.querySelector("[data-calendar-body]");
let calendarFocus = new Date(weekStart);

function addCalendarDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addCalendarMonths(date, months) {
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(date.getDate(), lastDay));
  return next;
}

function renderDatePicker(focusDay = false) {
  if (!datePicker) return;
  const month = calendarFocus.getMonth();
  const year = calendarFocus.getFullYear();
  datePickerTitle.textContent = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(calendarFocus);
  const selectedWeek = dateKey(weekStart);
  const todayKey = dateKey(today);
  const focusKey = dateKey(calendarFocus);
  let cursor = startOfWeek(new Date(year, month, 1));
  const rows = [];
  while (rows.length === 0 || cursor.getMonth() === month) {
    const row = document.createElement("tr");
    row.className = "pp-calendar__week";
    row.classList.toggle("pp-calendar__week--selected", dateKey(cursor) === selectedWeek);
    for (let index = 0; index < 7; index += 1) {
      const date = new Date(cursor);
      const key = dateKey(date);
      const cell = document.createElement("td");
      cell.setAttribute("role", "gridcell");
      const day = document.createElement("button");
      day.type = "button";
      day.className = "pp-calendar__day";
      day.textContent = date.getDate();
      day.dataset.calendarDate = key;
      day.tabIndex = key === focusKey ? 0 : -1;
      day.setAttribute("aria-label", new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(date));
      if (key === focusKey) day.dataset.dialogMenuAutofocus = "";
      if (date.getMonth() !== month) day.dataset.outside = "";
      if (key === todayKey) day.setAttribute("aria-current", "date");
      if (row.classList.contains("pp-calendar__week--selected")) cell.setAttribute("aria-selected", "true");
      cell.append(day);
      row.append(cell);
      cursor = addCalendarDays(cursor, 1);
    }
    rows.push(row);
  }
  datePickerBody.replaceChildren(...rows);
  if (focusDay) datePickerBody.querySelector('[tabindex="0"]')?.focus();
}

function pickCalendarDate(date) {
  weekStart = startOfWeek(date);
  renderWeeklySchedule();
  datePicker.dispatchEvent(new CustomEvent("dialog-menu-close"));
}

datePicker?.addEventListener("dialog-menu-open", () => {
  calendarFocus = new Date(weekStart);
  renderDatePicker();
});
datePicker?.querySelector("[data-calendar-prev]").addEventListener("click", () => {
  calendarFocus = addCalendarMonths(calendarFocus, -1);
  renderDatePicker();
});
datePicker?.querySelector("[data-calendar-next]").addEventListener("click", () => {
  calendarFocus = addCalendarMonths(calendarFocus, 1);
  renderDatePicker();
});
datePicker?.querySelector("[data-calendar-today]").addEventListener("click", () => pickCalendarDate(today));
datePickerBody?.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const day = event.target.closest("[data-calendar-date]");
  if (day) pickCalendarDate(new Date(`${day.dataset.calendarDate}T00:00:00`));
});
datePickerBody?.addEventListener("keydown", (event) => {
  const moves = {
    ArrowLeft: (date) => addCalendarDays(date, -1),
    ArrowRight: (date) => addCalendarDays(date, 1),
    ArrowUp: (date) => addCalendarDays(date, -7),
    ArrowDown: (date) => addCalendarDays(date, 7),
    PageUp: (date) => addCalendarMonths(date, -1),
    PageDown: (date) => addCalendarMonths(date, 1),
    Home: (date) => startOfWeek(date),
    End: (date) => addCalendarDays(startOfWeek(date), 6),
  };
  const move = moves[event.key];
  if (!move) return;
  event.preventDefault();
  calendarFocus = move(calendarFocus);
  renderDatePicker(true);
});

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
  const card = event.target.closest("[data-shift-edit]");
  if (card instanceof HTMLElement) {
    openShiftEdit(card);
    return;
  }
  const add = event.target.closest("[data-shift-date]");
  if (add) {
    prepareShiftForm("create");
    shiftDate.value = add.dataset.shiftDate;
    shiftSector.value = add.dataset.shiftSector;
    syncSelects(shiftForm);
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
  shiftModal.querySelectorAll("[data-shift-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.shiftPanel !== section;
  });
  shiftModal.querySelector("[data-shift-history]").setAttribute("aria-pressed", String(section === "historico"));
  if (section === "habilidades") renderShiftSkills();
  if (section === "pagamentos") syncPaymentValues();
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
  hideShiftNotice();
  resetShiftTabs();
});

/* Aviso dentro do modal: some sozinho após 6s (pausa com o mouse em cima ou
   com o foco no botão de fechar) e pode ser fechado pelo X. */
const shiftNoticeText = shiftNotice.querySelector("[data-shift-notice-text]");
const SHIFT_NOTICE_TIMEOUT = 6000;
let shiftNoticeTimer;

function hideShiftNotice() {
  clearTimeout(shiftNoticeTimer);
  shiftNotice.hidden = true;
}

function startShiftNoticeTimer() {
  clearTimeout(shiftNoticeTimer);
  if (!shiftNotice.hidden) shiftNoticeTimer = setTimeout(hideShiftNotice, SHIFT_NOTICE_TIMEOUT);
}

function showShiftNotice(message) {
  shiftNotice.hidden = false;
  shiftNoticeText.textContent = "";
  requestAnimationFrame(() => {
    shiftNoticeText.textContent = message;
  });
  startShiftNoticeTimer();
}

shiftNotice.addEventListener("pointerenter", () => clearTimeout(shiftNoticeTimer));
shiftNotice.addEventListener("pointerleave", startShiftNoticeTimer);
shiftNotice.addEventListener("focusin", () => clearTimeout(shiftNoticeTimer));
shiftNotice.addEventListener("focusout", startShiftNoticeTimer);
shiftNotice.querySelector("[data-shift-notice-close]").addEventListener("click", () => {
  hideShiftNotice();
  shiftForm.querySelector('[type="submit"]').focus();
});

shiftForm.addEventListener("submit", (event) => {
  event.preventDefault();
  showShiftNotice(
    shiftModal.dataset.mode === "edit"
      ? "A alteração de plantões ainda não está disponível. Nenhum dado foi salvo."
      : "A criação de plantões ainda não está disponível. Nenhum dado foi salvo."
  );
});

/* --------------------------------------- modo "Alterar Plantão" (edição) */
const shiftTimeFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" });

function setShiftMode(mode) {
  const edit = mode === "edit";
  shiftModal.dataset.mode = mode;
  shiftModal.querySelector("[data-shift-title]").textContent = edit ? "Alterar Plantão" : "Criar Plantão";
  shiftModal.querySelector("[data-shift-submit]").textContent = edit ? "Atualizar plantão" : "Salvar e criar plantão";
  shiftModal.querySelectorAll("[data-edit-only]").forEach((element) => (element.hidden = !edit));
  shiftModal.querySelectorAll("[data-create-only]").forEach((element) => (element.hidden = edit));
}

function prepareShiftForm(mode) {
  setShiftMode(mode);
  shiftForm.reset();
  shiftRepeatFields.disabled = true;
  hideShiftNotice();
  document.querySelector("#shift-professional-comment").textContent = "";
  document.querySelector("#shift-history-list").replaceChildren();
  setTimesCopied(false);
  resetShiftTabs();
}

function setSelectValue(select, value) {
  if (!Array.from(select.options).some((option) => option.value === value)) select.add(new Option(value));
  select.value = value;
}

function addDays(key, days) {
  const [year, month, day] = key.split("-").map(Number);
  return dateKey(new Date(year, month - 1, day + days));
}

function renderShiftHistory(shift, key, sector) {
  const [year, month, day] = key.split("-").map(Number);
  const created = new Date(year, month - 1, day - 30, 12, 5, 50);
  const confirmation = new Date(year, month - 1, day - 10, 15, 34, 42);
  const entries = [
    { when: confirmation, changes: [["Solicitação de confirmação", "Aguardando"]] },
    {
      when: created,
      changes: [
        ["Data", new Date(year, month - 1, day).toLocaleDateString("pt-BR")],
        ["Início", "19:00"],
        ["Duração", "12:00"],
        ["Anunciado", "Não"],
        ["Precisa de cobertura", "Não"],
        ["Profissional fixo", shift.name],
        ["Profissional de plantão", shift.name],
        ["Situação", "Designado"],
        ["Tipo", shift.type || "Plantão"],
        ["Valor", currency.format(shift.value ?? 1250)],
        ["Setor", sector],
        ["Solicitação de confirmação", "Não solicitado"],
        ["Status de pagamento", "Não pago"],
      ],
    },
  ];
  document.querySelector("#shift-history-list").replaceChildren(
    ...entries.map((entry) => {
      const item = document.createElement("li");
      const title = document.createElement("p");
      title.className = "pp-shift-history__title";
      title.innerHTML = `<strong>Pega Plantão</strong> - ${shiftTimeFormat.format(entry.when).replace(",", " às")}`;
      const list = document.createElement("dl");
      entry.changes.forEach(([label, value]) => {
        const row = document.createElement("div");
        const term = document.createElement("dt");
        term.textContent = `${label}:`;
        const detail = document.createElement("dd");
        detail.textContent = value;
        row.append(term, detail);
        list.append(row);
      });
      item.append(title, list);
      return item;
    })
  );
}

function openShiftEdit(card) {
  const [weekday, index] = card.dataset.shiftEdit.split(":").map(Number);
  const shift = exampleShifts[weekday]?.[index];
  if (!shift) return;
  const key = card.dataset.shiftEditDate;
  const sector = card.dataset.shiftEditSector;
  prepareShiftForm("edit");

  setSelectValue(shiftSector, sector);
  setSelectValue(document.querySelector("#shift-type"), shift.type || "Plantão");
  shiftDate.value = key;
  document.querySelector("#shift-start-time").value = "19:00";
  document.querySelector("#shift-end-time").value = "07:00";
  updateShiftDuration();
  shiftValue.value = String(shift.value ?? 1250);
  setSelectValue(document.querySelector("#shift-fixed-professional"), shift.name);
  setSelectValue(document.querySelector("#shift-professional"), shift.name);
  setSelectValue(document.querySelector("#shift-situation"), "Designado");

  document.querySelector("#shift-checkin-date").value = shift.checkin ? key : "";
  document.querySelector("#shift-checkin-time").value = shift.checkin || "";
  document.querySelector("#shift-checkout-date").value = shift.checkout ? addDays(key, 1) : "";
  document.querySelector("#shift-checkout-time").value = shift.checkout || "";
  document.querySelector("#shift-professional-comment").textContent =
    shift.comment || "O profissional não deixou um comentário.";
  renderShiftHistory(shift, key, sector);

  syncSelects(shiftForm);
  syncPaymentValues();
  selectShiftSection("informacoes");
  shiftModal.showModal();
}

shiftModal.querySelector("[data-shift-history]").addEventListener("click", (event) => {
  const showing = event.currentTarget.getAttribute("aria-pressed") === "true";
  selectShiftSection(showing ? "informacoes" : "historico");
});
/* "Copiar dados do plantão": depois de copiar, o botão (outline) fica verde com
   "Dados do plantão copiados"; volta ao normal ao mexer nos registros. */
const copyTimesButton = shiftModal.querySelector("[data-shift-copy-times]");
const copyTimesFields = ["#shift-checkin-date", "#shift-checkin-time", "#shift-checkout-date", "#shift-checkout-time"];

function setTimesCopied(copied) {
  copyTimesButton.classList.toggle("pp-btn--green", copied);
  copyTimesButton.querySelector("[data-copy-label]").textContent = copied
    ? "Dados do plantão copiados"
    : "Copiar dados do plantão";
  const icon = copyTimesButton.querySelector("[data-copy-icon]");
  icon.setAttribute("type", copied ? "tools" : "tools");
  icon.setAttribute("name", copied ? "save" : "copy");
  icon.setAttribute("monochrome", copied ? "true" : "false");
}

copyTimesFields.forEach((selector) => {
  document.querySelector(selector).addEventListener("input", () => setTimesCopied(false));
});

copyTimesButton.addEventListener("click", () => {
  setTimesCopied(true);
  const start = document.querySelector("#shift-start-time").value;
  const end = document.querySelector("#shift-end-time").value;
  document.querySelector("#shift-checkin-date").value = shiftDate.value;
  document.querySelector("#shift-checkin-time").value = start;
  document.querySelector("#shift-checkout-date").value =
    shiftDate.value && end && start && end <= start ? addDays(shiftDate.value, 1) : shiftDate.value;
  document.querySelector("#shift-checkout-time").value = end;
});
shiftModal.querySelector("[data-shift-delete]").addEventListener("click", () => {
  showShiftNotice("A exclusão de plantões ainda não está disponível. Nenhum dado foi alterado.");
});
shiftModal.querySelector("[data-shift-cancel-schedule]").addEventListener("click", () => {
  showShiftNotice("O cancelamento de agenda ainda não está disponível. Nenhum dado foi alterado.");
});

/* Setores e profissionais das listas vêm dos dados de exemplo da escala. */
function fillSelect(select, values, keepFirst) {
  const first = keepFirst ? select.options[0] : null;
  select.replaceChildren(...(first ? [first] : []), ...values.map((value) => new Option(value)));
}
const exampleProfessionals = [...new Set(Object.values(exampleShifts).flat().map((shift) => shift.name))].sort((a, b) =>
  a.localeCompare(b, "pt-BR")
);
fillSelect(shiftSector, sectors, false);
fillSelect(document.querySelector("#shift-fixed-professional"), exampleProfessionals, true);
fillSelect(document.querySelector("#shift-professional"), exampleProfessionals, true);

/* ------------------------------------------- abas extras do Criar Plantão */
const shiftValue = shiftForm.querySelector('input[name="value"]');
const paymentValue = document.querySelector("#shift-payment-value");
const paymentsBody = document.querySelector("#shift-payments-body");
const announceToggle = document.querySelector("#shift-announce");
const announceFields = document.querySelector("#shift-announce-fields");
const announceSearch = document.querySelector("#shift-announce-search");
const announceList = document.querySelector("#shift-announce-list");
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const decimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* Habilidades de exemplo, só para ilustrar a comparação. */
const exampleSkills = {
  "Alfonso Calzoni": ["Suporte avançado de vida (ACLS)", "Intubação orotraqueal", "Plantão em UTI"],
  "Gretchen George": ["Suporte avançado de vida (ACLS)", "Atendimento pediátrico", "Ultrassonografia"],
  "Alena Septimus": ["Atendimento pediátrico", "Plantão em UTI", "Ultrassonografia"],
};

function renderShiftSkills() {
  const fixed = document.querySelector("#shift-fixed-professional").value;
  const onDuty = document.querySelector("#shift-professional").value;
  document.querySelector('[data-skills-name="fixed"]').textContent = fixed || "Nenhum selecionado";
  document.querySelector('[data-skills-name="shift"]').textContent = onDuty || "Nenhum selecionado";
  const fixedSkills = exampleSkills[fixed] ?? [];
  const onDutySkills = exampleSkills[onDuty] ?? [];
  const skills = [...new Set([...fixedSkills, ...onDutySkills])].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const body = document.querySelector("#shift-skills-body");
  const mark = (has) =>
    has
      ? '<pp-icon type="ui" name="check" stroke-width="3" class="text-green-500" aria-hidden="true"></pp-icon><span class="sr-only">Possui</span>'
      : '<span aria-hidden="true">—</span><span class="sr-only">Não possui</span>';
  body.innerHTML = skills
    .map((skill) => `<tr><td>${skill}</td><td>${mark(fixedSkills.includes(skill))}</td><td>${mark(onDutySkills.includes(skill))}</td></tr>`)
    .join("");
  const empty = document.querySelector("#shift-skills-empty");
  empty.hidden = skills.length > 0;
  empty.textContent =
    fixed || onDuty
      ? "Os profissionais selecionados não têm habilidades cadastradas."
      : "Selecione o profissional fixo ou o profissional de plantão na aba Informações para comparar as habilidades.";
}

function syncAnnounce() {
  announceFields.disabled = !announceToggle.checked;
}

function filterAnnounce() {
  const term = announceSearch.value.trim().toLocaleLowerCase("pt-BR");
  let visible = 0;
  announceList.querySelectorAll("li").forEach((item) => {
    const match = !term || item.textContent.toLocaleLowerCase("pt-BR").includes(term);
    item.hidden = !match;
    if (match) visible += 1;
  });
  document.querySelector("#shift-announce-empty").hidden = visible > 0;
}

announceToggle.addEventListener("change", syncAnnounce);
announceSearch.addEventListener("input", filterAnnounce);
announceList.addEventListener("change", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  const items = announceList.querySelectorAll('input:not([data-announce-all])');
  const all = announceList.querySelector("[data-announce-all]");
  if (input === all) items.forEach((item) => (item.checked = all.checked));
  const checked = Array.from(items).filter((item) => item.checked).length;
  all.checked = checked === items.length;
  all.indeterminate = checked > 0 && checked < items.length;
});

function paymentsTotal() {
  return Array.from(paymentsBody.querySelectorAll('input[name="payment-value"]')).reduce(
    (sum, input) => sum + (Number(input.value) || 0),
    0
  );
}

function syncPaymentValues() {
  const value = Number(shiftValue.value) || 0;
  if (document.activeElement !== paymentValue) paymentValue.value = shiftValue.value;
  document.querySelector("#shift-configured-value").value = decimal.format(Number(shiftValue.defaultValue) || 0);
  document.querySelector("#shift-gross-value").value = decimal.format(value * 1.2);
  document.querySelector("#shift-paid-total").textContent = currency.format(paymentsTotal());
  document.querySelector("#shift-payments-empty").hidden = paymentsBody.children.length > 0;
}

paymentValue.addEventListener("input", () => {
  shiftValue.value = paymentValue.value;
  syncPaymentValues();
});
shiftValue.addEventListener("input", syncPaymentValues);

let paymentId = 0;
function addPayment() {
  paymentId += 1;
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const row = document.createElement("tr");
  row.innerHTML = `
    <td><input type="date" name="payment-date" class="pp-input w-52" value="${iso}" aria-label="Data do pagamento ${paymentId}" /></td>
    <td><input type="text" name="payment-value" class="pp-input w-52" placeholder="${shiftValue.value}" aria-label="Valor pago ${paymentId}" /></td>
    <td><input type="text" name="payment-note" class="pp-input w-full" placeholder="Observação" aria-label="Observação do pagamento ${paymentId}" /></td>
    <td><button type="button" class="pp-btn pp-btn--red pp-btn--outline pp-btn--icon" title="Remover pagamento" aria-label="Remover pagamento ${paymentId}" data-remove-payment>
      <pp-icon type="tools" name="delete" class="size-5"></pp-icon></button></td>`;
  paymentsBody.append(row);
  syncPaymentValues();
  row.querySelector('input[name="payment-value"]').focus();
}

shiftModal.querySelector("[data-shift-add-payment]").addEventListener("click", addPayment);
paymentsBody.addEventListener("click", (event) => {
  const button = event.target instanceof Element && event.target.closest("[data-remove-payment]");
  if (!button) return;
  button.closest("tr").remove();
  syncPaymentValues();
  shiftModal.querySelector("[data-shift-add-payment]").focus();
});
paymentsBody.addEventListener("input", syncPaymentValues);
shiftModal.querySelector("[data-shift-placeholder]").addEventListener("click", (event) => {
  showToast(`${event.currentTarget.dataset.shiftPlaceholder} — em construção.`);
});

function resetShiftTabs() {
  paymentsBody.replaceChildren();
  announceList.querySelector("[data-announce-all]").indeterminate = false;
  announceSearch.value = "";
  filterAnnounce();
  syncAnnounce();
  renderShiftSkills();
  syncPaymentValues();
}

renderWeeklySchedule();

/* ------------------------------------ legenda "Tipos de Plantão" (ícone i) */
/* A lista vem das opções do select Tipo do modal: uma única fonte de cores. */
function renderServiceTypeIndex() {
  const list = document.querySelector("[data-service-type-index]");
  const typeSelect = document.querySelector("#shift-type");
  if (!list || !typeSelect) return;
  list.replaceChildren(...Array.from(typeSelect.options).map((option) => {
    const item = document.createElement("li");
    item.className = "pp-dialog-menu__type";
    item.textContent = option.text;
    if (option.dataset.color) item.style.setProperty("--pp-dialog-menu-type", option.dataset.color);
    return item;
  }));
}
renderServiceTypeIndex();

/* ------------------------------------------------- filtro (pp-dialog-menu) */
weeklyPlace?.addEventListener("change", () => {
  weeklyPlaceTitle.textContent = weeklyPlace.value;
});
document.querySelectorAll('input[name="weekly-order"], #weekly-show-checkinout').forEach((input) => {
  input.addEventListener("change", renderWeeklySchedule);
});

/* ------------------------------------- prévia do plantão (hover no card) */
/* Igual à escala atual: passar o mouse sobre o card mostra, após um atraso,
   um pp-dialog-menu só de leitura com profissionais, situação, registros e
   tipo. Com o teclado, a prévia aparece no foco do card. */

function shiftPreviewSection(title, value) {
  const section = document.createElement("div");
  section.className = "pp-dialog-menu__section";
  const label = document.createElement("span");
  label.className = "pp-dialog-menu__title";
  label.textContent = title;
  const text = document.createElement("span");
  text.className = "pp-dialog-menu__value";
  text.textContent = value;
  section.append(label, text);
  return section;
}

function fillShiftPreview(card) {
  const [weekday, index] = card.dataset.shiftEdit.split(":").map(Number);
  const shift = exampleShifts[weekday]?.[index];
  if (!shift) return false;
  const date = new Date(`${card.dataset.shiftEditDate}T00:00:00`);
  const header = shiftPreviewSection(
    card.dataset.shiftEditSector,
    `${new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }).format(date)} · 19:00 às 07:00`
  );
  const sections = [
    header,
    shiftPreviewSection("Profissional fixo", shift.name),
    shiftPreviewSection("Profissional de plantão", shift.name),
  ];

  const details = document.createElement("div");
  details.className = "pp-dialog-menu__section";
  const situation = document.createElement("span");
  situation.innerHTML = "Situação: <strong class=\"pp-dialog-menu__value\">Designado</strong>";
  details.append(situation);
  const checkin = checkinStatus[shift.status];
  if (checkin) {
    const status = document.createElement("span");
    status.textContent = checkin.label;
    details.append(status);
  }
  if (shift.checkin || shift.checkout) {
    const times = document.createElement("span");
    times.textContent = `Entrada ${shift.checkin || "--:--"} · Saída ${shift.checkout || "--:--"}`;
    details.append(times);
  }
  const typeName = shiftTypeName(shift);
  const typeOption = Array.from(document.querySelector("#shift-type")?.options || []).find((option) => option.text === typeName);
  const type = document.createElement("span");
  type.className = "pp-dialog-menu__type";
  type.textContent = typeName;
  if (typeOption?.dataset.color) type.style.setProperty("--pp-dialog-menu-type", typeOption.dataset.color);
  details.append(type);
  sections.push(details);

  shiftPreview.replaceChildren(...sections);
  return true;
}

function positionShiftPreview(card) {
  const gap = 8;
  const rect = card.getBoundingClientRect();
  const width = shiftPreview.offsetWidth;
  const height = shiftPreview.offsetHeight;
  const left = Math.min(Math.max(rect.left + rect.width / 2 - width / 2, gap), window.innerWidth - width - gap);
  const below = rect.bottom + gap;
  const top = below + height <= window.innerHeight - gap ? below : Math.max(rect.top - height - gap, gap);
  shiftPreview.style.left = `${left}px`;
  shiftPreview.style.top = `${top}px`;
}

function showShiftPreview(card) {
  if (shiftModal.open || !fillShiftPreview(card)) return;
  shiftPreviewCard = card;
  shiftPreview.hidden = false;
  positionShiftPreview(card);
  card.setAttribute("aria-describedby", shiftPreview.id);
}

function hideShiftPreview() {
  clearTimeout(shiftPreviewTimer);
  if (!shiftPreview) return;
  shiftPreview.hidden = true;
  shiftPreviewCard?.removeAttribute("aria-describedby");
  shiftPreviewCard = undefined;
}

weeklySectors.addEventListener("pointerover", (event) => {
  if (event.pointerType !== "mouse" || !(event.target instanceof Element)) return;
  const card = event.target.closest(".pp-weekly-shift");
  if (!card || card === shiftPreviewCard) return;
  hideShiftPreview();
  shiftPreviewTimer = setTimeout(() => showShiftPreview(card), SHIFT_PREVIEW_DELAY);
});
weeklySectors.addEventListener("pointerout", (event) => {
  if (!(event.target instanceof Element)) return;
  const card = event.target.closest(".pp-weekly-shift");
  if (card && !(event.relatedTarget instanceof Node && card.contains(event.relatedTarget))) hideShiftPreview();
});
weeklySectors.addEventListener("focusin", (event) => {
  if (!(event.target instanceof Element)) return;
  const card = event.target.closest(".pp-weekly-shift");
  if (card?.matches(":focus-visible")) showShiftPreview(card);
});
weeklySectors.addEventListener("focusout", hideShiftPreview);
weeklySectors.addEventListener("click", hideShiftPreview);
document.addEventListener("scroll", hideShiftPreview, true);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && shiftPreview && !shiftPreview.hidden) hideShiftPreview();
});

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

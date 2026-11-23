/* =========================================================================
   Pega Plantão — Modern
   Comportamento da tela: ícones do Design System, toast, menus e preferências.
   ========================================================================= */

/* ------------------------------------------------------------------------
   <pp-icon> — injeta os SVGs de /assets/icons.

   Todo ícone da tela vem de um arquivo da pasta: o manifesto icons.json
   resolve type + name para o SVG correspondente. O grupo "ui" reúne os
   glifos que não existem no catálogo do Lumen DS (check, chevrons e gem).

   <pp-icon type="sidebar" name="calendar" class="size-6"></pp-icon>
   <pp-icon type="ui" name="chevronDown" stroke-width="2.2"></pp-icon>
   ------------------------------------------------------------------------ */
const ICON_DIRECTORY = "/assets/icons/";

const svgCache = new Map();
let manifestPromise;

/** Catálogo de ícones (public/assets/icons/icons.json). */
function loadManifest() {
  manifestPromise ??= fetch(`${ICON_DIRECTORY}icons.json`)
    .then((response) => (response.ok ? response.json() : []))
    .catch(() => []);

  return manifestPromise;
}

/** Markup de um arquivo SVG, com cache por arquivo. */
function loadSvg(file) {
  if (!svgCache.has(file)) {
    svgCache.set(
      file,
      fetch(ICON_DIRECTORY + encodeURIComponent(file))
        .then((response) => (response.ok ? response.text() : ""))
        .catch(() => "")
    );
  }
  return svgCache.get(file);
}

/** Encontra a variante do ícone (tipo + filled + monochrome) no catálogo. */
function pickIcon(manifest, icon, type, filled, monochrome) {
  const iconName = (icon ?? "").toLowerCase();
  const typeName = type ? type.toLowerCase() : null;
  const matchesType = (item) => !typeName || item.type.toLowerCase() === typeName;

  return (
    manifest.find(
      (item) => item.icon.toLowerCase() === iconName && matchesType(item) && item.filled === filled && item.monochrome === monochrome
    ) ??
    manifest.find((item) => item.icon.toLowerCase() === iconName && matchesType(item)) ??
    null
  );
}

function parseSvg(markup) {
  const template = document.createElement("template");
  template.innerHTML = markup.trim();
  return template.content.querySelector("svg");
}

class PpIcon extends HTMLElement {
  static observedAttributes = ["name", "type", "filled", "monochrome", "stroke-width"];

  #request = 0;

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  async render() {
    const request = ++this.#request;
    const name = this.getAttribute("name") ?? "";
    const type = this.getAttribute("type") ?? undefined;
    const filledAttr = this.getAttribute("filled");
    const filled = filledAttr !== null ? filledAttr === "true" || filledAttr === "" : undefined;
    const monochromeAttr = this.getAttribute("monochrome");
    const monochrome = monochromeAttr !== null ? monochromeAttr === "true" || monochromeAttr === "" : undefined;

    const wantsAsset =
      Boolean(type) || name.startsWith("type-") || name.endsWith(".svg") || filled !== undefined || monochrome !== undefined;

    const manifest = await loadManifest();
    if (request !== this.#request) return;

    let entry = null;
    if (wantsAsset) {
      const icon = name
        .replace(/^type-[^--]+--icon-/, "")
        .replace(/--.*$/, "")
        .replace(/\.svg$/, "");

      entry =
        pickIcon(manifest, icon, type, filled ?? false, monochrome ?? false) ??
        pickIcon(manifest, name, undefined, false, false);
    }

    if (entry) {
      await this.renderAsset(entry, request);
      return;
    }

    // Fallback: procura pelo nome do ícone no catálogo.
    entry = pickIcon(manifest, name, type, filled ?? false, monochrome ?? false);
    if (entry) {
      await this.renderAsset(entry, request);
      return;
    }

    this.replaceChildren();
  }

  async renderAsset(entry, request) {
    const markup = await loadSvg(entry.file);
    if (request !== this.#request) return;

    const svg = markup ? parseSvg(markup) : null;
    if (!svg) {
      this.replaceChildren();
      return;
    }

    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");

    const strokeWidth = this.getAttribute("stroke-width");
    if (strokeWidth) svg.setAttribute("stroke-width", strokeWidth);

    this.replaceChildren(svg);
  }
}

if (!customElements.get("pp-icon")) {
  customElements.define("pp-icon", PpIcon);
}

/* ------------------------------------------------------------------------
   Preferências (localStorage)
   ------------------------------------------------------------------------ */
const PREFS_KEY = "pp-preferencias";
const DEFAULTS = { notificarAnuncio: false, limiteCandidatura: "fim-do-planton" };

const form = document.querySelector("#prefs-form");
const toast = document.querySelector("#toast");
const toastText = document.querySelector("[data-toast-text]");

/* ---------------------------------------------------------------- toast */
let toastTimer;

function showToast(message) {
  if (!toast) return;
  if (toastText) toastText.textContent = message;

  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.remove("translate-y-2", "opacity-0"));

  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.add("translate-y-2", "opacity-0");
    window.setTimeout(() => {
      toast.hidden = true;
    }, 220);
  }, 3200);
}

/* ---------------------------------------------------------- account menu */
const accountContainer = document.querySelector("#account-menu-container");
const accountToggle = document.querySelector("#account-menu-toggle");
const accountMenu = document.querySelector("#account-menu");

function closeAccountMenu() {
  if (!accountToggle || !accountMenu) return;
  accountToggle.setAttribute("aria-expanded", "false");
  accountMenu.hidden = true;
}

accountToggle?.addEventListener("click", () => {
  if (!accountMenu) return;
  const expanded = accountToggle.getAttribute("aria-expanded") === "true";
  accountToggle.setAttribute("aria-expanded", String(!expanded));
  accountMenu.hidden = expanded;
});

accountMenu?.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const action = event.target.closest("[data-account-action]");
  if (!action) return;
  closeAccountMenu();
  accountToggle?.focus();
  showToast(`${action.dataset.accountAction} — em construção.`);
});

document.addEventListener("click", (event) => {
  if (event.target instanceof Node && accountContainer && !accountContainer.contains(event.target)) closeAccountMenu();
});

document.addEventListener("focusin", (event) => {
  if (event.target instanceof Node && accountContainer && !accountContainer.contains(event.target)) closeAccountMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || accountMenu?.hidden !== false) return;
  closeAccountMenu();
  accountToggle?.focus();
});

/* ------------------------------------------------------------ rail menus */
const rail = document.querySelector('nav[aria-label="Módulos"]');
const railToggles = rail?.querySelectorAll("[data-rail-toggle]");

function closeRailMenus() {
  railToggles?.forEach((button) => {
    button.setAttribute("aria-expanded", "false");
    const id = button.getAttribute("aria-controls");
    const menu = id ? document.getElementById(id) : null;
    if (menu) menu.hidden = true;
  });
}

function openRailMenu(button) {
  const id = button.getAttribute("aria-controls");
  const menu = id ? document.getElementById(id) : null;
  if (!menu || !rail) return;

  closeRailMenus();
  button.setAttribute("aria-expanded", "true");
  menu.hidden = false;
  const anchor = button.getBoundingClientRect();
  menu.style.left = `${anchor.right + 8}px`;
  if (id === "rail-configuracoes") {
    const top = Math.max(8, rail.getBoundingClientRect().top);
    menu.style.top = `${top}px`;
    menu.style.maxHeight = `${Math.max(0, window.innerHeight - top - 8)}px`;
  } else {
    menu.style.top = `${Math.max(8, Math.min(anchor.top, window.innerHeight - menu.offsetHeight - 8))}px`;
  }
}

rail?.addEventListener("pointerover", (event) => {
  if (event.pointerType !== "mouse" || !(event.target instanceof Element)) return;
  const item = event.target.closest(".pp-rail-link");
  if (!item || !rail.contains(item)) return;
  if (item instanceof HTMLButtonElement && item.hasAttribute("data-rail-toggle")) {
    if (item.getAttribute("aria-expanded") !== "true") openRailMenu(item);
  } else {
    closeRailMenus();
  }
});

rail?.addEventListener("pointerleave", (event) => {
  if (event.pointerType !== "mouse") return;
  const focused = document.activeElement;
  if (focused instanceof Element && focused.closest(".pp-rail-menu")) return;
  closeRailMenus();
});

rail?.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest("[data-rail-toggle]");
  if (button && rail.contains(button)) {
    const expanded = button.getAttribute("aria-expanded") === "true";
    if (expanded && event instanceof PointerEvent && event.pointerType === "mouse") return;
    if (expanded) closeRailMenus();
    else openRailMenu(button);
    return;
  }

  const menuItem = event.target.closest(".pp-rail-menu__item");
  if (menuItem && menuItem.getAttribute("href") === "#") {
    event.preventDefault();
    const expanded = rail.querySelector('[data-rail-toggle][aria-expanded="true"]');
    closeRailMenus();
    expanded?.focus();
    showToast("Página em construção.");
  }
});

document.addEventListener("click", (event) => {
  if (event.target instanceof Node && rail && !rail.contains(event.target)) closeRailMenus();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const expanded = rail?.querySelector('[data-rail-toggle][aria-expanded="true"]');
  if (!expanded) return;
  closeRailMenus();
  expanded.focus();
});

document.addEventListener("focusin", (event) => {
  if (event.target instanceof Node && rail && !rail.contains(event.target)) closeRailMenus();
});

rail?.addEventListener("scroll", closeRailMenus);
window.addEventListener("resize", closeRailMenus);

/* Copia a navegação de ajustes para o disclosure de telas pequenas. */
const settingsNav = document.querySelector("#prefs-nav");
const mobileNav = document.querySelector("#prefs-nav-mobile");

if (settingsNav && mobileNav) {
  const clone = settingsNav.cloneNode(true);
  clone.id = "prefs-nav-mobile-menu";
  clone.querySelectorAll("[id]").forEach((node) => {
    node.id += "-mobile";
  });
  clone.querySelectorAll("[data-nav-toggle]").forEach((button) => {
    const controls = button.getAttribute("aria-controls");
    if (controls) button.setAttribute("aria-controls", `${controls}-mobile`);
  });
  mobileNav.replaceChildren(clone);
}

/* Só uma seção de preferências fica expandida por vez, nos dois layouts. */
const preferenceNavs = document.querySelectorAll("#prefs-nav, #prefs-nav-mobile-menu");

preferenceNavs.forEach((nav) => {
  nav.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest("a")) {
      mobileNav?.closest("details")?.removeAttribute("open");
    }
    const clicked = event.target.closest("[data-nav-toggle]");
    if (!clicked || !nav.contains(clicked)) return;

    const section = clicked.getAttribute("aria-controls")?.replace(/-mobile$/, "");
    if (!section) return;
    const shouldExpand = clicked.getAttribute("aria-expanded") !== "true";

    preferenceNavs.forEach((menu) => {
      menu.querySelectorAll("[data-nav-toggle]").forEach((button) => {
        const controls = button.getAttribute("aria-controls");
        const group = controls ? document.getElementById(controls) : null;
        if (!group || !menu.contains(group)) return;

        const expanded = shouldExpand && controls?.replace(/-mobile$/, "") === section;
        button.setAttribute("aria-expanded", String(expanded));
        group.hidden = !expanded;
        button.querySelector("[data-chevron]")?.classList.toggle("-rotate-90", !expanded);
      });
    });
  });
});

const otherSection = document.querySelector("#prefs-other-tab");
const otherTitle = document.querySelector("[data-other-tab-title]");
const otherDesc = document.querySelector("[data-other-tab-desc]");
const preferenceForms = document.querySelectorAll("[data-preference-tab]");

const TAB_DESCRIPTIONS = {
  "#bloqueio": "Configure os critérios e regras de bloqueio de plantões.",
  "#cancelamento-de-agenda": "Defina as permissões e prazos para cancelamento de agenda.",
  "#divisoes": "Ajuste os parâmetros para divisões de plantão entre profissionais.",
  "#passagens": "Configure as regras para passagem de plantão entre profissionais.",
  "#trocas": "Defina as regras de solicitação, aprovação e prazos de trocas de plantão.",
  "#afastamentos": "Configure os alertas e notificações para afastamentos de profissionais.",
  "#conflitos-de-horarios": "Defina regras de alerta para conflitos de horários na escala.",
  "#horas-consecutivas": "Defina o limite de horas consecutivas permitidas para plantonistas.",
  "#horas-consecutivas-por-setor": "Configure os limites de horas consecutivas por setor específico.",
  "#horas-semanais": "Monitore e configure a carga horária máxima semanal dos profissionais.",
  "#horas-mensais": "Monitore e configure a carga horária máxima mensal dos profissionais.",
  "#intervalo-interjornada": "Defina o tempo mínimo de descanso entre plantões consecutivos.",
  "#plantoes-consecutivos": "Configure o número máximo de plantões consecutivos permitidos.",
  "#emails-e-notificacoes": "Gerencie as preferências de envio de e-mails e notificações do sistema.",
  "#credenciamento": "Configure as exigências e validações de documentos de credenciamento.",
  "#financeiro-avancado": "Configurações financeiras avançadas e regras de repasse.",
  "#geral-e-avancado": "Parâmetros gerais de registro e controle de ponto de plantonistas.",
  "#configuracoes-adicionais": "Opções adicionais para registro de entrada e saída.",
  "#tolerancia": "Defina a tolerância de horário em minutos para check-in e check-out.",
  "#valores-padroes": "Configure os valores de referência padrões praticados na escala.",
  "#visualizacao-da-escala": "Personalize o formato de visualização e filtros da grade de escala.",
};

function updatePreferenceSection() {
  if (!settingsNav || !form) return;

  const hash = location.hash || "#anuncios";
  const selected = Array.from(settingsNav.querySelectorAll("a")).find((link) => link.getAttribute("href") === hash);
  const group = selected?.closest(".pp-nav-sub-list");
  const groupId = group?.id;

  const isAnuncios = hash === "#anuncios";
  const activeForm = Array.from(preferenceForms).find((panel) => panel.dataset.preferenceTab === hash);
  form.hidden = !isAnuncios;
  preferenceForms.forEach((panel) => {
    panel.hidden = panel !== activeForm;
  });

  if (otherSection) {
    otherSection.hidden = isAnuncios || Boolean(activeForm);
    if (!isAnuncios && !activeForm && selected) {
      const label = selected.querySelector("span")?.textContent.trim() || "Preferências";
      if (otherTitle) otherTitle.textContent = label;
      if (otherDesc) {
        otherDesc.textContent = TAB_DESCRIPTIONS[hash] ?? `Ajuste as preferências e configurações de ${label.toLowerCase()}.`;
      }
    }
  }

  preferenceNavs.forEach((nav) => {
    nav.querySelectorAll("a").forEach((link) => {
      const active = link.getAttribute("href") === hash;
      link.classList.toggle("pp-nav-sub--active", active && link.classList.contains("pp-nav-sub"));
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    nav.querySelectorAll("[data-nav-toggle]").forEach((button) => {
      const controls = button.getAttribute("aria-controls");
      const panel = controls ? document.getElementById(controls) : null;
      if (!panel) return;
      const expanded = Boolean(groupId && controls.replace(/-mobile$/, "") === groupId);
      button.setAttribute("aria-expanded", String(expanded));
      panel.hidden = !expanded;
      button.querySelector("[data-chevron]")?.classList.toggle("-rotate-90", !expanded);
    });
  });

  const currentLabel = document.querySelector("[data-prefs-current]");
  if (currentLabel) {
    const groupToggle = groupId && settingsNav.querySelector(`[aria-controls="${groupId}"]`);
    const groupLabel = groupToggle?.querySelector("span")?.textContent.trim();
    const label = selected?.querySelector("span")?.textContent.trim();
    currentLabel.textContent = label ? [groupLabel, label].filter(Boolean).join(" · ") : "Preferências";
  }
}

document.querySelector("[data-save-other]")?.addEventListener("click", () => {
  showToast("Preferências salvas com sucesso.");
});

window.addEventListener("hashchange", updatePreferenceSection);
updatePreferenceSection();

/* ----------------------------------------------------- preferences form */
function readStoredPreferences() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

const checkbox = document.querySelector('input[name="notificarAnuncio"]');
const limitSelect = document.querySelector('select[name="limiteCandidatura"]');

const stored = readStoredPreferences();
const locationPreferenceKeys = {
  "#bloqueio": "locaisBloqueio",
  "#cancelamento-de-agenda": "locaisCancelamento",
  "#passagens": "locaisPassagens",
};
const locationPreferences = Object.fromEntries(
  Object.entries(locationPreferenceKeys).map(([hash, key]) => [hash, stored[key] ?? {}])
);
if (checkbox) checkbox.checked = stored.notificarAnuncio;
if (limitSelect) limitSelect.value = stored.limiteCandidatura;
preferenceForms.forEach((panel) => {
  panel.querySelectorAll("input[name], select[name]").forEach((input) => {
    if (!(input.name in stored)) return;
    if (input instanceof HTMLInputElement && input.type === "checkbox") input.checked = stored[input.name] === true;
    else if (input instanceof HTMLSelectElement) input.value = stored[input.name];
  });
});

/* ---------------------------------------------------------------- select */
/* O <select> nativo continua guardando o valor (form + localStorage); a lista
   aberta é um listbox próprio, para seguir o desenho do Design System. */
let openedSelect = null;
const selectSyncs = new WeakMap();

function setupSelect(root) {
  if (!(root instanceof HTMLElement)) return null;

  const select = root.querySelector("select");
  const trigger = root.querySelector("[data-select-trigger]");
  const menu = root.querySelector("[data-select-menu]");
  const valueLabel = root.querySelector("[data-select-value]");
  const chevron = root.querySelector("[data-select-chevron]");

  if (!(select instanceof HTMLSelectElement) || !(trigger instanceof HTMLButtonElement) || !(menu instanceof HTMLElement)) return null;

  const options = () => Array.from(menu.querySelectorAll('[role="option"]'));
  let active = -1;

  const sync = () => {
    const option = select.selectedOptions[0];
    if (valueLabel) valueLabel.textContent = option ? option.textContent.trim() : "";
    trigger.disabled = select.matches(":disabled");
    options().forEach((item) => item.setAttribute("aria-selected", String(Number(item.dataset.index) === select.selectedIndex)));
  };

  const build = () => {
    menu.replaceChildren(
      ...Array.from(select.options).map((option, index) => {
        const item = document.createElement("li");
        item.className = "pp-select-option";
        item.id = `${select.id}-option-${index}`;
        item.dataset.index = String(index);
        item.tabIndex = -1;
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", "false");
        if (option.disabled || option.parentElement?.disabled) item.setAttribute("aria-disabled", "true");
        item.textContent = option.textContent.trim();
        return item;
      }),
    );
  };

  const setActive = (index) => {
    const items = options().filter((item) => item.getAttribute("aria-disabled") !== "true");
    if (items.length === 0) return;
    active = (index + items.length) % items.length;
    items[active].focus();
  };

  const open = () => {
    if (!menu.hidden || select.matches(":disabled")) return;
    openedSelect?.close();
    build();
    sync();
    menu.hidden = false;
    menu.classList.remove("pp-select-menu--above");
    const menuBounds = menu.getBoundingClientRect();
    const rootBounds = root.getBoundingClientRect();
    const scrollContainer = root.closest(".pp-shift-content");
    const visibleBounds = scrollContainer?.getBoundingClientRect();
    const bottom = Math.min(window.innerHeight, visibleBounds?.bottom ?? window.innerHeight);
    const top = Math.max(0, visibleBounds?.top ?? 0);
    if (menuBounds.bottom > bottom && rootBounds.top - top > bottom - rootBounds.bottom) {
      menu.classList.add("pp-select-menu--above");
    }
    trigger.setAttribute("aria-expanded", "true");
    chevron?.classList.add("rotate-180");
    openedSelect = { root, close };
    const enabled = options().filter((item) => item.getAttribute("aria-disabled") !== "true");
    setActive(Math.max(0, enabled.findIndex((item) => Number(item.dataset.index) === select.selectedIndex)));
  };

  const close = ({ focus = false } = {}) => {
    if (menu.hidden) return;
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    chevron?.classList.remove("rotate-180");
    if (openedSelect?.root === root) openedSelect = null;
    active = -1;
    if (focus) trigger.focus();
  };

  const choose = (item) => {
    if (!item || item.getAttribute("aria-disabled") === "true") return;
    const index = Number(item.dataset.index);
    if (select.selectedIndex !== index) {
      select.selectedIndex = index;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    sync();
    close({ focus: true });
  };

  trigger.addEventListener("click", () => {
    if (menu.hidden) open();
    else close({ focus: true });
  });

  trigger.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    open();
  });

  menu.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const item = event.target.closest('[role="option"]');
    if (item) choose(item);
  });

  menu.addEventListener("keydown", (event) => {
    const items = options().filter((item) => item.getAttribute("aria-disabled") !== "true");
    if (items.length === 0) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive(active + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive(active - 1);
        break;
      case "Home":
        event.preventDefault();
        setActive(0);
        break;
      case "End":
        event.preventDefault();
        setActive(items.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(items[active]);
        break;
      case "Escape":
        event.preventDefault();
        close({ focus: true });
        break;
      case "Tab":
        close();
        break;
      default:
        break;
    }
  });

  select.addEventListener("change", sync);
  selectSyncs.set(select, sync);
  sync();
  return { sync, open, close };
}

function syncSelects(container) {
  container.querySelectorAll("select").forEach((select) => selectSyncs.get(select)?.());
}

["pointerdown", "focusin"].forEach((type) => {
  document.addEventListener(type, (event) => {
    if (openedSelect && event.target instanceof Node && !openedSelect.root.contains(event.target)) openedSelect.close();
  });
  document.addEventListener("reset", (event) => {
    if (event.target instanceof HTMLFormElement) setTimeout(() => syncSelects(event.target), 0);
  });
});

document.querySelectorAll("[data-select]").forEach((root) => setupSelect(root));

let nextSelectId = 0;
function enhanceSelect(select) {
  if (!(select instanceof HTMLSelectElement) || select.closest("[data-select]") || select.multiple || select.size > 1) return;

  if (!select.id) {
    do {
      nextSelectId += 1;
    } while (document.getElementById(`pp-select-${nextSelectId}`));
    select.id = `pp-select-${nextSelectId}`;
  }
  const label = select.labels[0];
  const root = document.createElement("div");
  root.className = "relative";
  root.dataset.select = "";
  if (label?.contains(select)) {
    label.after(root);
    label.htmlFor = select.id;
  } else {
    select.before(root);
  }
  root.append(select);

  const labelId = `${select.id}-label`;
  const valueId = `${select.id}-value`;
  const menuId = `${select.id}-menu`;
  let accessibleLabel = label;
  if (!accessibleLabel) {
    accessibleLabel = document.createElement("span");
    accessibleLabel.className = "sr-only";
    accessibleLabel.textContent = select.getAttribute("aria-label") || select.name || "Selecione uma opção";
    root.prepend(accessibleLabel);
  }
  if (!accessibleLabel.id) accessibleLabel.id = labelId;

  select.classList.remove("pp-select");
  select.classList.add("sr-only");
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "pp-select";
  trigger.dataset.selectTrigger = "";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", menuId);
  trigger.setAttribute("aria-labelledby", `${accessibleLabel.id} ${valueId}`);
  const value = document.createElement("span");
  value.id = valueId;
  value.dataset.selectValue = "";
  trigger.append(value);

  const chevron = document.createElement("pp-icon");
  chevron.setAttribute("type", "ui");
  chevron.setAttribute("name", "chevronDown");
  chevron.setAttribute("stroke-width", "2.4");
  chevron.dataset.selectChevron = "";
  chevron.className = "pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-gray-500 transition-transform duration-200";

  const menu = document.createElement("ul");
  menu.id = menuId;
  menu.className = "pp-select-menu";
  menu.dataset.selectMenu = "";
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-labelledby", accessibleLabel.id);
  menu.hidden = true;
  root.append(trigger, chevron, menu);
  setupSelect(root);
}

document.querySelectorAll("select").forEach(enhanceSelect);
new MutationObserver((mutations) => {
  if (openedSelect && !openedSelect.root.isConnected) openedSelect.close();
  mutations.forEach((mutation) => {
    if (mutation.type === "attributes") {
      if (mutation.target instanceof HTMLSelectElement) selectSyncs.get(mutation.target)?.();
      else if (mutation.target instanceof HTMLFieldSetElement) syncSelects(mutation.target);
      if (openedSelect?.root.querySelector("select")?.matches(":disabled")) openedSelect.close();
      return;
    }
    mutation.addedNodes.forEach((node) => {
      if (!(node instanceof Element)) return;
      if (node instanceof HTMLSelectElement) enhanceSelect(node);
      node.querySelectorAll("select").forEach(enhanceSelect);
    });
  });
}).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled"] });


document.querySelectorAll("#prefs-form, [data-preference-tab]").forEach((panel) => {
  panel.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      const values = raw ? JSON.parse(raw) : {};
      panel.querySelectorAll("input[name], select[name]").forEach((input) => {
        if (input instanceof HTMLInputElement && input.type === "checkbox") values[input.name] = input.checked;
        else if (input instanceof HTMLSelectElement) values[input.name] = input.value;
      });
      const locationKey = locationPreferenceKeys[panel.dataset.preferenceTab];
      if (locationKey) values[locationKey] = locationPreferences[panel.dataset.preferenceTab];
      localStorage.setItem(PREFS_KEY, JSON.stringify(values));
      showToast("Preferências salvas com sucesso.");
    } catch (error) {
      console.error("Não foi possível salvar as preferências.", error);
      showToast("Não foi possível salvar as preferências.");
    }
  });
});

/* --------------------------------------- example locations configuration */
const locaisModal = document.querySelector("#locais-modal");
const locaisForm = document.querySelector("#locais-form");
const locaisSearch = document.querySelector("#locais-search");
const locaisTable = document.querySelector(".pp-locais-table");
const locaisEmpty = document.querySelector("#locais-empty");
const exampleLocations = [6, 4].map((count, index) => ({
  name: `Hospital de exemplo ${index + 1}`,
  sectors: Array.from({ length: count }, (_, sectorIndex) => ({
    id: `${index + 1}-${sectorIndex + 1}`,
    name: `Setor de exemplo ${sectorIndex + 1}`,
  })),
}));
const locationColumns = [
  { key: "anunciar", label: "Anunciar" },
  { key: "manual", label: "Escolha manual" },
  { key: "automatica", label: "Escolha automática" },
];

function locationCheckbox(column, label, group) {
  return `<td><label class="pp-check">
    <input type="checkbox" class="sr-only" data-column="${column.key}" ${group ? "data-group-check" : "data-sector-check"} aria-label="${column.label}: ${label}" />
    <pp-icon type="ui" name="check" stroke-width="3"></pp-icon>
  </label></td>`;
}

function locationGroupGap(index, count, columns) {
  return index < count - 1
    ? `<tr class="pp-locais-table__gap" aria-hidden="true"><td colspan="${columns}"></td></tr>`
    : "";
}

if (locaisTable) {
  exampleLocations.forEach(({ name: hospital, sectors }, index) => {
    const rows = sectors.map(({ name: sector }) => {
      return `<tr class="pp-locais-table__sector" data-sector-row>
        <th scope="row" class="font-normal">${sector}</th>
        ${locationColumns.map((column) => locationCheckbox(column, `${sector}, ${hospital}`, false)).join("")}
      </tr>`;
    }).join("");
    const gap = locationGroupGap(index, exampleLocations.length, locationColumns.length + 1);
    locaisTable.insertAdjacentHTML(
      "beforeend",
      `<tbody data-location-group data-location-name="${hospital}">
      <tr class="pp-locais-table__group">
        <th scope="row">${hospital}</th>
        ${locationColumns.map((column) => locationCheckbox(column, `todos os setores de ${hospital}`, true)).join("")}
      </tr>
      ${rows}${gap}
    </tbody>`
    );
  });
}

function filterLocations() {
  const normalize = (value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const query = normalize(locaisSearch?.value.trim() ?? "");
  let visibleGroups = 0;

  locaisTable?.querySelectorAll("[data-location-group]").forEach((group) => {
    const matchesLocation = normalize(group.dataset.locationName ?? "").includes(query);
    let visibleSectors = 0;
    group.querySelectorAll("[data-sector-row]").forEach((row) => {
      const matches = matchesLocation || normalize(row.querySelector("th")?.textContent ?? "").includes(query);
      row.hidden = !matches;
      if (matches) visibleSectors++;
    });
    group.hidden = visibleSectors === 0;
    if (!group.hidden) visibleGroups++;
  });

  if (locaisEmpty) locaisEmpty.hidden = visibleGroups > 0;
}

locaisTable?.addEventListener("change", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.dataset.column) return;
  const group = input.closest("[data-location-group]");
  if (!group) return;

  const column = input.dataset.column;
  const groupCheck = group.querySelector(`[data-group-check][data-column="${column}"]`);
  const sectorChecks = group.querySelectorAll(`[data-sector-check][data-column="${column}"]`);
  if (!groupCheck) return;
  if (input === groupCheck) {
    sectorChecks.forEach((sectorCheck) => {
      sectorCheck.checked = input.checked;
    });
  }
  const checked = Array.from(sectorChecks).filter((sectorCheck) => sectorCheck.checked).length;
  groupCheck.checked = checked === sectorChecks.length;
  groupCheck.indeterminate = checked > 0 && checked < sectorChecks.length;
});

locaisSearch?.addEventListener("input", filterLocations);
locaisForm?.addEventListener("submit", (event) => event.preventDefault());
locaisModal?.querySelectorAll("[data-modal-close]").forEach((button) => {
  button.addEventListener("click", () => locaisModal.close());
});
document.querySelectorAll("[data-locais]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!locaisModal || !locaisForm) return;
    locaisForm.reset();
    locaisTable?.querySelectorAll("[data-group-check]").forEach((groupCheck) => {
      groupCheck.indeterminate = false;
    });
    filterLocations();
    locaisModal.showModal();
  });
});

/* --------------------------------------- locations for other preferences */
const preferenceLocationsModal = document.querySelector("#locais-preferencia-modal");
const preferenceLocationsForm = document.querySelector("#locais-preferencia-form");
const preferenceLocationsTable = document.querySelector(".pp-locais-preferencia");
const preferenceLocationsSearch = document.querySelector("#locais-preferencia-search");
const preferenceLocationsEmpty = document.querySelector("#locais-preferencia-empty");
const locationModes = {
  bloqueio: { hash: "#bloqueio", columns: [{ key: "data", label: "Data limite" }] },
  cancelamento: { hash: "#cancelamento-de-agenda", columns: [] },
  passagens: {
    hash: "#passagens",
    columns: [{ key: "aprovacao", label: "Requer aprovação" }, { key: "justificativa", label: "Requer justificativa" }],
  },
};
let currentLocationMode;

function preferenceCheck(field, label, sectorId = "", group = false) {
  return `<label class="pp-check">
    <input type="checkbox" class="sr-only" data-field="${field}" ${group ? "data-preference-group" : `data-preference-sector="${sectorId}"`} aria-label="${label}" />
    <pp-icon type="ui" name="check" stroke-width="3"></pp-icon>
  </label>`;
}

function preferenceDate(label, sectorId = "") {
  return `<input type="date" class="pp-input pp-locais-date" data-field="data" ${sectorId ? `data-preference-sector="${sectorId}"` : "data-preference-all-dates"} aria-label="${label}" />`;
}

function syncPreferenceGroups() {
  preferenceLocationsTable?.querySelectorAll("[data-preference-group]").forEach((groupCheck) => {
    const group = groupCheck.closest("tbody");
    const checks = group.querySelectorAll(`[data-preference-sector][data-field="${groupCheck.dataset.field}"]`);
    const checked = Array.from(checks).filter((input) => input.checked).length;
    groupCheck.checked = checks.length > 0 && checked === checks.length;
    groupCheck.indeterminate = checked > 0 && checked < checks.length;
  });
  const allDates = preferenceLocationsTable?.querySelector("[data-preference-all-dates]");
  if (allDates) {
    const dates = Array.from(preferenceLocationsTable.querySelectorAll('[data-preference-sector][data-field="data"]'), (input) => input.value);
    allDates.value = dates.length && dates.every((date) => date === dates[0]) ? dates[0] : "";
  }
}

function filterPreferenceLocations() {
  const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const query = normalize(preferenceLocationsSearch.value.trim());
  let visible = 0;
  preferenceLocationsTable.querySelectorAll("tbody").forEach((group) => {
    let visibleInGroup = 0;
    group.querySelectorAll("[data-preference-row]").forEach((row) => {
      row.hidden = !normalize(row.dataset.search).includes(query);
      if (!row.hidden) visibleInGroup++;
    });
    group.hidden = visibleInGroup === 0;
    visible += visibleInGroup;
  });
  preferenceLocationsEmpty.hidden = visible > 0;
}

function renderPreferenceLocations(mode) {
  const config = locationModes[mode];
  const columns = config.columns;
  const heading = preferenceLocationsTable.querySelector("thead tr");
  heading.querySelectorAll("[data-preference-heading]").forEach((cell) => cell.remove());
  columns.forEach(({ label }) => heading.insertAdjacentHTML("beforeend", `<th scope="col" data-preference-heading>${label}</th>`));
  preferenceLocationsTable.querySelectorAll("tbody").forEach((body) => body.remove());
  preferenceLocationsTable.classList.toggle("pp-locais-preferencia--cancelamento", mode === "cancelamento");

  const groups = mode === "bloqueio"
    ? [{ name: "Todos", sectors: exampleLocations.flatMap((location) => location.sectors.map((sector) => ({ ...sector, location: location.name }))) }]
    : exampleLocations.map((location) => ({
        ...location,
        sectors: location.sectors.map((sector) => ({ ...sector, location: location.name })),
      }));
  groups.forEach((group, index) => {
    const groupCells = mode === "bloqueio"
      ? `<td>${preferenceDate("Data limite para todos os setores")}</td>`
      : columns.map((column) => `<td>${preferenceCheck(column.key, `${column.label}: todos os setores de ${group.name}`, "", true)}</td>`).join("");
    const rows = group.sectors.map((sector) => {
      const fullName = `${sector.name}, ${sector.location}`;
      const name = mode === "bloqueio" ? `${sector.name} — ${sector.location}` : sector.name;
      const cells = mode === "bloqueio"
        ? `<td>${preferenceDate(`Data limite: ${fullName}`, sector.id)}</td>`
        : columns.map((column) => `<td>${preferenceCheck(column.key, `${column.label}: ${fullName}`, sector.id)}</td>`).join("");
      const sectorName = mode === "cancelamento"
        ? `<label class="pp-locais-preferencia__choice"><span class="pp-check"><input type="checkbox" class="sr-only" data-preference-sector="${sector.id}" data-field="permitido" aria-label="Permitir cancelamento: ${fullName}" /><pp-icon type="ui" name="check" stroke-width="3"></pp-icon></span>${name}</label>`
        : name;
      return `<tr class="pp-locais-table__sector" data-preference-row data-search="${fullName}"><th scope="row" class="font-normal">${sectorName}</th>${cells}</tr>`;
    }).join("");
    const gap = locationGroupGap(index, groups.length, columns.length + 1);
    preferenceLocationsTable.insertAdjacentHTML("beforeend", `<tbody><tr class="pp-locais-table__group"><th scope="row">${group.name}</th>${groupCells}</tr>${rows}${gap}</tbody>`);
  });

  const values = locationPreferences[config.hash];
  preferenceLocationsTable.querySelectorAll("[data-preference-sector]").forEach((input) => {
    const value = values[input.dataset.preferenceSector]?.[input.dataset.field];
    if (input.type === "checkbox") input.checked = value === true;
    else if (typeof value === "string") input.value = value;
  });
  syncPreferenceGroups();
  filterPreferenceLocations();
}

preferenceLocationsSearch?.addEventListener("input", filterPreferenceLocations);
preferenceLocationsSearch?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") event.preventDefault();
});
preferenceLocationsTable?.addEventListener("change", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (input.hasAttribute("data-preference-group")) {
    input.closest("tbody").querySelectorAll(`[data-preference-sector][data-field="${input.dataset.field}"]`).forEach((sector) => {
      sector.checked = input.checked;
    });
  } else if (input.hasAttribute("data-preference-all-dates")) {
    preferenceLocationsTable.querySelectorAll('[data-preference-sector][data-field="data"]').forEach((sector) => {
      sector.value = input.value;
    });
  }
  syncPreferenceGroups();
});
preferenceLocationsForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = {};
  preferenceLocationsTable.querySelectorAll("[data-preference-sector]").forEach((input) => {
    const id = input.dataset.preferenceSector;
    values[id] ??= {};
    values[id][input.dataset.field] = input.type === "checkbox" ? input.checked : input.value;
  });
  locationPreferences[locationModes[currentLocationMode].hash] = values;
  preferenceLocationsModal.close();
});
preferenceLocationsModal?.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  event.preventDefault();
  preferenceLocationsModal.close();
});
preferenceLocationsModal?.querySelector("[data-preferencia-close]")?.addEventListener("click", () => preferenceLocationsModal.close());
document.querySelectorAll("[data-locais-preferencia]").forEach((button) => {
  button.addEventListener("click", () => {
    currentLocationMode = button.dataset.locaisPreferencia;
    preferenceLocationsSearch.value = "";
    renderPreferenceLocations(currentLocationMode);
    preferenceLocationsModal.showModal();
    preferenceLocationsSearch.focus();
  });
});
document.querySelectorAll("[data-locais-pendente]").forEach((button) => {
  button.addEventListener("click", () => showToast("Configuração de locais e setores — em construção."));
});

/* ------------------------------------------------- prototype affordances */
document.querySelectorAll("[data-help]").forEach((button) => {
  button.addEventListener("click", () => showToast("Suporte — em construção."));
});

/* ------------------------------------------- live reload (npm run dev) */
/* ?no-reload desliga o SSE (usado por capturas headless). */
if ("EventSource" in window && !new URLSearchParams(location.search).has("no-reload")) {
  const liveReload = new EventSource("/live-reload");
  liveReload.addEventListener("reload", () => location.reload());
}


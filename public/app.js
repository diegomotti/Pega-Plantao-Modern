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

/* ----------------------------------------------------------- dialog menu */
/* pp-dialog-menu: painel flutuante ligado a um gatilho.
   <div class="pp-dialog-menu-anchor" data-dialog-menu>
     <button data-dialog-menu-trigger aria-expanded="false" aria-controls="…">
     <div id="…" class="pp-dialog-menu" role="dialog" hidden>…</div>
   </div>
   Mouse: abre ao passar (com pequeno atraso) e fecha ao sair. Clique fixa o
   painel aberto; clicar de novo, clicar fora ou Esc fecha. Teclado: Enter/Espaço
   abre e leva o foco ao primeiro campo. */
const DIALOG_MENU_OPEN_DELAY = 150;
const DIALOG_MENU_CLOSE_DELAY = 250;

function setupDialogMenu(root) {
  const trigger = root.querySelector("[data-dialog-menu-trigger]");
  const menu = root.querySelector(".pp-dialog-menu");
  if (!trigger || !menu) return;
  /* data-dialog-menu="click": abre só no clique/teclado (ex.: calendário).
     data-dialog-menu-fixed: painel fixo na tela, para gatilhos dentro de
     contêineres com overflow. */
  const opensOnHover = root.dataset.dialogMenu !== "click";
  const isFixed = root.hasAttribute("data-dialog-menu-fixed");
  let timer;
  let pinned = false;

  const isOpen = () => !menu.hidden;
  const place = () => {
    if (!isFixed || menu.hidden) return;
    const gap = 8;
    const rect = trigger.getBoundingClientRect();
    const width = menu.offsetWidth;
    const height = menu.offsetHeight;
    const preferred = menu.classList.contains("pp-dialog-menu--end") ? rect.right - width : rect.left;
    const left = Math.min(Math.max(preferred, gap), window.innerWidth - width - gap);
    const below = rect.bottom + gap;
    const top = below + height <= window.innerHeight - gap ? below : Math.max(rect.top - height - gap, gap);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  };
  const setOpen = (open) => {
    clearTimeout(timer);
    if (!open && menu.contains(document.activeElement)) trigger.focus({ preventScroll: true });
    const opening = open && menu.hidden;
    menu.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
    if (!open) pinned = false;
    /* Avisa o conteúdo (ex.: calendário) para se atualizar antes de aparecer. */
    if (opening) menu.dispatchEvent(new CustomEvent("dialog-menu-open"));
    place();
  };
  menu.addEventListener("dialog-menu-close", () => setOpen(false));
  if (isFixed) {
    window.addEventListener("resize", place);
    document.addEventListener("scroll", place, true);
  }
  const setOpenLater = (open, delay) => {
    clearTimeout(timer);
    timer = setTimeout(() => setOpen(open), delay);
  };
  /* Não fecha enquanto uma lista de select do painel estiver aberta. */
  const isBusy = () => Boolean(menu.querySelector(".pp-select-menu:not([hidden])"));

  root.addEventListener("pointerenter", (event) => {
    if (opensOnHover && event.pointerType === "mouse") setOpenLater(true, DIALOG_MENU_OPEN_DELAY);
  });
  root.addEventListener("pointerleave", (event) => {
    if (!opensOnHover || event.pointerType !== "mouse" || pinned || isBusy()) return;
    setOpenLater(false, DIALOG_MENU_CLOSE_DELAY);
  });

  trigger.addEventListener("click", (event) => {
    clearTimeout(timer);
    if (isOpen() && !pinned && event.detail > 0) {
      pinned = true;
      return;
    }
    const open = !isOpen();
    setOpen(open);
    pinned = open;
    if (open && event.detail === 0) {
      (menu.querySelector("[data-dialog-menu-autofocus]") ||
        menu.querySelector("button, input:not(.sr-only), [tabindex]:not([tabindex='-1']), input"))?.focus();
    }
  });

  /* Captura: se uma lista de select estiver aberta, o Esc fecha só ela. */
  root.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !isOpen()) return;
    if (menu.querySelector(".pp-select-menu:not([hidden])")) return;
    event.stopPropagation();
    setOpen(false);
    trigger.focus();
  }, true);

  document.addEventListener("pointerdown", (event) => {
    if (isOpen() && event.target instanceof Node && !root.contains(event.target)) setOpen(false);
  });
  document.addEventListener("focusin", (event) => {
    if (isOpen() && event.target instanceof Node && !root.contains(event.target)) setOpen(false);
  });
}

document.querySelectorAll("[data-dialog-menu]").forEach(setupDialogMenu);

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
  const item = event.target.closest(".pp-sidebar-link");
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
  if (focused instanceof Element && focused.closest(".pp-sidebar-menu")) return;
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

  const menuItem = event.target.closest(".pp-sidebar-menu__item");
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
window.addEventListener("scroll", closeRailMenus, { passive: true });
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

/* Um único "Salvar Preferências" para todas as abas: envia o formulário da
   aba aberta (a validação e o salvamento continuam no submit de cada um). */
document.querySelector("[data-save-preferences]")?.addEventListener("click", () => {
  const panel = [form, ...preferenceForms].find((item) => item instanceof HTMLFormElement && !item.hidden);
  if (panel) panel.requestSubmit();
  else showToast("Preferências salvas com sucesso.");
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

/* Listas de grupos dos alertas (dados de exemplo). Cada opção é um checkbox
   com data-multi: o formulário salva um array com os valores marcados. */
const EXAMPLE_GROUPS = ["Coringas", "Médicos plantonistas", "Enfermagem", "Residentes", "Fisioterapia", "Web Check-In"];
const slugify = (value) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

document.querySelectorAll("[data-group-list]").forEach((list) => {
  const name = list.dataset.groupList;
  const option = (value, label, all = false) => `<label class="pp-group-option${all ? " pp-group-option--all" : ""}">
    <span class="pp-check"><input type="checkbox" class="sr-only" name="${name}" value="${value}" data-multi ${all ? "data-group-all" : ""} /><pp-icon type="ui" name="check" stroke-width="3"></pp-icon></span>
    <span>${label}</span>
  </label>`;
  list.insertAdjacentHTML("beforeend", option("todos", "Todos os profissionais", true) + EXAMPLE_GROUPS.map((group) => option(slugify(group), group)).join(""));
});

function syncGroupList(list) {
  const all = list.querySelector("[data-group-all]");
  const items = Array.from(list.querySelectorAll("input[data-multi]:not([data-group-all])"));
  if (all) all.checked = items.length > 0 && items.every((item) => item.checked);
}

const stored = readStoredPreferences();
/* Cada diálogo de Locais e Setores (modo) → aba onde fica e chave no
   localStorage. Uma aba pode ter mais de um diálogo, como Trocas. */
/* Campos salvos pelo valor digitado (limites, horários, durações, datas). */
const VALUE_INPUT_TYPES = new Set(["number", "text", "time", "date"]);

const locationStorage = {
  bloqueio: ["#bloqueio", "locaisBloqueio"],
  cancelamento: ["#cancelamento-de-agenda", "locaisCancelamento"],
  divisoes: ["#divisoes", "locaisDivisoes"],
  passagens: ["#passagens", "locaisPassagens"],
  trocas: ["#trocas", "locaisTrocas"],
  periodo: ["#trocas", "periodoTroca"],
  limite: ["#trocas", "limiteTrocas"],
  conflitos: ["#conflitos-de-horarios", "locaisConflitos"],
  horasSetor: ["#horas-consecutivas-por-setor", "locaisHorasConsecutivas"],
  distancia: ["#geral-e-avancado", "distanciaMaxima"],
  biometriaFixa: ["#geral-e-avancado", "locaisBiometriaFixa"],
  biometriaApp: ["#geral-e-avancado", "locaisBiometriaApp"],
  provaDeVida: ["#geral-e-avancado", "taxaProvaDeVida"],
  visualizacao: ["#visualizacao-da-escala", "dataLimiteVisualizacao"],
};
const locationPreferences = Object.fromEntries(
  Object.entries(locationStorage).map(([mode, [, key]]) => [mode, stored[key] ?? {}])
);
if (checkbox) checkbox.checked = stored.notificarAnuncio;
if (limitSelect) limitSelect.value = stored.limiteCandidatura;
preferenceForms.forEach((panel) => {
  panel.querySelectorAll("input[name], select[name]").forEach((input) => {
    if (!(input.name in stored)) return;
    if (input instanceof HTMLInputElement && input.type === "checkbox" && input.hasAttribute("data-multi")) {
      input.checked = Array.isArray(stored[input.name]) && stored[input.name].includes(input.value);
    } else if (input instanceof HTMLInputElement && input.type === "checkbox") input.checked = stored[input.name] === true;
    else if (input instanceof HTMLInputElement && input.type === "radio") input.checked = stored[input.name] === input.value;
    else if (input instanceof HTMLInputElement && VALUE_INPUT_TYPES.has(input.type)) input.value = stored[input.name];
    else if (input instanceof HTMLSelectElement) input.value = stored[input.name];
  });
});

document.querySelectorAll("[data-group-list]").forEach((list) => {
  syncGroupList(list);
  list.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.hasAttribute("data-group-all")) {
      list.querySelectorAll("input[data-multi]").forEach((item) => {
        item.checked = input.checked;
      });
    }
    syncGroupList(list);
  });
});

document.querySelectorAll("#prefs-form .pp-card, [data-preference-tab] .pp-card").forEach((card) => {
  /* Só conta os controles do próprio cartão: os de um grupo dependente
     aninhado pertencem ao cartão interno, não a ele. */
  const controls = Array.from(card.querySelectorAll("input, select, textarea, button, a")).filter((control) => {
    if (control.matches("[data-card-expand]")) return false;
    const group = control.closest("[data-dependent-fields]");
    return !group || !card.contains(group);
  });
  const input = controls[0];
  if (controls.length !== 1 || !(input instanceof HTMLInputElement) || input.type !== "checkbox" || !input.closest("label.pp-check")) return;

  card.classList.add("pp-card--check");
  card.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    /* Cliques nas opções aninhadas pertencem a elas, não ao cartão pai. */
    const dependent = event.target.closest("[data-dependent-fields]");
    if (dependent && card.contains(dependent)) return;
    /* No cartão empilhado (.pp-card--stack) só a linha do checkbox alterna. */
    if (card.classList.contains("pp-card--stack") && !event.target.closest(".pp-card__row")) return;
    if (event.target.closest("label, input, button, a, select, textarea") || input.matches(":disabled")) return;
    if (window.getSelection()?.toString()) return;
    input.focus();
    input.click();
  });
});

/* Cartão principal (data-master-toggle): as opções dentro de
   [data-dependent-fields] só ficam editáveis com ele marcado, como no sistema
   atual (Bloqueio, Cancelamento, Divisões, Passagens, Trocas e Alertas). */
/* data-dependent-fields="chave" segue o checkbox data-master-toggle="chave";
   sem valor, segue o checkbox principal sem valor. Várias chaves separadas por
   espaço habilitam o grupo quando qualquer uma estiver marcada (e habilitada).
   Grupos aninhados ficam desabilitados junto com o grupo de fora. */
function syncDependentFields(panel) {
  panel.querySelectorAll("fieldset[data-dependent-fields]").forEach((fields) => {
    const keys = fields.dataset.dependentFields.split(/\s+/).filter(Boolean);
    const toggles = (keys.length ? keys : [""])
      .map((key) => panel.querySelector(`[data-master-toggle="${key}"]`))
      .filter((toggle) => toggle instanceof HTMLInputElement);
    if (toggles.length) fields.disabled = !toggles.some((toggle) => toggle.checked && !toggle.matches(":disabled"));
  });
}

preferenceForms.forEach((panel) => {
  syncDependentFields(panel);
  panel.addEventListener("change", (event) => {
    if (event.target instanceof Element && event.target.matches("[data-master-toggle]")) syncDependentFields(panel);
  });
});

/* Cartão empilhado (.pp-card--stack): a seta [data-card-expand] ao lado do
   checkbox recolhe/expande as opções. Marcar o cartão sempre as expande. */
function setCardExpanded(card, expanded) {
  card.toggleAttribute("data-collapsed", !expanded);
  const button = card.querySelector(":scope > .pp-card__row [data-card-expand]");
  if (!button) return;
  const label = expanded ? "Recolher opções" : "Expandir opções";
  button.setAttribute("aria-expanded", String(expanded));
  button.setAttribute("aria-label", label);
  button.title = label;
}

document.querySelectorAll(".pp-card--stack").forEach((card) => {
  const button = card.querySelector(":scope > .pp-card__row [data-card-expand]");
  const master = card.querySelector(":scope > .pp-card__row [data-master-toggle]");
  if (!button) return;
  button.addEventListener("click", () => setCardExpanded(card, card.hasAttribute("data-collapsed")));
  master?.addEventListener("change", () => {
    if (master.checked) setCardExpanded(card, true);
  });
});

/* --------------------------------------------------------------- tooltip */
/* Esc fecha o tooltip aberto (sem fechar o modal por trás); ele volta a
   aparecer quando o mouse sai e entra de novo, ou o foco muda. */
document.addEventListener(
  "keydown",
  (event) => {
    if (event.key !== "Escape") return;
    const open = Array.from(document.querySelectorAll(".pp-tooltip")).find(
      (tooltip) => !tooltip.hasAttribute("data-tooltip-dismissed") && (tooltip.matches(":hover") || tooltip.matches(":has(:focus-visible)"))
    );
    if (!open) return;
    event.preventDefault();
    event.stopPropagation();
    open.setAttribute("data-tooltip-dismissed", "");
  },
  true
);
["pointerleave", "focusout"].forEach((type) => {
  document.addEventListener(
    type,
    (event) => {
      const tooltip = event.target instanceof Element ? event.target.closest(".pp-tooltip") : null;
      if (tooltip && (type === "focusout" || event.target === tooltip)) tooltip.removeAttribute("data-tooltip-dismissed");
    },
    true
  );
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
  let menu = root.querySelector("[data-select-menu]");
  const valueLabel = root.querySelector("[data-select-value]");
  const chevron = root.querySelector("[data-select-chevron]");

  if (!(select instanceof HTMLSelectElement) || !(trigger instanceof HTMLButtonElement) || !(menu instanceof HTMLElement)) return null;

  /* A lista aberta ganha um campo de busca no topo: o listbox (<ul>) vai para
     dentro de um painel (.pp-select-menu) junto com o campo e o "sem resultado". */
  const list = menu.matches('[role="listbox"]') ? menu : menu.querySelector('[role="listbox"]');
  if (!(list instanceof HTMLElement)) return null;
  if (list === menu) {
    const panel = document.createElement("div");
    panel.className = "pp-select-menu";
    panel.dataset.selectMenu = "";
    panel.hidden = true;
    list.before(panel);
    list.className = "pp-select-list";
    delete list.dataset.selectMenu;
    list.hidden = false;
    menu = panel;
  }
  const search = document.createElement("input");
  search.type = "search";
  search.className = "pp-select-search";
  search.placeholder = "Buscar";
  search.autocomplete = "off";
  search.setAttribute("aria-label", "Filtrar opções");
  search.setAttribute("aria-controls", list.id);
  const empty = document.createElement("p");
  empty.className = "pp-select-empty";
  empty.textContent = "Nenhum resultado encontrado.";
  empty.hidden = true;
  menu.replaceChildren(search, list, empty);

  const options = () => Array.from(list.querySelectorAll('[role="option"]'));
  const visibleOptions = () => options().filter((item) => !item.hidden && item.getAttribute("aria-disabled") !== "true");
  const normalize = (text) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  let active = -1;

  const filter = () => {
    const term = normalize(search.value.trim());
    let count = 0;
    options().forEach((item) => {
      const match = !term || normalize(item.textContent).includes(term);
      item.hidden = !match;
      if (match) count += 1;
    });
    empty.hidden = count > 0;
    active = -1;
  };
  search.addEventListener("input", filter);

  const sync = () => {
    const option = select.selectedOptions[0];
    if (valueLabel) valueLabel.textContent = option ? option.textContent.trim() : "";
    const dot = root.querySelector("[data-select-dot]");
    if (dot instanceof HTMLElement) dot.style.backgroundColor = option?.dataset.color || "transparent";
    trigger.disabled = select.matches(":disabled");
    options().forEach((item) => item.setAttribute("aria-selected", String(Number(item.dataset.index) === select.selectedIndex)));
  };

  const build = () => {
    list.replaceChildren(
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
        if (option.dataset.color) {
          const dot = document.createElement("span");
          dot.className = "pp-select-dot";
          dot.style.backgroundColor = option.dataset.color;
          dot.setAttribute("aria-hidden", "true");
          item.prepend(dot);
        }
        return item;
      }),
    );
  };

  const setActive = (index) => {
    const items = visibleOptions();
    if (items.length === 0) return;
    active = (index + items.length) % items.length;
    items[active].focus();
  };

  const open = () => {
    if (!menu.hidden || select.matches(":disabled")) return;
    openedSelect?.close();
    build();
    sync();
    search.value = "";
    empty.hidden = true;
    menu.hidden = false;
    menu.classList.remove("pp-select-menu--above", "pp-select-menu--right");
    const menuBounds = menu.getBoundingClientRect();
    const rootBounds = root.getBoundingClientRect();
    const scrollContainer = root.closest(".pp-shift-content, main");
    const visibleBounds = scrollContainer?.getBoundingClientRect();
    const bottom = Math.min(window.innerHeight, visibleBounds?.bottom ?? window.innerHeight);
    const top = Math.max(0, visibleBounds?.top ?? 0);
    if (menuBounds.bottom > bottom && rootBounds.top - top > bottom - rootBounds.bottom) {
      menu.classList.add("pp-select-menu--above");
    }
    menu.classList.toggle("pp-select-menu--right", menuBounds.right > window.innerWidth);
    trigger.setAttribute("aria-expanded", "true");
    chevron?.classList.add("rotate-180");
    openedSelect = { root, close };
    const enabled = visibleOptions();
    const selected = enabled.find((item) => Number(item.dataset.index) === select.selectedIndex);
    selected?.scrollIntoView({ block: "nearest" });
    active = enabled.indexOf(selected);
    search.focus();
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
    const items = visibleOptions();

    /* No campo de busca: setas vão para a lista, Enter escolhe a 1ª opção. */
    if (event.target === search) {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setActive(0);
          break;
        case "ArrowUp":
          event.preventDefault();
          setActive(items.length - 1);
          break;
        case "Enter":
          event.preventDefault();
          choose(items[0]);
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
      return;
    }

    /* Na lista: digitar volta para a busca; seta acima na 1ª opção também. */
    if (event.key.length === 1 && event.key !== " " && !event.ctrlKey && !event.metaKey && !event.altKey) {
      search.focus();
      return;
    }
    if (event.key === "ArrowUp" && active <= 0) {
      event.preventDefault();
      active = -1;
      search.focus();
      return;
    }
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
  if (!(select instanceof HTMLSelectElement) || select.closest("[data-select]") || select.hasAttribute("data-native-select") || select.multiple || select.size > 1) return;

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
  /* Variante "colorfield" (Lumen): bolinha com a cor da opção antes do valor.
     Use <select data-color-select> e data-color="…" em cada <option>. */
  if (select.hasAttribute("data-color-select")) {
    trigger.classList.add("pp-select--color");
    const dot = document.createElement("span");
    dot.className = "pp-select-dot";
    dot.dataset.selectDot = "";
    dot.setAttribute("aria-hidden", "true");
    trigger.append(dot);
  }
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
      const multi = {};
      panel.querySelectorAll("input[name], select[name]").forEach((input) => {
        if (input instanceof HTMLInputElement && input.type === "checkbox" && input.hasAttribute("data-multi")) {
          multi[input.name] ??= [];
          if (input.checked) multi[input.name].push(input.value);
        } else if (input instanceof HTMLInputElement && input.type === "checkbox") values[input.name] = input.checked;
        else if (input instanceof HTMLInputElement && input.type === "radio") { if (input.checked) values[input.name] = input.value; }
        else if (input instanceof HTMLInputElement && VALUE_INPUT_TYPES.has(input.type)) values[input.name] = input.value;
        else if (input instanceof HTMLSelectElement) values[input.name] = input.value;
      });
      if (panel.dataset.preferenceTab === "#tolerancia") values.toleranciaParametros = toleranciaParametros;
      Object.assign(values, multi);
      Object.entries(locationStorage).forEach(([mode, [hash, key]]) => {
        if (hash === panel.dataset.preferenceTab) values[key] = locationPreferences[mode];
      });
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
const preferenceLocationsTitle = document.querySelector("#locais-preferencia-title");
/* level "local": uma linha por Local (sem setores), como Bloqueio por local,
   Período para troca e Limite mensal no sistema atual.
   choice: checkbox ao lado do nome do setor (Cancelamento, Divisões). */
const approvalColumns = [{ key: "aprovacao", label: "Necessita aprovação" }, { key: "justificativa", label: "Necessita justificativa" }];
const locationModes = {
  bloqueio: { level: "local", columns: [{ key: "data", label: "Data limite", type: "date" }] },
  cancelamento: { columns: [], choice: "Permitir cancelamento" },
  divisoes: { columns: [], choice: "Permitir divisão" },
  passagens: { columns: approvalColumns },
  trocas: { columns: approvalColumns },
  periodo: {
    level: "local",
    columns: [{ key: "periodo", label: "Período", type: "select", options: [["", "Sem restrição"], ["semana", "Semana"], ["mes", "Mês"]] }],
  },
  limite: { level: "local", columns: [{ key: "quantidade", label: "Quantidade", type: "number", placeholder: "Sem limite" }] },
  conflitos: { columns: [{ key: "ignorar", label: "Ignorar conflitos" }] },
  horasSetor: { columns: [{ key: "horas", label: "Horas consecutivas", type: "number" }] },
  distancia: { columns: [{ key: "metros", label: "Distância máxima (metros)", type: "number", max: 99999, placeholder: "Sem limite" }] },
  biometriaFixa: { columns: [{ key: "exigir", label: "Exigir sempre" }] },
  biometriaApp: { columns: [{ key: "exigir", label: "Exigir sempre" }] },
  provaDeVida: { columns: [{ key: "taxa", label: "Taxa de verificação (%)", type: "number", max: 100, placeholder: "0" }] },
  visualizacao: { columns: [{ key: "data", label: "Data limite", type: "date" }] },
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

function preferenceNumber(field, label, sectorId = "", group = false, placeholder = "—", max = 999) {
  return `<input type="number" min="0" max="${max}" step="1" inputmode="numeric" class="pp-number pp-number--table" data-field="${field}" ${group ? "data-preference-all-number" : `data-preference-sector="${sectorId}"`} aria-label="${label}" placeholder="${placeholder}" />`;
}

/* <select> nativo (data-native-select): o menu próprio do pp-select seria
   cortado pela rolagem da tabela do diálogo. */
function preferenceSelect(column, label, sectorId) {
  const options = column.options.map(([value, text]) => `<option value="${value}">${text}</option>`).join("");
  return `<select class="pp-input pp-locais-select" data-native-select data-field="${column.key}" data-preference-sector="${sectorId}" aria-label="${label}">${options}</select>`;
}

function preferenceCell(column, label, sectorId = "", group = false) {
  if (column.type === "number") return preferenceNumber(column.key, label, sectorId, group, column.placeholder, column.max);
  if (column.type === "date") return `<input type="date" class="pp-input pp-locais-date" data-field="${column.key}" ${group ? "data-preference-all-number" : `data-preference-sector="${sectorId}"`} aria-label="${label}" />`;
  if (column.type === "select") return preferenceSelect(column, label, sectorId);
  return preferenceCheck(column.key, label, sectorId, group);
}

function syncPreferenceGroups() {
  preferenceLocationsTable?.querySelectorAll("[data-preference-group]").forEach((groupCheck) => {
    const group = groupCheck.closest("tbody");
    const checks = group.querySelectorAll(`[data-preference-sector][data-field="${groupCheck.dataset.field}"]`);
    const checked = Array.from(checks).filter((input) => input.checked).length;
    groupCheck.checked = checks.length > 0 && checked === checks.length;
    groupCheck.indeterminate = checked > 0 && checked < checks.length;
  });
  preferenceLocationsTable?.querySelectorAll("[data-preference-all-number]").forEach((allNumber) => {
    const group = allNumber.closest("tbody");
    const numbers = Array.from(group.querySelectorAll(`[data-preference-sector][data-field="${allNumber.dataset.field}"]`), (input) => input.value);
    allNumber.value = numbers.length && numbers.every((value) => value === numbers[0]) ? numbers[0] : "";
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
  preferenceLocationsTable.classList.toggle("pp-locais-preferencia--cancelamento", Boolean(config.choice));
  preferenceLocationsTitle.textContent = config.level === "local" ? "Locais" : "Locais e Setores";
  preferenceLocationsSearch.placeholder = config.level === "local" ? "Pesquise por um local..." : "Pesquise por um local ou setor...";

  if (config.level === "local") {
    /* Bloqueio geral: uma única data para todos os locais. */
    const tipo = document.querySelector('select[name="tipoBloqueio"]')?.value;
    const rows = mode === "bloqueio" && tipo !== "local"
      ? [{ id: "todos", name: "Todos os locais" }]
      : exampleLocations.map((location, index) => ({ id: `local-${index + 1}`, name: location.name }));
    const body = rows.map(({ id, name }) => {
      const cells = columns.map((column) => `<td>${preferenceCell(column, `${column.label}: ${name}`, id)}</td>`).join("");
      return `<tr class="pp-locais-table__sector pp-locais-table__local" data-preference-row data-search="${name}"><th scope="row" class="font-normal">${name}</th>${cells}</tr>`;
    }).join("");
    preferenceLocationsTable.insertAdjacentHTML("beforeend", `<tbody>${body}</tbody>`);
  } else {
    exampleLocations.forEach((location, index) => {
      const groupCells = columns.map((column) => `<td>${preferenceCell(column, `${column.label}: todos os setores de ${location.name}`, "", true)}</td>`).join("");
      const groupName = config.choice
        ? `<label class="pp-locais-preferencia__choice">${preferenceCheck("permitido", `${config.choice}: todos os setores de ${location.name}`, "", true)}${location.name}</label>`
        : location.name;
      const rows = location.sectors.map((sector) => {
        const fullName = `${sector.name}, ${location.name}`;
        const cells = columns.map((column) => `<td>${preferenceCell(column, `${column.label}: ${fullName}`, sector.id)}</td>`).join("");
        const sectorName = config.choice
          ? `<label class="pp-locais-preferencia__choice">${preferenceCheck("permitido", `${config.choice}: ${fullName}`, sector.id)}${sector.name}</label>`
          : sector.name;
        return `<tr class="pp-locais-table__sector" data-preference-row data-search="${fullName}"><th scope="row" class="font-normal">${sectorName}</th>${cells}</tr>`;
      }).join("");
      const gap = locationGroupGap(index, exampleLocations.length, columns.length + 1);
      preferenceLocationsTable.insertAdjacentHTML("beforeend", `<tbody><tr class="pp-locais-table__group"><th scope="row">${groupName}</th>${groupCells}</tr>${rows}${gap}</tbody>`);
    });
  }

  const values = locationPreferences[mode];
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
  } else if (input.hasAttribute("data-preference-all-number")) {
    input.closest("tbody").querySelectorAll(`[data-preference-sector][data-field="${input.dataset.field}"]`).forEach((sector) => {
      sector.value = input.value;
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
  locationPreferences[currentLocationMode] = values;
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


/* ------------------------------------------------------------- tolerância */
/* Parâmetros de tolerância de entrada e saída: cada um vale para um período e
   tem a regra geral e, opcionalmente, regras por local. As alterações ficam em
   memória e são gravadas por "Salvar Preferências" (toleranciaParametros). */
const TOLERANCIA_PADRAO = {
  entrada: "00:30",
  saida: "00:30",
  antecipada: "sim",
  antecipadaTempo: "00:00",
  postergada: "sim",
  postergadaTempo: "00:00",
  acrescimo: "sim",
  acrescimoTempo: "00:01",
  desconto: "sim",
  descontoTempo: "00:01",
  sobreposicao: "nao",
};
let toleranciaParametros = Array.isArray(stored.toleranciaParametros)
  ? stored.toleranciaParametros
  : [{ id: "p1", inicio: "2026-04-01", fim: "2027-10-01", regra: { ...TOLERANCIA_PADRAO }, locais: [] }];

const toleranciaLista = document.querySelector("#tolerancia-lista");
const toleranciaModal = document.querySelector("#tolerancia-modal");
const toleranciaForm = document.querySelector("#tolerancia-form");
let toleranciaEdicao = null; // { parametroId, localId?, tipo: "parametro" | "local" }

const formatarData = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");
const simNao = (regra, chave) => (regra[chave] === "sim" ? `Sim / ${regra[`${chave}Tempo`]}` : "Não");
const nomeDoLocal = (id) => exampleLocations[Number(id.replace("local-", "")) - 1]?.name ?? id;

function toleranciaResumo(regra) {
  return [
    ["Tolerância de entrada", regra.entrada],
    ["Tolerância de saída", regra.saida],
    ["Considerar entrada antecipada", simNao(regra, "antecipada")],
    ["Considerar saída postergada", simNao(regra, "postergada")],
    ["Calcular acréscimos em blocos", simNao(regra, "acrescimo")],
    ["Calcular descontos em blocos", simNao(regra, "desconto")],
    ["Ignorar sobreposição em plantões consecutivos no mesmo setor", regra.sobreposicao === "sim" ? "Sim" : "Não"],
  ]
    .map(([rotulo, valor]) => `<div class="pp-tolerancia__rule"><dt>${rotulo}</dt><dd>${valor}</dd></div>`)
    .join("");
}

function iconButton(action, icon, label, extra = "") {
  return `<button type="button" class="pp-btn pp-btn--outline pp-btn--icon ${extra}" data-tolerancia-action="${action}" aria-label="${label}" title="${label}">
    <pp-icon type="tools" name="${icon}" class="size-4"></pp-icon>
  </button>`;
}

function renderTolerancias() {
  if (!toleranciaLista) return;
  if (!toleranciaParametros.length) {
    toleranciaLista.innerHTML = `<p class="pp-tolerancia__empty">Nenhum parâmetro de tolerância. Use <strong>Novo parâmetro</strong> para criar o primeiro.</p>`;
    return;
  }
  toleranciaLista.innerHTML = toleranciaParametros
    .map((parametro) => {
      const periodo = `${formatarData(parametro.inicio)} – ${formatarData(parametro.fim)}`;
      const locais = parametro.locais.length
        ? `<ul class="pp-tolerancia__locais-list">${parametro.locais
            .map(
              (local) => `<li data-local-id="${local.id}">
                <div class="min-w-0 flex-1"><p class="font-medium text-ink">${nomeDoLocal(local.local)}</p><p class="text-[12px]">Entrada ${local.regra.entrada} · Saída ${local.regra.saida}</p></div>
                ${iconButton("editar-local", "edit", `Editar regra de ${nomeDoLocal(local.local)}`)}
                ${iconButton("excluir-local", "delete", `Excluir regra de ${nomeDoLocal(local.local)}`, "pp-btn--red")}
              </li>`
            )
            .join("")}</ul>`
        : `<p class="pp-tolerancia__empty">Nenhuma regra por local.</p>`;
      return `<article class="pp-tolerancia" data-parametro-id="${parametro.id}" aria-label="Parâmetro ${periodo}">
        <header class="pp-tolerancia__header">
          <h3>${periodo}</h3>
          <span class="pp-tolerancia__tag">Regra geral</span>
          ${iconButton("excluir", "delete", `Excluir parâmetro ${periodo}`, "pp-btn--red")}
          ${iconButton("editar", "edit", `Editar parâmetro ${periodo}`)}
        </header>
        <div class="pp-tolerancia__body">
          <dl class="pp-tolerancia__rules">${toleranciaResumo(parametro.regra)}</dl>
          <section class="pp-tolerancia__locais" aria-label="Regras por local">
            <h4>Regra por local</h4>
            <button type="button" class="pp-btn pp-btn--outline self-start" data-tolerancia-action="novo-local">
              <pp-icon type="tools" name="plus" class="size-4"></pp-icon>Adicionar tolerância por local
            </button>
            ${locais}
          </section>
        </div>
      </article>`;
    })
    .join("");
}

function syncToleranciaSubcampos() {
  toleranciaForm?.querySelectorAll("[data-yn-sub]").forEach((sub) => {
    const ativo = toleranciaForm.elements[sub.dataset.ynSub].value === "sim";
    sub.hidden = !ativo;
    sub.querySelector("input").disabled = !ativo;
  });
}

function abrirTolerancia(edicao, dados, titulo) {
  toleranciaEdicao = edicao;
  const local = edicao.tipo === "local";
  toleranciaModal.querySelector("#tolerancia-modal-title").textContent = titulo;
  toleranciaForm.querySelector("[data-tolerancia-periodo]").hidden = local;
  toleranciaForm.querySelector("[data-tolerancia-periodo]").disabled = local;
  toleranciaForm.querySelector("[data-tolerancia-local]").hidden = !local;
  const select = toleranciaForm.elements.local;
  select.disabled = !local;
  select.innerHTML = exampleLocations.map((item, index) => `<option value="local-${index + 1}">${item.name}</option>`).join("");
  const valores = { ...TOLERANCIA_PADRAO, ...dados };
  Object.entries(valores).forEach(([nome, valor]) => {
    const campo = toleranciaForm.elements[nome];
    if (!campo) return;
    if (campo instanceof RadioNodeList) campo.value = valor;
    else campo.value = valor;
  });
  syncToleranciaSubcampos();
  toleranciaModal.showModal();
}

toleranciaForm?.addEventListener("change", (event) => {
  if (event.target instanceof HTMLInputElement && event.target.type === "radio") syncToleranciaSubcampos();
});

toleranciaForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!toleranciaForm.reportValidity()) return;
  const dados = Object.fromEntries(new FormData(toleranciaForm));
  const regra = Object.fromEntries(Object.keys(TOLERANCIA_PADRAO).map((chave) => [chave, dados[chave] ?? TOLERANCIA_PADRAO[chave]]));
  const { tipo, parametroId, localId } = toleranciaEdicao;
  if (tipo === "parametro") {
    if (dados.fim < dados.inicio) {
      toleranciaForm.elements.fim.setCustomValidity("O fim do período deve ser depois do início.");
      toleranciaForm.reportValidity();
      toleranciaForm.elements.fim.setCustomValidity("");
      return;
    }
    const existente = toleranciaParametros.find((item) => item.id === parametroId);
    if (existente) Object.assign(existente, { inicio: dados.inicio, fim: dados.fim, regra });
    else toleranciaParametros.push({ id: `p${Date.now()}`, inicio: dados.inicio, fim: dados.fim, regra, locais: [] });
  } else {
    const parametro = toleranciaParametros.find((item) => item.id === parametroId);
    const existente = parametro.locais.find((item) => item.id === localId);
    if (existente) Object.assign(existente, { local: dados.local, regra });
    else parametro.locais.push({ id: `l${Date.now()}`, local: dados.local, regra });
  }
  toleranciaModal.close();
  renderTolerancias();
});

toleranciaModal?.querySelector("[data-tolerancia-close]")?.addEventListener("click", () => toleranciaModal.close());

document.querySelector("[data-tolerancia-novo]")?.addEventListener("click", () => {
  const hoje = new Date().toISOString().slice(0, 10);
  abrirTolerancia({ tipo: "parametro" }, { inicio: hoje, fim: "" }, "Novo parâmetro de tolerância");
});

toleranciaLista?.addEventListener("click", (event) => {
  const botao = event.target instanceof Element ? event.target.closest("[data-tolerancia-action]") : null;
  if (!botao) return;
  const parametro = toleranciaParametros.find((item) => item.id === botao.closest("[data-parametro-id]").dataset.parametroId);
  const localId = botao.closest("[data-local-id]")?.dataset.localId;
  const local = parametro.locais.find((item) => item.id === localId);
  switch (botao.dataset.toleranciaAction) {
    case "editar":
      abrirTolerancia({ tipo: "parametro", parametroId: parametro.id }, { inicio: parametro.inicio, fim: parametro.fim, ...parametro.regra }, "Alterar parâmetros de tolerância");
      break;
    case "excluir":
      toleranciaParametros = toleranciaParametros.filter((item) => item !== parametro);
      renderTolerancias();
      showToast("Parâmetro removido. Salve as preferências para confirmar.");
      break;
    case "novo-local":
      abrirTolerancia({ tipo: "local", parametroId: parametro.id }, { ...parametro.regra }, "Tolerância por local");
      break;
    case "editar-local":
      abrirTolerancia({ tipo: "local", parametroId: parametro.id, localId }, { local: local.local, ...local.regra }, "Tolerância por local");
      break;
    case "excluir-local":
      parametro.locais = parametro.locais.filter((item) => item !== local);
      renderTolerancias();
      break;
  }
});

renderTolerancias();

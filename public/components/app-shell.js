/* ---------------------------------------------------------------------------
   AppShell — topbar e rail compartilhados por todas as páginas.

   Uso (o script fica no <head>, sem defer, para a moldura aparecer junto com
   a página):

     <script src="/components/app-shell.js"></script>
     ...
     <div class="flex h-full min-h-screen flex-col">
       <pp-app-header breadcrumb='[{"label":"Contas","href":"/"},{"label":"Preferências"}]'></pp-app-header>
       <div class="relative flex min-h-0 flex-1">
         <pp-app-sidebar></pp-app-sidebar>
         <main>…</main>
       </div>
     </div>

   - <pp-app-header>: logo, menu de Escalas (mobile), toast, busca,
     notificações e menu da conta, seguido do divisor. O atributo breadcrumb
     (JSON) é opcional; itens com href viram links e o último é a página atual.
   - <pp-app-sidebar>: divisor lateral e o menu de módulos (rail de 85px).
   - O link da página atual (rail, menu da conta e menu de Escalas) recebe
     aria-current="page" pelo endereço, e o botão do módulo que o contém fica
     selecionado. Para forçar outro módulo use <pp-app-sidebar current="escalas">.
   - Os dois elementos usam display: contents, então o header e o nav
     continuam como filhos diretos do layout. O comportamento (menus, toast)
     segue em app.js.
   --------------------------------------------------------------------------- */
(() => {
  const escape = (value) =>
    String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

  const samePage = (href) => {
    if (!href || href === "#" || href.startsWith("#")) return false;
    const target = new URL(href, location.href).pathname.replace(/\/index\.html$/, "/");
    return target === location.pathname.replace(/\/index\.html$/, "/");
  };

  function markCurrentLinks(root) {
    root.querySelectorAll("a[href]").forEach((link) => {
      if (samePage(link.getAttribute("href"))) link.setAttribute("aria-current", "page");
    });
  }

  const HEADER = `<header class="flex h-17 shrink-0 items-center pr-5 pl-5">
  <a
    href="/"
    class="flex shrink-0 items-center gap-1.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500"
    aria-label="Pega Plantão — início"
  >
    <img src="/assets/logo.svg" alt="" width="192" height="24" class="max-sm:w-36" />
  </a>

  <details class="relative ml-2 lg:hidden">
    <summary aria-label="Escalas" class="grid size-9 cursor-pointer list-none place-items-center rounded-full border border-primary-100 bg-white text-primary-500">
      <pp-icon type="sidebar" name="workscale" class="size-6"></pp-icon>
    </summary>
    <nav aria-label="Escalas" class="pp-sidebar-menu pp-account-menu left-0 right-auto">
      <a href="/escala/semanal.html" class="pp-sidebar-menu__item"><pp-icon type="sidebarWorkscale" name="weekly"></pp-icon>Semanal</a>
    </nav>
  </details>
  <!--BREADCRUMB-->

  <div class="relative ml-auto flex items-center gap-[22px]">
    <!-- success toast: logo à esquerda do ícone de busca -->
    <div class="pointer-events-none absolute top-1/2 right-[calc(100%+20px)] z-50 w-max -translate-y-1/2">
      <div
        id="toast"
        hidden
        role="status"
        aria-live="polite"
        class="flex max-w-[calc(100vw-168px)] translate-y-2 items-center gap-2.5 rounded-md bg-green-700 px-4 py-3 text-[13px] font-medium text-white opacity-0 shadow-lg shadow-black/20 transition-all duration-200"
      >
        <pp-icon type="ui" name="circleCheck" class="size-5"></pp-icon>
        <span data-toast-text>Preferências salvas com sucesso.</span>
      </div>
    </div>
    
    <button
      type="button"
      aria-label="Buscar"
      title="Buscar"
      class="grid size-6 place-items-center rounded-md text-gray-700 transition-colors hover:text-primary-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500"
    >
      <pp-icon type="topbar" name="search" class="size-[22px]"></pp-icon>
    </button>

    <button
      type="button"
      aria-label="Notificações"
      title="Notificações"
      class="relative grid size-6 place-items-center rounded-md text-gray-700 transition-colors hover:text-primary-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500"
    >
      <pp-icon type="sidebarandtopbar" name="notification" class="size-[22px]"></pp-icon>
      <span class="absolute -top-0.5 -right-0.5 size-[7px] rounded-full bg-tertiary-500 ring-2 ring-primary-25"></span>
    </button>

    <div id="account-menu-container" class="relative shrink-0">
      <button
        type="button"
        id="account-menu-toggle"
        aria-label="Conta de Diego"
        aria-expanded="false"
        aria-controls="account-menu"
        class="grid size-6 place-items-center rounded-full bg-[linear-gradient(145deg,#0b2b52_0%,#155fae_100%)] text-[10px] font-semibold text-white ring-2 ring-white/70 transition-transform hover:scale-[1.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
      >
        DG
      </button>
      <nav id="account-menu" aria-label="Menu da conta" class="pp-sidebar-menu pp-account-menu" hidden>
        <button type="button" class="pp-sidebar-menu__item w-full text-left" data-account-action="Meus dados">
          <pp-icon type="sidebarWorkscale" name="professional"></pp-icon>Meus dados
        </button>
        <a href="/account-preferences.html" class="pp-sidebar-menu__item">
          <pp-icon type="sidebar" name="settings"></pp-icon>Preferências
        </a>
        <button type="button" class="pp-sidebar-menu__item w-full text-left" data-account-action="Central de Ajuda">
          <pp-icon type="topbar" name="helpDesk"></pp-icon>Central de Ajuda
        </button>
        <button type="button" class="pp-sidebar-menu__item w-full text-left" data-account-action="Sair">
          <pp-icon type="sidebar" name="logout"></pp-icon>Sair
        </button>
      </nav>
    </div>
  </div>
</header>
<div aria-hidden="true" class="h-px shrink-0 bg-primary-50"></div>`;

  const RAIL = `<div
  aria-hidden="true"
  class="pointer-events-none absolute -top-px bottom-0 left-[88px] hidden w-px bg-[linear-gradient(to_bottom,var(--pp-palette-primary-50),rgba(188,242,255,0))] lg:block"
></div>
<nav aria-label="Módulos" class="hidden min-h-0 w-[85px] shrink-0 flex-col items-center gap-[18px] overflow-y-auto pt-[23px] scrollbar-slim lg:flex">
  <button type="button" title="Painel" aria-label="Painel" aria-expanded="false" aria-controls="rail-painel" data-rail-toggle class="pp-sidebar-link">
    <pp-icon type="sidebar" name="dashboard" class="size-6"></pp-icon>
  </button>
  <div id="rail-painel" class="pp-sidebar-menu" aria-label="Painel" hidden>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebar" name="dashboard"></pp-icon>Resumo</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarDashboard" name="report"></pp-icon>Relatórios</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarDashboard" name="finance"></pp-icon>Balanço</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarDashboard" name="tickets"></pp-icon>Chamados</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarDashboard" name="hours"></pp-icon>Carga horária</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarDashboard" name="anualHours"></pp-icon>Carga horária anual</a>
  </div>
  <button type="button" title="Escalas" aria-label="Escalas" aria-expanded="false" aria-controls="rail-escalas" data-rail-toggle class="pp-sidebar-link">
    <pp-icon type="sidebar" name="workscale" class="size-6"></pp-icon>
  </button>
  <div id="rail-escalas" class="pp-sidebar-menu" aria-label="Escalas" hidden>
    <a href="/escala/semanal.html" class="pp-sidebar-menu__item"><pp-icon type="sidebarWorkscale" name="weekly"></pp-icon>Semanal</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarWorkscale" name="monthly"></pp-icon>Mensal</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarWorkscale" name="professional"></pp-icon>Profissional</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarWorkscale" name="search"></pp-icon>Busca</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarWorkscale" name="models"></pp-icon>Modelo</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarWorkscale" name="checkinJustify"></pp-icon>Justificativas de horário</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebar" name="calendarCancel"></pp-icon>Cancelamentos de Agenda</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="tools" name="syncServices"></pp-icon>Sincronização de Plantões</a>
  </div>
  <button type="button" title="Profissionais" aria-label="Profissionais" aria-expanded="false" aria-controls="rail-profissionais" data-rail-toggle class="pp-sidebar-link">
    <pp-icon type="sidebar" name="professionals" class="size-6"></pp-icon>
  </button>
  <div id="rail-profissionais" class="pp-sidebar-menu" aria-label="Profissionais" hidden>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarProfessionals" name="professionals"></pp-icon>Profissionais</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarProfessionals" name="professionalShield"></pp-icon>Coordenadores</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarProfessionals" name="viewers"></pp-icon>Visualizadores</a>
  </div>
  <button type="button" title="Configurações" aria-label="Configurações" aria-expanded="false" aria-controls="rail-configuracoes" data-rail-toggle class="pp-sidebar-link">
    <pp-icon type="sidebar" name="settings" class="size-6"></pp-icon>
  </button>
  <div id="rail-configuracoes" class="pp-sidebar-menu" aria-label="Configurações" hidden>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarSettings" name="places"></pp-icon>Locais e Setores</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarSettings" name="professionalsGroup"></pp-icon>Grupos</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarSettings" name="dutyTypes"></pp-icon>Tipos de Plantão</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarSettings" name="dutysituations"></pp-icon>Situações do Plantão</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarSettings" name="values"></pp-icon>Valores</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarSettings" name="bonus"></pp-icon>Bonificações</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarSettings" name="bankAccounts"></pp-icon>Contas Bancárias</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarSettings" name="businessSubmit"></pp-icon>Cadastros de CNPJ</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarSettings" name="vacation"></pp-icon>Feriados</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarSettings" name="autoSettings"></pp-icon>Auto-Ajustes</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarSettings" name="contractTypes"></pp-icon>Tipos de Contratação</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarSettings" name="productivity"></pp-icon>Produtividades</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarSettings" name="ability"></pp-icon>Habilidades</a>
  </div>
  <button type="button" title="Financeiro" aria-label="Financeiro" aria-expanded="false" aria-controls="rail-financeiro" data-rail-toggle class="pp-sidebar-link">
    <pp-icon type="sidebar" name="finance" class="size-6"></pp-icon>
  </button>
  <div id="rail-financeiro" class="pp-sidebar-menu" aria-label="Financeiro" hidden>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarFinance" name="closure"></pp-icon>Fechamento</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarFinance" name="advance"></pp-icon>Adiantamento</a>
  </div>
  <button type="button" title="Credenciamento" aria-label="Credenciamento" aria-expanded="false" aria-controls="rail-credenciamento" data-rail-toggle class="pp-sidebar-link">
    <pp-icon type="sidebar" name="documents" class="size-6"></pp-icon>
  </button>
  <div id="rail-credenciamento" class="pp-sidebar-menu" aria-label="Credenciamento" hidden>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarSettings" name="places"></pp-icon>Documentos</a>
    <a href="#" class="pp-sidebar-menu__item"><pp-icon type="sidebarSettings" name="professionalsGroup"></pp-icon>Tipos de Documentos</a>
  </div>
  <a href="#" title="Registros" aria-label="Registros" class="pp-sidebar-link">
    <pp-icon type="topbar" name="post" class="size-6"></pp-icon>
  </a>
  <a href="#" title="Mensagens" aria-label="Mensagens" class="pp-sidebar-link">
    <pp-icon type="topbar" name="messagesOrEmails" class="size-6"></pp-icon>
  </a>
</nav>`;

  function breadcrumbHtml(raw) {
    if (!raw) return "";
    let items;
    try {
      items = JSON.parse(raw);
    } catch {
      console.warn("pp-app-header: breadcrumb precisa ser JSON, ex.: [{\"label\":\"Contas\",\"href\":\"/\"}]");
      return "";
    }
    const separator = `<pp-icon type="ui" name="chevronRight" stroke-width="1.9" class="size-4 text-gray-300"></pp-icon>`;
    const parts = items.map((item, index) => {
      const last = index === items.length - 1;
      if (last) return `<span class="font-medium text-ink" aria-current="page">${escape(item.label)}</span>`;
      return item.href
        ? `<a href="${escape(item.href)}" class="transition-colors hover:text-primary-500">${escape(item.label)}</a>`
        : `<span>${escape(item.label)}</span>`;
    });
    return `<nav aria-label="Você está aqui" class="ml-8 hidden items-center gap-2.5 text-[13.5px] sm:flex">${parts.join(separator)}</nav>`;
  }

  class AppHeader extends HTMLElement {
    connectedCallback() {
      if (this.dataset.rendered) return;
      this.dataset.rendered = "true";
      this.innerHTML = HEADER.replace("<!--BREADCRUMB-->", breadcrumbHtml(this.getAttribute("breadcrumb")));
      markCurrentLinks(this);
    }
  }

  class AppSidebar extends HTMLElement {
    connectedCallback() {
      if (this.dataset.rendered) return;
      this.dataset.rendered = "true";
      this.innerHTML = RAIL;
      markCurrentLinks(this);
      const forced = this.getAttribute("current");
      const toggle = forced
        ? this.querySelector(`[aria-controls="rail-${forced}"], [aria-label="${forced}" i]`)
        : this.querySelector('.pp-sidebar-menu a[aria-current="page"]')?.closest(".pp-sidebar-menu")?.previousElementSibling;
      if (toggle?.classList.contains("pp-sidebar-link")) {
        toggle.setAttribute("aria-current", "page");
        toggle.classList.add("pp-sidebar-link--selected");
      }
    }
  }

  customElements.define("pp-app-header", AppHeader);
  customElements.define("pp-app-sidebar", AppSidebar);
})();

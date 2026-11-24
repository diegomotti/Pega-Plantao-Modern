# Pega Plantão — Modern

Página inicial e reconstrução da tela **Contas → Preferências → Plantões**
do Pega Plantão com **HTML + Tailwind CSS**, seguindo a estrutura do projeto Lumen DS
(`public/` estático + `src/input.css` + servidor Node mínimo — sem Vite/TypeScript).

## AppShell (topbar e rail)

O topbar e o rail de módulos ficam em `public/components/app-shell.js`, como dois
elementos usados em todas as páginas:

```html
<head>
  …
  <link rel="stylesheet" href="/styles.css" />
  <script src="/components/app-shell.js"></script>
</head>
<body>
  <div class="flex h-full min-h-screen flex-col">
    <pp-app-header breadcrumb='[{"label":"Contas","href":"/"},{"label":"Preferências"}]'></pp-app-header>
    <div class="relative flex min-h-0 flex-1">
      <pp-app-sidebar></pp-app-sidebar>
      <main>…</main>
    </div>
  </div>
  <script src="/app.js"></script>
</body>
```

- `<pp-app-header>` renderiza o logo, o menu de Escalas (mobile), o toast, a
  busca, as notificações, o menu da conta e o divisor abaixo. `breadcrumb` é
  opcional (JSON); itens com `href` viram links e o último é a página atual.
- `<pp-app-sidebar>` renderiza o divisor lateral e o rail de módulos.
- O link da página atual recebe `aria-current="page"` automaticamente pelo
  endereço, e o módulo que o contém fica selecionado no rail. Para forçar um
  módulo, use `<pp-app-sidebar current="escalas">`.
- O script fica no `<head>` (sem `defer`) para a moldura aparecer junto com a
  página. Os elementos usam `display: contents`; menus e toast continuam em
  `app.js`.
- Para mudar um item do topbar ou do rail, edite só `app-shell.js`.

## Rodar

```bash
npm install
npm run dev      # http://localhost:3100
```

Outros scripts:

| script              | o que faz                                                    |
| ------------------- | ------------------------------------------------------------ |
| `npm run dev`       | servidor + Tailwind em watch (porta 3100)                     |
| `npm start`         | só o servidor estático em `public/`                           |
| `npm run watch:css` | só o Tailwind em watch                                        |
| `npm run build:css` | gera `public/styles.css` minificado                           |

A porta pode ser trocada com `PORT=…` (ex.: `PORT=3200 npm run dev`).

## Estrutura

```
public/index.html        página inicial vazia com header e rail
public/account-preferences.html  preferências, com navegação e conteúdo de Plantões
public/escala/semanal.html  escala semanal ilustrativa
public/weekly-schedule.js  calendário semanal e dados de exemplo
public/app.js            <pp-icon> + interações (nav, toast, menus, preferências, modal)
public/styles.css        CSS gerado pelo Tailwind (npm run build:css)
public/assets/logo.svg   logo do Pega Plantão
public/assets/icons/     432 SVGs do DS + 5 glifos "ui" + icons.json (manifesto)
public/favicon.svg
src/input.css            entrada do Tailwind (@theme + camadas base/components)
src/tokens.lumen.css     snapshot gerado a partir do tokens.json publicado
scripts/sync-tokens.mjs  baixa o tokens.json e gera src/tokens.lumen.css
server.js                servidor estático de public/ + live reload (SSE)
.design/                 referência do Figma + ferramentas de comparação de pixels
```

As abas de **Plantões** (Anúncios, Bloqueio, Cancelamento de Agenda, Divisões,
Passagens e Trocas) seguem o sistema atual
(`/Escala/Preferencias`) e são acessíveis por fragmentos como
`account-preferences.html#trocas`. As opções são salvas no `localStorage` deste
navegador.

Regras de habilitação: em Bloqueio, Cancelamento de Agenda, Divisões, Passagens
e Trocas, o primeiro cartão (`data-master-toggle`) habilita as opções dentro de
`<fieldset data-dependent-fields>`; desmarcado, elas ficam esmaecidas e
desabilitadas. Em Anúncios a notificação não controla os demais cartões.
Cartões que contêm apenas um checkbox podem ser acionados em toda a sua área;
cartões com outros controles mantêm as ações independentes. Cartões marcados
ficam destacados, inclusive ao recarregar preferências salvas.

O diálogo de Locais e Setores (`#locais-preferencia-modal`) é montado conforme a
aba, com hospitais e setores de exemplo (`locationModes` em `app.js`). Uma aba
pode ter mais de um diálogo: Trocas reúne também o Período para troca e o Limite
mensal do sistema atual, e cada diálogo é salvo na sua própria chave
(`locationStorage`).

| aba | linhas | colunas |
| --- | --- | --- |
| Bloqueio | "Todos os locais" (Bloqueio geral) ou um por Local (Bloqueio por local) | Data limite |
| Cancelamento de Agenda, Divisões | setores, com checkbox ao lado do nome | — |
| Passagens, Trocas | setores | Necessita aprovação, Necessita justificativa |
| Trocas › Restringir trocas do mesmo período | Locais | Período (Sem restrição, Semana, Mês) |
| Trocas › Quantidade de trocas permitidas no mês | Locais | Quantidade (em branco = sem limite) |

**Ok** mantém as alterações em edição e **Salvar Preferências** as grava no
navegador; fechar o diálogo descarta as alterações ainda não confirmadas. O
diálogo de Anúncios (`#locais-modal`) ainda é ilustrativo e não é salvo.

### Demais abas

E-mails e Notificações, Credenciamento, Financeiro Avançado, Registro de Entrada
e Saída Avançado (Geral e Avançado, Configurações adicionais e Tolerância),
Valores padrões e Visualização da Escala seguem o sistema atual. Regras de
habilitação:

- Uma aba pode ter vários cartões principais: `data-master-toggle="chave"`
  habilita `<fieldset data-dependent-fields="chave">`. Com várias chaves
  separadas por espaço, o grupo fica habilitado se qualquer uma estiver marcada
  (ex.: os botões de iniciar e encerrar plantão ficam ativos com qualquer forma
  de registro de entrada e saída). Grupos podem ser aninhados (Gestão de
  pagamento → Bloquear alteração de plantões já pagos → Grupo de coordenadores).
- Credenciamento, Financeiro Avançado e Geral e Avançado mostram a faixa do
  módulo contratado (`.pp-module-banner`); o botão **Saiba mais** ainda não tem
  destino.
- Novos diálogos de Locais e Setores: distância máxima por setor, biometria
  facial (dispositivo fixo e aplicativo), taxa de prova de vida e data limite
  para visualização da escala.
- Tolerância: lista de parâmetros por período com a regra geral e regras por
  local; **Novo parâmetro**, editar e excluir abrem o diálogo
  `#tolerancia-modal`. As alterações são gravadas com **Salvar Preferências**
  (`toleranciaParametros`).
- Campos de texto, hora e data com `name` também são salvos no `localStorage`.

As nove abas de **Alertas** (Afastamentos, Conflitos de horários, Horas
consecutivas, Horas consecutivas por setor, Horas semanais, Horas mensais,
Plantões mensais, Intervalo interjornada e Plantões consecutivos) seguem o
conteúdo do sistema atual. Em cada uma, as opções ficam dentro de
`<fieldset data-dependent-fields>` e só são editáveis com **Habilitar alerta**
(`data-master-toggle`) marcado. Os limites usam `pp-number` (campo numérico com o
mesmo formato e rótulo flutuante do `pp-select`) e são salvos como texto. As
listas de grupos (`data-group-list`, com grupos de exemplo) usam checkboxes
`data-multi`, salvos como array; **Todos os profissionais** marca ou desmarca a
lista inteira. Conflitos de horários e Horas consecutivas por setor usam o
diálogo de Locais e Setores (coluna de checkbox e coluna numérica,
respectivamente). As demais seções continuam como áreas ilustrativas.

### Botões

Use `pp-btn` para o botão preenchido primário do catálogo Lumen. Combine-o com
uma classe de cor (`pp-btn--primary-25`, `pp-btn--app-primary`,
`pp-btn--secondary`, `pp-btn--tertiary`, `pp-btn--red`, `pp-btn--green` ou
`pp-btn--white`), de estilo (`pp-btn--outline` ou `pp-btn--text`) e de formato
(`pp-btn--square`, `pp-btn--medium-rounded` ou `pp-btn--pill`), conforme necessário.
Sem classe de formato, o botão usa o arredondamento padrão do catálogo.
`pp-btn--icon` cria um botão quadrado de 40 px; forneça um `aria-label`.
O atributo nativo `disabled` aplica o estado desabilitado.

```html
<button type="button" class="pp-btn pp-btn--red pp-btn--outline">Excluir</button>
```

As cores seguem as variáveis de paleta usadas no catálogo, que podem diferir dos
tokens semânticos de botão. Diferentemente da prévia do catálogo, o estilo
`text` usa fundo transparente e a cor do estilo `outline`. Algumas combinações
claras, como `white` e `secondary` em `outline`, exigem fundo escuro.

### Seletores

Seletores nativos de escolha única são aprimorados automaticamente por `app.js`
com o estilo de **Horário limite para candidatura**, inclusive quando adicionados
à página depois do carregamento. Use um `label` associado e `pp-select` para
manter o estilo básico antes do carregamento do script:

```html
<div class="relative">
  <label for="tipo" class="pp-select-label">Tipo</label>
  <select id="tipo" name="tipo" class="pp-select">
    <option value="clinico">Clínico</option>
    <option value="plantao">Plantão</option>
  </select>
</div>
```

O `select` mantém o valor do formulário; após alterações programáticas sem
evento `change`, chame `syncSelects(container)`. Seletores múltiplos e listas
nativas com `size` maior que 1 mantêm o comportamento nativo.

A escala semanal é acessível em **Escalas → Semanal**. Ela abre na semana
atual e destaca o dia conforme a data local; as setas navegam entre semanas e
o campo Setor filtra os exemplos. Plantões só aparecem na semana ilustrativa
de 15/06/2026, e as ações
de edição, replicação e opções ainda não estão implementadas.

### Tokens (referência ao Lumen DS publicado)

A fonte da verdade é o catálogo publicado em
`https://pegaplantao-lumen-ds.netlify.app/tokens.json` (339 tokens, 130 overrides de
tema escuro). Como o site publicado não expõe um `tokens.css`, o projeto guarda um
**snapshot gerado** e o consome no build:

```
tokens.json (publicado)
      │  npm run sync:tokens
      ▼
src/tokens.lumen.css  →  @import em src/input.css
```

```bash
npm run sync:tokens     # atualiza o snapshot
npm run build           # sync:tokens + build:css
npm run dev             # usa o snapshot (sem rede)
```

O URL é configurável, então dá para sincronizar do Lumen DS local:

```bash
TOKENS_URL=http://localhost:3000/tokens.json npm run sync:tokens
# PowerShell: $env:TOKENS_URL="http://localhost:3000/tokens.json"; npm run sync:tokens
```

`src/tokens.lumen.css` traz `:root` (Palette, Web Elements, Web Components),
`[data-theme="dark"]` e os aliases de Tailwind (`--color-pp-*`, `--text-pp-*`,
`--tracking-pp-*`, `--radius-pp-*`), então classes como `bg-pp-palette-primary-800`
e `text-pp-sm` funcionam. Não edite esse arquivo: ele é sobrescrito pelo script.

O build é offline e determinístico: rode `sync:tokens` quando o DS publicar mudanças.
Se o `tokens.json` estiver indisponível, o script falha com a URL e o HTTP status.

### Ícones

Todos os ícones da tela vêm de um SVG em `public/assets/icons/`, carregado pelo
custom element `<pp-icon>` (definido em `public/app.js`). O manifesto
`assets/icons/icons.json` resolve as variantes por `type`, `filled` e
`monochrome`; cada SVG é buscado uma única vez e fica em cache.

```html
<pp-icon type="sidebar" name="dashboard" class="size-6"></pp-icon>
<pp-icon type="ui" name="chevronDown" stroke-width="2.2"></pp-icon>
<pp-icon type="sidebarSettings" name="places" data-monochrome="true"></pp-icon>
```

`data-monochrome="true"` (ou apenas `data-monochrome`) solicita a variante
monocromática, normalmente branca para botões coloridos. Use `"false"` ou
omita o atributo para a variante colorida, adequada a botões brancos. Se a
variante solicitada não existir, o componente usa outra variante do ícone.
O atributo existente `monochrome` continua aceito e tem precedência quando
ambos são informados. Alterações dos atributos atualizam o ícone.

O grupo `type="ui"` reúne os glifos que não existem no catálogo do Lumen DS e
que antes ficavam inline no `app.js`:

| `name`         | arquivo                                            |
| -------------- | -------------------------------------------------- |
| `check`        | `type-ui--icon-check--filled-false--monochrome-false.svg` |
| `chevronDown`  | `type-ui--icon-chevronDown--...svg`                |
| `chevronRight` | `type-ui--icon-chevronRight--...svg`               |
| `circleCheck`  | `type-ui--icon-circleCheck--...svg`                |
| `gem`          | `type-ui--icon-gem--...svg`                        |

Esses cinco arquivos e suas entradas no `icons.json` são adições locais do
projeto — se a pasta for substituída por um export novo do DS, recrie-os.

### Live reload

`server.js` observa `public/` e envia um evento SSE em `/live-reload`; o
`app.js` recarrega a página (o `watch:css` regrava `public/styles.css`).
Para capturas headless use `?no-reload` para desligar o SSE.

## Tipografia (Lumen Design System)

Famílias importadas do Google Fonts:

- **`Instrument Sans`** (`font-sans`): default sans do sistema
- **`Roboto`** (`font-roboto`, `font-secondary`): sans secundária para blocos de texto
- **`Red Hat Display`** (`font-red-hat-display`, `font-alternative`): sans alternativa para títulos
- **`Libre Bodoni`** (`font-serif`): serif

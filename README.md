# Pega Plantão — Modern

Página inicial e reconstrução da tela **Contas → Preferências → Plantões**
do Pega Plantão com **HTML + Tailwind CSS**, seguindo a estrutura do projeto Lumen DS
(`public/` estático + `src/input.css` + servidor Node mínimo — sem Vite/TypeScript).

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

Anúncios, Bloqueio, Cancelamento de Agenda, Divisões e Passagens têm conteúdo
próprio, acessível por fragmentos como `account-preferences.html#bloqueio`.
As opções dessas telas são salvas no `localStorage` deste navegador.
Os seletores de Bloqueio mostram apenas os valores da referência. Os diálogos de
Locais e Setores de Bloqueio, Cancelamento e Passagens usam hospitais e setores
de exemplo: **Ok** mantém as alterações em edição e **Salvar Preferências** as
grava no navegador; fechar o diálogo descarta as alterações ainda não confirmadas.
A configuração de Locais e Setores de Divisões ainda está em construção. As demais
seções continuam como áreas ilustrativas.

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
<pp-icon type="sidebar" name="dashboard" class="size-[25px]"></pp-icon>
<pp-icon type="ui" name="chevronDown" stroke-width="2.2"></pp-icon>
```

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

# Pega Plantão — Modern: regras do projeto

## CSS: edite só `src/input.css`

- `public/styles.css` é **gerado** pelo Tailwind a partir de `src/input.css`
  (`npm run build:css`, ou `npm run dev` / `npm run watch:css` em modo watch).
- **Nunca edite `public/styles.css` à mão.** Toda mudança de estilo vai em
  `src/input.css` (ou em `src/tokens.lumen.css`, via `npm run sync:tokens`).
- Depois de mudar `src/input.css`, gere o CSS com `npm run build:css` quando
  houver um shell no computador. Sem shell, avise que o watcher (`npm run dev`)
  precisa estar rodando para a mudança aparecer.
- Se o build falhar (ex.: utilitário desconhecido em um `@apply`), corrija a
  causa em `src/input.css` e informe o erro — não contorne o problema
  remendando `public/styles.css`.
- Ao revisar ou depurar estilos, leia `src/input.css`; use
  `public/styles.css` só para conferir o resultado compilado.

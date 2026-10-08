# Casos de teste do motor

Cada caso nasceu de um problema real visto durante o uso do protótipo. Todos precisam virar teste automatizado na fase 0 e continuar passando.

Notação: **Entrada** (HTML-modelo e/ou cadastro) → **Esperado**.

---

## A. Detecção de variáveis

| # | Entrada | Esperado |
|---|---|---|
| A1 | `<p>@cidade_1 - @uf_1</p>` | variáveis `cidade` (num 1) e `uf` (num 1) |
| A2 | `<p>@cidade_1/@uf_1</p>` | as duas são variáveis (barra só de um lado não é pacote npm) |
| A3 | `<script src="https://cdn.jsdelivr.net/npm/@scope/pkg/x.js">` | nenhuma variável |
| A4 | `contato@norte.com` | nenhuma variável |
| A5 | `<!-- use @cidade_1 aqui -->` | nenhuma variável |
| A6 | `<p>Escreva @cidade_N</p>` | nenhuma variável (`_N` literal é documentação) |
| A7 | `<style>@media (max-width:600px){…} @font-face{…}</style>` | nenhuma variável |
| A8 | `<img src="@media_hero_desktop_1">` (fora de style) | variável `media_hero_desktop`, grupo mídia |
| A9 | `<script type="application/ld+json">{"@context":"…","@type":"Event"}</script>` | nenhuma variável |
| A10 | `@{parcelamento_1}x` | variável `parcelamento`, texto "x" preservado depois |
| A11 | `<!-- @se gratuito = sim -->…<!-- @fim -->` sem `@gratuito` no texto | coluna `gratuito` criada, opções = {sim} |
| A12 | `@total_aberta`, `@total_breve`, `@total_cidades` | automáticas (contagem) |
| A13 | `@total_categorias_1` | variável comum da cidade (não é contagem) |
| A14 | `@mes_outono_abrev` com `@mes_outono` existente | automática, 3 letras |

## B. Dono

| # | Entrada | Esperado |
|---|---|---|
| B1 | `@evento` (sem número) | geral |
| B2 | `@cidade_1` na praça | cidade |
| B3 | `@cidade` dentro de `@repetir cidades` no tapume | cidade |
| B4 | Formato com etapas, `@data_etapa_1` só no HTML da etapa | etapa |
| B5 | Variável movida à mão para geral e HTML reenviado | continua geral (`manual`) |
| B6 | `@media_*`, `@img_*`, `@video_*` | grupo mídia, nunca coluna de texto |
| B7 | Formato com etapas, `<!-- @se noturna = sim -->` só no HTML da etapa | etapa (coluna de bloco segue a regra de `_1`) |
| B8 | HTML trocado por versão com seções novas | cadastro, donos movidos à mão e escolhas de mídia continuam valendo; variáveis novas entram com dono inferido |

## C. Preço e gratuito (padrão do guia)

Modelo:

```html
<span class="v"><!-- @se gratuito = sim -->Evento gratuito<!-- @senao --><!-- @se preco_vista -->R$@preco_vista_1<!-- @senao -->A confirmar<!-- @fim --><!-- @fim --></span>
```

| # | Cidade | Esperado |
|---|---|---|
| C1 | `preco_vista = 150` | `R$150` |
| C2 | `gratuito = sim` | `Evento gratuito` |
| C3 | `gratuito = sim`, `preco_vista = 150` | `Evento gratuito` |
| C4 | vazio | `A confirmar` |
| C5 | `gratuito = Sim` | `Evento gratuito` (sem diferença de maiúsculas) |
| C6 | `<!-- @se gratuito_1 = sim -->` no modelo, `gratuito = sim` | `Evento gratuito` (`_1` ignorado no `@se`) |
| C7 | `@se gratuito` sem operador, `gratuito = não` | trata como vazio |
| C8 | `parcelamento = 10`, `valor_parcelado = 15` | `preco_vista` calculado `150` |
| C9 | `preco_vista = 150`, `parcelamento = 10` | `valor_parcelado` calculado `15` |
| C10 | `preco_vista = 1720` (digitado) | sai `1.720` |
| C11 | `preco_vista = 1425` e `parcelamento = 10` | `valor_parcelado` = `142,50` |
| C12 | `preco_vista` e `valor_parcelado` vazios, `parcelamento = 10` | ambos vazios, sem loop |
| C13 | `Combo<!-- @se valor_adicional_prime --> + R$@valor_adicional_prime_1<!-- @fim -->` sem prime | `Combo` (some o "+" e o "R$") |

## D. Status e contagens

| # | Entrada | Esperado |
|---|---|---|
| D1 | cidade sem status, `@se status = aberta` | cai no `@senao` (em breve) |
| D2 | cidades: [aberta, vazio, vazio] | `@total_aberta` = 1, `@total_breve` = 2 |
| D3 | `<!-- @se status = em breve -->` e status vazio | verdadeiro |
| D4 | status `em breve` digitado, `@total_breve` | conta 1 |
| D5 | opções de status com HTML testando só `aberta` | [em breve, aberta]; padrão em breve |
| D6 | linha nova copiada de uma linha `aberta` | status volta ao padrão |
| D7 | `@agrupar por regiao` com Sudeste [2 cidades], Nordeste [1] | `@total_cidades` = 2 no grupo Sudeste, 1 no Nordeste |
| D8 | status "aberto" numa cidade e HTML testa "aberta" | aviso "valor que o HTML não conhece" |
| D9 | `@total_breve` num tapume sem nenhum `@se status` | cidades sem status contam como breve |
| D10 | linha sem a coluna `status` (nunca preenchida) e `@se status = em breve` | verdadeiro (igual a status vazio) |
| D11 | status "em breve" digitado e HTML testa "aberta" | sem aviso de valor desconhecido |

## E. Blocos

| # | Entrada | Esperado |
|---|---|---|
| E1 | `@repetir cidades` com 0 cidades | nenhum card |
| E2 | `@repetir cidades` com 3 cidades | 3 cards, cada um com os seus valores e `@url` próprio |
| E3 | `@repetir etapas` dentro da praça de SP | só as etapas cuja `_cidade` é SP |
| E4 | `@se` sem `@fim` | aviso bloqueante com o nome do bloco |
| E5 | `@fim` a mais | aviso bloqueante |
| E6 | `@senao` fora de `@se` | aviso bloqueante |
| E7 | `@se data_fim -->De @data_inicio_1 a @data_fim_1<!-- @senao -->@data_inicio_1<!-- @fim -->` | com fim: "De 12/03 a 14/03"; sem: "12/03" |
| E8 | praça com bloco mal fechado e 2 cidades | um aviso de bloco só (não um por cidade) |

## F. Arquivos e URLs

| # | Entrada | Esperado |
|---|---|---|
| F1 | cidade "São Paulo" | `sao-paulo.html`; `@url` no card = `sao-paulo.html` |
| F2 | cidade sem nome, linha 3 | `cidade-3.html` |
| F3 | coluna de nome vazia e `uf = SP` | nome "Cidade N" (não usa UF) |
| F4 | duas cidades "Recife" | aviso bloqueante de arquivo duplicado |
| F5 | etapa "Outono" da cidade "São Paulo" | `sao-paulo-outono.html` |
| F6 | `_arquivo = "sp.html"` | usa `sp.html` |
| F7 | tapume com `@cidade_3` e 2 cidades | vazio + aviso "mais espaços do que itens" |

## G. Mídia

| # | Entrada | Esperado |
|---|---|---|
| G1 | `@media_hero_desktop`, pasta `_media/praca/hero/` com `hero_desktop.webp`, `hero_desktop.mp4`, `mobile/hero.webp` | opções: os dois `hero_desktop.*` (não o mobile) |
| G2 | idem, sem escolha | padrão `hero_desktop.webp` (imagem preferida) |
| G3 | `@img_kit_foto` com `.webp` e `.mp4` na pasta | só `.webp` |
| G4 | `<img class="a" src="x.mp4" alt="H">` | `<video class="a" aria-label="H" src="x.mp4" data-pub-midia autoplay muted loop playsinline>` + CSS injetado no head |
| G5 | `<picture><source srcset="m.webp"><img src="x.mp4"></picture>` | o picture inteiro vira `<video … src="x.mp4">` |
| G6 | `<picture><source srcset="x.mp4"><img src="a.webp"></picture>` | source removido, img mantido |
| G7 | `<img data-src="z.mp4" src="a.webp">` | inalterado |
| G8 | `<video src="a.webp">` | vira `<img data-pub-midia>` |
| G9 | `const v = window.innerWidth < 700 ? "_media/praca/hero/m.mp4" : "_media/praca/hero/d.mp4"` | as duas referências detectadas |
| G10 | pasta antiga `_images/praca/kit/` | aceita como `_media` |
| G11 | variável de mídia por cidade (`_1`) | escolha diferente por linha |
| G12 | página com `.hero__bg--desk{display:none}` e as duas tags trocadas por vídeo | o CSS injetado não vence o da página (especificidade zero, `:where`): só a versão daquela tela aparece |
| G13 | mídia sem `_1` passada para "por cidade", uma cidade com escolha e outra sem | a sem escolha usa a escolha geral (não o arquivo padrão) |
| G14 | mídia escondida (geral numa imagem de fundo por CSS; numa cidade num `<img>` trocado por vídeo) | a tag sai da página e `url()` fica vazio; nada entra no lugar; não conta como campo vazio |

## H. Conversor de cards fixos

| # | Entrada | Esperado |
|---|---|---|
| H1 | tapume com 16 cards `@cidade_1…16`, 2 formatos (com `<a>` e sem) | um card com `@repetir cidades` + `@se status = aberta` / `@senao` |
| H2 | cards em `<section data-regiao="Sudeste">` | `@agrupar por regiao`; título vira `@regiao`; quantidade vira `@total_cidades` |
| H3 | "5 com inscrição aberta · 11 em breve" | vira `@total_aberta` / `@total_breve` |
| H4 | 3 formatos de card diferentes | erro "converta à mão" |
| H5 | HTML que já tem `@repetir` | não oferece conversão |

Usar `exemplos/combo-geral-2027-tapume.html` e `exemplos/combo-estacoes-tapume.html` como golden.

## I. Golden (ponta a ponta)

| # | Modelos | Cadastro | Esperado |
|---|---|---|---|
| I1 | `exemplos/makai-praca.html` | 2 cidades: SP (150, aberta) e Recife (gratuito) | `sao-paulo.html` com "R$150"; `recife.html` com "Evento gratuito" |
| I2 | `exemplos/combo-estacoes-tapume.html` + `combo-estacoes-praca.html` | 3 cidades em 2 regiões | `index.html` com 3 cards agrupados; contagens certas; links para as praças |
| I3 | `exemplos/combo-geral-2027-tapume.html` + `combo-estacoes-praca.html` | 2 cidades com meses | `@mes_*_abrev` automáticas no tapume ("Mai", "Jan") |

Gravar as saídas aprovadas em `packages/motor/test/golden/` e comparar (ignorando espaços). Para regravar depois de uma mudança aprovada: `pnpm golden`.

Os tapumes de cards fixos dos casos H1–H4 são fixtures sintéticos em `packages/motor/test/fixtures/` (os dois tapumes Combo de `exemplos/` já usam `@repetir`, então servem para H5).

## J. Verificador de HTML (fase 0)

| # | HTML | Esperado |
|---|---|---|
| J1 | `<!-- @se preco_vista -->…<!-- @senao --><!-- @se gratuito = sim -->…` | problema: preço testado antes do gratuito (com linha) |
| J2 | `R$@preco_vista_1` fora de bloco `@se gratuito` | problema |
| J3 | `<script>if (gratuito === 'sim')…</script>` | problema |
| J4 | `A confirmar` fora de `@senao` | problema (só com "A" maiúsculo: "a confirmar" no meio de uma frase é texto comum) |
| J5 | `@se status = aberto` | problema: use `aberta` |
| J6 | `@valor_1`, `@preco_1`, `@municipio_1` | problema: nome fora da base |
| J7 | `<picture><img src="@media_hero_desktop_1"></picture>` | problema |
| J8 | `src="data:image/png;base64,…"` | problema |
| J9 | HTML do guia (seção 12) copiado à risca | nenhum problema |
| J10 | `<div data-gratuito="@gratuito_1">` | problema: decisão guardada em atributo |
| J11 | `<img src="assets/foto.webp">` | problema: mídia fora de `_media/` |
| J12 | `@total_categorias_1`, `<!-- @se gratuito_1 == "sim" -->` | problemas: `total_` próprio; sintaxe do `@se` |

## K. Seções (esconder e mostrar)

| # | Entrada | Esperado |
|---|---|---|
| K1 | HTML com `<section id>` aninhadas, comentadas e sem id | lista só as de primeiro nível com id; nome = `aria-label`, senão o título (se não for só variável), senão o id |
| K2 | `kit` escondida, menu com `<li><a href="#kit">` e botão `href="#kit"` | seção, item de menu e botão saem; o resto fica |
| K3 | `praca#kit` escondida no evento, mostrada em SP; `praca#faq` escondida só em SP | SP: kit sim, faq não. RJ: kit não, faq sim |
| K4 | tapume com seção escondida | vale a escolha geral |
| K5 | página de etapa com exceção da cidade (esconder) e da etapa (mostrar) | a da etapa vence |
| K6 | mesmo id no tapume e na praça | escolhas independentes por tipo de página |

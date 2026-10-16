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
| B9 | Praça com `<!-- @se faq1_pergunta -->@faq1_pergunta<!-- @fim -->` (texto sem `_1`); `<!-- @se noturna = sim -->` sem texto; `@se status` com `@status` | `faq1_pergunta` geral (o `@se` segue o texto); `noturna` da cidade; nomes da base (`status`, preço…) sempre da cidade |

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
| D5 | opções de status com HTML testando só `aberta` | [em breve, aberta, realizado, esgotado]; padrão em breve |
| D6 | linha nova copiada de uma linha `aberta` | status volta ao padrão |
| D7 | `@agrupar por regiao` com Sudeste [2 cidades], Nordeste [1] | `@total_cidades` = 2 no grupo Sudeste, 1 no Nordeste |
| D8 | status "aberto" numa cidade e HTML testa "aberta" | aviso "valor que o HTML não conhece" |
| D9 | `@total_breve` num tapume sem nenhum `@se status` | cidades sem status contam como breve |
| D10 | linha sem a coluna `status` (nunca preenchida) e `@se status = em breve` | verdadeiro (igual a status vazio) |
| D11 | status "em breve" digitado e HTML testa "aberta" | sem aviso de valor desconhecido |
| D12 | status `esgotado`; HTML com `@se status = aberta` e com `@se status = esgotado` | o bloco da aberta vale (página e botões abertos); o `@se status = esgotado` vale onde existe; `@total_esgotado` conta à parte |

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
| F8 | One page com `@evento`, `@se tema1_titulo` e `@repetir cidades` | um `index.html`; tudo é geral (inclusive `tema1_titulo`); só o que está em `@repetir cidades` vira coluna da lista; sem cidades a lista sai vazia e não bloqueia |

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
| J5 | `@se status = aberto` | problema: use `aberta`; `aberta`, `em breve` e `realizado` não acusam |
| J6 | `@valor_1`, `@preco_1`, `@municipio_1` | problema: nome fora da base |
| J7 | `<picture><img src="@media_hero_desktop_1"></picture>` | problema |
| J8 | `src="data:image/png;base64,…"` | problema |
| J9 | HTML do guia (seção 12) copiado à risca | nenhum problema |
| J10 | `<div data-gratuito="@gratuito_1">` | problema: decisão guardada em atributo |
| J11 | `<img src="assets/foto.webp">` | problema: mídia fora de `_media/` |
| J12 | `@total_categorias_1`, `<!-- @se gratuito_1 == "sim" -->` | problemas: `total_` próprio; sintaxe do `@se` |
| J13 | `<script>tab.scrollIntoView(…)</script>` | problema: rolagem da página inteira (o site abre no meio); `barra.scrollTo({ left })` não é problema |
| J14 | `<h2>`, `<p>` com frases fixas (3 ou mais); `<svg><path>` no HTML | problemas: "texto-fixo" (com contagem e exemplos) e "svg-embutido"; texto dentro de `@se…@fim` e com variável não conta; `<svg><use>` não conta |

## K. Seções (esconder e mostrar)

| # | Entrada | Esperado |
|---|---|---|
| K1 | HTML com `<section id>` aninhadas, comentadas e sem id | lista só as de primeiro nível com id; nome = `aria-label`, senão o título (se não for só variável), senão o id |
| K2 | `kit` escondida, menu com `<li><a href="#kit">` e botão `href="#kit"` | seção, item de menu e botão saem; o resto fica |
| K3 | `praca#kit` escondida no evento, mostrada em SP; `praca#faq` escondida só em SP | SP: kit sim, faq não. RJ: kit não, faq sim |
| K4 | tapume com seção escondida | vale a escolha geral |
| K5 | página de etapa com exceção da cidade (esconder) e da etapa (mostrar) | a da etapa vence |
| K6 | mesmo id no tapume e na praça | escolhas independentes por tipo de página |
| K7 | ordem [c, a, b] com texto e seção sem id entre as seções | as seções com id trocam de lugar; o resto fica onde estava |
| K8 | seção nova no HTML fora da ordem salva | entra logo depois da que vinha antes dela |
| K9 | ordem e seção escondida juntas, só na praça | tapume na ordem do HTML; praça reordenada e sem a escondida |

## Q. Módulo de imagem (passo Seções)

| # | Entrada | Esperado |
|---|---|---|
| Q1 | módulo numa página com seções; página sem seções | entra como `<section id="pub-img-…">` de primeiro nível depois da última seção (sem seções: antes do `</body>`); aparece na lista como "Imagem: <arquivo>" |
| Q2 | ordem com o módulo entre duas seções; módulo escondido numa cidade | fica entre elas; some só naquela cidade; não aparece em outro tipo de página |
| Q3 | PNG com largura 40, fundo e espaço G; valores inválidos | `<img>` com o caminho da mídia (vai para o site), `--pub-larg:40%`, fundo e regra para celular; largura vira 10–100, cor inválida não entra |
| Q3b | módulo com altura 420, 0 e 99999 | `--pub-alt:420px` (imagem no meio; no celular até 80% da tela); 0 = sem altura; 99999 vira 1200 |
| Q4 | SVG com script, onclick e javascript:; com e sem cor única | embutido limpo, com viewBox; sem cor fica o original; com cor, fill/stroke viram currentColor (menos none) |
| Q5 | SVG com "@cidade_1" no texto | o @ fica como está (o módulo entra depois das variáveis) |

## L. Rodapé

| # | Entrada | Esperado |
|---|---|---|
| L1 | `praca#@rodape` escondido; HTML com `<footer>` solto e outro dentro de uma seção | some o solto, fica o de dentro da seção; tapume intacto |
| L2 | rodapé padrão com fonte, cores, descrição com `<`, link `javascript:` e redes | fonte e cores no estilo, texto escapado, link inseguro descartado, ícones com a cor do texto |
| L3 | rodapé padrão ligado no evento | entra antes de `</body>` em todas as páginas, fonte no `<head>` |
| L4 | escondido em SP, rodapé próprio no RJ | SP sem rodapé; RJ com o próprio; tapume com o geral |
| L5 | desligado no evento, ligado numa cidade | só aquela cidade tem |
| L6 | cor ou fonte inválida (tentando quebrar o CSS) | volta ao padrão |
| L7 | logo, descrição com `**negrito**`, título "Dúvidas", links e rede com texto | duas colunas (logo e descrição / título, links e redes), negrito, texto ao lado do ícone, empilha no celular; logo com caminho estranho é descartado |

## M. Patrocinadores

| # | Entrada | Esperado |
|---|---|---|
| M1 | Master, Gold e Silver com logos fora de ordem | cotas uma abaixo da outra, com título e tamanho da cota; logos em ordem alfabética; link em nova aba; sem link, só o logo |
| M2 | Apoio, Ticketeria e Realização | Ticketeria e Realização na mesma faixa |
| M3 | bloco sem título com um GG e dois P (Lei de ICMS) | linha GG em cima, linha P embaixo, sem título |
| M4 | ordem escolhida e ordem aleatória | escolhida respeita a ordem; aleatória marca a linha e põe o script |
| M5 | só patrocinador desativado | seção não aparece; aviso |
| M6 | tapume + praça, com etapas e One page | só internas: cada praça a sua (tapume nunca); com etapas, cada etapa a sua e a praça nenhuma; One page com a dela (chave `unica`); antes do rodapé do HTML e do rodapé padrão |
| M7 | bloco com várias cotas lado a lado e nome do bloco; cota sem nome | nome do bloco acima da faixa; cota sem nome sem título; bloco de uma cota ignora o nome do bloco |

## N. Edição na prévia

| # | Entrada | Esperado |
|---|---|---|
| N1 | página gerada sem `marcarEdicao` | nenhuma marca nem `<pub-v>` (o site publicado nunca tem) |
| N2 | com `marcarEdicao`: variável em texto, atributo, `<title>`, `<style>`, `<script>` e em `@repetir cidades`; contagem | texto visível vira `<pub-v data-v="variável" data-l="linha">` (linha vazia = geral, id da cidade na lista); atributos, title, style e script ficam com o valor puro; contagens não são marcadas |
| N3 | `@a_confirmar` no `@senao` de `@se local`, dentro de `@repetir cidades` | é geral e sai "A confirmar" por padrão; na prévia, o campo editável é o `local` daquela cidade |
| N4 | `@se horario` vazio com "A confirmar" (texto, `<span>` ou `@a_confirmar`) no `@senao`; `@se gratuito = sim` | na prévia vira `<pub-v data-v="horario" data-l="linha" data-ph="1">` (digitar por cima preenche o horário); @se com comparação não vira campo; site publicado igual |

## O. Datas

| # | Entrada | Esperado |
|---|---|---|
| O1 | 13/10/2026 com _dia, _mes, _mes_nome, _mes_abrev, _ano, _curta, _semana, _semana_abrev, _extenso; "12/03"; texto | 13, 10, outubro, out, 2026, 13/10, terça-feira, ter, "13 de outubro de 2026"; sem ano: mês sim, ano vazio; texto sai como foi digitado |
| O2 | @periodo: mesmo mês, meses diferentes, anos diferentes, sem fim, extenso | "13 a 23 out 2026", "28 set a 3 out 2026", "30 dez 2026 a 2 jan 2027", "13 out 2026", "13 a 23 de outubro de 2026" |
| O3 | HTML só com @data_inicio_dia_1, @periodo_1 e @periodo no card | data_inicio e data_fim viram colunas da cidade sozinhas; variações são automáticas e saem formatadas |
| O4 | prévia editável com @data_evento_dia e @data_evento | só a data pura é editável; as variações não |

## P. Modo automático (status realizado)

| # | Entrada | Esperado |
|---|---|---|
| P1 | automático, 8 h; Cotia termina 23/10/2026; Ibiúna só com início 23/10; agora 23/10 07:59 e 08:00 (Brasília) | às 07:59 nada muda; às 08:00 Cotia e Ibiúna ficam "realizado" em @se e em @total_realizado; sem data não muda |
| P2 | manual; horas 0 e 30 | manual não muda; 0 h: 00:00 do último dia; 30 h: dia seguinte às 06:00 |
| P3 | automático com HTML sem `@se status = realizado` | "realizado" está nas opções de status; aviso (alerta) "O HTML não mostra realizado" |

## R. SEO e compartilhamento

| # | Entrada | Esperado |
|---|---|---|
| R1 | tudo vazio, HTML com title, description e favicon | título/descrição do HTML; og:title/og:description copiam; og:image = primeira foto (jpg/png/webp, não svg); favicon do HTML; tags sem duplicar |
| R2 | HTML sem title nem description | título = nome do evento (na cidade: "evento · cidade"); descrição = primeiro parágrafo com 40+ caracteres, cortado em ~155 sem quebrar palavra, com "…" |
| R3 | título, descrição, favicon e compartilhamento preenchidos | valem os preenchidos, com {evento} trocado e aspas/< escapados; favicon e imagem vão para o site |
| R4 | com endereço do site | og:image e og:url absolutos (index.html → raiz) |
| R5 | gerar sem seo / com seo; SP sem cadastro, RJ com cadastro próprio | sem seo o head fica como veio; SP herda da principal ("São Paulo - <título>", descrição, og:title com o nome na frente, imagem e favicon da principal; o `<title>` do HTML da praça não vale); RJ usa o seu título, imagem e favicon |

## S. Página "em breve" não abre no site

| # | Entrada | Esperado |
|---|---|---|
| S1 | publicação; SP aberta, RJ sem status (em breve), BH realizado | SP e BH normais; o arquivo de RJ existe, mas só leva para index.html (refresh + script) com robots noindex; o tapume continua listando todas |
| S2 | prévia (sem fecharEmBreve) | a página de RJ aparece normal |
| S3 | HTML sem status; formato com etapas e status das etapas | sem status nada fecha; com status das etapas, fecha só a etapa em breve (a praça da cidade abre) |

## T. Arquivo para baixar e galeria por cidade

| # | Entrada | Esperado |
|---|---|---|
| T1 | `@arquivo_material_aula` | é variável de mídia; opções = arquivos da pasta da seção (PDF e imagens, sem fontes) |
| T2 | `<a href="@arquivo_material_aula">` com aula.pdf na pasta | href = o PDF (padrão pelo nome); o arquivo vai para o site; `<img>` vizinho segue imagem |
| T3 | galeria dentro de `@repetir cidades`, subpastas `galeria/sao-paulo/`, `galeria/rio-de-janeiro/` | cada cidade pega as fotos da sua subpasta; espaço numerado sem arquivo de mesmo nome fica vazio e o `@se` tira (não repete a primeira foto) |

## U. Galeria (`@repetir galeria`)

| # | Entrada | Esperado |
|---|---|---|
| U1 | 4 fotos (SP, RJ, todas, SP) fora de cidade | todas na ordem; `@galeria_cidade` = nome (vazio na de todas); `@galeria_numero` 1…4; legenda opcional com `@se`; os arquivos vão para o site |
| U2 | galeria dentro de `@repetir cidades` | cada cidade mostra as dela e as de todas |
| U3 | página da cidade (praça); duas galerias (`galeria`, `galeria_bastidores`) | só as da cidade e as de todas; cada galeria com a sua lista |
| U4 | detecção | `@galeria_*` não vira coluna; `galeriasDe` lista as galerias dos HTMLs |

## V. Cidades vazias (sobra de planilha)

| # | Entrada | Esperado |
|---|---|---|
| V1 | One page com 2 cidades e 2 linhas sem nada (só id / só espaços) | `@repetir cidades` com 2 itens, `@total_cidades` = 2, aviso `linhas-vazias` "2 cidade(s) vazia(s)" |
| V2 | tapume + praça com uma linha vazia | continua virando `cidade-N.html` (protótipo), sem aviso |
| V3 | enviar `valores-iniciais.csv` (`variavel;valor`) | vai para os gerais; cidades não mudam (apps/web, planilha.test.ts) |
| V4 | enviar planilha com linhas só de id | não viram cidade; as vazias atuais saem contadas ("N sem nada preenchido") |

## W. Séries numeradas

| # | Entrada | Esperado |
|---|---|---|
| W1 | faq1…3, equipe1…2 (mesmos campos), material_capa_linha1…2, destaque1 + destaque2_gratuito, carreta_ponto1…3 + hero_ponto1 | listas: faq, equipe, carreta_ponto; o resto fica solto |
| W2 | itens com campos diferentes | campos na ordem do item 1; cada item diz o que falta ("O HTML não tem, neste item: …" no Cadastro) |
| W3 | variação opcional `faqN_resposta_gratuito` dentro de `@se gratuito = sim` | preenchida e gratuito: ela; vazia ou pago: `faqN_resposta` |
| J16 | `@hero_titulo_linha1`, `@hero_titulo_linha2`, `@hero_titulo_destaque` (ou `@titulo` + `@titulo_destaque`) | problema "texto-dividido": um campo só, com a formatação no publicador; um `_linha1` sozinho não conta |
| J15 | faq1 com `_resposta_gratuito`, faq2/faq3 com `_resposta` | problema `lista-desigual` dizendo o que falta em cada item |

## AA. Texto formatado, blocos ocultos e movidos, links em nova aba

| # | Entrada | Esperado |
|---|---|---|
| AA1 | valor com `<br>` e `<span class style>` usado no texto, num `alt` e no `<title>` | HTML limpo na tela; texto puro (quebra vira espaço) no atributo e no título |
| AA2 | valor com `<script>`, `onclick`, `url()`, `position`; `<div>` do editor; `<font color>`; tag sem fechar; texto comum "eu <3" | só b/strong/i/em/u/s/br/span (com cor, fundo, tamanho, peso, estilo, espaçamento, altura da linha, maiúsculas, sublinhado) ficam; div vira quebra; font vira span; tags fechadas; texto comum escapado |
| AA3 | campo com "ocultar texto" / "ocultar bloco" | texto com `visibility:hidden` (bloco mantém o tamanho) / bloco some (`<pub-o data-bloco>` + CSS `:has`) e o resto sobe; sem uso, nada de CSS a mais |
| AA4 | campo com "mover" −1 | marcador `<pub-o data-mover>` no bloco e o script que troca de lugar com o irmão |
| AA4b | `<h2><span>@a</span></h2>` com "mover" 2; campo sozinho num `<div>` dentro da `<section>` | move o `<h2>` (o `<span>` não tem irmão); move a seção inteira |
| AA4c | campo em `aria-label`, `<script>`, `<title>` e outro em texto e em `alt` | os três primeiros são texto simples; o que também está no texto, não |
| AA4d | rodapé com descrição, título e link formatados no editor; descrição antiga com `**negrito**` | HTML limpo (script sai, texto fica); título sem tags no aria-label; `**…**` continua virando `<strong>` |
| AA4e | três cards; `f1` junto de `n1` (antes), `f2` e `n2` depois de `l2` | marcadores `data-campo`/`data-junto`; cada card reordenado só com os campos dele (F1 N1 L1 / L2 F2 N2) |
| AA5 | links `@link_…` externos, com "nova aba" desligada, âncora `#`, `@url`, link escrito no HTML | externo ganha `target="_blank" rel="noopener"`; desligado fica na mesma aba (tira o target); âncora e página do site, nada |

## Z. Preços do Odoo (apps/web, odoo.test.ts, Odoo simulado)

| # | Entrada | Esperado |
|---|---|---|
| Z1 | link `…/shop/cde27combo4sp-…-346`, link sem código `…-belo-horizonte-410?x=1`, link de outro site | 346; 410; nenhum |
| Z2 | combo R$ 799 com "Compare to Price" 1.149,96, 12x, Prime 10% | parcela 66,58 (para baixo), separado 1.149,96, 31% e R$ 350,96 de desconto, Prime 719,10 e 59,92; distâncias por etapa; sem meses |
| Z3 | combo de Recife com etapas de Salvador; ingresso com nome trocado e a distância no código do produto (`-13KM]`); Prime sem regra | etapas de Salvador fora (aviso); distância pelo código; sem Prime |
| Z4 | combo sem código no padrão | preço e link vêm; distâncias não (aviso) |
| Z5 | sincronizar duas vezes sem mudança; combo que não existe | grava na primeira, não na segunda; cidade sem link intocada; aviso "não existe" |
| Z6 | automação com o preço mudado e evento publicado; fora da janela de 30 min; desligado | grava e republica; nada; nada |
| Z7 | "Buscar agora" gravou valores novos sem publicar; automação seguinte sem mudança no Odoo | publica na passada seguinte, fora da hora do intervalo (e tira o `pendente`); na próxima, nada |
| Z8 | intervalo 2, 6 e 24 h | confere só na passada do começo do intervalo, contado da 0h de Brasília (padrão 6 h) |
| Z9 | combo à venda / nunca vendeu e fora de venda / vendeu e saiu de venda; status trocado à mão | aberta / em breve / esgotado (preços ficam); a troca à mão fica até o Odoo mudar de situação |
| Z10 | combo com `sale_ok` falso numa cidade que já vendeu, evento publicado | esgotado, preço anterior mantido, motivo no resultado, site republicado |

## X. Publicação agendada (apps/web, automacao.test.ts)

| # | Entrada | Esperado |
|---|---|---|
| X1 | agendamento vencido, com produção e domínio | versão nova no teste e na produção; agendamento sai; `ultimoAgendamento` ok "no teste e na produção" |
| X2 | agendamento no futuro | nada |
| X3 | só teste com produção na mesma versão / pediu produção sem domínio | produção acompanha / só teste, com o aviso "não tem domínio" |
| X4 | evento que não pode ser publicado | não publica, agendamento sai, motivo em `ultimoAgendamento` |

## Y. Pós-evento

| # | Entrada | Esperado |
|---|---|---|
| Y1 | One page com `pos_unica`, desligado / ligado ("unica") | página normal / pós no mesmo index.html (`pos: true`); `@pos_texto` é geral e só do pós |
| Y2 | tapume + praça com `pos_praca`: ligado em SP; `comRealizado` com RJ realizado; `previa` | só SP troca; só RJ troca; todas trocam; tapume nunca; `@pos_texto_1` é da cidade |
| Y3 | pós ligado em cidade "em breve", publicação | abre (não vira página fechada) |
| Y4 | com etapas e `pos_etapa` | só a etapa ligada troca; variável só do pós da etapa é da etapa; sem HTML de pós, nada muda |
| Y5 | `@img_resultados_podio` no pós | pasta `_media/pos/resultados/` |


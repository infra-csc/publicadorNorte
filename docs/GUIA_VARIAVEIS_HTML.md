# Guia de variáveis para HTML de eventos

Vale para **qualquer evento** (corrida, beach tennis, combo…) e para **todas as páginas**: tapume (home), praça (interna da cidade) e etapa.
Quem monta o HTML (designer ou Claude) segue este guia. Isso inclui imagens e vídeos (seção 9). O Publicador de Hotsites lê o HTML, acha as variáveis e monta uma página por cidade.

**Este é o único arquivo de regras.** Ele já inclui as regras de preço, gratuito e status (seção 12). Se houver outro guia antigo no canal, ignore-o.

---

## 1. Tudo editável, tudo conectado, tudo responsivo

Esta é a regra mais importante do guia. O HTML é um **modelo**: quem publica precisa conseguir trocar **qualquer texto, link, imagem ou ícone** pelo publicador, sem abrir o código. O que fica escrito direto no HTML não aparece no cadastro e não pode ser corrigido por quem publica.

| Vira variável (aparece no cadastro ou no passo Mídia) | Fica no código |
|---|---|
| **Todo texto que aparece na tela**: títulos, subtítulos, parágrafos, rótulos, legendas, texto de botão, perguntas e respostas das dúvidas, avisos | Estrutura: tags, classes, CSS, JavaScript |
| Dados da cidade e do evento: cidade, local, datas, horários, preços, status | Setas, "+", "×" e outros sinais de interface (feitos em CSS ou texto, não imagem) |
| **Todos os links**: inscrição, WhatsApp, e-mail, redes sociais, vídeos, arquivos para baixar (PDF) | |
| **Todas as imagens, ícones e ilustrações** (como arquivos em `_media`, seção 9) | |

Não existe "texto genérico que não muda": se aparece na tela, vira variável. Uma variável a mais não atrapalha; um texto fixo errado vai para o ar e ninguém consegue corrigir sem pedir um HTML novo.

### 1.1 Textos
- Nome = `<seção>_<parte>`, sem número quando é igual em todas as páginas: `@sobre_titulo`, `@sobre_texto`, `@duvidas_titulo`, `@duvidas_sub`, `@inscricao_botao`, `@material_titulo`.
- Listas de itens parecidos são **séries numeradas**, cada item dentro do seu `@se`, com mais espaços do que o necessário hoje (o que sobrar some). No publicador elas aparecem em blocos, com + e − para mostrar ou tirar um item:

```html
<ul class="qa">
  <!-- @se faq1_pergunta -->
  <li><details><summary><img src="@img_duvidas_icone1" alt=""><span>@faq1_pergunta</span></summary>
    <div class="a"><p>@faq1_resposta</p></div></details></li>
  <!-- @fim -->
  <!-- @se faq2_pergunta -->
  <li><details><summary><img src="@img_duvidas_icone2" alt=""><span>@faq2_pergunta</span></summary>
    <div class="a"><p>@faq2_resposta</p></div></details></li>
  <!-- @fim -->
  <!-- … até faq12 -->
</ul>
```
- **Todos os itens de uma série têm os mesmos campos** (mesmo molde). Se uma dúvida tem link, todas têm `@faqN_link` (dentro de `@se faqN_link`). Nada de dúvida 1 com `_resposta_gratuito`/`_resposta_preco` e dúvida 2 só com `_resposta`, nem de passo 2 com `_texto_gratuito` e passo 3 sem: no publicador cada item vira um formulário diferente e quem preenche não entende. O verificador acusa (`lista-desigual`).
- Texto que muda conforme o evento (gratuito, preço, em breve) é um **campo opcional que existe em todos os itens**; vazio, vale o campo normal:

```html
<!-- em TODAS as dúvidas (faq1 … faq12), igual: -->
<div class="a"><p>
  <!-- @se gratuito = sim --><!-- @se faq1_resposta_gratuito -->@faq1_resposta_gratuito<!-- @senao -->@faq1_resposta<!-- @fim -->
  <!-- @senao -->@faq1_resposta<!-- @fim -->
</p>
<!-- @se faq1_link --><a class="btn" href="#datas">@faq1_link</a><!-- @fim --></div>
```
  Resposta que mostra dado do cadastro (preço, lista de cidades) continua com o padrão do dado **depois** do texto do campo, no item que precisa; os campos continuam os mesmos em todos os itens.
- Quantidades mínimas de espaços: dúvidas 12, equipe 8, depoimentos 8, temas/etapas 8, vídeos 6. (Galeria não usa espaços fixos: seção 1.4.)
- Pergunta das dúvidas que depende de dado (preço, cidades, duração) também é variável; a resposta usa o padrão do dado (preço da seção 12, `@repetir cidades` para a lista de cidades).

### 1.2 Links e arquivos para baixar
- Links: `@link_inscricao` (base), `@link_whatsapp`, `@link_email`, `@link_instagram`, `@link_youtube`, `@link_regulamento`… Todo `<a href>` que leva para fora usa uma variável.
- **Arquivo para baixar (PDF)**: use uma variável `@arquivo_<seção>_<nome>`. O PDF fica em `_media/<pagina>/<secao>/` e quem publica escolhe ou envia o arquivo no passo **Mídia**:

```html
<!-- @se arquivo_material_aula -->
<a class="btn" href="@arquivo_material_aula" download>@material_botao</a>
<span>@material_paginas páginas · @material_tamanho</span>
<!-- @senao -->
<span class="btn btn--off">Disponível em breve</span>
<!-- @fim -->
```

### 1.3 Imagens, ícones e ilustrações
- **Toda imagem é um arquivo** dentro de `_media/<pagina>/<secao>/` (seção 9), com uma variável `@img_<secao>_<nome>` quando quem publica pode querer trocar. Isso vale para foto, ilustração, ícone, selo e capa.
- **Ícones em SVG, como arquivo**: exporte cada ícone como um `.svg` próprio (com `viewBox`, sem `width`/`height` fixos) na pasta da seção ou em `_media/<pagina>/icones/`, e use `<img src="@img_icones_preco" alt="">`. **Não escreva `<svg>…</svg>` dentro do HTML** para ícones e ilustrações: assim eles não podem ser trocados.
- Se o ícone precisa mudar de cor pelo CSS, use `mask-image`/`-webkit-mask-image` com o arquivo `.svg` e `background-color` no CSS.
- **Todo arquivo citado no HTML vai junto na pasta `_media` entregue.** Nada de imagem de exemplo com texto, print de tela ou mensagem de erro: use a imagem real ou uma imagem neutra da cor do layout.
- Ilustrações em camadas (personagem, ingredientes, fundo) são arquivos separados, cada um com sua variável.

### 1.4 Galeria (fotos por cidade)
Galeria **não** é uma série de espaços fixos (`@img_galeria_foto1…12`). É uma lista: quem publica envia **quantas fotos quiser** no passo **Mídia**, várias de uma vez, e marca cada uma com a cidade (ou "Todas as cidades"). No HTML, escreva **um item só** entre `@repetir galeria` e `@fim`, com as variáveis da foto:

| Variável | O que vira |
|---|---|
| `@galeria_foto` | o arquivo da foto (use no `src`) |
| `@galeria_legenda` | a legenda (pode ficar vazia: use `@se galeria_legenda`) |
| `@galeria_cidade` | o nome da cidade da foto (vazio quando a foto é de todas) |
| `@galeria_numero` | 1, 2, 3… na ordem da galeria |

```html
<!-- Galeria com abas por cidade: um bloco por cidade, cada um com as fotos dela -->
<!-- @repetir cidades -->
<div class="galeria" data-cidade="@cidade">
  <!-- @repetir galeria -->
  <figure class="galeria__item">
    <img src="@galeria_foto" alt="@galeria_legenda" loading="lazy">
    <!-- @se galeria_legenda --><figcaption>@galeria_legenda</figcaption><!-- @fim -->
  </figure>
  <!-- @fim -->
</div>
<!-- @fim -->
```
- **Dentro de `@repetir cidades`** (ou na página da cidade), a galeria mostra as fotos daquela cidade e as marcadas para todas. **Fora**, mostra todas as fotos, e o `@galeria_cidade` serve para filtrar por JavaScript (`data-cidade="@galeria_cidade"`).
- Mais de uma galeria na página: dê um nome depois de `galeria`, `<!-- @repetir galeria_bastidores -->`. Cada uma tem a sua lista no passo Mídia.
- O CSS da galeria funciona com qualquer quantidade de fotos (0, 1, 3, 40): grade com `auto-fill`/`minmax` ou carrossel com rolagem. Se a cidade não tiver foto, o bloco fica vazio: esconda com `.galeria:empty { display: none }` ou mostre um aviso por CSS.
- As variáveis de foto não aparecem no cadastro: quem publica cuida das fotos no passo Mídia.

### 1.5 Tudo conectado (botões e números sincronizados)
- **A mesma ação usa a mesma variável e o mesmo `@se` em todo lugar**: o botão do topo, o botão fixo no rodapé do celular, o da seção de inscrição e o do card de compartilhar. Se a inscrição está "em breve", **todos** dizem "em breve"; se está aberta, **todos** levam ao `@link_inscricao`.
- Contagens nunca são digitadas: `@total_cidades`, `@total_aberta`, `@total_breve`. "2 cidades" escrito no HTML fica errado na terceira cidade.
- Texto que repete um dado (ex.: "a partir de 16 anos" no FAQ e na inscrição) usa **a mesma variável** nos dois lugares.

### 1.6 Animações
- Animação de entrada (aparecer deslizando, contar números, desenhar ilustração) começa quando o elemento **entra na tela** (`IntersectionObserver`), inclusive o que já está visível quando a página abre. Não dependa só do evento `load` da janela ou do `scroll`.
- Sem JavaScript, o conteúdo aparece (o estado "escondido antes de animar" é colocado pelo próprio script, com uma classe).
- Funciona dentro da prévia do publicador (a página roda num quadro) e quando a página abre já rolada no meio.
- Respeite `prefers-reduced-motion: reduce` (sem movimento, conteúdo visível).
- Imagens fora do topo com `loading="lazy"`; a do topo sem lazy.

### 1.7 Responsivo
- Monte primeiro para celular e confira em **360, 390, 768, 1024, 1280 e 1440 px** de largura. Nenhuma largura pode ter rolagem horizontal.
- Textos com `clamp()`, imagens com `max-width:100%` e `height:auto` (ou `object-fit` na classe), grades com `auto-fit`/`minmax`.
- Áreas de toque com pelo menos 44 × 44 px; botão fixo no rodapé do celular não cobre conteúdo (deixe espaço no fim da página).
- Textos longos (nomes de cidade grandes, valores com centavos) não podem estourar cards e botões.

---

## 2. Como escrever

| Regra | Exemplo |
|---|---|
| Começa com `@`, nome em minúsculas, palavras separadas por `_` | `@data_inicio_1` |
| Só letras, números e `_`. Nada de acento, `-`, `$` ou espaço | `@desconto_em_reais_1`, **não** `@desconto-em-R$` |
| Na página da cidade (praça) e da etapa, toda variável da cidade termina em `_1` | `@cidade_1`, `@preco_vista_1` |
| Variável igual em todas as páginas não tem número | `@evento`, `@ano` |
| Num `@se` fora de `@repetir`, vale o que o texto usa: `<!-- @se faq1_pergunta -->@faq1_pergunta…` é igual em todas; com `@x_1` (ou sem texto, como `@se noturna = sim`), muda em cada cidade. Nomes da base (`status`, `gratuito`, preços) são sempre da cidade | `<!-- @se compra_item1 -->@compra_item1<!-- @fim -->` |
| Texto colado logo depois da variável: use chaves | `@{parcelamento_1}x` → "12x" |
| Unidade e símbolo ficam no HTML; a variável leva só o valor | `R$@preco_vista_1`, `@porcentagem_desconto_1% OFF` |
| Trecho que só aparece se houver valor: comentários `@se` e `@fim` | ver seção 4 |
| Nunca coloque `@se` / `@fim` dentro de um atributo (`href="..."`, `class="..."`) | |
| Comentários (`<!-- -->`) não são lidos como variável: use para documentar | |

---

## 3. Variáveis base (nomes obrigatórios)

Sempre que o dado existir no evento, use **exatamente** estes nomes. É o que mantém as colunas do cadastro e as contas automáticas funcionando em todos os eventos. Nunca crie outro nome para o mesmo dado (ex.: `@valor`, `@preco`, `@data`, `@municipio`).

### Gerais (sem número)
| Variável | O que é |
|---|---|
| `@evento` | Nome do evento |
| `@ano` | Ano da edição |

### Da cidade
| Variável | O que é | Valor digitado |
|---|---|---|
| `@cidade_1` | Nome da cidade | São Paulo |
| `@uf_1` | Estado | SP |
| `@regiao_1` | Região (agrupa os cards no tapume) | Sudeste |
| `@status_1` | Situação da inscrição | `aberta` ou `em breve` (o padrão; ver seção 12) |
| `@local_1` | Onde acontece | Parque Villa-Lobos |
| `@data_inicio_1` | Primeiro dia | 13/10/2026 (calendário; o formato na página é do HTML, seção 4) |
| `@data_fim_1` | Último dia (vazio se for um dia só) | 23/10/2026 |
| `@link_inscricao_1` | Link do botão de inscrição | https://… |

### Preço

**Antes de escrever o HTML, defina como o evento cobra.** Inscrição e kit sempre têm um valor (a não ser no evento gratuito). O que muda é a forma:

| Forma de cobrança | Variáveis que o HTML usa | Não crie |
|---|---|---|
| **À vista** (sem parcelamento) | `@preco_vista_1` | `@parcelamento`, `@valor_parcelado` |
| **Parcelado** (com opção à vista) | `@preco_vista_1`, `@parcelamento_1`, `@valor_parcelado_1` | — |
| **Gratuito** em alguma cidade | `@gratuito_1` (além das de cima) | — |
| **Com desconto** em relação ao preço cheio | `@porcentagem_desconto_1`, `@preco_comum_1`, `@desconto_em_reais_1` | — |

Se o briefing não diz que o evento é parcelado, ele é **à vista**: não crie variáveis de parcela. Se o briefing não deixa claro, pergunte antes de montar.

| Variável | O que é | Preenchimento |
|---|---|---|
| `@preco_vista_1` | Preço da inscrição (à vista), só número | digitado. Se o evento for parcelado, pode ser **automático**: parcelamento × valor_parcelado |
| `@parcelamento_1` | Número de parcelas | 12 |
| `@valor_parcelado_1` | Valor de cada parcela, só número | digitado ou **automático**: preco_vista ÷ parcelamento |
| `@gratuito_1` | Evento gratuito nesta cidade | `sim` ou vazio |
| `@porcentagem_desconto_1` | Desconto, só número | 30 |
| `@preco_comum_1` | Preço sem desconto | **automático**: preco_vista ÷ (1 − desconto/100) |
| `@desconto_em_reais_1` | Quanto economiza | **automático**: preco_comum − preco_vista |

O publicador aceita qualquer forma: digite o preço à vista, ou as parcelas, ou os dois. O que faltar e der para calcular, ele calcula.

**Nunca escreva o preço como texto fixo** ("A confirmar", "R$ 150"). O preço é sempre variável. "A confirmar" só aparece no HTML como o caso de preço vazio, dentro do padrão da seção 4.

### Módulo O2 Prime (só se o evento tiver)
| Variável | O que é | Preenchimento |
|---|---|---|
| `@preco_prime_1` | Preço à vista com O2 Prime | digitado |
| `@preco_prime_parcelado_1` | Parcela com O2 Prime | **automático** |
| `@valor_adicional_prime_1` | Quanto o Prime soma | **automático** |

Com os **preços do Odoo** ligados (passo Cadastro), o O2 Prime é desconto de assinante: `@preco_prime_1` é o preço do combo para assinante, e `@porcentagem_desconto_prime_1` o desconto (ex.: `10`). Nesse caso, não use `@valor_adicional_prime_1`. O Odoo também preenche `@etapa1_distancias_1`… (“5, 10, 13”) e, se o nome da etapa tiver a estação, `@mes_outono_1` / `@mes_outono_abrev_1`.
| `@link_inscricao_prime_1` | Link do checkout com Prime | digitado |

Evento sem O2 Prime: simplesmente não use estas variáveis.

### Automáticas (o publicador preenche)
| Variável | O que vira |
|---|---|
| `@url` / `@url_1` | Nome do arquivo da página daquela cidade (para links) |
| `@total_cidades` | Quantas cidades (dentro da região, se estiver num grupo) |
| `@total_aberta`, `@total_breve` | Quantas cidades têm esse status |
| `@<variavel>_abrev` | 3 primeiras letras (ex.: `@mes_outono_abrev` → "Mai") |

---

## 4. Padrões prontos (copiar e colar)

### Preço — evento à vista
```html
<!-- @se gratuito = sim -->
  <b>Evento gratuito</b>
<!-- @senao --><!-- @se preco_vista -->
  <b>R$@preco_vista_1</b>
<!-- @senao -->
  <b>A confirmar</b>
<!-- @fim --><!-- @fim -->
```

### Preço — evento parcelado
```html
<!-- @se gratuito = sim -->
  <b>Evento gratuito</b>
<!-- @senao --><!-- @se preco_vista -->
  <!-- @se parcelamento -->
    <b>@{parcelamento_1}x R$@valor_parcelado_1</b>
    <span>ou R$@preco_vista_1 à vista</span>
  <!-- @senao -->
    <b>R$@preco_vista_1</b>
  <!-- @fim -->
<!-- @senao -->
  <b>A confirmar</b>
<!-- @fim --><!-- @fim -->
```
- "Evento gratuito" sai sem "R$". Nas cidades gratuitas, deixe os campos de preço vazios.
- Cidade sem parcelamento cadastrado mostra só o preço à vista, sem "x" e sem parcela vazia.
- Cidade ainda sem preço mostra "A confirmar". Assim que o preço for cadastrado, ele aparece.
- Use **o mesmo padrão** em todo lugar onde o preço aparece (card do kit, barra fixa, FAQ, card do tapume).
- Se tirar a linha `@se gratuito`, tire também o `@fim` correspondente (o último).

### Datas: o cadastro guarda, o HTML escolhe o formato
Toda variável de data se chama `data` ou começa com `data_` (`@data_inicio`, `@data_fim`, `@data_etapa`…). No publicador ela é sempre um **campo de data com calendário** (13/10/2026). **Como a data aparece na página é escolha do HTML**, pelo fim do nome da variável. O publicador formata sozinho; **não formate data com JavaScript** (nem leia `data-ini`/`data-fim` para remontar o texto).

| No HTML | Sai (data 13/10/2026) |
|---|---|
| `@data_inicio` | 13/10/2026 |
| `@data_inicio_curta` | 13/10 |
| `@data_inicio_dia` | 13 |
| `@data_inicio_mes` | 10 |
| `@data_inicio_mes_abrev` | out |
| `@data_inicio_mes_nome` | outubro |
| `@data_inicio_ano` | 2026 |
| `@data_inicio_semana` | terça-feira |
| `@data_inicio_semana_abrev` | ter |
| `@data_inicio_extenso` | 13 de outubro de 2026 |
| `@periodo` | 13 a 23 out 2026 (de `data_inicio` a `data_fim`) |
| `@periodo_extenso` | 13 a 23 de outubro de 2026 |

- Na página da cidade, com `_1` no fim, como sempre: `@data_inicio_dia_1`, `@periodo_1`. No card do tapume e dentro de `@repetir cidades`, sem número.
- `@periodo` não repete mês e ano: "13 a 23 out 2026", "28 set a 3 out 2026", "30 dez 2026 a 2 jan 2027"; um dia só (sem data de fim): "13 out 2026".
- Não precisa escrever a data pura no HTML para a coluna existir: usar só `@data_inicio_dia` ou `@periodo` já cria a coluna de data no cadastro.
- Para montar o seu próprio formato, combine as partes: `@data_inicio_dia de @data_inicio_mes_nome` → "13 de outubro".

Exemplo de período com dia da semana:
```html
<!-- @se data_fim -->@periodo_1<!-- @senao -->@data_inicio_semana_1, @data_inicio_extenso_1<!-- @fim -->
```

### Desconto
```html
<span class="badge">@porcentagem_desconto_1% OFF</span>
<s>R$@preco_comum_1</s> — economize R$@desconto_em_reais_1
```

### Trecho opcional (some inteiro se não houver valor)
```html
Combo<!-- @se valor_adicional_prime --> + R$@valor_adicional_prime_1<!-- @fim -->
```
Sem valor, some o "+" e o "R$" junto.

### Valor ainda não definido ("A confirmar")
Quando um dado ainda não existe (local, horário, endereço, contato, preço…), a página mostra "A confirmar" no lugar dele. Cada "A confirmar" pertence a **um dado específico**: ele fica no `@senao` do `@se` daquele dado.

```html
<dd><!-- @se horario -->@horario_1<!-- @senao -->A confirmar<!-- @fim --></dd>
```
Dentro de `@repetir cidades` (tapume, One page), o mesmo sem `_1`: `<!-- @se horario -->@horario<!-- @senao -->A confirmar<!-- @fim -->`.

- **Um `@se` por dado**, com o nome do próprio dado (`@se horario`, `@se contato`). Assim, no publicador, clicar no "A confirmar" (edição na prévia) **preenche aquele dado**, daquela cidade; quando ele tem valor, o "A confirmar" some sozinho.
- **É só texto**, com o mesmo estilo do valor que ele substitui. Proibido:
  - borda, contorno ou traçado/tracejado em volta;
  - bolinha, ponto, ícone ou símbolo antes ou depois;
  - selo/badge, fundo colorido, colchetes (`[A CONFIRMAR]`) ou caixa alta forçada só para ele.
- Se precisar de uma classe para isso, ela não pode mudar a aparência além de, no máximo, uma cor de texto mais suave (ex.: `.tbc{color:inherit;opacity:.7}`).
- Não use uma variável única para todos os "A confirmar" (como `@a_confirmar`): cada um é de um dado.

### Link de inscrição
```html
<a class="cta" href="@link_inscricao_1">Garantir minha vaga</a>
```

### Partes que podem sumir (`@se`) e o CSS
Quando um `@se` tira um elemento da página (ex.: o card do O2 Prime, numa cidade sem `preco_prime`), o publicador apaga o elemento do HTML. O CSS que arruma o que sobrou precisa enxergar isso **pelo tipo do elemento**, não pela posição:

- Use `:only-of-type`, **nunca** `:only-child`. Quase sempre existe outro filho no mesmo pai (uma `<legend>`, um título, um `<span>` escondido para leitor de tela), e aí o `:only-child` nunca vale.
- Pelo mesmo motivo, use `:first-of-type`, `:last-of-type` e `:nth-of-type()` em vez de `:first-child`, `:last-child` e `:nth-child()` em itens opcionais.
- Os itens opcionais devem ser do mesmo tipo de tag entre si (todos `<label>`, todos `<article>`…) e de um tipo diferente dos outros filhos do pai.

```html
<fieldset class="cp-opts">
  <legend class="so-leitor">Escolha sua versão</legend>
  <label class="cp-opt">… Combo …</label>
  <!-- @se preco_prime -->
  <label class="cp-opt cp-opt--o2">… Combo + O2 Prime …</label>
  <!-- @fim -->
</fieldset>
```
```css
.cp-opts { display: grid; grid-template-columns: 1fr 1fr; }
/* sobrou um card só: ocupa a linha inteira, centralizado */
.cp-opts > .cp-opt:only-of-type { grid-column: 1 / -1; max-width: 560px; justify-self: center; width: 100%; }
```
Com `:only-child`, a `<legend>` conta como filho e o card fica preso em meia coluna.

Alternativa sem seletor: grade que se ajusta sozinha à quantidade de itens, por exemplo `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`.

---

## 5. Variáveis próprias do evento

Cada evento pode ter dados que só ele tem. Exemplo de **beach tennis**: categorias, formato do torneio, premiação. Para criar:

1. **Confira se já existe uma base** para aquele dado (seção 3). Se existir, use a base.
2. **Dê um nome que explica o dado**, em minúsculas com `_`: `@categorias_1`, `@formato_torneio_1`, `@premiacao_1`, `@vagas_por_categoria_1`.
3. **Não reaproveite nomes da base com outro sentido** (ex.: não use `@status` para "status da quadra"; use `@status_quadra_1`).
4. **Siga as mesmas regras**: `_1` se muda por cidade, sem número se é igual para todas; unidade fora da variável (`@vagas_1 vagas`, `R$@premiacao_1`).
5. **Registre no bloco de documentação** no fim do HTML (seção 10).

O publicador lê qualquer `@nome` como variável e cria a coluna sozinho. Também dá para criar colunas no cadastro com "+ Coluna" e montar contas com elas.

---

## 6. Página de cidade (interna / praça)

- Um HTML só para todas as cidades.
- Toda variável da cidade termina em `_1`: ela vira o valor da cidade daquela página.
- O publicador gera um arquivo por cidade cadastrada (`sao-paulo.html`, `recife.html`…).

### One page (página única, sem tapume)

- No One page **todo o cadastro é geral**: cada variável vira um campo único (`@evento`, `@hero_texto`, `@tema1_titulo`, `@faq3_pergunta`…). Não use `_1` no fim para "página": escreva o nome sem número.
- Lista de cidades na página (agenda, acordeão, mapa): use `@repetir cidades` com um item só, como no tapume (seção 7). As variáveis dentro dele (`@cidade`, `@uf`, `@local`, `@data_inicio`…) viram colunas da tabela de cidades, uma linha por cidade.
- Blocos numerados que podem sobrar (temas, salas, equipe, perguntas do FAQ): `@tema1_titulo`, `@tema2_titulo`… cada um dentro do seu `<!-- @se tema1_titulo -->…<!-- @fim -->`. Vazio, o bloco some. No publicador eles aparecem agrupados, com + e − para mostrar ou tirar um bloco.
- Sai um `index.html`. Mídia, patrocinadores, seções e rodapé funcionam como na página de cidade. As imagens ficam em `_media/pagina/`.

---

## 7. Tapume (home com os cards das cidades)

**Nunca escreva um card para cada cidade** (`@cidade_1`, `@cidade_2`, `@cidade_3`…). Escreva **um card só**, entre os comentários abaixo. O publicador cria um card para cada cidade cadastrada: sem cidade, não aparece card; cidade nova, aparece card novo.

Dentro do card, as variáveis **não têm número** (o card já é de uma cidade).

```html
<p class="contagem">@total_aberta com inscrição aberta · @total_breve em breve</p>

<!-- @agrupar por regiao -->
<section class="regiao" data-regiao="@regiao">
  <h3>@regiao <span>@total_cidades</span></h3>
  <div class="grade">
<!-- @repetir cidades -->
<!-- @se status = aberta -->
    <a class="card aberta" href="@url">
      <h3>@cidade <span>@uf</span></h3>
      <p>@periodo · @local</p>
      <p><!-- @se gratuito = sim -->Evento gratuito<!-- @senao --><!-- @se preco_vista -->R$@preco_vista<!-- @senao -->A confirmar<!-- @fim --><!-- @fim --></p>
      <span class="tag">inscrições abertas</span>
    </a>
<!-- @senao -->
    <div class="card breve" aria-disabled="true">
      <h3>@cidade <span>@uf</span></h3>
      <span class="tag">em breve</span>
    </div>
<!-- @fim -->
<!-- @fim -->
  </div>
</section>
<!-- @fim -->
```

| Comentário | O que faz |
|---|---|
| `@agrupar por regiao` … `@fim` | Repete a seção uma vez para cada região do cadastro |
| `@repetir cidades` … `@fim` | Repete o card uma vez para cada cidade |
| `@se status = aberta` … `@senao` … `@fim` | Card de inscrição aberta (com link) ou card "em breve" (sem link) |

- Para abrir uma cidade, troca-se o status no cadastro. O HTML não muda.
- As variáveis do card têm os **mesmos nomes** da página da cidade (`@cidade`, `@data_inicio`, `@valor_parcelado`…). Uma coluna do cadastro serve as duas páginas.
- Sem agrupamento por região: tire as linhas `@agrupar` e o `@fim` correspondente.
- Cada `@se`, `@repetir` e `@agrupar` precisa do seu `@fim`.

---

## 8. Formato com etapas (home → cidade → etapa)

- **Tapume:** lista as cidades (igual à seção 7).
- **Praça:** página da cidade com o seletor de etapas. Para listar as etapas, use `@repetir etapas` com um card só, como na seção 7.
- **Etapa:** página interna de cada etapa. Variáveis que só existem nela (ex.: `@etapa_1`, `@data_etapa_1`) viram colunas da tabela de etapas.

---

## 9. Imagens e vídeos (pasta `_media`)

Imagens e vídeos ficam juntos na pasta `_media`, organizados por **página** e **seção**. Cada imagem ou vídeo que pode ser trocado tem **uma variável**. No passo **Mídia** do publicador, cada variável só aceita os arquivos da pasta da sua seção: não dá para colocar a foto do kit no lugar do vídeo do topo.

### Pastas
```
_media/
  tapume/            ← home
    destaque/
    card/
  praca/             ← página da cidade
    hero/
      fundo.webp
      desktop.mp4
      mobile.mp4
    kit/
      foto.webp
      camiseta.webp
    arena/
      video.mp4
  etapa/             ← só no formato com etapas
  pagina/            ← só no formato One page
```
- Primeiro nível: a página (`tapume`, `praca`, `etapa` ou `pagina`).
- Segundo nível: a **seção** da página, em uma palavra, minúsculas, sem acento e sem `_` (`hero`, `kit`, `arena`, `galeria`).
- Dentro da seção: todas as opções daquele lugar, imagens e vídeos juntos. Imagem em `.webp` e vídeo em `.mp4` sempre que possível.
- Nada de imagem ou vídeo embutido no HTML em base64, e nada de pastas soltas (`video/`, `assets/`, `images/`): tudo fica dentro de `_media`.

### Variáveis
| Tipo | Formato | Opções no passo Mídia |
|---|---|---|
| **Imagem ou vídeo** (recomendado) | `@media_<secao>_<nome>` | imagens e vídeos da pasta da seção |
| Só imagem | `@img_<secao>_<nome>` | só imagens da pasta da seção |
| Só vídeo | `@video_<secao>_<nome>` | só vídeos da pasta da seção |
| Arquivo para baixar (PDF) | `@arquivo_<secao>_<nome>` | PDFs (e imagens) da pasta da seção, num `<a href>` |

Use `@media_` em todo lugar que pode ter foto **ou** vídeo (topo, banners, destaques). Assim quem publica escolhe no passo Mídia o que preferir para aquele lugar. Use `@img_` só onde vídeo não faz sentido (ícone, foto de produto, selo).

### Desktop e mobile
Quando a seção tem uma versão para computador e outra para celular, o fim do nome da variável diz qual é:

| Variável | Mostra só os arquivos de |
|---|---|
| `@media_hero_desktop` | desktop: `desktop.webp`, `desktop.mp4` ou a subpasta `desktop/` |
| `@media_hero_mobile` | mobile: `mobile.webp`, `mobile.mp4` ou a subpasta `mobile/` |

- Arquivo de desktop tem `desktop` no nome ou fica em `_media/<pagina>/<secao>/desktop/`. O de mobile tem `mobile` no nome ou fica em `.../mobile/`.
- Arquivos sem `desktop` nem `mobile` no nome (ex.: `fundo.webp`) aparecem como opção nas duas versões.
- Uma variável sem `desktop`/`mobile` no fim (ex.: `@media_kit_foto`) vê todos os arquivos da seção.

### Exemplos
| Variável | Opções vêm de | Arquivo padrão |
|---|---|---|
| `@media_hero_desktop` (na praça) | `_media/praca/hero/`, versão desktop | `desktop.webp` ou `desktop.mp4` |
| `@media_hero_mobile` (na praça) | `_media/praca/hero/`, versão mobile | `mobile.webp` ou `mobile.mp4` |
| `@img_kit_camiseta` (na praça) | `_media/praca/kit/` | `camiseta.webp` |
| `@media_card_foto` (no card do tapume) | `_media/tapume/card/` | `foto.webp` |

- **Arquivo padrão:** o que tem o mesmo nome do fim da variável (`desktop` → `desktop.webp`/`desktop.mp4`). Se não existir, vale o primeiro da pasta.
- **Igual em todas as páginas:** sem número (`@media_hero_desktop`).
- **Muda em cada cidade:** com `_1` na página da cidade (`@media_hero_desktop_1`) ou sem número dentro do card que se repete no tapume.

### Como escrever no HTML
Escreva sempre uma tag `<img>` com a variável `@media_`. Se for escolhido um vídeo, o publicador troca sozinho por `<video autoplay muted loop playsinline>`, mantendo a classe, o estilo e o tamanho:
```html
<img class="hero__bg hero__bg--desk" src="@media_hero_desktop_1" alt="Largada em @cidade_1">
<img class="hero__bg hero__bg--mob"  src="@media_hero_mobile_1"  alt="Largada em @cidade_1">
```
- Desktop e mobile em **duas tags**, cada uma com a sua variável, e o CSS mostra uma ou outra pela largura da tela (`@media (min-width: …)`). Não escolha o arquivo pelo JavaScript: assim a troca entre imagem e vídeo funciona e o publicador encontra os arquivos.
- Não coloque `@media_` dentro de `<picture>` nem use `<source srcset>` para foto/vídeo trocável: use um `<img>` simples. Se o arquivo escolhido for vídeo, o publicador troca a tag inteira por `<video autoplay muted loop playsinline>`, mantendo `class`, `id` e `style`. Por isso o CSS do espaço deve mirar a **classe** (ex.: `.hero-midia{width:100%;height:100%;object-fit:cover}`), nunca `img` ou `.hero img`, senão o vídeo perde o tamanho.
- A classe da tag (`hero__bg`) precisa servir para `<img>` e para `<video>`: use `object-fit: cover`, largura e altura no CSS da classe, não no seletor `img`.
- Imagem de fundo por CSS (`background-image:url(@img_kit_foto)`) só aceita imagem: use `@img_`, não `@media_`.
- Prefira sempre uma variável `@img_` (seção 1.3). Caminho direto, sem variável, só para o que nunca vai ser trocado, e sempre dentro de `_media`: `<img src="_media/praca/marca/logo.webp">`.

### No publicador
- No passo **Páginas**, envie a pasta `_media` (ou a pasta do site que contém a `_media`). Imagens e vídeos vão juntos.
- No passo **Mídia**, escolha a página, veja as seções e clique na imagem ou no vídeo de cada lugar. A prévia atualiza na hora.
- O `.zip` sai com os arquivos usados na mesma estrutura `_media/...`, prontos para subir junto dos HTMLs.

### Patrocinadores
A seção de patrocinadores é montada pelo publicador (banco geral de logos) e entra sozinha antes do rodapé, **só nas páginas internas**: a página do One page, a praça (no formato tapume + praça) e cada etapa (no formato com etapas). O tapume e a praça que lista etapas não têm. **Não monte seção de patrocinadores no HTML.**

### Rodapé
O publicador tem um **rodapé padrão** (feito no passo Seções), e quem publica pode esconder o rodapé que vier no HTML. Por isso:
- Se o HTML tiver rodapé, ele fica num `<footer>` **fora** das seções, no fim do `<body>`.
- Não ponha conteúdo essencial do evento só no rodapé: ele pode ser escondido e trocado pelo padrão.

### Seções que podem ser escondidas ou mudar de ordem
No passo **Seções**, quem publica pode esconder partes da página (no evento todo ou só numa cidade) e mudar a ordem delas. Para isso funcionar:
- Cada parte da página fica numa `<section id="nome">` **de primeiro nível** (não dentro de outra `<section>`). Ex.: `<section id="kit">`, `<section id="faq">`.
- Dê um nome claro: `aria-label="Kit do atleta"` na `<section>`, ou um título (`<h2>`) dentro dela. Sem isso, aparece o `id`.
- Links para a seção usam `href="#nome"`. Quando a seção é escondida, o publicador tira esses links junto (o item do menu inteiro, se ele só tiver o link).
- O layout em volta precisa continuar bonito sem a seção (sem espaço sobrando) e com as seções em outra ordem: cada seção deve se sustentar sozinha (não depender da seção de cima para o fundo, a cor ou o espaçamento).

---

## 9b. Pós-evento (HTML opcional)

Depois do evento, a página pode trocar de HTML **no mesmo endereço** (resultados, fotos, agradecimento). É um HTML à parte, enviado no passo **Pós-evento** do publicador:

| Formato | HTML de pós-evento | Entra no lugar de |
|---|---|---|
| One page | um (`pos_unica`) | o index.html |
| Tapume + praça | um (`pos_praca`), usado em cada praça | a página de cada cidade em que for ligado |
| Tapume + praça + etapa | `pos_praca` e/ou `pos_etapa` | a página da cidade e/ou da etapa em que for ligado |

O tapume (home) não muda. Regras:
- Segue **o mesmo guia** (seções 1 a 9): todo texto visível é variável, imagens e ícones como arquivo, responsivo, `@se` para o que pode faltar.
- As variáveis da base valem do mesmo jeito (`@evento`, `@cidade_1`, `@data_inicio_1`, `@local_1`…) e vêm do Cadastro.
- As variáveis **próprias** do pós-evento começam com `pos_`: `@pos_titulo`, `@pos_texto`, `@pos_botao`, `@link_pos_resultados`. Elas aparecem no passo Pós-evento (não no Cadastro). Como na praça, `@pos_x` é igual em todas as páginas e `@pos_x_1` é de cada cidade/etapa.
- Imagens do pós-evento: `@img_<secao>_<nome>` com arquivos em `_media/pos/<secao>/` (ex.: `@img_resultados_podio` → `_media/pos/resultados/podio.webp`).
- Fotos do evento por cidade: galeria própria, `<!-- @repetir galeria_pos -->…<!-- @fim -->` (seção 1.4). Cada cidade mostra as fotos dela.
- Entregue o HTML de pós-evento como `pos-evento.html`, com o bloco de documentação no fim (seção 10).
- Passo a passo completo, com exemplo e checklist: `docs/POS_EVENTO.md`.

## 10. Bloco de documentação (obrigatório no fim de cada HTML)

```html
<!--
  VARIÁVEIS — [nome do evento] — [tapume | praça | etapa]
  Gerais: @evento, @ano
  Base usadas: @cidade, @uf, @regiao, @status, @data_inicio, @data_fim, @local,
               @gratuito, @parcelamento, @valor_parcelado, @preco_vista, @link_inscricao
  Próprias deste evento:
    @categorias — lista de categorias, texto livre (ex.: "Iniciante, Intermediário, Open")
    @premiacao  — valor total da premiação, só número (o "R$" está no HTML)
  Imagens e vídeos (pasta _media/praca/):
    @img_hero_fundo_1 — hero/, muda em cada cidade
    @img_kit_foto     — kit/, igual em todas as páginas
    @media_hero_desktop_1, @media_hero_mobile_1 — hero/, imagem ou vídeo, muda em cada cidade
  Opcionais: O2 Prime não usado neste evento.
-->
```

---

## 11. Checklist antes de entregar

- [ ] **Todo texto visível é variável** (títulos, parágrafos, botões, perguntas e respostas das dúvidas, legendas): procure no `<body>` frases sem `@` (seção 1)
- [ ] Listas (dúvidas, equipe, galeria, vídeos, temas) são séries numeradas com `@se` e espaços sobrando (seção 1.1)
- [ ] Todos os itens de cada série têm **os mesmos campos** (variações como `_gratuito` são opcionais e existem em todos os itens)
- [ ] Todo link usa variável; PDF para baixar com `@arquivo_<secao>_<nome>` (seção 1.2)
- [ ] Ícones e ilustrações são arquivos (`.svg` exportado, `.webp`) em `_media`, com variável `@img_`; nenhum `<svg>` de ícone escrito no HTML (seção 1.3)
- [ ] Todo arquivo citado está na pasta `_media` entregue; nenhuma imagem de exemplo com texto ou print de tela
- [ ] Galeria com **um item só** entre `@repetir galeria` e `@fim`, usando `@galeria_foto`, `@galeria_legenda`, `@galeria_cidade` (seção 1.4); nada de `@img_galeria_foto1…12`
- [ ] Botões da mesma ação sincronizados: mesma variável e mesmo `@se status` no topo, no botão fixo, na inscrição e no compartilhar; contagens com `@total_…` (seção 1.5)
- [ ] Animações de entrada com `IntersectionObserver`, funcionando ao abrir no meio da página e dentro de um quadro; `prefers-reduced-motion` respeitado (seção 1.6)
- [ ] Conferido em 360, 390, 768, 1024, 1280 e 1440 px, sem rolagem horizontal (seção 1.7)
- [ ] Nenhum dado de cidade ficou digitado direto no HTML
- [ ] Nomes da base usados sem variação (seção 3)
- [ ] Preços com "R$" no HTML e variável só com número
- [ ] Forma de cobrança definida (à vista ou parcelado) e só as variáveis dela no HTML
- [ ] Nenhum preço ou "A confirmar" escrito fixo; preço sempre pelo padrão da seção 4, com gratuito e preço vazio tratados
- [ ] Datas pelas variações do nome (`@periodo`, `@data_inicio_dia`, `@data_inicio_mes_abrev`…), nunca formatadas por JavaScript (seção 4)
- [ ] Tapume com **um card só** entre `@repetir cidades` e `@fim`, com versão aberta e em breve
- [ ] Todo `@se`, `@repetir` e `@agrupar` tem o seu `@fim`
- [ ] Todo "A confirmar" está no `@senao` do `@se` do próprio dado, como texto simples: sem borda, tracejado, bolinha, ícone ou selo (seção 4)
- [ ] CSS de partes opcionais usa `:only-of-type` / `:nth-of-type` (nunca `:only-child` / `:nth-child`); a página fica bonita com e sem cada parte opcional (seção 4)
- [ ] Imagens e vídeos em `_media/<pagina>/<secao>/`, sem base64 e sem pastas soltas (`video/`, `assets/`)
- [ ] Lugares que podem ter foto ou vídeo com `@media_<secao>_<nome>` numa tag `<img>`; desktop e mobile em duas tags com `_desktop` / `_mobile` no fim da variável; um arquivo padrão com o mesmo nome
- [ ] Bloco de documentação no fim do HTML
- [ ] Conferência da seção 12.5 feita (preço, gratuito e status)

---

## 12. Regras obrigatórias: preço, gratuito e status

Esta seção vale acima de qualquer outro trecho do guia.

O publicador só entende preço, gratuito e status escritos **exatamente** nos modelos abaixo. Qualquer outra forma (JavaScript, atributo `data-`, ordem diferente, texto fixo) faz a página mostrar "A confirmar" ou ignorar o gratuito.


### 12.1 Como o publicador decide

Os blocos são comentários HTML. O publicador lê esses comentários **antes** de a página existir. O navegador e o JavaScript não participam.

```
<!-- @se gratuito = sim -->  …mostra se a cidade é gratuita…
<!-- @senao -->              …mostra nos outros casos…
<!-- @fim -->
```

- `@se coluna = valor`: compara com o valor da coluna da cidade (sem diferenciar maiúsculas e acentos).
- `@se coluna`: verdadeiro se a coluna estiver preenchida.
- Todo `@se` termina com um `@fim`. O `@senao` é opcional.
- Dentro do `@se`, escreva o nome **sem** `_1`: `@se gratuito = sim`, nunca `@se gratuito_1 = sim`.


### 12.2 Preço com gratuito: copie exatamente

**Ordem obrigatória: primeiro o gratuito, depois o preço, por último "A confirmar".**

#### Valor (onde aparece o preço)

```html
<!-- @se gratuito = sim -->Evento gratuito<!-- @senao --><!-- @se preco_vista -->R$@preco_vista_1<!-- @senao -->A confirmar<!-- @fim --><!-- @fim -->
```

#### Frase de apoio (abaixo do preço)

```html
<!-- @se gratuito = sim -->Sem custo de inscrição.<!-- @senao --><!-- @se preco_vista -->À vista, com o kit incluso.<!-- @senao -->Valor divulgado na abertura das inscrições.<!-- @fim --><!-- @fim -->
```

Você pode mudar os **textos** livremente ("À vista, com o kit do atleta incluso.", "Inscrições gratuitas" etc.). Não mude a **estrutura**: os comentários, a ordem e os nomes `gratuito` e `preco_vista`.

#### Botão de inscrição (opcional)

```html
<!-- @se gratuito = sim --><a class="btn" href="@link_inscricao_1">Inscreva-se grátis</a><!-- @senao --><a class="btn" href="@link_inscricao_1">Quero minha vaga</a><!-- @fim -->
```

#### Evento parcelado

Troque só o miolo do preço. O gratuito continua vindo antes:

```html
<!-- @se gratuito = sim -->Evento gratuito<!-- @senao --><!-- @se valor_parcelado -->@{parcelamento_1}x R$@valor_parcelado_1<!-- @senao -->A confirmar<!-- @fim --><!-- @fim -->
```


### 12.3 Status da cidade

O status tem quatro valores:

| Valor na tabela | Significado |
|---|---|
| `em breve` (padrão, quando ninguém escolheu) | Inscrições ainda não abertas |
| `aberta` | Inscrições abertas |
| `realizado` | A etapa já aconteceu |
| `esgotado` | As vendas acabaram depois de abertas (vem dos **preços do Odoo**). A página continua aberta e os botões continuam levando para a compra; só o preço muda |

No **modo automático** do evento (passo Cadastro → "Status pelas datas"), cada cidade vira `realizado` sozinha depois do último dia (`data_fim`, ou `data_inicio` se for um dia só), mais as horas configuradas. O site é republicado sozinho. No modo manual, a equipe escolhe.

No HTML, trate **os três** casos, com `realizado` primeiro:

```html
<!-- @se status = realizado -->
  <div class="card card--realizado">… Realizado …</div>
<!-- @senao --><!-- @se status = aberta -->
  <a class="card" href="@url">… Inscrições abertas …</a>
<!-- @senao -->
  <div class="card card--breve">… Em breve …</div>
<!-- @fim --><!-- @fim -->
```

- **Não calcule o status (nem "próxima parada", "acontecendo agora", "realizado") por JavaScript** comparando datas com o relógio do navegador: o publicador decide e a página já sai pronta. Use `@se status = …`.
- Tudo o que muda quando a etapa acontece (selo, botão de inscrição, texto da data) fica dentro desses blocos, para mudar junto.
- **Esgotado:** onde o HTML testa `@se status = aberta`, uma cidade esgotada entra no bloco da aberta (link, página e botão de compra). Para mostrar o esgotado, teste-o **antes**, só onde muda (preço, etiqueta do card no tapume):

```html
<!-- @se status = esgotado -->
  <b class="preco">@preco_esgotado</b>
<!-- @senao -->
  … preço normal …
<!-- @fim -->
```

Com os **preços do Odoo** ligados, o status vem sozinho: com preço à venda, `aberta`; sem preço, `em breve`; saiu de venda depois de ter vendido, `esgotado`. A equipe ainda pode trocar à mão (vale até a próxima mudança no Odoo).

Contagens automáticas: `@total_aberta`, `@total_breve`, `@total_realizado`, `@total_esgotado`, `@total_cidades` (`@total_aberta` não conta as esgotadas).
Não use `@total_` para outra coisa. Para o número de categorias, use um nome sem esse prefixo, como `@qtd_categorias_1`.


### 12.4 Proibido

| Não faça | Por quê |
|---|---|
| Testar `preco_vista` antes de `gratuito` | Uma cidade gratuita com preço preenchido mostraria o preço |
| Montar preço, gratuito ou status em JavaScript (`if (gratuito === 'sim')`, `textContent = 'A confirmar'`) | O publicador não roda JS. A página fica sempre igual |
| Guardar a decisão em atributo (`data-gratuito="@gratuito_1"`) e esconder com CSS ou JS | Mesmo motivo. Use `@se` |
| Escrever "A confirmar", "R$ 150" ou "Gratuito" fixo fora dos blocos | Não muda por cidade |
| "A confirmar" fora do `@senao` do `@se` do próprio dado, "[A CONFIRMAR]", ou enfeitado com borda, tracejado, bolinha, ícone ou selo | Texto simples no `@senao` do dado (seção 4) |
| `@se gratuito_1`, `@se @gratuito`, `@se gratuito == "sim"` | Escreva `@se gratuito = sim` |
| Colocar `@se` dentro de string JS, `<template>` ou atributo | Só vale como comentário HTML normal no corpo da página |
| Usar outro nome (`gratis`, `evento_gratuito`, `free`, `valor`, `preco`) | Os nomes são `gratuito` e `preco_vista` (ou `parcelamento` e `valor_parcelado`) |
| Testar o status contra `aberto`, `abertas` ou `open` | O valor é `aberta` |
| Calcular status, "próxima parada" ou "realizado" por JavaScript com a data do navegador | O publicador decide pelo modo automático; use `@se status = realizado` |
| `elemento.scrollIntoView(…)` no JavaScript (ex.: trazer a aba ativa à vista) | Rola a página inteira até o elemento: o site abre no meio, não no topo. Role só a barra: `barra.scrollTo({ left: aba.offsetLeft - 16 })` |
| Texto visível escrito direto no HTML (título, FAQ, botão, legenda) | Não aparece no cadastro: ninguém consegue corrigir sem pedir HTML novo. Use variáveis (seção 1) |
| `<svg>…</svg>` de ícone ou ilustração escrito dentro do HTML | Não pode ser trocado no passo Mídia. Exporte `.svg` para `_media` e use `<img src="@img_…">` |
| Botões da mesma ação com textos ou links diferentes (topo "aberta", rodapé "em breve") | Todos usam a mesma variável e o mesmo `@se status` |
| "2 cidades", "3 etapas" escritos no HTML | Use `@total_cidades`, `@total_etapas` |


### 12.5 Conferência antes de entregar o HTML

Procure no arquivo e confirme cada item:

- [ ] Toda ocorrência de `@preco_vista_1` ou `@valor_parcelado_1` está dentro de um `<!-- @se gratuito = sim -->…<!-- @senao -->`
- [ ] Nenhum `<!-- @se preco_vista -->` aparece antes do `<!-- @se gratuito = sim -->` do mesmo trecho
- [ ] A palavra `gratuito` não aparece em nenhum `<script>`
- [ ] "A confirmar" só aparece depois de um `<!-- @senao -->`
- [ ] Número de `<!-- @se` + `<!-- @repetir` + `<!-- @agrupar` = número de `<!-- @fim`
- [ ] O status é testado como `<!-- @se status = realizado -->` e `<!-- @se status = aberta -->` (sem status calculado por JavaScript)
- [ ] Nenhuma variável própria começa com `total_`
- [ ] Nenhum `scrollIntoView` no JavaScript (o site precisa abrir no topo)

Se algum item falhar, corrija antes de entregar.

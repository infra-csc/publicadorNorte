# Guia de variáveis para HTML de eventos

Vale para **qualquer evento** (corrida, beach tennis, combo…) e para **todas as páginas**: tapume (home), praça (interna da cidade) e etapa.
Quem monta o HTML (designer ou Claude) segue este guia. Isso inclui imagens e vídeos (seção 9). O Publicador de Hotsites lê o HTML, acha as variáveis e monta uma página por cidade.

**Este é o único arquivo de regras.** Ele já inclui as regras de preço, gratuito e status (seção 12). Se houver outro guia antigo no canal, ignore-o.

---

## 1. O que vira variável

Pergunte: **"isso muda de uma cidade para outra, ou vai mudar até o evento acontecer?"**

| Vira variável | Fica fixo no HTML |
|---|---|
| Cidade, UF, região, local, datas, horários | Textos institucionais e de marca |
| Preços, parcelas, descontos, "gratuito" | Títulos de seção, FAQ genérico |
| Links de inscrição, status da inscrição | Imagens, ícones, cores, animações |
| Qualquer dado que muda por cidade ou etapa | O que é igual em todas as cidades e não muda |

Na dúvida, vira variável. Uma variável a mais não atrapalha; um dado fixo errado vai para todas as páginas.

---

## 2. Como escrever

| Regra | Exemplo |
|---|---|
| Começa com `@`, nome em minúsculas, palavras separadas por `_` | `@data_inicio_1` |
| Só letras, números e `_`. Nada de acento, `-`, `$` ou espaço | `@desconto_em_reais_1`, **não** `@desconto-em-R$` |
| Na página da cidade (praça) e da etapa, toda variável da cidade termina em `_1` | `@cidade_1`, `@preco_vista_1` |
| Variável igual em todas as páginas não tem número | `@evento`, `@ano` |
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
| `@data_inicio_1` | Primeiro dia | 12/03 |
| `@data_fim_1` | Último dia (vazio se for um dia só) | 14/03 |
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

### Data de um dia ou período
```html
<!-- @se data_fim -->De @data_inicio_1 a @data_fim_1<!-- @senao -->@data_inicio_1<!-- @fim -->
```
Com as duas datas: "De 12/03 a 14/03". Só com a data de início: "12/03".

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

### Link de inscrição
```html
<a class="cta" href="@link_inscricao_1">Garantir minha vaga</a>
```

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
      <p><!-- @se data_fim -->@data_inicio a @data_fim<!-- @senao -->@data_inicio<!-- @fim --> · @local</p>
      <p><!-- @se gratuito = sim -->Evento gratuito<!-- @senao --><!-- @se preco_vista -->R$@preco_vista<!-- @senao -->Preço a confirmar<!-- @fim --><!-- @fim --></p>
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
- Arquivo que nunca vai ser trocado (ícone, logo fixo) pode usar o caminho direto, sem variável, mas sempre dentro de `_media`: `<img src="_media/praca/marca/logo.webp">`.

### No publicador
- No passo **Páginas**, envie a pasta `_media` (ou a pasta do site que contém a `_media`). Imagens e vídeos vão juntos.
- No passo **Mídia**, escolha a página, veja as seções e clique na imagem ou no vídeo de cada lugar. A prévia atualiza na hora.
- O `.zip` sai com os arquivos usados na mesma estrutura `_media/...`, prontos para subir junto dos HTMLs.

### Seções que podem ser escondidas ou mudar de ordem
No passo **Seções**, quem publica pode esconder partes da página (no evento todo ou só numa cidade) e mudar a ordem delas. Para isso funcionar:
- Cada parte da página fica numa `<section id="nome">` **de primeiro nível** (não dentro de outra `<section>`). Ex.: `<section id="kit">`, `<section id="faq">`.
- Dê um nome claro: `aria-label="Kit do atleta"` na `<section>`, ou um título (`<h2>`) dentro dela. Sem isso, aparece o `id`.
- Links para a seção usam `href="#nome"`. Quando a seção é escondida, o publicador tira esses links junto (o item do menu inteiro, se ele só tiver o link).
- O layout em volta precisa continuar bonito sem a seção (sem espaço sobrando) e com as seções em outra ordem: cada seção deve se sustentar sozinha (não depender da seção de cima para o fundo, a cor ou o espaçamento).

---

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

- [ ] Nenhum dado de cidade ficou digitado direto no HTML
- [ ] Nomes da base usados sem variação (seção 3)
- [ ] Preços com "R$" no HTML e variável só com número
- [ ] Forma de cobrança definida (à vista ou parcelado) e só as variáveis dela no HTML
- [ ] Nenhum preço ou "A confirmar" escrito fixo; preço sempre pelo padrão da seção 4, com gratuito e preço vazio tratados
- [ ] Datas com o padrão de um dia ou período
- [ ] Tapume com **um card só** entre `@repetir cidades` e `@fim`, com versão aberta e em breve
- [ ] Todo `@se`, `@repetir` e `@agrupar` tem o seu `@fim`
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

O status só tem dois valores:

| Valor na tabela | Significado |
|---|---|
| `em breve` (padrão, quando ninguém escolheu) | Inscrições ainda não abertas |
| `aberta` | Inscrições abertas |

No HTML, teste **sempre** contra `aberta`:

```html
<!-- @se status = aberta -->
  <a class="card" href="@url">… Inscrições abertas …</a>
<!-- @senao -->
  <div class="card card--breve">… Em breve …</div>
<!-- @fim -->
```

Contagens automáticas: `@total_aberta`, `@total_breve`, `@total_cidades`.
Não use `@total_` para outra coisa. Para o número de categorias, use um nome sem esse prefixo, como `@qtd_categorias_1`.


### 12.4 Proibido

| Não faça | Por quê |
|---|---|
| Testar `preco_vista` antes de `gratuito` | Uma cidade gratuita com preço preenchido mostraria o preço |
| Montar preço, gratuito ou status em JavaScript (`if (gratuito === 'sim')`, `textContent = 'A confirmar'`) | O publicador não roda JS. A página fica sempre igual |
| Guardar a decisão em atributo (`data-gratuito="@gratuito_1"`) e esconder com CSS ou JS | Mesmo motivo. Use `@se` |
| Escrever "A confirmar", "R$ 150" ou "Gratuito" fixo fora dos blocos | Não muda por cidade |
| `@se gratuito_1`, `@se @gratuito`, `@se gratuito == "sim"` | Escreva `@se gratuito = sim` |
| Colocar `@se` dentro de string JS, `<template>` ou atributo | Só vale como comentário HTML normal no corpo da página |
| Usar outro nome (`gratis`, `evento_gratuito`, `free`, `valor`, `preco`) | Os nomes são `gratuito` e `preco_vista` (ou `parcelamento` e `valor_parcelado`) |
| Testar o status contra `aberto`, `abertas` ou `open` | O valor é `aberta` |


### 12.5 Conferência antes de entregar o HTML

Procure no arquivo e confirme cada item:

- [ ] Toda ocorrência de `@preco_vista_1` ou `@valor_parcelado_1` está dentro de um `<!-- @se gratuito = sim -->…<!-- @senao -->`
- [ ] Nenhum `<!-- @se preco_vista -->` aparece antes do `<!-- @se gratuito = sim -->` do mesmo trecho
- [ ] A palavra `gratuito` não aparece em nenhum `<script>`
- [ ] "A confirmar" só aparece depois de um `<!-- @senao -->`
- [ ] Número de `<!-- @se` + `<!-- @repetir` + `<!-- @agrupar` = número de `<!-- @fim`
- [ ] O status é testado como `<!-- @se status = aberta -->`
- [ ] Nenhuma variável própria começa com `total_`

Se algum item falhar, corrija antes de entregar.

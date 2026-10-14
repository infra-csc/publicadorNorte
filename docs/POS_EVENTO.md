# Pós-evento

Guia do pós-evento para quem escreve o HTML (designers) e para quem publica (atendimento). Complementa a seção 9b do `GUIA_VARIAVEIS_HTML.md`.

## O que é

Depois do evento, a página pode trocar de HTML **no mesmo endereço**: em vez da página de inscrição, quem abre o link vê resultados, fotos e agradecimento. Não muda o link, não cria página nova e não mexe no Google (a página continua no mesmo endereço).

É um HTML à parte, opcional. Sem ele, nada muda no site.

## Quantos HTMLs e onde entram

| Formato do evento | HTML de pós-evento | Entra no lugar de |
|---|---|---|
| One page | um, para o site | o `index.html` |
| Tapume + praça | um, usado em cada praça | a página de cada cidade em que for ligado |
| Tapume + praça + etapa | um para praça e/ou um para etapa | a página da cidade e/ou da etapa em que for ligado |

- O **tapume (home) não muda**.
- No tapume + praça, o mesmo HTML serve para todas as cidades, cada uma com os seus dados. Cada cidade liga o seu pós-evento quando quiser: uma pode estar no pós-evento enquanto outra ainda vende inscrição.
- Com etapas, dá para ter pós-evento só na praça, só na etapa ou nos dois.

---

## Para quem escreve o HTML

### Regras gerais

- Segue **o mesmo guia** (seções 1 a 9 do `GUIA_VARIAVEIS_HTML.md`): todo texto visível é variável, imagens e ícones como arquivo, responsivo, `@se` para o que pode faltar.
- Entregue como `pos-evento.html`, com o **bloco de documentação** no fim (seção 10 do guia).

### Variáveis

**Da base** (vêm do Cadastro, valem do mesmo jeito que na página normal):
`@evento`, `@cidade_1`, `@uf_1`, `@local_1`, `@data_inicio_1`, `@periodo_1`…

**Próprias do pós-evento:** começam com `pos_`. Aparecem no passo Pós-evento do publicador (não no Cadastro).

| Escreva | Vale para |
|---|---|
| `@pos_titulo` | igual em todas as páginas |
| `@pos_titulo_1` | muda em cada cidade (ou etapa) |

No One page só existe uma página, então use sem `_1`.

Para o publicador mostrar o tipo do campo, use no nome:
- **link**: `link`, `url` ou `href` → `@link_pos_resultados`, `@pos_url_fotos_1`
- **botão**: `botao`, `btn` ou `cta` → `@pos_botao_resultados`
- o resto aparece como **texto**: `@pos_titulo`, `@pos_texto_1`

### Imagens

`@img_<secao>_<nome>`, com os arquivos em `_media/pos/<secao>/`.

```html
<img src="@img_resultados_podio" alt="@pos_podio_legenda">
<!-- arquivo: _media/pos/resultados/podio.webp -->
```

Para mudar em cada cidade, `_1` no fim: `@img_resultados_podio_1`.

### Galeria de fotos do evento

Uma galeria própria, com **um item só** dentro do bloco. Cada cidade mostra as fotos dela.

```html
<div class="galeria">
  <!-- @repetir galeria_pos -->
  <figure>
    <img src="@galeria_foto" alt="@galeria_legenda" loading="lazy">
    <figcaption>@galeria_legenda</figcaption>
  </figure>
  <!-- @fim -->
</div>
```

### Exemplo (tapume + praça)

```html
<section id="obrigado">
  <h1>@pos_titulo</h1>
  <p>@pos_texto_1</p>
  <p>@cidade_1 · @periodo_1 · @local_1</p>
  <!-- @se link_pos_resultados_1 -->
  <a class="btn" href="@link_pos_resultados_1">@pos_botao_resultados</a>
  <!-- @fim -->
</section>

<section id="fotos">
  <h2>@pos_fotos_titulo</h2>
  <div class="galeria">
    <!-- @repetir galeria_pos -->
    <img src="@galeria_foto" alt="@galeria_legenda" loading="lazy">
    <!-- @fim -->
  </div>
</section>

<!--
  VARIÁVEIS — [nome do evento] — pós-evento (praça)
  Base usadas: @cidade, @periodo, @local
  Próprias:
    @pos_titulo            — título, igual em todas as cidades
    @pos_texto_1           — agradecimento, muda em cada cidade
    @link_pos_resultados_1 — link dos resultados da cidade (sem link, o botão some)
    @pos_botao_resultados  — texto do botão
    @pos_fotos_titulo      — título da galeria
  Galeria: @repetir galeria_pos (fotos de cada cidade)
-->
```

### Checklist

- [ ] Todo texto visível é variável; as próprias começam com `pos_`
- [ ] `_1` só no que muda em cada cidade/etapa
- [ ] Links e botões opcionais dentro de `@se`, para sumirem quando vazios
- [ ] Imagens em `_media/pos/<secao>/`, citadas com `@img_<secao>_<nome>`
- [ ] Galeria com um item só entre `@repetir galeria_pos` e `@fim`
- [ ] Conferido em 360, 768, 1280 e 1440 px, sem rolagem horizontal
- [ ] Bloco de documentação no fim

---

## Para quem publica

Passo **Pós-evento** do publicador (depois de Seções).

1. **Envie o HTML** no cartão do pós-evento (com etapas, há um cartão para praça e um para etapa).
2. **Preencha os campos** em "Campos do pós-evento": os iguais em todas as páginas no topo; os de cada cidade/etapa embaixo, escolhendo a cidade na caixa ao lado do título.
3. **Fotos e imagens**: na galeria do pós-evento (fotos por cidade) e na lista de mídia logo abaixo.
4. **Confira na prévia** ao lado. A prévia mostra sempre o pós-evento, mesmo desligado.
5. **Ligue onde já acabou** em "Onde está ligado":
   - One page: "Página normal | Pós-evento" para o site.
   - Tapume + praça (e etapas): a mesma escolha em cada cidade/etapa, ou "Ligar em todas / Desligar todas".
   - **"Ligar sozinho quando virar realizado"**: a cidade/etapa entra no pós-evento quando o status dela for `realizado`. Com o status automático pelas datas, o site é republicado sozinho depois do evento.
6. **Publique.** Ligar e desligar só vale no site depois de publicar (pelo botão, pela publicação agendada ou pela automação do "realizado"). No passo Publicar, as páginas com pós-evento aparecem marcadas "· pós-evento".

Para voltar à página normal, desligue e publique de novo.

### Bom saber

- Uma cidade "em breve" com o pós-evento ligado abre normalmente (não manda para a home).
- Os campos que só existem no HTML de pós-evento não aparecem no Cadastro, só neste passo.
- O pós-evento usa os mesmos dados do Cadastro: se mudar a data ou o local da cidade, muda nas duas páginas.
- Para trocar o pós-evento numa data e hora certas, ligue-o e use a **Publicação agendada** do passo Publicar.

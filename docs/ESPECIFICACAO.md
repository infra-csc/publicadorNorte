# Especificação — Publicador de Hotsites

Descreve o comportamento do protótipo (`referencia/publicador-atual.html`, v. 07/10 · 18h30), que já foi validado pela equipe. O programa novo deve reproduzir tudo o que está aqui antes de ganhar funcionalidades novas.

Público: designers e atendimento da Norte Marketing. Ninguém que usa a ferramenta precisa saber programar.

---

## 1. Conceitos

| Termo | O que é |
|---|---|
| **Evento** | Um hotsite: nome, formato, HTMLs-modelo, cadastro, mídia e publicações. |
| **Formato** | Quais páginas o evento tem (seção 2). |
| **Página-modelo** | HTML enviado pelo designer, com variáveis `@nome`. Um modelo por tipo de página. |
| **Tapume** | A home do evento. Gera `index.html`. Lista as cidades em cards. |
| **Praça** | Página interna da cidade. Gera um arquivo por cidade cadastrada. |
| **Etapa** | Página interna de cada etapa de uma cidade (só no formato com etapas). |
| **Cadastro** | Tabelas de valores: gerais do evento, uma linha por cidade e uma linha por etapa. |
| **Variável** | `@nome` no HTML. Vira um valor do cadastro, um arquivo de mídia ou um valor automático. |
| **Bloco** | Comentário HTML de controle: `@se`, `@senao`, `@repetir`, `@agrupar`, `@fim`. |

---

## 2. Formatos

| Chave | Nome na tela | Páginas | Saída |
|---|---|---|---|
| `unica` | One page | página única | `index.html` com o HTML como está, sem variáveis |
| `tapume_praca` | Tapume + praça | tapume, praça | `index.html` + `<cidade>.html` |
| `tapume_etapa_praca` | Tapume + praça + etapa | tapume, praça, etapa | `index.html` + `<cidade>.html` + `<cidade>-<etapa>.html` |

No formato com etapas, cada etapa pertence a uma cidade (campo interno `_cidade`). A praça é a página da cidade com o seletor de etapas; a etapa é a página interna.

---

## 3. Fluxo de telas (passos)

1. **Evento**: nome e formato (cards de formato na ordem tapume → cidade → etapa, com descrição curta).
2. **Páginas**: envio de um HTML por tipo de página e envio da pasta `_media` (ou da pasta do site que a contém). Mostra quantas referências de arquivo o HTML tem e quais faltam. Se o tapume tiver cards fixos numerados, oferece "Transformar em card que se repete" (seção 9) e "Baixar HTML convertido".
3. **Variáveis**: as variáveis encontradas em chips agrupados: *Igual em todas as páginas*, *Muda em cada cidade*, *Muda em cada etapa*, *Imagens e vídeos*, *Preenchidas sozinhas*, *Excluídas do cadastro*, *Não são variáveis*. Clicar num chip abre um menu para mover de grupo. Mostra também um resumo dos blocos encontrados.
4. **Cadastro**: campos gerais + tabela de cidades (+ tabela de etapas). Prévia ao vivo ao lado.
5. **Mídia**: por página e por seção, miniaturas das opções de cada variável de mídia; clicar escolhe. Prévia ao lado. Os blocos podem ser arrastados para outra ordem (só na tela; o site não muda).
6. **Seções**: por página, as seções do HTML com Mostrar/Esconder (no evento todo e por cidade) e arrastar para mudar a ordem **na página gerada**. Prévia ao lado.
7. **Conferir**: lista de páginas que serão geradas, avisos (seção 10) e prévia celular/desktop.
8. **Publicar**: hoje gera um `.zip`. No programa novo, publica numa URL real (ROADMAP, fase 1).

Os passos Variáveis, Cadastro, Mídia e Seções não aparecem no formato One page. A barra lateral mostra os passos com check quando concluídos. Lista inicial de eventos com abrir e excluir (com confirmação).

---

## 4. Detecção de variáveis

### 4.1 Sintaxe

```
@nome            @nome_1            @{nome_1}x
```

- Regex de referência (protótipo):
  `/(?<![\w.@-])@(?:\{([A-Za-z][A-Za-z0-9_]*?)(?:_(\d+))?\}|([A-Za-z][A-Za-z0-9]*(?:_[A-Za-z][A-Za-z0-9]*)*)(?:_(\d+))?(?![\w]))/g`
- `base` = nome em minúsculas sem o sufixo numérico; `num` = o sufixo (`_1`, `_2`…) ou nulo.
- Chaves `@{...}` servem quando há texto colado depois (`@{parcelamento_1}x`).

### 4.2 O que NÃO é variável

| Caso | Exemplo |
|---|---|
| Dentro de comentário HTML | `<!-- use @cidade_1 aqui -->` |
| E-mail | `contato@norte.com` (lookbehind impede) |
| Pacote npm em URL | `cdn.jsdelivr.net/npm/@scope/pacote` (barra antes e depois) |
| At-rule de CSS dentro de `<style>` ou `style=""` | `@media`, `@import`, `@font-face`, `@keyframes`, `@supports`, `@charset`, `@page`, `@namespace`, `@container`, `@layer`, `@property`, `@counter-style`, `@viewport`, `@document`, `@scope`, `@starting-style`, `@tailwind`, `@apply`, `@top`… |
| Chave de JSON-LD dentro de `<script type="application/ld+json">` | `@context`, `@type`, `@id`, `@graph`… |
| Documentação com `_N` literal | `@cidade_N` |

Fora de `<style>`, `@media_hero_desktop` É variável (prefixo de mídia, seção 7).

### 4.3 Dono (em qual tabela o valor é preenchido)

Inferido a cada envio de HTML, até alguém mover à mão (`manual = true`):

1. `url`, `total_*` de contagem e `*_abrev` cuja raiz existe → **automática**.
2. Usada dentro de `@repetir etapas` → **etapa** (se o formato tem etapas); dentro de `@repetir cidades`/`@agrupar` → **cidade**.
3. Sem sufixo numérico → **geral**.
4. Com sufixo, no formato com etapas: só aparece na página de etapa → **etapa**; senão → **cidade**.
5. Com sufixo, demais formatos → **cidade**.

Variável que aparece só como coluna de bloco (`@se gratuito = sim`, `@agrupar por regiao`) também é detectada (sintética) e ganha coluna.

Estados por variável: `dono`, `manual`, `ignorar` (não é variável: fica no HTML como está escrita), `excluida` (sai do cadastro e vira vazio na página), `extra` (coluna criada no cadastro com "+ Coluna"), `formula`.

### 4.4 Colunas

Colunas de uma tabela = variáveis com aquele dono, menos `url`, mídia, excluídas e ignoradas, mais as extras. Ordem: a que o usuário arrastou; senão a ordem padrão:

`cidade, uf, regiao, status, local, data_inicio, data_fim, gratuito, mes_outono, mes_inverno, mes_primavera, mes_verao, parcelamento, valor_parcelado, preco_vista, porcentagem_desconto, preco_comum, desconto_em_reais, preco_prime, preco_prime_parcelado, valor_adicional_prime, link_inscricao, link_inscricao_prime`; as demais na ordem em que aparecem.

---

## 5. Cadastro

### 5.1 Tabela

- Uma linha por cidade (ou etapa). Coluna extra "Arquivo gerado" (editável; vazio = nome automático).
- Ações por linha, fixas à direita: duplicar, subir, descer, remover (com confirmação).
- "+ Cidade" cria linha copiando a de cima, **menos** o nome, o arquivo e o status (status volta ao padrão).
- Colar da planilha (Tab/Enter) a partir de uma célula preenche várias linhas e colunas, criando linhas se faltar.
- Colunas arrastáveis para reordenar. Clicar no título abre painel: ver/editar fórmula, mover, excluir coluna.
- Coluna com opções conhecidas (valores usados em `@se coluna = valor` no HTML) vira `<select>` com "—" (vazio) + opções. Exceção: `status` (seção 5.3).
- Edição atualiza a prévia ao vivo (debounce 300 ms) sem perder foco, rolagem ou piscar. Focar uma linha mostra a página daquela linha na prévia.

### 5.2 Fórmulas e números

Fórmulas padrão (aplicadas quando a variável aparece pela primeira vez; editáveis):

| Coluna | Fórmula |
|---|---|
| `preco_vista` | `parcelamento * valor_parcelado` |
| `valor_parcelado` | `preco_vista / parcelamento` |
| `preco_comum` | `preco_vista / (1 - porcentagem_desconto / 100)` |
| `desconto_em_reais` | `preco_comum - preco_vista` |
| `preco_prime_parcelado` | `preco_prime / parcelamento` |
| `valor_adicional_prime` | `preco_prime - preco_vista` |

- Operadores `+ - * / ( )` (e `× ÷`), números e nomes de colunas.
- Valor digitado sempre vence o calculado. Célula calculada mostra o cálculo como placeholder; se tem valor digitado e o cálculo existe, mostra botão ↺ para voltar ao calculado.
- Proteção de ciclo: dentro de uma conta, a própria coluna conta como vazia (`preco_vista ↔ valor_parcelado` não entra em loop).
- Conta que não fecha (faltou valor, divisão inválida) = vazio.
- Leitura de número em formato BR: `1.720` = 1720, `1.720,50` = 1720.5, `R$`, `%`, espaços e `x` final ignorados.
- Saída em formato BR: inteiro sem casas (`1.720`), senão 2 casas (`142,50`). Número digitado numa coluna que participa de fórmula sai no mesmo formato.

### 5.3 Status

- Valores: `em breve` (padrão; célula vazia equivale a em breve) e `aberta`. Outros valores só se o HTML testar explicitamente `@se status = <valor>`.
- O select de status não tem opção vazia; mostra "em breve" selecionado quando vazio.
- `breve`, `em breve` e `em-breve` são equivalentes em comparações e contagens.

### 5.4 Gerais

Variáveis de dono geral aparecem como campos acima da tabela. Valor vazio sai em branco em todas as páginas (aviso).

---

## 6. Montagem das páginas (motor)

### 6.1 Blocos

```
<!-- @repetir cidades -->  …  <!-- @fim -->
<!-- @repetir etapas -->   …  <!-- @fim -->
<!-- @agrupar por <coluna> --> … <!-- @fim -->
<!-- @se <coluna> -->            … [<!-- @senao --> …] <!-- @fim -->
<!-- @se <coluna> = <valor> -->  … [<!-- @senao --> …] <!-- @fim -->
<!-- @se <coluna> != <valor> --> … [<!-- @senao --> …] <!-- @fim -->
```

- Marcador: `/<!--\s*@(repetir|agrupar|se|senao|fim)\b([\s\S]*?)-->/g`.
- Nome da coluna: tira `@` inicial e sufixo `_N` (`@se gratuito_1 = sim` ≡ `@se gratuito = sim`).
- Comparação por slug (sem acento, minúsculas, não alfanumérico → `-`), com `em-breve` ≡ `breve`.
- `@se coluna` sem operador: verdadeiro se preenchida e diferente de `nao`, `no`, `false`, `0`.
- Erros de estrutura (`@senao` fora de `@se`, `@fim` a mais, bloco sem `@fim`) viram aviso bloqueante.
- `@repetir cidades` percorre as cidades do grupo atual (se dentro de `@agrupar`) ou todas. `@repetir etapas` dentro de uma praça percorre só as etapas daquela cidade.
- `@agrupar por regiao` repete o conteúdo uma vez por valor distinto da coluna, na ordem em que aparecem; cidades sem valor formam um grupo vazio (aviso).

### 6.2 Resolução de uma variável

Contexto: página (tapume/praça/etapa), cidade e etapa da página, item atual de um `@repetir`, grupo atual de um `@agrupar`.

1. Excluída → vazio.
2. `@total_cidades` / `@total_pracas` / `@total_etapas` → contagem no escopo (grupo atual, ou etapas da cidade). `@total_<status>` (`aberta`, `breve`, `em_breve`, `encerrada`…, ou valor usado em `@se status = …`) → cidades do escopo com aquele status (vazio conta como breve). Qualquer outro `@total_x` (ex.: `@total_categorias`) é variável comum.
3. `@x_abrev` (com raiz `x` existente) → 3 primeiras letras do valor de `x`.
4. `@url` → nome do arquivo: do item do `@repetir`; no tapume com `_N`, da cidade N; na praça com etapas e `_N`, da etapa N da cidade; na etapa, da própria etapa; na praça, da própria cidade.
5. Variável do grupo do `@agrupar` → valor do grupo.
6. Geral → valor geral.
7. Cidade/etapa → item do `@repetir` se for do mesmo tipo; senão a cidade/etapa da página; senão, no tapume, a N-ésima cidade (`@cidade_3`). Sem item → vazio + aviso "mais espaços do que itens".
8. Mídia → caminho do arquivo escolhido (seção 7).

### 6.3 Nomes de arquivo

- Cidade: valor de `_arquivo` ou `slug(nome).html`; sem nome, `cidade-N.html`.
- Etapa: `<arquivo-da-cidade-sem-.html>-<slug(etapa)>.html`.
- Nome do item: primeira coluna preenchida entre `cidade, praca, nome, local` (cidade) ou `etapa, nome, estacao, titulo` (etapa). Se a coluna de nome existe mas está vazia, usa "Cidade N" (não usa UF ou outra coluna como nome).
- Dois arquivos com o mesmo nome → aviso bloqueante.

### 6.4 Pós-processamento

Em cada página gerada, nesta ordem: reordena as seções (6.5), tira as seções escondidas e o rodapé do HTML se escondido (6.5, 6.6), tira a mídia escondida (7.5), põe o rodapé padrão (6.6) e roda `ajustarTagsMidia` (seção 7.4).

### 6.5 Seções (esconder e mostrar)

- Seção = cada `<section id="…">` de primeiro nível do HTML-modelo (fora de comentários, scripts e estilos). Seções dentro de outra seção não aparecem.
- Nome na tela: `aria-label` da seção; senão o texto do primeiro título (`h1`–`h6`), se tiver texto além de variáveis; senão o `id`.
- Escolha guardada no evento por chave `<tipo de página>#<id>` (ex.: `praca#kit`): escondidas no evento todo e exceções por linha (cidade ou etapa; `true` = mostrar, `false` = esconder).
- Página de cidade: geral, depois a exceção da cidade. Página de etapa: geral, exceção da cidade, exceção da etapa. Tapume: só o geral.
- Esconder tira a seção inteira e os links `href="#id"`; item de menu (`<li>`) que só tem esse link sai junto.
- Ordem: por tipo de página (vale para todas as páginas daquele tipo), guardada como lista de ids. As seções com id trocam de lugar entre si; o resto do HTML (e seções sem id) fica onde estava. Seção nova no HTML (fora da ordem salva) entra logo depois da que vinha antes dela. Os links do menu não mudam de ordem.
- Tela: passo **Seções**, por página, com a lista arrastável (alça ⠿ ou setas ↑↓), Mostrar/Esconder para o evento todo e, com uma cidade escolhida, "igual ao evento / mostrar / esconder"; "Voltar à ordem do HTML" desfaz a ordem. Prévia ao lado.

### 6.6 Rodapé

- **Rodapé do HTML**: o `<footer>` que veio no HTML, fora das seções (o de dentro de uma seção não conta; o do publicador também não). No passo Seções aparece como uma linha fixa no fim da lista, com Mostrar/Esconder no evento todo e por cidade (chave `<tipo>#@rodape`).
- **Rodapé padrão**: montado pelo publicador a partir de uma configuração: fonte do Google Fonts (ou a mesma da página), cores de fundo, texto e links, logo (imagem da mídia do evento ou enviada na hora, em `_media/rodape/`), descrição (várias linhas; `**texto**` vira negrito), título dos links, links (texto + endereço) e redes sociais com ícone de uma lista pronta (Instagram, Facebook, YouTube, TikTok, X, LinkedIn, WhatsApp, Spotify, site, e-mail, telefone) e texto opcional ao lado ("Siga no Instagram"). Os ícones têm a cor do texto.
- Formato: desktop em duas colunas (esquerda: logo e descrição; direita: título, links um embaixo do outro e redes). Até 760 px de largura, tudo empilhado e centralizado. Sem links nem redes, uma coluna só.
- Geral do evento (Mostrar/Esconder); por cidade, "igual ao evento / mostrar / esconder" e, se quiser, um rodapé próprio (começa como cópia do geral). Na página da etapa, a escolha da etapa vence a da cidade. O tapume usa o geral.
- Entra antes de `</body>` (ou no fim), com a fonte no `<head>`. Estilo próprio isolado pela classe `.pub-rodape`.
- Segurança: links só com `https://`, `http://`, `mailto:`, `tel:` ou `#` (os outros não aparecem); textos escapados; cor ou fonte inválida volta ao padrão.

---

## 7. Mídia

### 7.1 Pastas

`_media/<pagina>/<secao>/arquivos` com `<pagina>` = `tapume`, `praca`, `etapa` ou `pagina` (One page). Compatível com `_images/` (versão antiga). Aceita a pasta `_media` solta ou dentro da pasta do site.

Tipos aceitos: png, jpg, jpeg, gif, webp, svg, avif, mp4, webm, woff2, woff, ttf, otf, css, js, json, pdf. Arquivos ocultos ignorados.

### 7.2 Variáveis de mídia

| Prefixo | Aceita |
|---|---|
| `@img_<secao>_<nome>` | imagens |
| `@video_<secao>_<nome>` | vídeos |
| `@media_<secao>_<nome>` | imagens e vídeos |

- Opções = arquivos dentro das pastas `_media/<pagina>/<secao>/` de todas as páginas em que a variável aparece.
- Desktop/mobile: se o nome do slot tem `desktop`/`desk` ou `mobile`/`mob`/`celular` como palavra, só aparecem arquivos da mesma versão (nome do arquivo ou subpasta). Arquivo sem versão aparece nas duas.
- Arquivo padrão: o arquivo cujo nome (sem extensão) é igual ao fim da variável, **preferindo imagem**; senão a primeira imagem; senão o primeiro arquivo.
- Dono: geral (igual em todas as páginas) ou cidade/etapa (escolha por linha). Mesmo menu de chips do passo Variáveis, e também uma chave no passo Mídia ("Igual em todas as cidades" / "Escolher por cidade").
- Por cidade, a linha sem escolha usa a escolha geral; sem escolha geral, o arquivo padrão.

### 7.3 Referências de arquivo no HTML

Caminhos em `src`, `href` (não `.html`), `poster`, `data-src`, `srcset`, `url(...)` no CSS e strings em JS terminadas em extensão de mídia/fonte/pdf. Externos (`http:`, `//`, `#`, `@…`) ignorados. Resolução: caminho exato → arquivo que termina com o caminho → arquivo com o mesmo nome em qualquer pasta.

### 7.4 Troca imagem ↔ vídeo

Depois de montar a página:

- `<img>` cujo `src` é vídeo → `<video … src autoplay muted loop playsinline data-pub-midia>`, mantendo `class`, `id`, `style` e demais atributos; `alt` vira `aria-label`; remove `srcset`, `sizes`, `loading`, `decoding`, `fetchpriority`.
- `<picture>` cujo `<img>` é vídeo → o `<picture>` inteiro vira o `<video>` acima.
- `<source srcset="*.mp4">` dentro de `<picture>` → removido.
- `<video src="*.webp">` → `<img data-pub-midia>`.
- Se houve troca, injeta no `<head>`: `:where(video[data-pub-midia],img[data-pub-midia]){display:block;width:100%;height:100%;object-fit:cover}`. O `:where()` deixa a regra com especificidade zero: o CSS da página (que esconde a versão desktop no celular e vice-versa pela classe) sempre vence.

### 7.5 Tela Mídia

Seletor de página; seções com o nome da pasta; cada variável com faixa de miniaturas (vídeo com `<video preload=metadata>`); seleção marcada; prévia ao lado atualiza na hora. Variável sem arquivo na pasta → aviso com o caminho esperado.

Adicionar arquivos direto na tela (arrastar do computador ou clicar para procurar):
- Solto na **seção**: vai para `_media/<pagina>/<secao>/` com o nome do arquivo limpo (sem acento, espaço ou maiúscula).
- Solto num **lugar** (variável): mesma pasta, com o nome do lugar (`desktop.mp4`, `desktop-2.mp4`…), e já fica escolhido para ele (na cidade selecionada, se for por cidade).
- Nunca sobrescreve: nome ocupado ganha `-2`, `-3`… Conteúdo igual ao de um arquivo guardado não sobe de novo.
- `@img_` só aceita imagem, `@video_` só vídeo, `@media_` e a seção aceitam os dois.

Cada miniatura tem dois ícones: **olho** (esconde a mídia daquele lugar, no evento todo ou na cidade selecionada se for "por cidade": a tag `<img>`/`<video>`/`<source>` sai da página e, em CSS, `url()` fica vazio; nada entra no lugar. Clicar de novo mostra o mesmo arquivo. A escolha fica guardada como `!oculta:<caminho>`) e **lixeira** (exclui o arquivo, com confirmação; as escolhas que apontavam para ele voltam ao padrão).

---

## 8. Prévia

- Celular (390×780) e desktop (1280×800), escalada para caber no painel.
- Arquivos locais trocados por data URLs (o site não precisa estar hospedado para a prévia).
- URL base opcional do evento (`<base href>`) para referências absolutas.
- Duplo buffer: o iframe novo carrega escondido e só substitui o atual quando pronto. Mantém a rolagem entre atualizações. Não recarrega se o HTML não mudou.
- "Abrir em outra janela": janela separada que acompanha as mudanças.

---

## 9. Conversor de cards fixos do tapume

Para tapumes antigos com um card por cidade numerado (`@cidade_1`, `@cidade_2`…):

1. Detecta: sem `@repetir` e com 2+ sufixos numéricos fora de comentário/script/style.
2. Acha a raiz de cada card: o maior elemento que só referencia um número, cujo pai referencia vários. Normaliza pela "cara" mais comum (tag + primeira classe).
3. Se os cards estão em grupos (ex.: uma `<section>` por região): coluna de grupo = atributo `data-*` com valores distintos por grupo (`data-regiao` → `regiao`) ou o título do grupo (`grupo`). Gera `@agrupar por <col>`; no cabeçalho, o nome vira `@<col>` e a quantidade vira `@total_cidades`.
4. Modelos: o HTML do card sem números; até 2 formatos. Com 2, o formato com link (`<a>`) é o "aberta" e o outro "em breve", gerando `@se status = aberta … @senao … @fim`. Mais de 2 → erro "converta à mão".
5. Contagens soltas no texto ("5 com inscrição aberta · 11 em breve") viram `@total_aberta` / `@total_breve`.
6. Pré-preenche o cadastro com as cidades dos cards (número, grupo, status).

---

## 10. Avisos

| Nível | Aviso |
|---|---|
| bloqueia | Falta o HTML de uma página do formato |
| bloqueia | Nenhuma cidade cadastrada / nenhuma etapa (formato com etapas) |
| bloqueia | Dois arquivos com o mesmo nome |
| bloqueia | Erro de estrutura de bloco |
| alerta | Etapas sem cidade (não geram página) |
| alerta | Valor de coluna que o HTML não conhece (ex.: status "aberto" quando o HTML testa "aberta") |
| alerta | Tapume com cards fixos |
| alerta | Mídia sem arquivo na pasta |
| alerta | Campos vazios no cadastro (por variável, com as cidades) |
| alerta | Gerais sem valor |
| alerta | Página com mais espaços do que itens cadastrados |

Cada aviso leva ao passo onde se corrige.

---

## 11. Publicação (protótipo)

Gera `.zip` com `index.html`, as páginas e só os arquivos referenciados, na mesma estrutura de pastas. Registra no evento: data, número de páginas, avisos e nome do arquivo. No programa novo isso vira publicação em URL (ROADMAP, fase 1), mantendo o zip como opção de download.

---

## 12. Dados de um evento (formato do protótipo)

```json
{
  "id": "ev-…", "nome": "", "formato": "tapume_praca",
  "paginas": {}, "vars": { "<base>": { "dono": "cidade", "manual": false, "ignorar": false, "excluida": false, "extra": false, "formula": "…" } },
  "gerais": { "<base>": "valor" },
  "cidades": [ { "_id": "…", "_arquivo": "", "<base>": "valor", "<midia>": "_media/praca/hero/x.webp" } ],
  "etapas":  [ { "_id": "…", "_cidade": "<_id da cidade>", "<base>": "valor" } ],
  "ordem": { "cidade": ["…"], "etapa": ["…"] },
  "imagens": { "<midia geral>": "caminho" },
  "arquivos": { "<caminho>": { "asset": "<id>", "bytes": 0 } },
  "baseUrl": "", "publicacoes": [ { "em": "ISO", "paginas": 0, "avisos": 0, "arquivo": "x.zip" } ]
}
```

Valores de linha ficam num objeto livre (as colunas mudam por evento). No Postgres, isso cabe bem em `jsonb` (ROADMAP, modelo de dados).

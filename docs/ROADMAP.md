# Roadmap — Publicador de Hotsites

Uso: equipe da Norte Marketing. Primeira entrega sem login. Prioridade absoluta: **hospedar a mídia e publicar o site numa URL real**. O resto fica mapeado e entra por fases.

| Fase | Entrega | Status |
|---|---|---|
| 0 | Motor extraído e testado | feito — goldens aguardando aprovação |
| 1 | App básico + mídia hospedada + publicação em URL real | em teste no GitHub Pages (D2 provisório); destino: Cloudflare |
| 2 | Rodapé padrão | feito (por evento, com troca por cidade); falta o layout oficial da Norte (D4) |
| 3 | Pós-evento (página e virada automática) | mapeado |
| 4 | Login, convite e papéis | mapeado |
| 5 | Patrocinadores (banco + seção padrão) | feito (banco geral, cotas, composição por página); falta o login só de patrocínios (fase 4) |
| 6 | Data, local e preço vindos de API | mapeado |

---

## Arquitetura

```
apps/web (Next.js na Vercel)
 ├─ /app/...                 telas do publicador (os 7 passos)
 ├─ /api/...                 salvar evento, upload de mídia, publicar
 └─ rota dos sites           serve as páginas publicadas
        │
packages/motor (TS puro)     HTML-modelo + cadastro + mídia → páginas + avisos
        │
Supabase
 ├─ Postgres                 eventos, linhas do cadastro, publicações
 └─ Storage                  modelos HTML, _media, versões publicadas
```

### Por que os sites publicados passam por uma rota do app

Em vez de copiar HTML estático para um bucket público, o app serve as páginas publicadas por uma rota (`/<evento>/<arquivo>` no domínio dos sites), lendo a versão publicada do Storage, com cache de CDN curto (ex.: `s-maxage=60, stale-while-revalidate`).

Isso resolve três fases futuras sem republicar nada:

- **Pós-evento (fase 3):** a rota compara a hora atual com o fim do evento + 8 h e serve a página pós-evento sozinha. Não depende de cron.
- **Rodapé padrão (fase 2):** o rodapé pode ser injetado na hora de servir, então trocar texto ou cor vale para todas as páginas na hora.
- **Patrocinadores (fase 5):** a seção vem do banco; cadastrar um patrocinador atualiza todos os eventos que o usam.

Sem isso, também funciona um Storage público com HTML estático, mas cada mudança exige republicar, e o pós-evento precisa de um job agendado. Observação: o Supabase Storage serve `.html` como `text/plain`, por isso o HTML não pode ser servido direto do bucket. Mídia (imagens/vídeos) pode ser servida direto do Storage ou de CDN.

---

## Fase 0 — Motor extraído e testado

Objetivo: o comportamento validado no protótipo vira uma biblioteca testada, base de todo o resto.

- `packages/motor` em TypeScript, sem DOM do navegador (usar `parse5` ou `linkedom` onde o protótipo usa `DOMParser`, no conversor de cards).
- API sugerida:
  - `detectar(modelos) → variaveis, blocos, opcoes`
  - `inferirDonos(variaveis, formato)`
  - `gerar({ formato, modelos, vars, gerais, cidades, etapas, midia, agora }) → { paginas[], avisos[], bloqueado }`
  - `verificarHtml(html, tipoPagina) → problemas[]` (ver abaixo)
  - `converterCardsFixos(html) → { html, prefill, erro? }`
  - `refsDeArquivo(html)`, `ajustarTagsMidia(html)`
- Testes: todos os casos de `docs/CASOS_DE_TESTE.md`, mais testes "golden" com os HTMLs de `exemplos/` (gerar e comparar com saída aprovada).

### Verificador de HTML (novo, entra na fase 0)

Transforma o checklist da seção 12.5 do guia em verificação automática no envio do HTML, com o número da linha:

- preço (`@preco_vista`, `@valor_parcelado`) fora de um `@se gratuito = sim … @senao`;
- `@se preco_vista` antes do `@se gratuito` no mesmo trecho;
- `gratuito`, `status` ou `preco` decididos dentro de `<script>`;
- "A confirmar" fora de `@senao`;
- blocos sem `@fim`;
- status testado contra valor diferente de `aberta`/`em breve`;
- variável própria começando com `total_` que não é contagem;
- nome sinônimo da base (`@valor`, `@preco`, `@data`, `@municipio`, `@gratis`…);
- `@media_` dentro de `<picture>`;
- mídia fora de `_media/`, base64 embutido;
- (fase 2) `<footer>` presente.

Problemas viram avisos no passo Páginas. Isso elimina o vai-e-volta entre quem gera o HTML e quem publica.

---

## Fase 1 — App básico + publicação em URL real (PRIORIDADE)

### Escopo

1. Telas dos 7 passos com o comportamento da ESPECIFICACAO (pode melhorar o visual, não o fluxo).
2. Eventos salvos no Postgres (lista compartilhada pela equipe), com exclusão confirmada.
3. Upload da pasta `_media` direto para o Storage (upload em paralelo, com progresso, retomável; arquivos repetidos por hash não sobem de novo).
4. Prévia usando as URLs do Storage (não mais data URLs).
5. **Publicar**: gera as páginas com o motor, grava como versão imutável no Storage (`publicados/<evento>/<versao>/…`), marca como versão ativa e mostra a URL final. Mídia referenciada com URL absoluta do Storage/CDN (ou copiada para a versão, decisão D3).
6. Histórico de publicações com "voltar para esta versão" (troca a versão ativa).
7. Baixar `.zip` continua disponível.
8. Slug do evento editável (vira o caminho da URL), único.

### Acesso sem login

Sem login nesta fase, mas o app **não pode ficar aberto na internet**: proteger as telas do publicador com uma senha única da equipe (middleware com Basic Auth ou proteção de deploy da Vercel). Os sites publicados são públicos.

### Modelo de dados inicial

```
eventos(id, slug unique, nome, formato, config jsonb, criado_em, atualizado_em, excluido_em)
  config = { vars, gerais, ordem, imagens, baseUrl }
modelos(id, evento_id, tipo, html text, enviado_em)          -- tapume | praca | etapa | unica
linhas(id, evento_id, tipo, ordem, cidade_id null, valores jsonb)  -- tipo: cidade | etapa
midias(id, evento_id, caminho, storage_key, bytes, mime, sha256)
publicacoes(id, evento_id, versao, ativa bool, paginas int, avisos jsonb, publicado_em, url)
```

### Pronto quando

- Um designer sobe os HTMLs da Makai e a `_media`, preenche duas cidades e publica.
- `https://<dominio>/<evento>/` abre o tapume, os cards levam às praças, imagens e vídeos carregam, no celular e no desktop.
- Republicar troca o site sem quebrar links. Voltar para a versão anterior funciona.

---

## Fase 2 — Rodapé padrão

- Os HTMLs não têm rodapé. Se tiverem, o `<footer>` é removido na geração (com aviso no passo Páginas).
- O rodapé é um componente da plataforma, igual em todos os eventos, com campos editáveis por evento: textos (ex.: realização, contato, direitos, links legais) e cores (fundo, texto, destaque).
- Injetado antes de `</body>` (na rota de servir, para valer na hora).
- Atualizar o GUIA: seção "não faça rodapé" e item no verificador.
- **Precisa da Norte:** o layout do rodapé padrão (D4).

---

## Fase 3 — Pós-evento

- Novo tipo de página-modelo `pos_evento` (um por evento), com variáveis próprias: resultados e fotos (galeria).
- Cadastro por cidade/etapa: resultados (tabela por categoria? ou texto livre; D5) e pasta `_media/pos_evento/<secao>/`.
- **Virada automática:** quando `agora ≥ fim do evento + 8 h` (fuso `America/Sao_Paulo`), a URL da praça/etapa passa a servir a página pós-evento. No tapume, o card da cidade muda para o estado "encerrado" (`@se status = encerrada`, status calculado).
- Botões manuais: "virar agora" e "adiar virada".
- **Pré-requisito:** datas estruturadas. Hoje `data_inicio`/`data_fim` são texto livre ("12/03"). Passam a ser data de verdade (seletor de data, com ano), e opcionalmente hora de término; o HTML continua recebendo "12/03" formatado. Sem hora, fim = 23:59 de `data_fim` (ou `data_inicio`) — **confirmar regra (D6)**.

---

## Fase 4 — Login, convite e papéis

- Supabase Auth com convite por e-mail (link mágico). Só domínio da Norte ou convidados.
- Papéis:
  - `admin`: tudo, inclusive convidar e excluir.
  - `editor`: cria e publica eventos.
  - `patrocinios`: acessa **só** o banco de patrocinadores e a seção de patrocinadores dos eventos.
- Registro de quem publicou cada versão.
- Remove a senha única da fase 1.

---

## Fase 5 — Patrocinadores

- **Banco global** (reutilizável em qualquer evento): nome, logo (variações clara/escura, SVG ou PNG), link, descrição curta, ativo.
- **Vínculo por evento** (e opcionalmente por cidade): cota/categoria (ex.: master, oficial, apoio), ordem.
- **Seção padrão:** componente da plataforma no formato definido pela Norte (D7), inserida no HTML onde houver o marcador `<!-- @patrocinadores -->` (ou antes do rodapé, se não houver).
- Papel `patrocinios` vê só essas telas (depende da fase 4).

---

## Fase 6 — Data, local e preço por API

- Conector "fonte de dados" por evento: para cada cidade/etapa, um ID externo; o conector busca data, local, preço (e talvez status/link de inscrição).
- Valores vindos da API preenchem as colunas da base; o usuário pode sobrescrever à mão (mesma lógica do ↺ das fórmulas).
- Sincronização: botão "atualizar agora" + atualização periódica (ex.: a cada hora) + no momento de publicar. Mudança vinda da API republica sozinha? (D9)
- **Precisa da Norte:** qual sistema/API (plataforma de inscrição), autenticação e formato dos dados (D8).

---

## Decisões em aberto

| # | Decisão | Quem | Sugestão |
|---|---|---|---|
| D1 | Domínio dos sites publicados e forma da URL: `eventos.<dominio>/<evento>/` ou subdomínio por evento | Norte | caminho por evento num subdomínio fixo (um certificado, zero configuração por evento) |
| D2 | Hospedagem: Vercel + Supabase (sugerido) ou infraestrutura que a Norte já usa | Norte | Vercel + Supabase |
| D3 | Mídia publicada: URL do Storage/CDN ou cópia dentro de cada versão | dev | cópia por versão (versão anterior continua intacta) |
| D4 | Layout e campos do rodapé padrão | Norte | — |
| D5 | Formato dos resultados no pós-evento | Norte | tabela por categoria + PDF opcional |
| D6 | Hora de término do evento para a regra "+8 h" | Norte | campo opcional de hora; sem hora, 23:59 |
| D7 | Formato visual da seção de patrocinadores | Norte | — |
| D8 | Qual API de data/local/preço | Norte | — |
| D9 | Mudança da API republica sozinha ou pede confirmação | Norte | pede confirmação |

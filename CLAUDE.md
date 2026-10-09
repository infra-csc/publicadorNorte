# Publicador de Hotsites — Norte Marketing

Ferramenta interna da Norte Marketing que transforma HTMLs de eventos esportivos (escritos com variáveis `@nome`) em hotsites publicados numa URL real: uma página home (tapume) e uma página por cidade (praça), e opcionalmente por etapa.

Antes de qualquer tarefa, leia:

1. `docs/ESPECIFICACAO.md`: como o produto funciona hoje (fonte da verdade do comportamento).
2. `docs/ROADMAP.md`: fases, prioridades e decisões em aberto.
3. `docs/CASOS_DE_TESTE.md`: comportamentos que não podem quebrar.
4. `docs/GUIA_VARIAVEIS_HTML.md`: o contrato com quem escreve os HTMLs.

`referencia/publicador-atual.html` é o protótipo que funciona (HTML único, sem servidor). Quando a especificação não responder uma dúvida de comportamento, abra o protótipo no navegador e faça igual. Não copie a estrutura do código: copie o comportamento.

## Regras do projeto

- **O motor não muda sem teste.** Toda alteração em `packages/motor` vem com teste novo ou ajustado em `CASOS_DE_TESTE`. Nenhum PR passa com teste vermelho.
- **O motor é puro.** Sem acesso a banco, rede, DOM ou `Date.now()` direto. Recebe HTML + cadastro + arquivos e devolve páginas + avisos. Data/hora entram como parâmetro.
- **Nomes de variáveis da base são fixos** (`cidade`, `uf`, `regiao`, `status`, `local`, `data_inicio`, `data_fim`, `gratuito`, `preco_vista`, `parcelamento`, `valor_parcelado`, `porcentagem_desconto`, `preco_comum`, `desconto_em_reais`, `link_inscricao`, `preco_prime`, `preco_prime_parcelado`, `valor_adicional_prime`, `link_inscricao_prime`). Não renomeie, não crie sinônimos.
- **Status só tem `em breve` (padrão, vazio) e `aberta`.** `@se status = em breve` e `= breve` são equivalentes.
- **O guia é contrato.** Se uma mudança altera o que o HTML precisa conter, atualize `docs/GUIA_VARIAVEIS_HTML.md` no mesmo PR e o verificador de HTML.
- **Interface em português do Brasil**, textos curtos e diretos, sem jargão técnico para quem publica (designers e atendimento, não devs).
- **Nunca apague dados do usuário sem confirmação.** Eventos, cadastros e mídias têm exclusão com confirmação.
- **Segredos só em variáveis de ambiente.** Nada de chave no repositório.

## Stack (ver ROADMAP para justificativas)

- Monorepo com pnpm workspaces.
- `packages/motor`: TypeScript puro, testes com Vitest.
- `apps/web`: Next.js (App Router) + TypeScript. A interface do publicador e a rota que serve os sites publicados.
- Supabase: Postgres (eventos, cadastros, publicações) e Storage (HTMLs-modelo, mídia, versões publicadas).
- Deploy do app na Vercel. Domínio dos sites publicados: decisão em aberto (ROADMAP, D1).

## Comandos (manter atualizados)

```
pnpm install
pnpm test              # motor + verificador
pnpm golden            # regrava as saídas golden (só depois de aprovar a mudança)
pnpm dev               # apps/web em http://localhost:3000 (precisa de apps/web/.env.local, ver .env.example)
pnpm lint && pnpm typecheck
```

Os scripts da raiz chamam `pnpm`, então ele precisa estar no PATH (`corepack enable` ou `npm i -g pnpm`). Sem isso, rode direto: `corepack pnpm -r test`.

## Estrutura

```
packages/motor/
  src/
    index.ts        API pública
    tipos.ts        Formato, TipoPagina, Linha, EstadoVar, Aviso
    variaveis.ts    regex de @variável e o que não é variável
    blocos.ts       @repetir/@agrupar/@se/@senao/@fim → árvore + erros
    detectar.ts     detectar(), inferirDono(), sincronizarVars(), colunas(), fórmulas padrão
    cadastro.ts     valor final de cada coluna (digitado/calculado), nomes de item e de arquivo, novaLinha()
    formulas.ts     avaliar() das fórmulas
    midia.ts        opções e padrão de mídia, refsDeArquivo(), ajustarTagsMidia()
    gerar.ts        gerar() → páginas + avisos
    conversor.ts    temCardsFixos(), converterCardsFixos() (linkedom no lugar do DOMParser)
    verificador.ts  verificarHtml() → problemas com linha
  test/             um arquivo por seção de CASOS_DE_TESTE (a-… a j-…)
    fixtures/       HTMLs sintéticos (cards fixos, trechos do guia)
    golden/         saídas aprovadas dos exemplos
apps/web/           Next.js 16 (App Router). Ler node_modules/next/dist/docs antes de mexer: middleware agora é proxy.ts
  proxy.ts          senha única da equipe (SENHA_EQUIPE); sem senha, só abre em localhost
  app/              telas: / (eventos) e /eventos/[slug]/[passo]; rotas em app/api
  componentes/      Editor (estado + salvamento automático) e um componente por passo
  lib/comum/        tipos do evento, montagem (motor + mídia), arquivos (sha do git)
  lib/servidor/     github.ts (só fetch), armazenamento.ts e destino.ts (interfaces trocáveis), config.ts
```

## Hospedagem atual (ambiente de testes)

- Repositório `RenanPrates/publicadorNorte` (público). Código em `main`; dados dos eventos no branch `dados` (`eventos/<slug>/evento.json`, `modelos/`, `arquivos/`); sites publicados no branch `gh-pages` (`<slug>/…`, com `.nojekyll`), servidos pelo GitHub Pages em `https://renanprates.github.io/publicadorNorte/<slug>/`.
- Cada publicação é um commit em `gh-pages` + tag `<slug>-v<N>`; "voltar para esta versão" restaura a pasta daquela versão num commit novo.
- Publicador no ar: https://publicador-norte.infraestrutura-685.workers.dev (senha da equipe).
- O publicador roda na **Cloudflare** a partir de uma cópia deste repositório na organização infra-csc: a cada push na main, `.github/workflows/avisar-cloudflare.yml` avisa a cópia (segredo DISPARO_CLOUDFLARE) e o deploy sai na hora. A configuração do Worker está em apps/web/wrangler.jsonc e open-next.config.ts (`pnpm cf:build`); o CI monta esse build a cada push.
- O destino final é a Cloudflare: tudo que é do GitHub fica atrás de `Armazenamento` e `DestinoPublicacao`. O app não pode usar APIs só de Node (roda em Workers via OpenNext).
- Imports do motor sem extensão `.js` (o Turbopack não resolve `.js` → `.ts`).
- As rotas de eventos ficam em `/api/hotsites`, não `/api/eventos`: a lista EasyPrivacy (bloqueador do Opera, uBlock, Brave) tem a regra `||workers.dev/api/event`, que derruba qualquer caminho `/api/event…` em `*.workers.dev`. Antes de criar rota nova, confira que o caminho não esbarra em listas de bloqueio.

## Fluxo de trabalho

- Trabalhe por fase do ROADMAP. Não adiante funcionalidade de fase futura.
- Comece cada fase escrevendo os testes dos casos listados, depois o código.
- Ao terminar uma fase: rode tudo, atualize este arquivo (comandos, estrutura) e marque a fase no ROADMAP.

// Verificador de HTML: transforma o checklist do guia (seções 9, 12.4 e 12.5) em avisos com número da linha,
// mostrados no passo Páginas. Não bloqueia a publicação.
import { lerBlocos, type No, type NoSe } from './blocos';
import { ehImagemArq, ehVideoArq, normRef, refsDeArquivo } from './midia';
import { slug, slugValor } from './texto';
import type { TipoPagina } from './tipos';
import { dentro, faixas, varsDoTexto, zonas } from './variaveis';

export type CodigoProblema =
  | 'bloco-mal-fechado'
  | 'preco-fora-do-gratuito'
  | 'preco-antes-do-gratuito'
  | 'decisao-em-script'
  | 'rolagem-em-script'
  | 'decisao-em-atributo'
  | 'a-confirmar-fixo'
  | 'status-invalido'
  | 'sintaxe-se'
  | 'total-proprio'
  | 'nome-fora-da-base'
  | 'midia-em-picture'
  | 'base64'
  | 'midia-fora-da-pasta';

export interface Problema {
  codigo: CodigoProblema;
  linha: number;
  mensagem: string;
  /** o pedaço do HTML que gerou o problema */
  trecho: string;
}

const PRECO = new Set(['preco_vista', 'valor_parcelado']);
const CONTAGENS = new Set(['total_cidades', 'total_pracas', 'total_etapas', 'total_aberta', 'total_breve', 'total_em_breve']);
/** nomes que já têm uma variável base: nome errado → nome certo */
export const SINONIMOS: Record<string, string> = {
  valor: 'preco_vista', preco: 'preco_vista', preco_avista: 'preco_vista', valor_vista: 'preco_vista', valor_avista: 'preco_vista',
  data: 'data_inicio', data_evento: 'data_inicio', municipio: 'cidade', estado: 'uf',
  gratis: 'gratuito', gratuita: 'gratuito', free: 'gratuito', evento_gratuito: 'gratuito',
  parcelas: 'parcelamento', valor_parcela: 'valor_parcelado', link: 'link_inscricao',
};

interface Ramo { se: NoSe; ramo: 'sim' | 'senao' }

const gratuitoSim = (n: NoSe) => n.col === 'gratuito' && (n.op === '' || (n.op === '=' && slug(n.val) === 'sim'));
/** este ramo é o "não é gratuito"? */
const ramoPago = (r: Ramo) =>
  (gratuitoSim(r.se) && r.ramo === 'senao') || (r.se.col === 'gratuito' && r.se.op === '!=' && slug(r.se.val) === 'sim' && r.ramo === 'sim');

function contemGratuito(nos: No[]): boolean {
  return nos.some((n) => (n.t === 'se' && (n.col === 'gratuito' || contemGratuito(n.filhos) || contemGratuito(n.senao))) || ((n.t === 'repetir' || n.t === 'agrupar') && contemGratuito(n.filhos)));
}

export function verificarHtml(html: string, _tipo?: TipoPagina): Problema[] {
  const out: Problema[] = [];
  // início de cada linha, para achar o número da linha de uma posição
  const inicios = [0];
  for (let i = 0; i < html.length; i++) if (html.charCodeAt(i) === 10) inicios.push(i + 1);
  const linha = (pos: number) => {
    let lo = 0, hi = inicios.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (inicios[m] <= pos) lo = m; else hi = m - 1; }
    return lo + 1;
  };
  const trechoEm = (pos: number, tam = 80) => html.slice(pos, pos + tam).split('\n')[0].trim();
  const add = (codigo: CodigoProblema, pos: number, mensagem: string, trecho = trechoEm(pos)) => out.push({ codigo, linha: linha(pos), mensagem, trecho });

  const { raiz, erros } = lerBlocos(html);
  for (const e of erros) add('bloco-mal-fechado', e.ini, 'Bloco mal fechado: ' + e.msg + '. Todo @se, @repetir e @agrupar precisa do seu @fim.');

  // zonas do HTML inteiro: comentários e scripts não contam como texto da página
  const zHtml = zonas(html);
  const scripts = faixas(html, /<script\b(?![^>]*ld\+json)[^>]*>[\s\S]*?<\/script>/gi);
  const estilos = faixas(html, /<style\b[\s\S]*?<\/style>/gi);
  const foraDoTexto = (pos: number) => dentro(zHtml.com, pos) || dentro(scripts, pos) || dentro(estilos, pos);

  const checarSe = (n: NoSe) => {
    if (/==|["']/.test(n.arg) || /^@/.test(n.arg) || /^@?[A-Za-z]\w*_\d+\b/.test(n.arg)) {
      add('sintaxe-se', n.ini, `Escreva o @se sem "@", sem número e com um "=" só, sem aspas (ex.: @se gratuito = sim).`);
    }
    if (n.col === 'status' && n.op && !['aberta', 'breve'].includes(slugValor(n.val))) {
      add('status-invalido', n.ini, `O status testado é "${n.val}". Use "aberta" (ou "em breve").`);
    }
    if (SINONIMOS[n.col]) add('nome-fora-da-base', n.ini, `@se ${n.col}: use o nome da base @${SINONIMOS[n.col]}.`);
  };

  const andar = (nos: No[], ramos: Ramo[]) => {
    for (const n of nos) {
      if (n.t === 'txt') {
        for (const a of varsDoTexto(n.s)) {
          const pos = n.ini + a.ini;
          if (PRECO.has(a.base) && !ramos.some(ramoPago) && !dentro(scripts, pos)) {
            add('preco-fora-do-gratuito', pos, `${a.tok} está fora de um bloco "@se gratuito = sim … @senao". Uma cidade gratuita mostraria o preço.`);
          }
          if (/^total_/.test(a.base) && !CONTAGENS.has(a.base)) {
            add('total-proprio', pos, `${a.tok}: variáveis começando com "total_" são contagens automáticas. Use outro nome (ex.: @qtd_${a.base.slice(6)}).`);
          }
          if (SINONIMOS[a.base]) add('nome-fora-da-base', pos, `${a.tok}: use o nome da base @${SINONIMOS[a.base]}${a.num ? '_' + a.num : ''}.`);
        }
        const rx = /A confirmar/g; // maiúsculo: o caso de preço vazio do guia ("a confirmar" no meio de frase é texto comum)
        let m: RegExpExecArray | null;
        while ((m = rx.exec(n.s))) {
          const pos = n.ini + m.index;
          if (!foraDoTexto(pos) && !ramos.some((r) => r.ramo === 'senao')) {
            add('a-confirmar-fixo', pos, '"A confirmar" escrito fixo. Ele só pode aparecer depois de um @senao, como o caso de preço vazio.');
          }
        }
      } else if (n.t === 'repetir' || n.t === 'agrupar') {
        if (n.t === 'agrupar' && SINONIMOS[n.col]) add('nome-fora-da-base', n.ini, `@agrupar por ${n.col}: use o nome da base @${SINONIMOS[n.col]}.`);
        andar(n.filhos, ramos);
      } else {
        checarSe(n);
        if (PRECO.has(n.col) && !ramos.some(ramoPago) && (contemGratuito(n.filhos) || contemGratuito(n.senao))) {
          add('preco-antes-do-gratuito', n.ini, `"@se ${n.col}" vem antes do "@se gratuito = sim". Teste primeiro o gratuito, depois o preço.`);
        }
        andar(n.filhos, [...ramos, { se: n, ramo: 'sim' }]);
        andar(n.senao, [...ramos, { se: n, ramo: 'senao' }]);
      }
    }
  };
  andar(raiz, []);

  // preço, gratuito ou status decididos no JavaScript
  for (const [a, b] of scripts) {
    const s = html.slice(a, b);
    const m = s.match(/\bgratuit[oa]s?\b|a confirmar|@\{?(?:gratuito|status|preco_vista|valor_parcelado)(?:_\d+)?\b/i);
    if (m) add('decisao-em-script', a + m.index!, 'Preço, gratuito ou status decidido dentro de <script>. O publicador não roda JavaScript: use @se.', trechoEm(a + m.index!));
  }
  // scrollIntoView rola também a janela (e o publicador em volta da prévia): o site abre no meio
  for (const [a, b] of scripts) {
    const i = html.slice(a, b).search(/\.scrollIntoView\s*\(/);
    if (i >= 0) add('rolagem-em-script', a + i + 1, 'scrollIntoView rola a página inteira até o elemento (o site abre no meio, não no topo). Para mostrar uma aba ou um item, role só a barra: barra.scrollTo({ left: … }).', trechoEm(a + i));
  }
  // decisão guardada em atributo data-
  for (const m of html.matchAll(/\sdata-[\w-]+\s*=\s*["']\s*@\{?(gratuito|status)(?:_\d+)?\b/gi)) {
    if (!foraDoTexto(m.index!)) add('decisao-em-atributo', m.index! + 1, `@${m[1]} guardado em atributo data-. Use @se ${m[1]} = … no HTML.`);
  }
  // @media_ dentro de <picture>
  for (const m of html.matchAll(/<picture\b[\s\S]*?<\/picture>/gi)) {
    const v = m[0].match(/@\{?(media|video)_\w+/i);
    if (v && !dentro(zHtml.com, m.index!)) add('midia-em-picture', m.index! + v.index!, `${v[0]} dentro de <picture>. Use um <img> simples: o publicador troca por <video> quando o arquivo for vídeo.`);
  }
  // mídia embutida em base64
  for (const m of html.matchAll(/data:(image|video)\/[\w.+-]+;base64,/gi)) {
    add('base64', m.index!, `${m[1] === 'video' ? 'Vídeo' : 'Imagem'} embutida no HTML em base64. Coloque o arquivo na pasta _media e use o caminho.`, m[0]);
  }
  // imagem ou vídeo fora de _media/
  for (const ref of refsDeArquivo(html)) {
    const r = normRef(ref);
    if (!(ehImagemArq(r) || ehVideoArq(r)) || /^(_media|_images)\//.test(r)) continue;
    const pos = html.indexOf(ref);
    if (pos >= 0 && dentro(zHtml.com, pos)) continue;
    add('midia-fora-da-pasta', Math.max(0, pos), `${r} está fora da pasta _media. Organize em _media/<pagina>/<secao>/.`, ref);
  }
  return out.sort((a, b) => a.linha - b.linha);
}

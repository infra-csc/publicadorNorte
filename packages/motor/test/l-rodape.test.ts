// L. Rodapé (o do HTML e o rodapé padrão do publicador)
import { describe, expect, it } from 'vitest';
import { gerar, montarRodape, RODAPE_PADRAO, temRodapeHtml, type ConfigRodape } from '../src/index';
import { linha } from './ajuda';

const PAG = '<html><head><title>x</title></head><body><section id="a"><footer class="card-pe">dentro</footer></section><footer class="site">Rodapé do designer</footer></body></html>';
const CONFIG: ConfigRodape = {
  ...RODAPE_PADRAO,
  fonte: 'Space Grotesk',
  corFundo: '#000000',
  corTexto: '#ffffff',
  corLinks: '#ff0000',
  descricao: 'Realização: Norte <Marketing>\nTodos os direitos',
  links: [{ texto: 'Regulamento', url: 'https://norte.com/reg' }, { texto: 'Perigo', url: 'javascript:alert(1)' }],
  redes: [{ rede: 'instagram', url: 'https://instagram.com/norte' }, { rede: 'email', url: 'mailto:oi@norte.com' }],
};

describe('L. Rodapé', () => {
  it('L1: esconder o rodapé do HTML tira o <footer> de fora das seções (o de dentro de uma seção fica)', () => {
    expect(temRodapeHtml(PAG)).toBe(true);
    const r = gerar({ formato: 'tapume_praca', modelos: { tapume: PAG, praca: PAG }, cidades: [linha({ cidade: 'SP' })], secoes: { ocultas: ['praca#@rodape'] } });
    expect(r.paginas[0].html).toContain('Rodapé do designer');
    expect(r.paginas[1].html).not.toContain('Rodapé do designer');
    expect(r.paginas[1].html).toContain('<footer class="card-pe">dentro</footer>');
  });

  it('L2: rodapé padrão com fonte do Google, cores, descrição, links e ícones; texto escapado e link inseguro descartado', () => {
    const h = montarRodape(CONFIG);
    expect(h).toContain("font-family:'Space Grotesk'");
    expect(h).toContain('background:#000000;color:#ffffff');
    expect(h).toContain('Realização: Norte &lt;Marketing&gt;\nTodos os direitos');
    expect(h).toContain('<a href="https://norte.com/reg" target="_blank" rel="noopener">Regulamento</a>');
    expect(h).not.toContain('javascript:');
    expect(h).toContain('aria-label="Instagram"');
    expect(h).toContain('<a href="mailto:oi@norte.com" aria-label="E-mail">');
    // os ícones usam a cor do texto
    expect(h).toContain('.pub-rodape__redes a{color:#ffffff');
  });

  it('L3: entra antes de </body>, com a fonte no <head>; geral em todas as páginas', () => {
    const r = gerar({ formato: 'tapume_praca', modelos: { tapume: PAG, praca: PAG }, cidades: [linha({ cidade: 'SP' })], rodape: { ativo: true, geral: CONFIG } });
    for (const p of r.paginas) {
      expect(p.html).toMatch(/<\/footer><footer class="pub-rodape" data-pub-rodape>[\s\S]*<\/footer><\/body><\/html>$/);
      expect(p.html).toContain('family=Space+Grotesk:wght@400;600;700&amp;display=swap" data-pub-rodape></head>');
    }
  });

  it('L4: por cidade: esconder numa cidade e um rodapé próprio noutra; o tapume usa o geral', () => {
    const sp = linha({ cidade: 'SP' });
    const rj = linha({ cidade: 'RJ' });
    const r = gerar({
      formato: 'tapume_praca',
      modelos: { tapume: PAG, praca: PAG },
      cidades: [sp, rj],
      rodape: { ativo: true, geral: CONFIG, porLinha: { [sp._id]: { ativo: false }, [rj._id]: { config: { ...CONFIG, descricao: 'Só no Rio' } } } },
    });
    expect(r.paginas[0].html).toContain('Realização: Norte');
    expect(r.paginas[1].html).not.toContain('data-pub-rodape');
    expect(r.paginas[2].html).toContain('Só no Rio');
    expect(r.paginas[2].html).not.toContain('Realização');
  });

  it('L5: desligado no evento, mas ligado numa cidade', () => {
    const sp = linha({ cidade: 'SP' });
    const r = gerar({ formato: 'tapume_praca', modelos: { tapume: PAG, praca: PAG }, cidades: [sp], rodape: { ativo: false, geral: CONFIG, porLinha: { [sp._id]: { ativo: true } } } });
    expect(r.paginas[0].html).not.toContain('data-pub-rodape');
    expect(r.paginas[1].html).toContain('data-pub-rodape');
  });

  it('L7: formato em duas colunas: logo e descrição (com negrito) à esquerda; título, links e redes com texto à direita; empilha no celular', () => {
    const h = montarRodape({
      ...CONFIG,
      logo: '_media/rodape/logo.png',
      descricao: 'No **Circuito das Estações**, cada etapa conta.',
      tituloLinks: 'Dúvidas',
      redes: [{ rede: 'instagram', url: 'https://instagram.com/norte', texto: 'Siga no Instagram' }],
    });
    expect(h).toMatch(/<div class="pub-rodape__esq"><img class="pub-rodape__logo" src="_media\/rodape\/logo.png" alt=""><p class="pub-rodape__desc">No <strong>Circuito das Estações<\/strong>, cada etapa conta.<\/p><\/div><div class="pub-rodape__dir"><p class="pub-rodape__titulo">Dúvidas<\/p><nav/);
    expect(h).toContain('<svg');
    expect(h).toContain('<span>Siga no Instagram</span></a>');
    expect(h).toContain('grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)');
    expect(h).toContain('@media (max-width:760px)');
    // só uma coluna quando não há links nem redes
    expect(montarRodape({ ...CONFIG, links: [], redes: [] })).not.toContain('<div class="pub-rodape__dir">');
    // logo com caminho estranho é descartado
    expect(montarRodape({ ...CONFIG, logo: 'javascript:alert(1)' })).not.toContain('<img class="pub-rodape__logo"');
    expect(montarRodape({ ...CONFIG, logo: '../../segredo.png' })).not.toContain('<img class="pub-rodape__logo"');
  });

  it('L6: cor ou fonte inválida volta ao padrão (não quebra o estilo)', () => {
    const h = montarRodape({ ...CONFIG, corFundo: 'red;}body{display:none', fonte: "x'</style>" });
    expect(h).toContain(`background:${RODAPE_PADRAO.corFundo}`);
    expect(h).toContain('font-family:inherit');
    expect(h).not.toContain('display:none');
  });
});

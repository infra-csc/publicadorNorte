// Motor do Publicador de Hotsites: HTML-modelo + cadastro + mídia → páginas + avisos.
// Puro: sem banco, rede, DOM do navegador ou relógio. Data/hora entram como parâmetro.

export { FORMATOS, NOME_PAGINA, BASE_DO_POS, ehPos, tipoBase } from './tipos';
export type { Formato, TipoPagina, TipoPos, TipoItem, Dono, EstadoVar, Vars, Linha, Modelos, Passo, Aviso } from './tipos';
export { slug, slugValor, esc, numBR, fmtBR, abreviar } from './texto';
export { RX_VAR, ehMidia, varsDoTexto } from './variaveis';
export { lerBlocos, RX_MARCA, type No, type NoSe, type ErroBloco } from './blocos';
export {
  acharVars, detectar, inferirDono, inferirDonos, sincronizarVars, colunas, ehContagem, raizAbrev,
  FORMULAS_PADRAO, ORDEM_PADRAO, STATUS_CONHECIDOS, NOMES_BASE,
  type Deteccao, type VarDetectada, type Ocorrencia,
} from './detectar';
export { avaliar, nomesFormula } from './formulas';
export { Cadastro, linhaVazia, novaLinha, COLUNAS_NOME, type DadosCadastro } from './cadastro';
export { TEXTOS_PADRAO, VARS_GALERIA, galeriasDe, soNoPos } from './detectar';
export { estaRealizado, limiteRealizado, type Automacao } from './datas';
export { ehData, ehPeriodo, formatoDeData, formatarData, periodo, lerData, paraISO, deISO, FORMATOS_DATA, type FormatoData } from './datas';
export { converterMarcas, MARCA_INI, MARCA_MEIO, MARCA_FIM } from './edicao';
export { ehRico, limparRico, textoDoRico, ehLinkExterno, ajustarLinks, anotarLinks, varsDeLink } from './rico';
export {
  ajustarTagsMidia, PASTA_PAG, refsDeArquivo, acharArquivo, normRef, opcoesMidia, padraoMidia, valorMidia, pastasMidia,
  versaoTela, caminhoMidia, OCULTA, midiaEscondida, arquivoDaEscolha, tirarMidiaOculta, secaoMidia, slotMidia, arquivoAceito, tipoArquivo, TIPOS_ARQUIVO, CSS_MIDIA, type OpcaoMidia,
} from './midia';
export { gerar, type EntradaGerar, type EscolhaPos, type FotoGaleria, type PaginaGerada, type ResultadoGerar } from './gerar';
export { temCardsFixos } from './cards-fixos';
export type { ResultadoConversao, CardPreenchido } from './conversor';
// converterCardsFixos usa um parser de HTML (linkedom): importe de '@norte/motor/conversor'
export { aplicarSeo, lerSeo, resolverSeo, type Seo, type SeoPagina, type TextosSeo, type ValoresSeo } from './seo';
export { colocarModulos, htmlModulo, limparSvg, pintar as pintarSvg, ehModulo, PREFIXO_MODULO, type ModuloImagem } from './modulos';
export { secoesDe, removerSecoes, reordenarSecoes, ordemFinal, ocultasDaPagina, temRodapeHtml, RODAPE_HTML, type Secao, type EscolhaSecoes } from './secoes';
export {
  montarRodape, colocarRodape, rodapeDaPagina, linkFonte, urlSegura, caminhoSeguro, REDES, RODAPE_PADRAO, FONTES_SUGERIDAS,
  type ConfigRodape, type EscolhaRodape, type RedeSocial,
} from './rodape';
export {
  montarPatrocinios, colocarPatrocinios, patrocinadoresFora, COTAS_PADRAO, TAMANHOS, PASTA_LOGOS, SCRIPT_ALEATORIO,
  type Patrocinador, type Cota, type Tamanho, type BlocoPatrocinio, type ComposicaoPatrocinio, type EstiloPatrocinio, type EntradaPatrocinios, type OrdemBloco,
} from './patrocinios';
export { verificarHtml, SINONIMOS, type Problema, type CodigoProblema } from './verificador';
export { separarSeries, faltasNaSerie, type Serie } from './series';

// Motor do Publicador de Hotsites: HTML-modelo + cadastro + mídia → páginas + avisos.
// Puro: sem banco, rede, DOM do navegador ou relógio. Data/hora entram como parâmetro.

export { FORMATOS, NOME_PAGINA } from './tipos';
export type { Formato, TipoPagina, TipoItem, Dono, EstadoVar, Vars, Linha, Modelos, Passo, Aviso } from './tipos';
export { slug, slugValor, esc, numBR, fmtBR, abreviar } from './texto';
export { RX_VAR, ehMidia, varsDoTexto } from './variaveis';
export { lerBlocos, RX_MARCA, type No, type NoSe, type ErroBloco } from './blocos';
export {
  acharVars, detectar, inferirDono, inferirDonos, sincronizarVars, colunas, ehContagem, raizAbrev,
  FORMULAS_PADRAO, ORDEM_PADRAO, STATUS_CONHECIDOS,
  type Deteccao, type VarDetectada, type Ocorrencia,
} from './detectar';
export { avaliar, nomesFormula } from './formulas';
export { Cadastro, novaLinha, COLUNAS_NOME, type DadosCadastro } from './cadastro';
export { converterMarcas, MARCA_INI, MARCA_MEIO, MARCA_FIM } from './edicao';
export {
  ajustarTagsMidia, refsDeArquivo, acharArquivo, normRef, opcoesMidia, padraoMidia, valorMidia, pastasMidia,
  versaoTela, caminhoMidia, OCULTA, midiaEscondida, arquivoDaEscolha, tirarMidiaOculta, secaoMidia, slotMidia, arquivoAceito, tipoArquivo, TIPOS_ARQUIVO, CSS_MIDIA, type OpcaoMidia,
} from './midia';
export { gerar, type EntradaGerar, type PaginaGerada, type ResultadoGerar } from './gerar';
export { temCardsFixos } from './cards-fixos';
export type { ResultadoConversao, CardPreenchido } from './conversor';
// converterCardsFixos usa um parser de HTML (linkedom): importe de '@norte/motor/conversor'
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

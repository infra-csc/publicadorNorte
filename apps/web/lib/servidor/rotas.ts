// Respostas das rotas de API: erros viram mensagens em português para a interface.
import { Conflito, NaoEncontrado } from './armazenamento';
import { ConfigFaltando } from './config';
import { ErroGitHub } from './github';
import { autorizadoReq } from './sessao';

export const erro = (status: number, mensagem: string) => Response.json({ erro: mensagem }, { status });

/** roda a rota: confere a senha da equipe (a não ser em rotas públicas) e traduz os erros */
export async function responder(req: Request, fn: () => Promise<Response>, opcoes: { publico?: boolean } = {}): Promise<Response> {
  try {
    if (!opcoes.publico && !(await autorizadoReq(req))) return erro(401, 'Entre com a senha da equipe.');
    return await fn();
  } catch (e) {
    if (e instanceof Conflito) return erro(409, e.message);
    if (e instanceof NaoEncontrado) return erro(404, e.message);
    if (e instanceof ConfigFaltando) return erro(500, e.message);
    if (e instanceof ErroGitHub) {
      if (e.limite) {
        const em = e.limite.liberaEm;
        const quando = em ? ` Libera às ${em.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })} (horário de Brasília).` : ' Tente de novo em alguns minutos.';
        return erro(503, 'O GitHub limitou os pedidos do publicador por agora (muitos em pouco tempo).' + quando);
      }
      if (e.status === 401) return erro(502, 'A chave do GitHub não foi aceita. Confira o GITHUB_TOKEN no .env.local.');
      if (e.status === 403) return erro(502, 'A chave do GitHub não tem permissão para isso. Ela precisa de Contents e Pages com leitura e escrita. (' + e.message + ')');
      if (e.status === 404) return erro(502, 'O GitHub não encontrou o repositório. Confira GITHUB_REPO e o acesso da chave.');
      return erro(502, 'O GitHub recusou a operação: ' + e.message);
    }
    console.error(e);
    return erro(500, 'Erro inesperado: ' + (e instanceof Error ? e.message : String(e)));
  }
}

/** slug válido para pasta e URL */
export const slugValido = (s: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= 60;

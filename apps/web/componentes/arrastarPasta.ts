// Arquivos soltos na tela, inclusive pastas inteiras: percorre as pastas e devolve cada arquivo com o caminho
// relativo (igual ao que o "escolher pasta" do navegador dá em webkitRelativePath).

export interface ArquivoSolto { file: File; rel: string }

type Entrada = { isFile: boolean; isDirectory: boolean; name: string; fullPath: string };
type EntradaArquivo = Entrada & { file: (ok: (f: File) => void, erro: (e: unknown) => void) => void };
type EntradaPasta = Entrada & { createReader: () => { readEntries: (ok: (l: Entrada[]) => void, erro: (e: unknown) => void) => void } };

const arquivoDe = (e: EntradaArquivo) => new Promise<File>((ok, erro) => e.file(ok, erro));
async function filhos(p: EntradaPasta): Promise<Entrada[]> {
  const leitor = p.createReader();
  const out: Entrada[] = [];
  // readEntries devolve em lotes (até 100): lê até vir vazio
  for (;;) {
    const lote = await new Promise<Entrada[]>((ok, erro) => leitor.readEntries(ok, erro));
    if (!lote.length) return out;
    out.push(...lote);
  }
}

async function percorrer(e: Entrada, out: ArquivoSolto[]) {
  if (e.isFile) out.push({ file: await arquivoDe(e as EntradaArquivo), rel: e.fullPath.replace(/^\//, '') });
  else if (e.isDirectory) for (const f of await filhos(e as EntradaPasta)) await percorrer(f, out);
}

/** tem arquivos (ou pastas) sendo arrastados? */
export const temArquivos = (e: React.DragEvent) => [...e.dataTransfer.types].includes('Files');

export async function lerSoltos(dt: DataTransfer): Promise<ArquivoSolto[]> {
  const entradas = [...dt.items]
    .filter((i) => i.kind === 'file')
    .map((i) => (i as DataTransferItem & { webkitGetAsEntry?: () => Entrada | null }).webkitGetAsEntry?.() || null);
  // navegador sem suporte a pastas: só os arquivos
  if (!entradas.length || entradas.some((x) => !x)) return [...dt.files].map((file) => ({ file, rel: file.name }));
  const out: ArquivoSolto[] = [];
  for (const e of entradas) await percorrer(e!, out);
  return out;
}

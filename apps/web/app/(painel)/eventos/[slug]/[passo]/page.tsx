import { notFound } from 'next/navigation';
import { PassoAtual } from '@/componentes/passos/PassoAtual';

const VALIDOS = ['evento', 'paginas', 'variaveis', 'cadastro', 'midia', 'patrocinios', 'secoes', 'conferir', 'publicar'];

export default async function Passo({ params }: { params: Promise<{ passo: string }> }) {
  const { passo } = await params;
  if (!VALIDOS.includes(passo)) notFound();
  return <PassoAtual passo={passo} />;
}

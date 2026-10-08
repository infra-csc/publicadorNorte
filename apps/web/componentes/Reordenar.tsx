'use client';
// Arrastar para reordenar: a alça (⠿) é o que se arrasta; o bloco inteiro recebe o solto.
// Usa um tipo próprio no arrasto, para não confundir com arquivos soltos do computador.
import { useState } from 'react';

const TIPO = 'application/x-publicador-ordem';

export function useReordenar(mover: (de: number, para: number) => void) {
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [sobre, setSobre] = useState<number | null>(null);
  const fim = () => { setArrastando(null); setSobre(null); };

  /** propriedades da alça */
  const alca = (i: number) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent<HTMLElement>) => {
      e.dataTransfer.setData(TIPO, String(i));
      e.dataTransfer.effectAllowed = 'move';
      const bloco = e.currentTarget.closest('[data-reordenar]') as HTMLElement | null;
      if (bloco) e.dataTransfer.setDragImage(bloco, 20, 20);
      setArrastando(i);
    },
    onDragEnd: fim,
  });

  /** propriedades do bloco que recebe o solto */
  const alvo = (i: number) => ({
    'data-reordenar': '',
    'data-arrastando': arrastando === i ? '' : undefined,
    'data-sobre': sobre === i && arrastando !== null && arrastando !== i ? (arrastando < i ? 'depois' : 'antes') : undefined,
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(TIPO)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (sobre !== i) setSobre(i);
    },
    onDrop: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(TIPO)) return;
      e.preventDefault();
      e.stopPropagation();
      const de = Number(e.dataTransfer.getData(TIPO));
      fim();
      if (!Number.isNaN(de) && de !== i) mover(de, i);
    },
  });

  return { alca, alvo };
}

/** move um item da posição `de` para `para` (cópia nova) */
export function mover<T>(lista: T[], de: number, para: number): T[] {
  const l = [...lista];
  const [x] = l.splice(de, 1);
  l.splice(para, 0, x);
  return l;
}

/** alça de arrastar + setas para quem usa teclado */
export function Alca({ i, total, alca, mover: moverPara, rotulo }: { i: number; total: number; alca: ReturnType<typeof useReordenar>['alca']; mover: (de: number, para: number) => void; rotulo: string }) {
  return (
    <span className="alca-w">
      <span className="alca" title="Arraste para mudar a ordem" aria-hidden="true" {...alca(i)}>⠿</span>
      <button type="button" className="iconbtn alca-seta" aria-label={`Subir ${rotulo}`} disabled={i === 0} onClick={() => moverPara(i, i - 1)}>↑</button>
      <button type="button" className="iconbtn alca-seta" aria-label={`Descer ${rotulo}`} disabled={i === total - 1} onClick={() => moverPara(i, i + 1)}>↓</button>
    </span>
  );
}

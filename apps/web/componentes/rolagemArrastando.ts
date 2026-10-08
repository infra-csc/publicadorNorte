'use client';
// Enquanto algo é arrastado (seção, bloco de mídia ou arquivo do computador), a tela rola sozinha
// perto do topo e do fim, mais rápido quanto mais perto da borda. O navegador não faz isso direito sozinho.
import { useEffect } from 'react';

const ZONA = 110; // altura da faixa sensível, em px
const TOPO_FIXO = 64; // o cabeçalho fixo cobre o topo da tela
const MAX = 22; // px por quadro

export function useRolagemArrastando() {
  useEffect(() => {
    let vel = 0;
    let relogio: ReturnType<typeof setInterval> | undefined;
    const rolar = () => {
      if (!vel) { clearInterval(relogio); relogio = undefined; return; }
      window.scrollBy(0, vel);
    };
    const sobre = (e: DragEvent) => {
      const y = e.clientY;
      const cima = TOPO_FIXO + ZONA;
      const baixo = window.innerHeight - ZONA;
      vel = y < cima ? -Math.ceil(((cima - y) / ZONA) * MAX) : y > baixo ? Math.ceil(((y - baixo) / ZONA) * MAX) : 0;
      if (vel && !relogio) relogio = setInterval(rolar, 16);
    };
    const parar = () => { vel = 0; };
    const saiu = (e: DragEvent) => { if (!e.relatedTarget) parar(); };
    document.addEventListener('dragover', sobre);
    document.addEventListener('drop', parar);
    document.addEventListener('dragend', parar);
    document.addEventListener('dragleave', saiu);
    return () => {
      parar();
      clearInterval(relogio);
      document.removeEventListener('dragover', sobre);
      document.removeEventListener('drop', parar);
      document.removeEventListener('dragend', parar);
      document.removeEventListener('dragleave', saiu);
    };
  }, []);
}

'use client';
import { PassoCadastro } from './PassoCadastro';
import { PassoConferir } from './PassoConferir';
import { PassoEvento } from './PassoEvento';
import { PassoMidia } from './PassoMidia';
import { PassoPaginas } from './PassoPaginas';
import { PassoPatrocinios } from './PassoPatrocinios';
import { PassoPublicar } from './PassoPublicar';
import { PassoSecoes } from './PassoSecoes';
import { PassoVariaveis } from './PassoVariaveis';

export function PassoAtual({ passo }: { passo: string }) {
  switch (passo) {
    case 'evento': return <PassoEvento />;
    case 'paginas': return <PassoPaginas />;
    case 'variaveis': return <PassoVariaveis />;
    case 'cadastro': return <PassoCadastro />;
    case 'midia': return <PassoMidia />;
    case 'patrocinios': return <PassoPatrocinios />;
    case 'secoes': return <PassoSecoes />;
    case 'conferir': return <PassoConferir />;
    default: return <PassoPublicar />;
  }
}

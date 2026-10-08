import { BancoPatrocinadores } from '@/componentes/BancoPatrocinadores';
import { Topo } from '@/componentes/Topo';

export default function Patrocinios() {
  return (
    <>
      <Topo aba="patrocinios" />
      <div className="shell home">
        <main className="main">
          <BancoPatrocinadores />
        </main>
      </div>
    </>
  );
}

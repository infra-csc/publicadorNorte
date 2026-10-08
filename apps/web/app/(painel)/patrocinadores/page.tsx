import { BancoPatrocinadores } from '@/componentes/BancoPatrocinadores';
import { Topo } from '@/componentes/Topo';

export default function Patrocinadores() {
  return (
    <>
      <Topo crumb="Patrocinadores" />
      <div className="shell home">
        <main className="main">
          <BancoPatrocinadores />
        </main>
      </div>
    </>
  );
}

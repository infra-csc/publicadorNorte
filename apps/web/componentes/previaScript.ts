// Script que roda dentro do iframe da prévia (origem isolada; conversa com o publicador por postMessage).
// - atualizar: recebe a página nova e troca só o que mudou entre a versão anterior e a nova (texto e atributos),
//   sem recarregar; o que o JavaScript da própria página mudou fica como está. Se a estrutura mudou, pede recarga.
// - editar: com o modo de edição ligado, os <pub-v> (textos que vêm de variáveis) ficam editáveis.
/* eslint-disable */
function scriptPrevia() {
  var base: Document | null = null;
  var editando = false;
  var timerRolagem: ReturnType<typeof setTimeout> | undefined;
  var envia = function (m: unknown) { parent.postMessage(m, '*'); };
  var filhos = function (n: Node) { return Array.prototype.filter.call(n.childNodes, function (c: Node) { return c.nodeType === 1 || c.nodeType === 3; }) as Node[]; };
  var mesmo = function (a: Node, b: Node) {
    return a.nodeName === b.nodeName && (a.nodeType !== 1 || ((a as Element).getAttribute('id') || '') === ((b as Element).getAttribute('id') || ''));
  };
  // casa cada filho da versão anterior com o filho vivo correspondente (pula o que o JS da página inseriu)
  var casar = function (vivos: Node[], velhos: Node[]) {
    var r: Node[] = [];
    var j = 0;
    for (var i = 0; i < velhos.length; i++) {
      while (j < vivos.length && !mesmo(vivos[j], velhos[i])) j++;
      if (j >= vivos.length) return null;
      r.push(vivos[j++]);
    }
    return r;
  };
  var focado = function (n: Node) { var a = document.activeElement; return !!a && a !== document.body && a.contains(n); };
  var morph = function (vivo: Node, velho: Node, novo: Node): boolean {
    if (vivo.nodeType === 1 && (vivo as Element).tagName === 'PUB-V' && focado(vivo)) return true;
    if (novo.nodeType === 3) {
      if (velho.nodeValue === novo.nodeValue || focado(vivo)) return true;
      // o JS da página reescreveu este texto (ex.: formatou uma data): recarrega para ele refazer
      if (vivo.nodeValue !== velho.nodeValue) return false;
      vivo.nodeValue = novo.nodeValue;
      return true;
    }
    // nada mudou neste pedaço: deixa como está (inclusive o que o JS da página reescreveu nele)
    if (velho.isEqualNode(novo)) return true;
    if (novo.nodeName === 'SCRIPT') return false;
    var ve = velho as Element, ne = novo as Element, vi = vivo as Element;
    var mexido = false;
    Array.prototype.forEach.call(ne.attributes, function (a: Attr) {
      if (ve.getAttribute(a.name) === a.value) return;
      if (vi.getAttribute(a.name) !== ve.getAttribute(a.name)) mexido = true;
      vi.setAttribute(a.name, a.value);
    });
    if (mexido) return false;
    Array.prototype.forEach.call(ve.attributes, function (a: Attr) { if (!ne.hasAttribute(a.name)) vi.removeAttribute(a.name); });
    var vo = filhos(velho), no = filhos(novo);
    if (vo.length !== no.length) return false;
    for (var i = 0; i < vo.length; i++) if (!mesmo(vo[i], no[i])) return false;
    var vv = casar(filhos(vivo), vo);
    if (!vv) return false;
    for (var k = 0; k < vo.length; k++) if (!morph(vv[k], vo[k], no[k])) return false;
    return true;
  };
  var cabeca = function (d: Document) {
    var h = d.head.cloneNode(true) as HTMLElement;
    h.querySelectorAll('title').forEach(function (t) { t.remove(); });
    return h.innerHTML;
  };
  var editar = function (sim: boolean) {
    editando = !!sim;
    document.documentElement.toggleAttribute('data-pub-editando', editando);
    if (!document.getElementById('pub-edicao-estilo')) {
      var st = document.createElement('style');
      st.id = 'pub-edicao-estilo';
      st.textContent =
        'html[data-pub-editando] pub-v{outline:1.5px dashed rgba(110,90,255,.8);outline-offset:2px;border-radius:2px;cursor:text}' +
        'html[data-pub-editando] pub-v:hover,html[data-pub-editando] pub-v:focus{background:rgba(110,90,255,.18);outline-style:solid}' +
        "html[data-pub-editando] pub-v:empty::before{content:'@' attr(data-v);opacity:.55;font-style:italic}";
      document.head.appendChild(st);
    }
    document.querySelectorAll('pub-v').forEach(function (el) {
      if (editando) { el.setAttribute('contenteditable', 'plaintext-only'); (el as HTMLElement).spellcheck = false; }
      else el.removeAttribute('contenteditable');
    });
  };

  // volta o cursor para o fim do campo (depois de recarregar no meio da digitação)
  var focar = function (v: string, l: string) {
    var alvo = Array.prototype.find.call(document.querySelectorAll('pub-v'), function (o: HTMLElement) { return o.dataset.v === v && (o.dataset.l || '') === l; }) as HTMLElement | undefined;
    if (!alvo) return;
    alvo.focus();
    var r = document.createRange();
    r.selectNodeContents(alvo);
    r.collapse(false);
    var s = getSelection();
    if (s) { s.removeAllRanges(); s.addRange(r); }
  };

  addEventListener('message', function (e: MessageEvent) {
    var d = e.data || {};
    if (d.tipo === 'pub-base') {
      base = new DOMParser().parseFromString(d.html, 'text/html');
      if (d.y) scrollTo(0, d.y);
      editar(d.editar);
      if (d.foco) focar(d.foco.v, d.foco.l || '');
    } else if (d.tipo === 'pub-atualizar') {
      var novo = new DOMParser().parseFromString(d.html, 'text/html');
      var ok = false;
      try { ok = !!base && cabeca(base) === cabeca(novo) && morph(document.body, base.body, novo.body); } catch (x) { ok = false; }
      if (ok) {
        if (base!.title !== novo.title) document.title = novo.title;
        base = novo;
        editar(editando);
      }
      envia({ tipo: 'pub-resultado', ok: ok, y: scrollY });
    } else if (d.tipo === 'pub-modo') editar(d.editar);
  });
  addEventListener('scroll', function () {
    clearTimeout(timerRolagem);
    timerRolagem = setTimeout(function () { envia({ tipo: 'pub-rolagem', y: scrollY }); }, 150);
  }, { passive: true });

  // edição: clique no texto não aciona link/botão/acordeão; Enter termina; cada letra vai para o cadastro
  document.addEventListener('click', function (e) {
    if (!editando) return;
    var t = e.target as Element;
    if (t && t.closest && t.closest('pub-v')) { e.preventDefault(); e.stopPropagation(); }
    else if (t && t.closest) { var a = t.closest('a[href]'); if (a && !/^#/.test(a.getAttribute('href') || '')) e.preventDefault(); }
  }, true);
  document.addEventListener('focusin', function (e) {
    var t = e.target as HTMLElement;
    if (!editando || !t || t.tagName !== 'PUB-V' || t.dataset.ph !== '1') return;
    var r = document.createRange();
    r.selectNodeContents(t);
    var s = getSelection();
    if (s) { s.removeAllRanges(); s.addRange(r); }
  });
  document.addEventListener('keydown', function (e) {
    var el = e.target as HTMLElement;
    if (editando && e.key === 'Enter' && el && el.closest && el.closest('pub-v')) { e.preventDefault(); el.blur(); }
  }, true);
  document.addEventListener('input', function (e) {
    var t = e.target as Element;
    var el = t && t.closest ? (t.closest('pub-v') as HTMLElement | null) : null;
    if (!el) return;
    var alvo: HTMLElement = el;
    if (alvo.dataset.ph === '1') delete alvo.dataset.ph;
    var valor = alvo.textContent || '';
    // o mesmo campo em outros lugares da página muda junto
    document.querySelectorAll('pub-v').forEach(function (o) {
      var oe = o as HTMLElement;
      if (oe !== alvo && oe.dataset.v === alvo.dataset.v && oe.dataset.l === alvo.dataset.l) oe.textContent = valor;
    });
    envia({ tipo: 'pub-editar', v: alvo.dataset.v, l: alvo.dataset.l, valor: valor });
  }, true);
  document.addEventListener('DOMContentLoaded', function () { envia({ tipo: 'pub-pronto' }); });
}

export const SCRIPT_PREVIA = '(' + scriptPrevia.toString() + ')();';

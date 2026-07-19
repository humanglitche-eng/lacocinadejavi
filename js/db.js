/* ============================================================
   LA COCINA DE JAVI — Capa de datos (Firebase / modo demo)
   Si CONFIG.firebase tiene credenciales reales usa Firestore;
   si no, funciona en MODO DEMO con localStorage para que el
   sitio sea navegable desde el día uno.
   ============================================================ */

window.DB = (function () {
  const cfg = window.CONFIG.firebase;
  const activo = !!(cfg && cfg.apiKey && !/^TU_/.test(cfg.apiKey));
  let _init = null;

  function _script(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  async function _firebase() {
    if (!_init) {
      _init = (async () => {
        const base = 'https://www.gstatic.com/firebasejs/10.12.2';
        await _script(`${base}/firebase-app-compat.js`);
        await Promise.all([
          _script(`${base}/firebase-auth-compat.js`),
          _script(`${base}/firebase-firestore-compat.js`),
        ]);
        firebase.initializeApp(cfg);
        return { db: firebase.firestore(), auth: firebase.auth() };
      })();
    }
    return _init;
  }

  /* ---------- helpers modo demo ---------- */
  const _ls = (k, v) => {
    if (v === undefined) {
      try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; }
    }
    localStorage.setItem(k, JSON.stringify(v));
  };
  const _id = () => 'demo-' + Math.random().toString(36).slice(2, 9);

  /* ---------- API pública ---------- */

  async function guardarPedido(pedido) {
    pedido.estado = 'nuevo';
    pedido.ts = Date.now();
    if (!activo) {
      const arr = _ls('lcj_pedidos');
      const id = _id();
      arr.push({ id, ...pedido });
      _ls('lcj_pedidos', arr);
      return { demo: true, id };
    }
    const { db } = await _firebase();
    const ref = await db.collection('pedidos').add(pedido);
    return { demo: false, id: ref.id };
  }

  function _resumirVotos(v, votos) {
    v.anotados = votos.reduce((a, x) => a + (x.porciones || 1), 0);
    v.porOpcion = {};
    (v.opciones || []).forEach(o => { v.porOpcion[o] = 0; });
    votos.forEach(x => {
      if (x.opcion in v.porOpcion) v.porOpcion[x.opcion] += (x.porciones || 1);
    });
    return v;
  }

  async function obtenerVotacion() {
    if (!activo) {
      const v = { ...window.CONFIG.votacionDemo, demo: true };
      return _resumirVotos(v, _ls('lcj_votos').filter(x => x.fecha === v.fecha));
    }
    const { db } = await _firebase();
    const doc = await db.collection('config').doc('votacion').get();
    const v = doc.exists ? doc.data() : { activa: false };
    if (v.activa) {
      const q = await db.collection('votos').where('fecha', '==', v.fecha).get();
      _resumirVotos(v, q.docs.map(d => d.data()));
    }
    return v;
  }

  async function guardarVoto(voto) {
    voto.ts = Date.now();
    const { telefono, ...publico } = voto;
    if (!activo) {
      const arr = _ls('lcj_votos');
      arr.push({ id: _id(), ...voto });
      _ls('lcj_votos', arr);
      return { demo: true };
    }
    const { db } = await _firebase();
    const ref = await db.collection('votos').add(publico);
    if (telefono) {
      await db.collection('votos_contacto').add({ voto: ref.id, telefono, ts: voto.ts });
    }
    return { demo: false };
  }

  return { activo, firebase: _firebase, guardarPedido, obtenerVotacion, guardarVoto, _ls };
})();

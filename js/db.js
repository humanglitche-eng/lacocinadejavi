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
    // pre-lanzamiento: cada voto = 1 persona hacia la meta
    v.anotados = votos.length;
    v.porOpcion = {};
    (v.opciones || []).forEach(o => { v.porOpcion[o] = 0; });
    votos.forEach(x => { if (x.opcion in v.porOpcion) v.porOpcion[x.opcion] += 1; });
    return v;
  }

  // La campaña (meta, fecha, opciones) vive en CONFIG.votacion (versionado).
  // Firestore sólo guarda los votos; acá los contamos por la fecha de campaña.
  async function obtenerVotacion() {
    const cv = window.CONFIG.votacion;
    const v = {
      activa: true,
      meta: cv.meta, cupo: cv.meta,
      fecha: cv.fecha,
      opciones: (cv.variedades || []).map(x => x.nombre),
    };
    if (!activo) {
      v.demo = true;
      return _resumirVotos(v, _ls('lcj_votos').filter(x => x.fecha === v.fecha));
    }
    const { db } = await _firebase();
    const q = await db.collection('votos').where('fecha', '==', v.fecha).get();
    return _resumirVotos(v, q.docs.map(d => d.data()));
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

  // ¿este usuario ya votó en esta campaña? (uno por persona)
  async function yaVoto(fecha, uid) {
    if (!activo) return _ls('lcj_votos').some(v => v.fecha === fecha && v.uid === uid);
    const { db } = await _firebase();
    const snap = await db.collection('votos').doc(`${fecha}__${uid}`).get();
    return snap.exists ? snap.data() : null;
  }

  // voto de un usuario logueado (docId = fecha__uid → uno por persona)
  async function guardarVotoUsuario(voto) {
    voto.ts = Date.now();
    const id = `${voto.fecha}__${voto.uid}`;
    if (!activo) {
      const arr = _ls('lcj_votos').filter(v => !(v.fecha === voto.fecha && v.uid === voto.uid));
      arr.push({ id, ...voto });
      _ls('lcj_votos', arr);
      return { demo: true };
    }
    const { db } = await _firebase();
    await db.collection('votos').doc(id).set(voto);
    return { demo: false };
  }

  async function guardarSugerencia(sug) {
    sug.ts = Date.now();
    if (!activo) {
      const arr = _ls('lcj_sugerencias'); arr.push({ id: _id(), ...sug });
      _ls('lcj_sugerencias', arr);
      return { demo: true };
    }
    const { db } = await _firebase();
    await db.collection('sugerencias').add(sug);
    return { demo: false };
  }

  /* ---------- platos por ronda (fase 2, admin) ---------- */
  async function listarPlatos() {
    if (!activo) return _ls('lcj_platos');
    const { db } = await _firebase();
    const q = await db.collection('platos').get();
    return q.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function guardarPlato(p) {
    p.ts = p.ts || Date.now();
    if (!activo) {
      const arr = _ls('lcj_platos');
      if (p.id) { const i = arr.findIndex(x => x.id === p.id); if (i >= 0) arr[i] = p; else arr.push(p); }
      else { p.id = _id(); arr.push(p); }
      _ls('lcj_platos', arr);
      return p;
    }
    const { db } = await _firebase();
    if (p.id) { const { id, ...data } = p; await db.collection('platos').doc(id).set(data, { merge: true }); return p; }
    const ref = await db.collection('platos').add(p); p.id = ref.id; return p;
  }

  async function borrarPlato(id) {
    if (!activo) { _ls('lcj_platos', _ls('lcj_platos').filter(x => x.id !== id)); return; }
    const { db } = await _firebase();
    await db.collection('platos').doc(id).delete();
  }

  return {
    activo, firebase: _firebase, guardarPedido, obtenerVotacion, guardarVoto,
    guardarVotoUsuario, yaVoto, guardarSugerencia,
    listarPlatos, guardarPlato, borrarPlato, _ls,
  };
})();

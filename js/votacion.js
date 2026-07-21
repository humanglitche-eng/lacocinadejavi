/* ============================================================
   LA COCINA DE JAVI — Página de votación
   Dos modos:
   · pre-lanzamiento: juntar 40 registrados que votan (interés).
   · preventa: ronda activa con 3 platos; reservás porciones del
     que quieras y te comprometés a comprar el ganador.
   ============================================================ */

(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const CFG = window.CONFIG;
  const DIAS_LARGO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  let modo = 'prelanzamiento';
  let preventaCfg = null;
  let opcionElegida = null;
  let campana = null;
  let modoRegistro = false;
  // preventa
  let platosRonda = [], tally = { porPlato: {}, personas: 0, porciones: 0 }, miRes = null;

  const EMOJI = {};
  (CFG.votacion.variedades || []).forEach(v => { EMOJI[v.nombre] = v.emoji; });
  const emojiDe = n => EMOJI[n] || '🍽️';

  let toastTimer;
  function toast(m) {
    const t = $('#toast'); t.textContent = m; t.classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('visible'), 2800);
  }

  /* ==================== PRE-LANZAMIENTO ==================== */
  async function cargarPrelanzamiento() {
    const v = await window.DB.obtenerVotacion();
    campana = v;
    const meta = v.cupo || CFG.votacion.meta;
    const anotados = v.anotados || 0;
    const dias = window.UTIL.diasHasta(v.fecha);
    const pct = Math.min(100, Math.round((anotados / meta) * 100));
    const lleno = anotados >= meta;

    $('#metaVotos').textContent = anotados;
    $('#metaObjetivo').textContent = meta;
    $('#metaDias').textContent = dias;
    $('#cupoRelleno').style.width = pct + '%';
    $('#metaCaja').classList.toggle('meta-lleno', lleno);
    $('#metaTexto').innerHTML = lleno
      ? '🎉 <b>¡Meta alcanzada!</b> Arrancamos con la preventa. Te avisamos por WhatsApp.'
      : `Faltan <b>${meta - anotados}</b> votos y quedan <b>${dias} días</b> (hasta el ${window.UTIL.fechaLarga(v.fecha)}). ¡Sumá al barrio!`;

    const maxV = Math.max(1, ...Object.values(v.porOpcion || {}));
    $('#opcionesVoto').innerHTML = (v.opciones || []).map(o => {
      const n = (v.porOpcion && v.porOpcion[o]) || 0;
      const lider = n > 0 && n === maxV;
      return `<button type="button" class="opcion-voto ${opcionElegida === o ? 'elegida' : ''} ${lider ? 'lider' : ''}" data-opcion="${o}">
        <span class="opcion-nombre">${emojiDe(o)} ${o}${lider ? ' 👑' : ''}</span>
        <span class="opcion-barra"><span style="width:${Math.round(n / maxV * 100)}%"></span></span>
        <span class="opcion-votos">${n}</span>
      </button>`;
    }).join('');
    $$('.opcion-voto').forEach(b => b.addEventListener('click', () => elegir(b.dataset.opcion)));
    $('#formVoto').dataset.fecha = v.fecha;
  }

  function elegir(o) {
    opcionElegida = o;
    $$('.opcion-voto').forEach(x => x.classList.toggle('elegida', x.dataset.opcion === o));
    const btn = $('#btnVotar');
    if (window.AUTH.user()) { btn.disabled = false; btn.textContent = `Votar ${o}`; }
  }

  $('#formVoto').addEventListener('submit', async e => {
    e.preventDefault();
    const u = window.AUTH.user();
    if (!u) { toast('Entrá con tu cuenta para votar 🙂'); return; }
    if (!opcionElegida) { toast('Elegí un plato primero 🍲'); return; }
    const btn = $('#btnVotar'); btn.disabled = true; btn.textContent = 'Enviando…';
    const tel = $('[name=vtelefono]', e.target).value.trim();
    try {
      await window.DB.guardarVotoUsuario({
        fecha: e.target.dataset.fecha, uid: u.uid,
        nombre: u.displayName || (u.email || '').split('@')[0] || 'vecino',
        opcion: opcionElegida, porciones: 1,
      });
      if (tel) { try { await window.AUTH.guardarPerfil({ telefono: tel }); } catch {} }
      toast(`¡Voto para ${opcionElegida}! 🙌 Gracias por sumarte`);
      opcionElegida = null;
      await cargarPrelanzamiento();
      actualizarVotoUI(u);
    } catch (err) {
      toast('No se pudo votar 😕 Probá de nuevo'); console.error(err);
      btn.disabled = false; btn.textContent = 'Votar';
    }
  });

  async function actualizarVotoUI(u) {
    if (!u) { $('#formVoto').hidden = true; $('#yaVotaste').hidden = true; return; }
    $('#formVoto').hidden = false;
    try { const p = await window.AUTH.perfil(); if (p && p.telefono) $('[name=vtelefono]', $('#formVoto')).value = p.telefono; } catch {}
    const ya = await window.DB.yaVoto(campana.fecha, u.uid);
    const yaEl = $('#yaVotaste');
    if (ya) {
      $('#formVoto').hidden = true; yaEl.hidden = false;
      yaEl.innerHTML = `✅ Ya votaste por <b>${emojiDe(ya.opcion)} ${ya.opcion}</b>. ¡Gracias por sumarte!`;
    } else yaEl.hidden = true;
  }

  /* ==================== PREVENTA ==================== */
  async function cargarPreventa() {
    const fecha = preventaCfg.fecha;
    const dia = new Date(fecha + 'T12:00:00').getDay();
    const todos = await window.DB.listarPlatos();
    platosRonda = todos.filter(p => p.dia === dia && !p.usado)
      .sort((a, b) => (a.orden || 0) - (b.orden || 0)).slice(0, 3);
    tally = await window.DB.contarReservas(fecha);
    const u = window.AUTH.user();
    miRes = u ? await window.DB.miReserva(fecha, u.uid) : null;
    $('#preventaDia').textContent = new Date(fecha + 'T12:00:00')
      .toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    renderPreventa();
  }

  function renderPreventa() {
    const u = window.AUTH.user();
    const maxP = Math.max(1, ...Object.values(tally.porPlato || {}));
    if (!platosRonda.length) {
      $('#platosRonda').innerHTML = '<p style="opacity:.7;text-align:center">Todavía no hay platos cargados para esta ronda.</p>';
    } else {
      $('#platosRonda').innerHTML = platosRonda.map(p => {
        const n = tally.porPlato[p.id] || 0;
        const lider = n > 0 && n === maxP;
        const mio = miRes && miRes.platoId === p.id;
        return `<div class="prc ${lider ? 'lider' : ''} ${mio ? 'mio' : ''}">
          <div class="prc-foto">${p.foto ? `<img src="${p.foto}" alt="${p.nombre}">` : '🍽️'}</div>
          <div class="prc-body">
            <b>${lider ? '👑 ' : ''}${p.nombre}</b>
            <p>${p.explicacion || ''}</p>
            <div class="prc-tally"><span class="prc-barra"><span style="width:${Math.round(n / maxP * 100)}%"></span></span><span class="prc-num">${n} porc.</span></div>
            ${u ? `<div class="prc-reserva">
              <div class="cantidad-mini">
                <button type="button" data-menos="${p.id}">−</button>
                <span id="cant-${p.id}">${mio ? miRes.porciones : 1}</span>
                <button type="button" data-mas="${p.id}">+</button>
              </div>
              <button class="btn ${mio ? 'btn-borde' : 'btn-amarillo'}" data-reservar="${p.id}">${mio ? 'Actualizar' : 'Reservar esta'}</button>
            </div>` : ''}
          </div>
        </div>`;
      }).join('');
    }
    // resumen
    if (tally.personas) {
      $('#preventaResumen').innerHTML = `🍽️ <b>${tally.personas}</b> ${tally.personas === 1 ? 'persona reservó' : 'personas reservaron'} · <b>${tally.porciones}</b> porciones en total`;
    } else {
      $('#preventaResumen').textContent = 'Sé el primero en reservar tu porción.';
    }
    // mi reserva
    const av = $('#preventaAviso');
    if (miRes) {
      const pl = platosRonda.find(p => p.id === miRes.platoId);
      av.hidden = false;
      av.innerHTML = `✅ Reservaste <b>${miRes.porciones}</b> ${miRes.porciones === 1 ? 'porción' : 'porciones'}${pl ? ` de <b>${pl.nombre}</b>` : ''}. Si gana, te lo confirmamos por WhatsApp.`;
    } else av.hidden = true;
    // login prompt si no está logueado
    if (!u) {
      $('#preventaResumen').innerHTML += '<br><span style="opacity:.7">Entrá con tu cuenta (arriba) para reservar.</span>';
    }
    cablearReserva();
  }

  function cablearReserva() {
    $$('[data-mas]').forEach(b => b.addEventListener('click', () => {
      const el = $('#cant-' + b.dataset.mas); el.textContent = Math.min(20, +el.textContent + 1);
    }));
    $$('[data-menos]').forEach(b => b.addEventListener('click', () => {
      const el = $('#cant-' + b.dataset.menos); el.textContent = Math.max(1, +el.textContent - 1);
    }));
    $$('[data-reservar]').forEach(b => b.addEventListener('click', () => reservar(b.dataset.reservar)));
  }

  async function reservar(platoId) {
    const u = window.AUTH.user();
    if (!u) { toast('Entrá con tu cuenta para reservar 🙂'); return; }
    const porciones = +$('#cant-' + platoId).textContent || 1;
    try {
      await window.DB.guardarReserva({
        fecha: preventaCfg.fecha, uid: u.uid, platoId, porciones,
      });
      // guardar whatsapp del perfil si no lo tiene
      const pl = platosRonda.find(p => p.id === platoId);
      toast(`¡Reservaste ${porciones} de ${pl ? pl.nombre : 'tu plato'}! 🙌`);
      await cargarPreventa();
    } catch (err) { toast('No se pudo reservar 😕 Probá de nuevo'); console.error(err); }
  }

  /* ==================== AUTENTICACIÓN ==================== */
  async function renderAuth(u) {
    const area = $('#authArea');
    if (!window.AUTH.activo) {
      area.innerHTML = '<div class="aviso-demo" style="display:block">🔧 MODO DEMO — el login se activa con Firebase.</div>';
    } else if (u) {
      const nombre = u.displayName || (u.email || '').split('@')[0] || 'vecino';
      area.innerHTML = `<div class="user-chip">
        ${u.photoURL ? `<img src="${u.photoURL}" alt="">` : '<span class="user-ini">👤</span>'}
        <span>Hola, <b>${nombre}</b></span>
        <button class="user-salir" id="btnLogout">salir</button>
      </div>`;
      $('#btnLogout').addEventListener('click', () => window.AUTH.logout());
    } else {
      area.innerHTML = tarjetaLogin();
      cablearLogin();
    }
    // refrescar la UI del modo activo según el login
    if (modo === 'preventa') { await cargarPreventa(); }
    else { await actualizarVotoUI(u); }
  }

  function tarjetaLogin() {
    return `<div class="login-card">
      <button class="btn btn-google" id="btnGoogle" type="button">
        <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.3 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.9 6.1C12.2 13.2 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.2-9.6 6.2-17z"/><path fill="#FBBC05" d="M10.4 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.7l-7.1-5.5c-2 1.3-4.5 2.1-8.4 2.1-6.4 0-11.8-3.7-13.6-8.9l-7.9 6.1C6.4 42.6 14.6 48 24 48z"/></svg>
        Entrar con Google
      </button>
      <div class="o-sep"><span>o con tu email</span></div>
      <form id="formEmail" class="login-email">
        <div class="campo campo-nombre" hidden><label>Tu nombre</label><input name="enombre" placeholder="Ej: Caro"></div>
        <div class="campo"><label>Email</label><input name="eemail" type="email" required placeholder="vos@mail.com"></div>
        <div class="campo"><label>Contraseña</label><input name="epass" type="password" required minlength="6" placeholder="mínimo 6 caracteres"></div>
        <button class="btn btn-amarillo" type="submit" id="btnEmail">Entrar</button>
      </form>
      <p class="login-toggle">¿No tenés cuenta? <a href="#" id="toggleRegistro">Registrate</a></p>
      <p id="loginError" class="login-error" hidden></p>
    </div>`;
  }

  function cablearLogin() {
    $('#btnGoogle').addEventListener('click', async () => {
      try { await window.AUTH.loginGoogle(); } catch (e) { mostrarError(traducirError(e)); }
    });
    $('#toggleRegistro').addEventListener('click', e => {
      e.preventDefault();
      modoRegistro = !modoRegistro;
      $('.campo-nombre').hidden = !modoRegistro;
      $('#btnEmail').textContent = modoRegistro ? 'Crear cuenta' : 'Entrar';
      $('.login-toggle').innerHTML = modoRegistro
        ? '¿Ya tenés cuenta? <a href="#" id="toggleRegistro">Entrá</a>'
        : '¿No tenés cuenta? <a href="#" id="toggleRegistro">Registrate</a>';
      cablearLogin();
    });
    $('#formEmail').addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.target;
      const email = f.eemail.value.trim(), pass = f.epass.value, nombre = f.enombre.value.trim();
      $('#btnEmail').disabled = true;
      try {
        if (modoRegistro) await window.AUTH.registrarEmail(email, pass, nombre);
        else await window.AUTH.loginEmail(email, pass);
      } catch (err) { mostrarError(traducirError(err)); $('#btnEmail').disabled = false; }
    });
  }

  function mostrarError(msg) { const el = $('#loginError'); if (el) { el.hidden = false; el.textContent = msg; } }
  function traducirError(e) {
    const c = (e && e.code) || '';
    if (c.includes('wrong-password') || c.includes('invalid-credential')) return 'Email o contraseña incorrectos.';
    if (c.includes('email-already-in-use')) return 'Ese email ya tiene cuenta. Probá entrar.';
    if (c.includes('weak-password')) return 'La contraseña necesita al menos 6 caracteres.';
    if (c.includes('popup-closed') || c.includes('cancelled-popup')) return 'Se cerró la ventana de Google. Probá de nuevo.';
    if (c.includes('invalid-email')) return 'Revisá el email.';
    return 'No se pudo. Probá de nuevo.';
  }

  /* ==================== SUGERIR (WhatsApp) ==================== */
  $('#formSugerencia').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    const nombre = f.snombre.value.trim(), plato = f.splato.value.trim();
    const msg = `¡Hola Javi! 👋 Sugiero un plato para la votación: *${plato}* (soy ${nombre}).`;
    window.open(`https://wa.me/${CFG.negocio.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
    f.reset();
    $('#sugerenciaOk').hidden = false;
    toast('¡Gracias! Se abre WhatsApp para enviarla 📝');
  });

  /* ==================== COMPARTIR ==================== */
  const url = location.href.split('#')[0];
  const textoCompartir = '🥟 En La cocina de Javi estamos votando qué comida casera sumar (guisos, pastas, milanesas y más). ¡Sumate y votá antes del 1/10!';
  $('#compartirWa').href = window.UTIL.compartirWhatsApp(`${textoCompartir}\n${url}`);
  $('#compartirCopiar').addEventListener('click', async () => {
    const ok = await window.UTIL.copiar(url);
    toast(ok ? '¡Link copiado! Pegalo donde quieras 📋' : url);
  });

  /* ==================== INIT ==================== */
  (async () => {
    if (!window.AUTH.activo) $$('.aviso-demo').forEach(el => el.style.display = '');
    preventaCfg = await window.DB.obtenerPreventa();
    if (preventaCfg && preventaCfg.activa && preventaCfg.fecha) {
      modo = 'preventa';
      $('#bloquePrelanzamiento').hidden = true;
      $('#bloquePreventa').hidden = false;
      await cargarPreventa();
    } else {
      modo = 'prelanzamiento';
      await cargarPrelanzamiento();
    }
    window.AUTH.onUser(u => renderAuth(u));
    window.AUTH.init();
  })();
})();

/* ============================================================
   LA COCINA DE JAVI — Página de votación (pre-lanzamiento)
   Registro con cuenta (Google / email) + voto que suma a los 40.
   ============================================================ */

(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const CFG = window.CONFIG;
  let opcionElegida = null;
  let campana = null;         // datos de la campaña (obtenerVotacion)
  let modoRegistro = false;   // toggle login/registro del form email

  const EMOJI = {};
  (CFG.votacion.variedades || []).forEach(v => { EMOJI[v.nombre] = v.emoji; });
  const emojiDe = n => EMOJI[n] || '🍽️';

  let toastTimer;
  function toast(m) {
    const t = $('#toast'); t.textContent = m; t.classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('visible'), 2800);
  }

  /* ==================== CAMPAÑA (meta + opciones) ==================== */
  async function cargar() {
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
      ? '🎉 <b>¡Meta alcanzada!</b> Arrancamos el 1 de octubre. Te avisamos por WhatsApp.'
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

  /* ==================== AUTENTICACIÓN ==================== */
  async function renderAuth(u) {
    const area = $('#authArea');
    if (!window.AUTH.activo) {
      area.innerHTML = '<div class="aviso-demo" style="display:block">🔧 MODO DEMO — el login se activa con Firebase.</div>';
      return;
    }
    if (u) {
      const nombre = u.displayName || (u.email || '').split('@')[0] || 'vecino';
      area.innerHTML = `<div class="user-chip">
        ${u.photoURL ? `<img src="${u.photoURL}" alt="">` : '<span class="user-ini">👤</span>'}
        <span>Hola, <b>${nombre}</b></span>
        <button class="user-salir" id="btnLogout">salir</button>
      </div>`;
      $('#btnLogout').addEventListener('click', () => window.AUTH.logout());
      $('#formVoto').hidden = false;
      // prefill whatsapp desde el perfil
      try { const p = await window.AUTH.perfil(); if (p && p.telefono) $('[name=vtelefono]', $('#formVoto')).value = p.telefono; } catch {}
      // ¿ya votó?
      const ya = await window.DB.yaVoto(campana.fecha, u.uid);
      const yaEl = $('#yaVotaste');
      if (ya) {
        $('#formVoto').hidden = true;
        yaEl.hidden = false;
        yaEl.innerHTML = `✅ Ya votaste por <b>${emojiDe(ya.opcion)} ${ya.opcion}</b>. ¡Gracias por sumarte!`;
      } else { yaEl.hidden = true; }
    } else {
      area.innerHTML = tarjetaLogin();
      $('#formVoto').hidden = true;
      $('#yaVotaste').hidden = true;
      cablearLogin();
    }
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
      try { await window.AUTH.loginGoogle(); }
      catch (e) { mostrarError(traducirError(e)); }
    });
    $('#toggleRegistro').addEventListener('click', e => {
      e.preventDefault();
      modoRegistro = !modoRegistro;
      $('.campo-nombre').hidden = !modoRegistro;
      $('#btnEmail').textContent = modoRegistro ? 'Crear cuenta' : 'Entrar';
      $('.login-toggle').innerHTML = modoRegistro
        ? '¿Ya tenés cuenta? <a href="#" id="toggleRegistro">Entrá</a>'
        : '¿No tenés cuenta? <a href="#" id="toggleRegistro">Registrate</a>';
      cablearLogin(); // re-cablea el nuevo enlace
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

  /* ==================== VOTAR ==================== */
  $('#formVoto').addEventListener('submit', async e => {
    e.preventDefault();
    const u = window.AUTH.user();
    if (!u) { toast('Entrá con tu cuenta para votar 🙂'); return; }
    if (!opcionElegida) { toast('Elegí un plato primero 🍲'); return; }
    const btn = $('#btnVotar'); btn.disabled = true; btn.textContent = 'Enviando…';
    const tel = $('[name=vtelefono]', e.target).value.trim();
    try {
      await window.DB.guardarVotoUsuario({
        fecha: e.target.dataset.fecha,
        uid: u.uid,
        nombre: u.displayName || (u.email || '').split('@')[0] || 'vecino',
        opcion: opcionElegida,
        porciones: 1,
      });
      if (tel) { try { await window.AUTH.guardarPerfil({ telefono: tel }); } catch {} }
      toast(`¡Voto para ${opcionElegida}! 🙌 Gracias por sumarte`);
      opcionElegida = null;
      await cargar();
      await renderAuth(u);
    } catch (err) {
      toast('No se pudo votar 😕 Probá de nuevo'); console.error(err);
      btn.disabled = false; btn.textContent = 'Votar';
    }
  });

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
  const textoCompartir = '🥟 En La cocina de Javi estamos votando qué comida casera sumar (guisos, pastas, milanesas y más). ¡Sumate y votá antes del 1/10!';
  const url = location.href.split('#')[0];
  $('#compartirWa').href = window.UTIL.compartirWhatsApp(`${textoCompartir}\n${url}`);
  $('#compartirCopiar').addEventListener('click', async () => {
    const ok = await window.UTIL.copiar(url);
    toast(ok ? '¡Link copiado! Pegalo donde quieras 📋' : url);
  });

  /* ==================== INIT ==================== */
  (async () => {
    await cargar();
    window.AUTH.onUser(u => renderAuth(u));
    window.AUTH.init();
  })();
})();

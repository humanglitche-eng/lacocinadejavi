/* ============================================================
   LA COCINA DE JAVI — Página de votación (pre-lanzamiento)
   Meta: 40 votos antes del 1/10 para arrancar el menú semanal.
   Votar un plato + sugerir + compartir con el barrio.
   ============================================================ */

(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const CFG = window.CONFIG;
  let opcionElegida = null;

  // mapa nombre → emoji desde las variedades configuradas
  const EMOJI = {};
  (CFG.votacion.variedades || []).forEach(v => { EMOJI[v.nombre] = v.emoji; });
  const emojiDe = n => EMOJI[n] || '🍽️';

  let toastTimer;
  function toast(m) {
    const t = $('#toast'); t.textContent = m; t.classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('visible'), 2800);
  }

  async function cargar() {
    const v = await window.DB.obtenerVotacion();
    if (!v || !v.activa) {
      $('#votoContenido').innerHTML = '<p style="text-align:center;opacity:.7">La votación no está abierta en este momento.</p>';
      return;
    }
    const meta = v.cupo || CFG.votacion.meta;
    const anotados = v.anotados || 0;
    const dias = window.UTIL.diasHasta(v.fecha);
    const pct = Math.min(100, Math.round((anotados / meta) * 100));
    const lleno = anotados >= meta;

    // números + barra
    $('#metaVotos').textContent = anotados;
    $('#metaObjetivo').textContent = meta;
    $('#metaDias').textContent = dias;
    $('#cupoRelleno').style.width = pct + '%';
    $('#metaCaja').classList.toggle('meta-lleno', lleno);
    $('#metaTexto').innerHTML = lleno
      ? '🎉 <b>¡Meta alcanzada!</b> Arrancamos el menú semanal. Te avisamos por WhatsApp.'
      : `Faltan <b>${meta - anotados}</b> votos y quedan <b>${dias} días</b> (hasta el ${window.UTIL.fechaLarga(v.fecha)}). ¡Sumá al barrio!`;

    // opciones para votar (con barra de votos)
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
    $$('.opcion-voto').forEach(b => b.addEventListener('click', () => {
      opcionElegida = b.dataset.opcion;
      $$('.opcion-voto').forEach(x => x.classList.toggle('elegida', x.dataset.opcion === opcionElegida));
      const btn = $('#btnVotar'); btn.disabled = false; btn.textContent = `Votar ${opcionElegida}`;
    }));
    $('#formVoto').dataset.fecha = v.fecha;
  }

  // votar
  $('#formVoto').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    if (!opcionElegida) { toast('Elegí un plato primero 🍲'); return; }
    const btn = $('#btnVotar'); btn.disabled = true; btn.textContent = 'Enviando…';
    try {
      await window.DB.guardarVoto({
        fecha: f.dataset.fecha,
        opcion: opcionElegida,
        nombre: f.vnombre.value.trim(),
        telefono: f.vtelefono.value.trim(),
        porciones: 1,
      });
      toast(`¡Voto para ${opcionElegida}! 🙌 Gracias por sumarte`);
      f.reset(); opcionElegida = null;
      cargar();
    } catch (err) {
      toast('No se pudo votar 😕 Probá de nuevo'); console.error(err);
      btn.disabled = false; btn.textContent = 'Votar';
    }
  });

  // sugerir plato → le llega directo al WhatsApp de Javi
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

  // compartir
  const textoCompartir = '🥟 En La cocina de Javi estamos votando qué comida casera sumar (guisos, pastas, milanesas y más). ¡Sumate y votá antes del 1/10!';
  const url = location.href.split('#')[0];
  $('#compartirWa').href = window.UTIL.compartirWhatsApp(`${textoCompartir}\n${url}`);
  $('#compartirCopiar').addEventListener('click', async () => {
    const ok = await window.UTIL.copiar(url);
    toast(ok ? '¡Link copiado! Pegalo donde quieras 📋' : url);
  });

  if (!window.DB.activo) $$('.aviso-demo').forEach(el => el.style.display = '');

  cargar();
})();

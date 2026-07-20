/* ============================================================
   LA COCINA DE JAVI — App pública
   Rueda de carta + carrusel de detalle + pedido + votación.
   ============================================================ */

(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const CARTA = window.CARTA;
  const CFG = window.CONFIG;
  const fmt = n => '$' + n.toLocaleString('es-AR');

  /* ============ SVG empanada (ilustración por sabor) ============ */
  function svgEmpanada(color, escala) {
    // media luna con repulgue: 8 bultitos sobre el borde curvo
    const bultos = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8, ang = Math.PI * (1 - t);
      const x = 50 + 42 * Math.cos(ang), y = 62 - 36.5 * Math.sin(ang);
      bultos.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.6" fill="${color}" stroke="#14110d" stroke-width="1.4"/>`);
    }
    return `<svg viewBox="0 0 100 78" xmlns="http://www.w3.org/2000/svg" ${escala ? `width="${escala}" height="${escala * .78}"` : ''}>
      ${bultos.join('')}
      <path d="M10 62 A40 40 0 0 1 90 62 Z" fill="${color}"/>
      <path d="M10 62 A40 40 0 0 1 90 62" fill="none" stroke="#14110d" stroke-width="1.6"/>
      <line x1="10" y1="62" x2="90" y2="62" stroke="#14110d" stroke-width="1.6"/>
      <ellipse cx="42" cy="48" rx="12" ry="6" fill="rgba(255,255,255,.28)"/>
    </svg>`;
  }

  /* ==================== HERO CINEMATOGRÁFICO ==================== */
  const N = CARTA.length;
  let indiceActivo = 0;
  const escena = $('#escena');
  const lienzoA = $('#lienzoA'), lienzoB = $('#lienzoB');
  const sellosEl = $('#sellos');
  let lienzoVisible = lienzoA;

  function construirHero() {
    sellosEl.innerHTML = CARTA.map((p, i) => `
      <button class="sello ${i === 0 ? 'activo' : ''}" data-i="${i}" aria-label="${p.nombre}">
        <img src="${p.foto}" alt="${p.nombre}">
      </button>`).join('');
    $$('.sello', sellosEl).forEach(b => b.addEventListener('click', () => irA(+b.dataset.i)));
    // precarga los hero para que el crossfade no parpadee
    CARTA.forEach(p => { if (p.hero) { const im = new Image(); im.src = p.hero; } });
    const p0 = CARTA[0];
    lienzoA.style.backgroundImage = `url(${p0.hero || p0.foto})`;
    pintarTexto(p0);
  }

  function pintarTexto(p) {
    const nombre = $('#nombreActivo'), desc = $('#descActiva');
    nombre.textContent = p.nombre + (p.estrella ? ' ★' : '');
    desc.textContent = p.desc;
    // reinicia la animación de entrada
    [nombre, desc].forEach(el => { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; });
  }

  function irA(i) {
    i = ((i % N) + N) % N;
    if (i === indiceActivo) { abrirDetalle(i); return; }
    indiceActivo = i;
    const p = CARTA[i];
    // crossfade: pinta en el lienzo oculto y lo revela
    const oculto = lienzoVisible === lienzoA ? lienzoB : lienzoA;
    oculto.style.transform = '';               // borra parallax residual
    oculto.style.backgroundImage = `url(${p.hero || p.foto})`;
    oculto.classList.remove('activa'); void oculto.offsetWidth; // reinicia ken burns
    oculto.classList.add('activa');
    lienzoVisible.classList.remove('activa');
    lienzoVisible = oculto;
    $$('.sello', sellosEl).forEach((b, k) => b.classList.toggle('activo', k === i));
    pintarTexto(p);
  }

  $('#escenaPrev').addEventListener('click', () => irA(indiceActivo - 1));
  $('#escenaNext').addEventListener('click', () => irA(indiceActivo + 1));
  $('#btnElegir').addEventListener('click', () => abrirDetalle(indiceActivo));

  // swipe + freno del autoplay al interactuar
  let x0 = null, y0 = null, auto = null;
  function pausar() { clearInterval(auto); auto = null; }
  function reanudar() { if (!auto) auto = setInterval(() => irA(indiceActivo + 1), 6500); }
  escena.addEventListener('pointerdown', e => { x0 = e.clientX; y0 = e.clientY; pausar(); });
  escena.addEventListener('pointerup', e => {
    if (x0 == null) return;
    const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) irA(indiceActivo + (dx < 0 ? 1 : -1));
    reanudar();
  });

  // parallax suave con el mouse (desktop)
  const finoMovil = window.matchMedia('(pointer: fine)').matches;
  if (finoMovil) {
    escena.addEventListener('pointermove', e => {
      const r = escena.getBoundingClientRect();
      const mx = (e.clientX - r.left) / r.width - .5, my = (e.clientY - r.top) / r.height - .5;
      lienzoVisible.style.transform = `scale(1.1) translate(${mx * -16}px, ${my * -12}px)`;
      $('#escenaTexto').style.transform = `translate(${mx * 8}px, ${my * 6}px)`;
    });
    escena.addEventListener('pointerleave', () => {
      lienzoVisible.style.transform = '';
      $('#escenaTexto').style.transform = '';
    });
  }
  reanudar();

  /* ==================== DETALLE ==================== */
  const detalle = $('#detalle');
  let indiceDetalle = 0;

  function abrirDetalle(i) {
    indiceDetalle = i;
    pintarDetalle();
    detalle.classList.add('abierto');
    document.body.style.overflow = 'hidden';
  }
  function cerrarDetalle() {
    detalle.classList.remove('abierto');
    document.body.style.overflow = '';
    girarHasta(indiceDetalle);
  }
  function pintarDetalle() {
    const p = CARTA[indiceDetalle];
    const visual = p.hero || p.foto;
    $('#detalleVisual').classList.toggle('hero', !!p.hero);
    $('#detalleVisual').innerHTML = visual ? `<img src="${visual}" alt="${p.nombre}">` : svgEmpanada(p.color);
    $('#detalleNombre').textContent = p.nombre + (p.estrella ? ' ★' : '');
    $('#detalleDesc').textContent = p.desc;
    $('#detalleCant').textContent = cantidadTemp;
  }
  let cantidadTemp = 1;
  $('#detalleCerrar').addEventListener('click', cerrarDetalle);
  $('#detallePrev').addEventListener('click', () => { indiceDetalle = (indiceDetalle - 1 + N) % N; cantidadTemp = 1; pintarDetalle(); });
  $('#detalleNext').addEventListener('click', () => { indiceDetalle = (indiceDetalle + 1) % N; cantidadTemp = 1; pintarDetalle(); });
  $('#cantMenos').addEventListener('click', () => { cantidadTemp = Math.max(1, cantidadTemp - 1); $('#detalleCant').textContent = cantidadTemp; });
  $('#cantMas').addEventListener('click', () => { cantidadTemp = Math.min(48, cantidadTemp + 1); $('#detalleCant').textContent = cantidadTemp; });
  $('#detalleAgregar').addEventListener('click', () => {
    agregarAlPedido(CARTA[indiceDetalle].id, cantidadTemp);
    toast(`${cantidadTemp} × ${CARTA[indiceDetalle].nombre} al pedido`);
    cantidadTemp = 1; $('#detalleCant').textContent = 1;
    cerrarDetalle();
  });

  /* ==================== PEDIDO ==================== */
  let pedido = {}; // {saborId: cantidad}
  const totalUnidades = () => Object.values(pedido).reduce((a, b) => a + b, 0);

  function precioPedido() {
    // arma el mejor precio combinando docenas, medias docenas y unidades
    const u = totalUnidades();
    const P = CFG.precios;
    const doc = Math.floor(u / 12), r12 = u % 12;
    const med = Math.floor(r12 / 6), r6 = r12 % 6;
    let total = doc * P.docena + med * P.mediaDocena + r6 * P.unidad;
    // si conviene redondear a la promo superior, avisamos
    const partes = [];
    if (doc) partes.push(`${doc} docena${doc > 1 ? 's' : ''}`);
    if (med) partes.push(`${med} media docena`);
    if (r6) partes.push(`${r6} unidad${r6 > 1 ? 'es' : ''}`);
    let sugerencia = null;
    if (r6 > 0 && (6 - r6) * 0 + P.mediaDocena < r6 * P.unidad + 0) sugerencia = null; // nunca pasa con estos precios
    const faltan = u > 0 && r12 !== 0 ? 12 - r12 : 0;
    if (faltan > 0 && faltan <= 3) sugerencia = `Sumá ${faltan} más y llegás a otra docena promo (${fmt(P.docena)}).`;
    return { total, partes, sugerencia };
  }

  function agregarAlPedido(id, cant) {
    pedido[id] = (pedido[id] || 0) + cant;
    pintarCarrito();
  }

  function pintarCarrito() {
    const u = totalUnidades();
    const fab = $('#carritoFab');
    fab.classList.toggle('oculto', u === 0);
    $('#carritoGlobo').textContent = u;
    const cuerpo = $('#lineasPedido');
    cuerpo.innerHTML = Object.entries(pedido).map(([id, cant]) => {
      const p = CARTA.find(x => x.id === id);
      return `<div class="linea-pedido" data-id="${id}">
        <span class="punto" style="background:${p.color}"></span>
        <span class="nombre">${p.nombre}</span>
        <span class="mini">
          <button data-op="-">−</button>
          <b>${cant}</b>
          <button data-op="+">+</button>
        </span>
      </div>`;
    }).join('') || '<p style="opacity:.6;text-align:center;padding:1.5rem 0">Todavía no elegiste nada. Elegí un sabor 🥟</p>';
    $$('.linea-pedido button', cuerpo).forEach(b => b.addEventListener('click', () => {
      const id = b.closest('.linea-pedido').dataset.id;
      pedido[id] += b.dataset.op === '+' ? 1 : -1;
      if (pedido[id] <= 0) delete pedido[id];
      pintarCarrito();
    }));
    const { total, partes, sugerencia } = precioPedido();
    $('#resumenPrecio').innerHTML = u === 0 ? '' : `
      <div class="detalle-promo">${u} empanadas → ${partes.join(' + ')}</div>
      ${sugerencia ? `<div class="detalle-promo" style="color:var(--amarillo)">💡 ${sugerencia}</div>` : ''}
      <div class="total"><span>Total</span><span>${fmt(total)}</span></div>`;
    $('#btnEnviarPedido').disabled = u === 0;
  }

  const hojaCarrito = $('#hojaCarrito');
  $('#carritoFab').addEventListener('click', () => hojaCarrito.classList.add('abierta'));
  $$('[data-cerrar-hoja]').forEach(el => el.addEventListener('click', () => hojaCarrito.classList.remove('abierta')));

  function mensajeWhatsApp(datos) {
    const { total, partes } = precioPedido();
    const lineas = Object.entries(pedido).map(([id, c]) => `• ${c} × ${CARTA.find(x => x.id === id).nombre}`);
    return encodeURIComponent(
      `¡Hola Javi! 👋 Quiero hacer un pedido:\n\n${lineas.join('\n')}\n\n` +
      `(${partes.join(' + ')}) Total: ${fmt(total)}\n\n` +
      `Nombre: ${datos.nombre}\nEntrega: ${datos.entrega === 'envio' ? 'Envío' : 'Take away (retiro)'}${datos.direccion ? '\nDirección: ' + datos.direccion : ''}` +
      (datos.nota ? `\nNota: ${datos.nota}` : '')
    );
  }

  $('#formPedido').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const datos = {
      nombre: f.nombre.value.trim(),
      telefono: f.telefono.value.trim(),
      entrega: f.entrega.value,
      direccion: f.direccion.value.trim(),
      nota: f.nota.value.trim(),
      items: Object.entries(pedido).map(([id, cant]) => ({ id, nombre: CARTA.find(x => x.id === id).nombre, cant })),
      total: precioPedido().total,
    };
    const btn = $('#btnEnviarPedido');
    btn.disabled = true; btn.textContent = 'Enviando…';
    try {
      const r = await window.DB.guardarPedido(datos);
      const wa = `https://wa.me/${CFG.negocio.whatsapp}?text=${mensajeWhatsApp(datos)}`;
      $('#pedidoOk').style.display = 'grid';
      $('#pedidoOkWa').href = wa;
      $('#pedidoOkTexto').textContent = r.demo
        ? 'Pedido registrado en modo demo. Confirmalo por WhatsApp para que le llegue a Javi:'
        : '¡Pedido registrado! Javi ya lo ve en su panel. Si querés, confirmalo también por WhatsApp:';
      f.style.display = 'none';
      pedido = {}; pintarCarrito();
    } catch (err) {
      toast('No se pudo enviar 😕 Probá de nuevo');
      console.error(err);
    }
    btn.disabled = false; btn.textContent = 'Enviar pedido';
  });
  function pintarEntregaNota() {
    const val = $('#entregaSelect').value;
    $('#campoDireccion').style.display = val === 'envio' ? 'grid' : 'none';
    $('#entregaNota').textContent = val === 'envio'
      ? CFG.entrega.envio : CFG.entrega.takeAway;
  }
  $('#entregaSelect').addEventListener('change', pintarEntregaNota);

  /* ==================== ESTADO DE ATENCIÓN ==================== */
  function pintarEstado() {
    const e = window.UTIL.estadoAtencion();
    const pill = $('#estadoPill');
    pill.hidden = false;
    pill.classList.toggle('cerrado', !e.abierto);
    $('#estadoTexto').textContent = e.abierto ? e.texto : `Cerrado · ${e.texto}`;
    // aviso dentro del carrito cuando está cerrado
    const aviso = $('#avisoCerrado');
    if (e.abierto) { aviso.hidden = true; }
    else {
      aviso.hidden = false;
      aviso.innerHTML = `🕐 <b>Ahora estamos cerrados.</b> ${e.texto}. Podés dejar tu pedido igual y lo preparamos en el próximo turno.`;
    }
  }

  /* ==================== VARIOS ==================== */
  let toastTimer;
  function toast(msj) {
    const t = $('#toast');
    t.textContent = msj;
    t.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('visible'), 2600);
  }

  function pintarContacto() {
    const n = CFG.negocio;
    $('#waLink').href = `https://wa.me/${n.whatsapp}?text=${encodeURIComponent('¡Hola Javi! Vi la página y quiero hacer un pedido 🥟')}`;
    $('#telLink').href = `tel:+549${n.whatsapp.slice(3)}`;
    $('#telTexto').textContent = n.telefono;
    const ig = $('#igLink');
    if (n.instagram) { ig.href = `https://instagram.com/${n.instagram}`; ig.style.display = ''; }
    $('#zonaTexto').textContent = n.zona;
    $('#horarioTexto').textContent = n.horario;
  }

  if (!window.DB.activo) {
    $$('.aviso-demo').forEach(el => el.style.display = '');
  }

  /* init */
  construirHero();
  pintarCarrito();
  pintarEstado();
  pintarEntregaNota();
  pintarContacto();
  setInterval(pintarEstado, 60000); // refresca abierto/cerrado cada minuto
})();

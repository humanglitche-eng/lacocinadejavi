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

  /* ==================== RUEDA ==================== */
  const rueda = $('#rueda');
  const N = CARTA.length;
  const paso = 360 / N;
  let angulo = 0;          // rotación actual de la rueda
  let indiceActivo = 0;

  function construirRueda() {
    const radio = rueda.clientWidth / 2 - (rueda.clientWidth < 380 ? 40 : 52);
    rueda.innerHTML = CARTA.map((p, i) => `
      <div class="rueda-item" data-i="${i}">
        <div class="disco">${p.foto ? `<img src="${p.foto}" alt="${p.nombre}">` : svgEmpanada(p.color)}</div>
        <div class="etiqueta">${p.nombre}</div>
      </div>`).join('');
    $$('.rueda-item', rueda).forEach((el, i) => {
      const a = i * paso - 90; // item 0 arriba
      el.dataset.base = a;
      posicionarItem(el, a, radio);
      el.addEventListener('click', () => {
        if (i === indiceActivo) abrirDetalle(i);
        else girarHasta(i);
      });
    });
    aplicarRotacion();
  }

  function posicionarItem(el, aDeg, radio) {
    const a = aDeg * Math.PI / 180;
    el.style.transform = `translate(${Math.cos(a) * radio}px, ${Math.sin(a) * radio}px)`;
  }

  function aplicarRotacion(animado) {
    rueda.style.transition = animado ? 'transform .55s cubic-bezier(.2,.8,.2,1)' : 'none';
    rueda.style.transform = `rotate(${angulo}deg)`;
    const radio = rueda.clientWidth / 2 - (rueda.clientWidth < 380 ? 40 : 52);
    $$('.rueda-item', rueda).forEach(el => {
      // contra-rotamos cada item para que quede derecho…
      const a = parseFloat(el.dataset.base) * Math.PI / 180;
      el.style.transition = animado ? 'transform .55s cubic-bezier(.2,.8,.2,1)' : 'none';
      el.style.transform = `translate(${Math.cos(a) * radio}px, ${Math.sin(a) * radio}px) rotate(${-angulo}deg)`;
      // …pero la empanada real acompaña el giro completo (360°)
      const visual = el.querySelector('.disco img, .disco svg');
      if (visual) {
        visual.style.transition = animado ? 'transform .55s cubic-bezier(.2,.8,.2,1)' : 'none';
        visual.style.transform = `rotate(${angulo}deg)`;
      }
    });
    // activo = el que quedó arriba
    indiceActivo = ((Math.round(-angulo / paso) % N) + N) % N;
    $$('.rueda-item', rueda).forEach((el, i) => el.classList.toggle('activo', i === indiceActivo));
    $('#nombreActivo').textContent = CARTA[indiceActivo].nombre;
  }

  function girarHasta(i) {
    // gira por el camino más corto hasta dejar i arriba
    const objetivo = -i * paso;
    let delta = ((objetivo - angulo) % 360 + 540) % 360 - 180;
    angulo += delta;
    aplicarRotacion(true);
  }

  // arrastre (pointer events)
  let arrastrando = false, angPrevio = 0, centro = null, movido = 0;
  function angPuntero(e) {
    const r = rueda.getBoundingClientRect();
    centro = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    return Math.atan2(e.clientY - centro.y, e.clientX - centro.x) * 180 / Math.PI;
  }
  rueda.addEventListener('pointerdown', e => {
    arrastrando = true; movido = 0; angPrevio = angPuntero(e);
    rueda.setPointerCapture(e.pointerId);
  });
  rueda.addEventListener('pointermove', e => {
    if (!arrastrando) return;
    const a = angPuntero(e);
    let d = a - angPrevio;
    if (d > 180) d -= 360; if (d < -180) d += 360;
    angulo += d; movido += Math.abs(d);
    angPrevio = a;
    aplicarRotacion(false);
  });
  rueda.addEventListener('pointerup', () => {
    if (!arrastrando) return;
    arrastrando = false;
    angulo = Math.round(angulo / paso) * paso; // imán al más cercano
    aplicarRotacion(true);
  });
  // si arrastró, cancelamos el click fantasma
  rueda.addEventListener('click', e => { if (movido > 6) { e.stopPropagation(); } }, true);

  $('#btnElegir').addEventListener('click', () => abrirDetalle(indiceActivo));
  window.addEventListener('resize', () => { construirRueda(); });

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
    $('#detalleVisual').innerHTML = p.foto ? `<img src="${p.foto}" alt="${p.nombre}">` : svgEmpanada(p.color);
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
    }).join('') || '<p style="opacity:.6;text-align:center;padding:1.5rem 0">Todavía no elegiste nada. Girá la ruleta 🎡</p>';
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
      `Nombre: ${datos.nombre}\nEntrega: ${datos.entrega}${datos.direccion ? '\nDirección: ' + datos.direccion : ''}` +
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
  $('#entregaSelect').addEventListener('change', e => {
    $('#campoDireccion').style.display = e.target.value === 'envio' ? 'grid' : 'none';
  });

  /* ==================== VOTACIÓN (5 variantes) ==================== */
  const DIAS = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'];
  let opcionElegida = null;

  async function pintarVotacion() {
    const v = await window.DB.obtenerVotacion();
    const caja = $('#votacionTarjeta');
    if (!v || !v.activa) {
      caja.innerHTML = '<p style="opacity:.7;text-align:center">Por ahora no hay votación abierta. ¡Atento a la próxima!</p>';
      return;
    }
    const objetivo = new Date(v.fecha + 'T12:00:00');
    // tira de días: desde hoy hasta el objetivo (mínimo 7 días)
    const hoy = new Date(); hoy.setHours(12, 0, 0, 0);
    const nDias = Math.max(7, Math.round((objetivo - hoy) / 86400000) + 1);
    let tira = '';
    for (let i = 0; i < nDias; i++) {
      const d = new Date(hoy.getTime() + i * 86400000);
      const es = d.toDateString() === objetivo.toDateString();
      tira += `<div class="dia ${es ? 'objetivo' : ''}">${DIAS[d.getDay()]}<b>${d.getDate()}</b></div>`;
    }
    $('#diasTira').innerHTML = tira;
    const tiraEl = $('#diasTira'), objEl = tiraEl.querySelector('.dia.objetivo');
    if (objEl) tiraEl.scrollLeft = Math.max(0, objEl.offsetLeft - tiraEl.clientWidth / 2 + objEl.clientWidth / 2);
    const fechaTxt = objetivo.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'numeric' });
    $('#votacionGrito').innerHTML = `Hoy se vota el menú para <span style="color:var(--amarillo)">${fechaTxt}</span> — elegí tu plato. Si completamos el cupo… <span style="color:var(--amarillo)">¡se cocina el más votado!</span>`;

    // las 5 variantes con su barra de votos
    const maxVotos = Math.max(1, ...Object.values(v.porOpcion || {}));
    $('#opcionesVoto').innerHTML = (v.opciones || []).map(o => {
      const n = (v.porOpcion && v.porOpcion[o]) || 0;
      const lider = n > 0 && n === maxVotos;
      return `<button type="button" class="opcion-voto ${opcionElegida === o ? 'elegida' : ''} ${lider ? 'lider' : ''}" data-opcion="${o}">
        <span class="opcion-nombre">${lider ? '👑 ' : ''}${o}</span>
        <span class="opcion-barra"><span style="width:${Math.round(n / maxVotos * 100)}%"></span></span>
        <span class="opcion-votos">${n}</span>
      </button>`;
    }).join('');
    $$('.opcion-voto').forEach(b => b.addEventListener('click', () => {
      opcionElegida = b.dataset.opcion;
      $$('.opcion-voto').forEach(x => x.classList.toggle('elegida', x.dataset.opcion === opcionElegida));
      const btn = $('#btnVotar');
      btn.disabled = false;
      btn.textContent = `Votar ${opcionElegida}`;
    }));

    const pct = Math.min(100, Math.round((v.anotados / v.cupo) * 100));
    $('#cupoRelleno').style.width = pct + '%';
    $('#cupoTexto').innerHTML = v.anotados >= v.cupo
      ? `<b>¡CUPO COMPLETO!</b> 🎉 Se cocina el más votado. Los anotados ya tienen su porción.`
      : `<b>${v.anotados}</b> de <b>${v.cupo}</b> porciones anotadas — faltan ${v.cupo - v.anotados} para que se cocine`;
    $('#formVoto').dataset.fecha = v.fecha;
  }

  $('#formVoto').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    if (!opcionElegida) { toast('Elegí un plato primero 🍲'); return; }
    try {
      await window.DB.guardarVoto({
        fecha: f.dataset.fecha,
        opcion: opcionElegida,
        nombre: f.vnombre.value.trim(),
        telefono: f.vtelefono.value.trim(),
        porciones: parseInt(f.vporciones.value, 10) || 1,
      });
      toast(`¡Voto para ${opcionElegida}! 🙌 Te avisamos si se cocina`);
      f.reset();
      opcionElegida = null;
      const btn = $('#btnVotar');
      btn.disabled = true; btn.textContent = 'Elegí un plato para votar';
      pintarVotacion();
    } catch (err) {
      toast('No se pudo votar 😕 Probá de nuevo');
      console.error(err);
    }
  });

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
  construirRueda();
  pintarCarrito();
  pintarVotacion();
  pintarContacto();
})();

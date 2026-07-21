/* ============================================================
   LA COCINA DE JAVI — Panel interno
   Comandas + contabilidad + stream. Con Firebase usa Auth y
   Firestore en vivo; sin Firebase entra en modo demo.
   ============================================================ */

(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const fmt = n => '$' + n.toLocaleString('es-AR');
  const ESTADOS = ['nuevo', 'confirmado', 'horneando', 'listo', 'entregado'];
  const SIGUIENTE = { nuevo: 'confirmado', confirmado: 'horneando', horneando: 'listo', listo: 'entregado' };

  let toastTimer;
  function toast(m) {
    const t = $('#toast'); t.textContent = m; t.classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('visible'), 2400);
  }

  /* ---------------- datos demo ---------------- */
  const DEMO_PEDIDOS = [
    { id: 'd1', nombre: 'Caro', telefono: '221 555-0001', entrega: 'retiro', estado: 'nuevo', total: 20000, ts: Date.now() - 9e5, items: [{ nombre: 'Carne', cant: 6 }, { nombre: 'Jamón y queso', cant: 6 }] },
    { id: 'd2', nombre: 'Tute', telefono: '221 555-0002', entrega: 'envio', direccion: '12 y 60', estado: 'horneando', total: 31000, ts: Date.now() - 3.6e6, items: [{ nombre: 'Carne picante', cant: 12 }, { nombre: 'Humita', cant: 6 }] },
    { id: 'd3', nombre: 'Flor', telefono: '221 555-0003', entrega: 'retiro', estado: 'entregado', total: 20000, ts: Date.now() - 8.64e7, items: [{ nombre: 'Pollo', cant: 12 }] },
  ];
  const DEMO_GASTOS = [
    { concepto: 'Harina 25 kg', monto: 18000, ts: Date.now() - 1.7e8 },
    { concepto: 'Carne picada', monto: 32000, ts: Date.now() - 8.6e7 },
  ];

  let pedidos = [], gastos = [];

  /* ---------------- login (AUTH + gate de admin) ---------------- */
  const demo = !window.AUTH.activo;
  let entrado = false;

  function errorLogin(msg) { const el = $('#loginError'); el.style.display = ''; el.textContent = msg; }

  if (demo) {
    $('#loginDemo').style.display = '';
    $('#campoEmail').style.display = 'none';
    $('#campoClave').style.display = 'none';
  } else {
    $('#btnGoogle').style.display = '';
    $('#oSep').style.display = '';
  }

  $('#btnEntrar').addEventListener('click', async () => {
    if (demo) { entrar(); return; }
    try { await window.AUTH.loginEmail($('#email').value, $('#clave').value); }
    catch (e) { errorLogin('No se pudo entrar: revisá email y contraseña.'); }
  });
  $('#btnGoogle').addEventListener('click', async () => {
    try { await window.AUTH.loginGoogle(); }
    catch (e) { errorLogin('No se pudo entrar con Google. Probá de nuevo.'); }
  });

  if (!demo) {
    window.AUTH.onUser(u => {
      if (!u) { $('#login').style.display = ''; $('#panel').style.display = 'none'; return; }
      if (!window.AUTH.esAdmin()) {
        $('#login').style.display = '';
        errorLogin(`La cuenta ${u.email || ''} no tiene permiso de admin. Cerrá sesión y entrá con la cuenta autorizada.`);
        // botón salir para cambiar de cuenta
        if (!$('#btnSalirNoAdmin')) {
          const b = document.createElement('button');
          b.id = 'btnSalirNoAdmin'; b.className = 'btn btn-borde'; b.textContent = 'Cerrar sesión';
          b.onclick = () => window.AUTH.logout();
          $('#login').appendChild(b);
        }
        return;
      }
      entrar();
    });
    window.AUTH.init();
  }

  async function entrar() {
    if (entrado) return; entrado = true;
    $('#login').style.display = 'none';
    $('#panel').style.display = '';
    if (demo) $$('#panel .aviso-demo').forEach(el => el.style.display = '');
    $('#overlayUrl').textContent = new URL('overlay.html', location.href).href;
    await cargarDatos();
    pintarComandas();
    pintarContabilidad();
    cargarPlatos();
  }

  /* ---------------- datos ---------------- */
  async function cargarDatos() {
    if (demo) {
      pedidos = window.DB._ls('lcj_pedidos').concat(DEMO_PEDIDOS);
      gastos = window.DB._ls('lcj_gastos').concat(DEMO_GASTOS);
      return;
    }
    const { db } = await window.DB.firebase();
    db.collection('pedidos').orderBy('ts', 'desc').limit(80).onSnapshot(q => {
      pedidos = q.docs.map(d => ({ id: d.id, ...d.data() }));
      pintarComandas(); pintarContabilidad();
    });
    db.collection('gastos').orderBy('ts', 'desc').limit(80).onSnapshot(q => {
      gastos = q.docs.map(d => ({ id: d.id, ...d.data() }));
      pintarContabilidad();
    });
  }

  async function cambiarEstado(p) {
    const nuevo = SIGUIENTE[p.estado];
    if (!nuevo) return;
    p.estado = nuevo;
    if (!demo) {
      const { db } = await window.DB.firebase();
      await db.collection('pedidos').doc(p.id).update({ estado: nuevo });
    } else {
      const propios = window.DB._ls('lcj_pedidos');
      const idx = propios.findIndex(x => x.id === p.id);
      if (idx >= 0) { propios[idx].estado = nuevo; window.DB._ls('lcj_pedidos', propios); }
      pintarComandas(); pintarContabilidad();
    }
    toast(`Pedido de ${p.nombre} → ${nuevo.toUpperCase()}`);
  }

  /* ---------------- comandas ---------------- */
  function pintarComandas() {
    const orden = [...pedidos].sort((a, b) =>
      (ESTADOS.indexOf(a.estado) - ESTADOS.indexOf(b.estado)) || (b.ts - a.ts));
    $('#listaComandas').innerHTML = orden.map(p => {
      const hora = new Date(p.ts).toLocaleString('es-AR', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
      const items = (p.items || []).map(i => `${i.cant} × ${i.nombre}`).join(' · ');
      const sig = SIGUIENTE[p.estado];
      return `<div class="comanda estado-${p.estado}">
        <div class="comanda-cabeza">
          <b>${p.nombre}</b>
          <span class="chip-estado">${p.estado}</span>
        </div>
        <div class="comanda-items">${items}</div>
        <div style="font-size:.8rem;opacity:.65">${hora} · ${p.entrega}${p.direccion ? ' → ' + p.direccion : ''} · ${p.telefono || ''}${p.nota ? ' · 📝 ' + p.nota : ''}</div>
        <div class="comanda-pie" style="margin-top:.5rem">
          <b style="color:var(--amarillo)">${fmt(p.total || 0)}</b>
          ${sig ? `<button class="btn btn-amarillo" style="padding:.5rem 1rem;font-size:.75rem" data-avanzar="${p.id}">→ ${sig}</button>` : ''}
        </div>
      </div>`;
    }).join('') || '<p style="opacity:.6;text-align:center;padding:2rem 0">Sin comandas todavía. Cuando entren pedidos desde la web, aparecen acá solos.</p>';
    $$('[data-avanzar]').forEach(b => b.addEventListener('click', () => {
      const p = pedidos.find(x => x.id === b.dataset.avanzar);
      if (p) cambiarEstado(p);
    }));
  }

  /* ---------------- contabilidad ---------------- */
  function pintarContabilidad() {
    const hoy0 = new Date(); hoy0.setHours(0, 0, 0, 0);
    const hace7 = Date.now() - 7 * 86400000;
    const vendidos = pedidos.filter(p => p.estado !== 'nuevo'); // confirmado en adelante cuenta como venta
    const vHoy = vendidos.filter(p => p.ts >= hoy0.getTime()).reduce((a, p) => a + (p.total || 0), 0);
    const vSem = vendidos.filter(p => p.ts >= hace7).reduce((a, p) => a + (p.total || 0), 0);
    const emp = vendidos.filter(p => p.ts >= hace7).reduce((a, p) => a + (p.items || []).reduce((x, i) => x + i.cant, 0), 0);
    const gSem = gastos.filter(g => g.ts >= hace7).reduce((a, g) => a + (g.monto || 0), 0);
    $('#kpiHoy').textContent = fmt(vHoy);
    $('#kpiSemana').textContent = fmt(vSem);
    $('#kpiEmpanadas').textContent = emp;
    $('#kpiGastos').textContent = fmt(gSem);

    const movs = [
      ...vendidos.map(p => ({ ts: p.ts, txt: `Venta — ${p.nombre}`, monto: p.total || 0 })),
      ...gastos.map(g => ({ ts: g.ts, txt: `Gasto — ${g.concepto}`, monto: -(g.monto || 0) })),
    ].sort((a, b) => b.ts - a.ts).slice(0, 20);
    $('#tablaMov').innerHTML = '<tr><th>Fecha</th><th>Concepto</th><th>Monto</th></tr>' +
      movs.map(m => `<tr>
        <td>${new Date(m.ts).toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' })}</td>
        <td>${m.txt}</td>
        <td style="color:${m.monto < 0 ? 'var(--rojo)' : 'var(--verde)'}">${m.monto < 0 ? '−' : '+'}${fmt(Math.abs(m.monto))}</td>
      </tr>`).join('');
  }

  $('#formGasto').addEventListener('submit', async e => {
    e.preventDefault();
    const g = { concepto: e.target.concepto.value.trim(), monto: parseInt(e.target.monto.value, 10), ts: Date.now() };
    if (demo) {
      const arr = window.DB._ls('lcj_gastos'); arr.push(g); window.DB._ls('lcj_gastos', arr);
      gastos.unshift(g);
    } else {
      const { db } = await window.DB.firebase();
      await db.collection('gastos').add(g);
    }
    e.target.reset();
    pintarContabilidad();
    toast('Gasto registrado');
  });

  /* ---------------- platos por ronda (día de semana) ---------------- */
  const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const DIAS_LARGO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MAX_PLATOS = 3;
  let platos = [];
  let diaSel = new Date().getDay();
  let fotoNueva = null; // dataURL de la foto recién elegida

  function pintarDiasSelector() {
    $('#diasSelector').innerHTML = DIAS_CORTO.map((d, i) => {
      const n = platos.filter(p => p.dia === i).length;
      return `<button type="button" class="dia-btn ${i === diaSel ? 'activo' : ''}" data-dia="${i}">
        ${d}${n ? `<span class="dia-n">${n}</span>` : ''}
      </button>`;
    }).join('');
    $$('#diasSelector .dia-btn').forEach(b => b.addEventListener('click', () => {
      diaSel = +b.dataset.dia; cerrarFormPlato(); pintarDiasSelector(); pintarPlatos();
    }));
  }

  function platosDelDia() {
    return platos.filter(p => p.dia === diaSel).sort((a, b) => (a.orden || 0) - (b.orden || 0));
  }

  async function cargarPlatos() {
    platos = await window.DB.listarPlatos();
    pintarDiasSelector();
    pintarPlatos();
    cargarPreventaControl();
  }

  async function cargarPreventaControl() {
    const pv = await window.DB.obtenerPreventa();
    $('#pvActiva').checked = !!(pv && pv.activa);
    if (pv && pv.fecha) $('#pvFecha').value = pv.fecha;
    const est = $('#pvEstado');
    if (pv && pv.activa && pv.fecha) {
      const f = new Date(pv.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
      est.innerHTML = `🟢 Preventa <b>activa</b> para el <b>${f}</b>. La web muestra los platos de ese día.`;
    } else est.innerHTML = '⚪ Preventa apagada — la web muestra la juntada de los 40.';
  }

  $('#pvGuardar').addEventListener('click', async () => {
    const activa = $('#pvActiva').checked;
    const fecha = $('#pvFecha').value;
    if (activa && !fecha) { toast('Elegí la fecha de la ronda'); return; }
    try { await window.DB.setPreventa({ activa, fecha }); toast('Preventa actualizada'); cargarPreventaControl(); }
    catch (err) { toast('No se pudo guardar 😕'); console.error(err); }
  });

  function pintarPlatos() {
    const dp = platosDelDia();
    $('#listaPlatos').innerHTML = dp.map(p => `
      <div class="plato-card ${p.usado ? 'usado' : ''}" data-id="${p.id}">
        <div class="plato-thumb">${p.foto ? `<img src="${p.foto}" alt="${p.nombre}">` : '🍽️'}</div>
        <div class="plato-info">
          <b>${p.nombre}${p.usado ? ' <span class="tag-usado">ya salió</span>' : ''}</b>
          <p>${p.explicacion || '<span style="opacity:.5">Sin explicación</span>'}</p>
        </div>
        <div class="plato-acciones">
          <button class="mini-btn" data-usado="${p.id}" title="${p.usado ? 'Volver a disponible' : 'Marcar como ya salió (se elimina de la ronda)'}">${p.usado ? '↩️' : '🏆'}</button>
          <button class="mini-btn" data-editar="${p.id}">✏️</button>
          <button class="mini-btn" data-borrar="${p.id}">🗑️</button>
        </div>
      </div>`).join('') ||
      `<p style="opacity:.6;text-align:center;padding:1.5rem 0">Sin platos para el ${DIAS_LARGO[diaSel]}. Agregá el primero 👇</p>`;
    $$('[data-editar]').forEach(b => b.addEventListener('click', () => abrirFormPlato(platos.find(p => p.id === b.dataset.editar))));
    $$('[data-borrar]').forEach(b => b.addEventListener('click', () => borrar(b.dataset.borrar)));
    $$('[data-usado]').forEach(b => b.addEventListener('click', async () => {
      const p = platos.find(x => x.id === b.dataset.usado);
      await window.DB.marcarPlatoUsado(p.id, !p.usado);
      toast(p.usado ? 'Plato disponible de nuevo' : 'Marcado como ya salió');
      await cargarPlatos();
    }));
    // límite de 3 por día
    const btn = $('#btnAgregarPlato');
    if (dp.length >= MAX_PLATOS) { btn.disabled = true; btn.textContent = `Máximo ${MAX_PLATOS} por día`; }
    else { btn.disabled = false; btn.textContent = '＋ Agregar plato'; }
  }

  function abrirFormPlato(p) {
    const f = $('#formPlato');
    fotoNueva = null;
    f.id.value = p ? p.id : '';
    f.dia.value = diaSel;
    f.nombre.value = p ? p.nombre : '';
    f.explicacion.value = p ? (p.explicacion || '') : '';
    f.foto.value = '';
    $('#platoFormTitulo').textContent = p ? 'Editar plato' : `Nuevo plato · ${DIAS_LARGO[diaSel]}`;
    const prev = $('#platoPreview'), img = $('#platoPreviewImg');
    if (p && p.foto) { img.src = p.foto; prev.hidden = false; } else { prev.hidden = true; }
    f.hidden = false;
    f.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function cerrarFormPlato() { $('#formPlato').hidden = true; }

  $('#btnAgregarPlato').addEventListener('click', () => abrirFormPlato(null));
  $('#cancelarPlato').addEventListener('click', cerrarFormPlato);

  $('#formPlato').foto.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      fotoNueva = await window.UTIL.comprimirImagen(file, 800, 0.72);
      $('#platoPreviewImg').src = fotoNueva;
      $('#platoPreview').hidden = false;
    } catch { toast('No se pudo leer la imagen'); }
  });

  $('#formPlato').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const btn = $('#btnGuardarPlato'); btn.disabled = true; btn.textContent = 'Guardando…';
    const existente = f.id.value ? platos.find(p => p.id === f.id.value) : null;
    const plato = {
      dia: +f.dia.value,
      nombre: f.nombre.value.trim(),
      explicacion: f.explicacion.value.trim(),
      foto: fotoNueva || (existente ? existente.foto || '' : ''),
      orden: existente ? (existente.orden || 0) : platosDelDia().length,
    };
    if (f.id.value) plato.id = f.id.value;
    try {
      await window.DB.guardarPlato(plato);
      toast(f.id.value ? 'Plato actualizado' : 'Plato agregado');
      cerrarFormPlato();
      await cargarPlatos();
    } catch (err) {
      toast('No se pudo guardar 😕'); console.error(err);
    }
    btn.disabled = false; btn.textContent = 'Guardar plato';
  });

  async function borrar(id) {
    const p = platos.find(x => x.id === id);
    if (!p || !confirm(`¿Borrar "${p.nombre}"?`)) return;
    try { await window.DB.borrarPlato(id); toast('Plato borrado'); await cargarPlatos(); }
    catch (err) { toast('No se pudo borrar 😕'); console.error(err); }
  }

  /* ---------------- tabs ---------------- */
  $$('.panel-tabs button').forEach(b => b.addEventListener('click', () => {
    $$('.panel-tabs button').forEach(x => x.classList.remove('activa'));
    $$('.vista').forEach(x => x.classList.remove('activa'));
    b.classList.add('activa');
    $('#vista-' + b.dataset.vista).classList.add('activa');
  }));
})();

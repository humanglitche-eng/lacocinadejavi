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

  /* ---------------- login ---------------- */
  const demo = !window.DB.activo;
  if (demo) {
    $('#loginDemo').style.display = '';
    $('#campoEmail').style.display = 'none';
    $('#campoClave').style.display = 'none';
  }

  $('#btnEntrar').addEventListener('click', async () => {
    if (demo) { entrar(); return; }
    try {
      const { auth } = await window.DB.firebase();
      await auth.signInWithEmailAndPassword($('#email').value, $('#clave').value);
      entrar();
    } catch (e) {
      const el = $('#loginError');
      el.style.display = ''; el.textContent = 'No se pudo entrar: revisá email y contraseña.';
    }
  });

  async function entrar() {
    $('#login').style.display = 'none';
    $('#panel').style.display = '';
    if (demo) $$('#panel .aviso-demo').forEach(el => el.style.display = '');
    $('#overlayUrl').textContent = new URL('overlay.html', location.href).href;
    await cargarDatos();
    pintarComandas();
    pintarContabilidad();
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

  /* ---------------- tabs ---------------- */
  $$('.panel-tabs button').forEach(b => b.addEventListener('click', () => {
    $$('.panel-tabs button').forEach(x => x.classList.remove('activa'));
    $$('.vista').forEach(x => x.classList.remove('activa'));
    b.classList.add('activa');
    $('#vista-' + b.dataset.vista).classList.add('activa');
  }));
})();

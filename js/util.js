/* ============================================================
   LA COCINA DE JAVI — Utilidades compartidas
   Horario de atención, cuenta regresiva y compartir.
   Usado por el home (app.js) y la página de votación.
   ============================================================ */

window.UTIL = (function () {
  const DIA_NOMBRE = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  /* ¿Estamos abiertos ahora? Devuelve estado + próximo horario. */
  function estadoAtencion(ahora) {
    const h = window.CONFIG.horario;
    const d = ahora || new Date();
    const dia = d.getDay(), hora = d.getHours();
    const abierto = h.dias.includes(dia) && hora >= h.desde && hora < h.hasta;

    // buscar la próxima apertura (hoy si aún no abrió, o el próximo día hábil)
    let proxTxt = '';
    for (let i = 0; i < 8; i++) {
      const cand = new Date(d.getTime() + i * 86400000);
      const cd = cand.getDay();
      if (!h.dias.includes(cd)) continue;
      if (i === 0 && hora >= h.desde) continue;       // hoy ya pasó el horario
      const cuando = i === 0 ? 'hoy' : (i === 1 ? 'mañana' : `el ${DIA_NOMBRE[cd]}`);
      proxTxt = `Abrimos ${cuando} a las ${h.desde} h`;
      break;
    }
    return {
      abierto,
      texto: abierto ? `Abierto ahora · hasta las ${h.hasta} h` : (proxTxt || h.etiqueta),
      etiqueta: h.etiqueta,
    };
  }

  /* Cuenta regresiva a una fecha (YYYY-MM-DD). */
  function diasHasta(fechaStr, ahora) {
    const objetivo = new Date(fechaStr + 'T23:59:59');
    const d = ahora || new Date();
    return Math.max(0, Math.ceil((objetivo - d) / 86400000));
  }

  function fechaLarga(fechaStr) {
    return new Date(fechaStr + 'T12:00:00')
      .toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
  }

  /* Link para compartir por WhatsApp. */
  function compartirWhatsApp(texto) {
    return `https://wa.me/?text=${encodeURIComponent(texto)}`;
  }

  async function copiar(texto) {
    try { await navigator.clipboard.writeText(texto); return true; }
    catch { return false; }
  }

  /* Comprime una imagen (File) a JPEG data URL, achicando el lado mayor
     a maxLado px. Ideal para guardar fotos chicas en Firestore sin Storage. */
  function comprimirImagen(file, maxLado, calidad) {
    return new Promise((res, rej) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let w = img.naturalWidth, h = img.naturalHeight;
        const m = Math.max(w, h), lim = maxLado || 800;
        if (m > lim) { const s = lim / m; w = Math.round(w * s); h = Math.round(h * s); }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        res(c.toDataURL('image/jpeg', calidad || 0.72));
      };
      img.onerror = rej;
      img.src = url;
    });
  }

  return { estadoAtencion, diasHasta, fechaLarga, compartirWhatsApp, copiar, comprimirImagen };
})();

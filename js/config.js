/* ============================================================
   LA COCINA DE JAVI — Configuración central
   Editá este archivo para cambiar datos del negocio.
   ============================================================ */

window.CONFIG = {
  negocio: {
    nombre: 'La cocina de Javi',
    telefono: '221-638-9534',
    // WhatsApp en formato internacional sin signos (54 9 + área + número)
    whatsapp: '5492216389534',
    instagram: '',                 // TODO: handle de IG de Javi (sin @)
    zona: 'Envíos a radio cercano · Take away en el cuadro de La Plata',
    horario: 'Viernes a domingos, 19 a 22 h',
  },

  /* Horario de atención: se muestra "Abierto/Cerrado" según esto.
     días con 0=Dom, 1=Lun … 6=Sáb → viernes, sábado y domingo. */
  horario: {
    dias: [5, 6, 0],
    desde: 19, hasta: 22,          // de 19:00 a 22:00
    etiqueta: 'Viernes a domingos, de 19 a 22 h',
  },

  /* Entrega. TODO: cargar la dirección/esquina del punto central real. */
  entrega: {
    puntoCentral: 'La Plata (punto central a confirmar)',
    envio: 'Hacemos envíos en un radio cercano al punto central (a coordinar por WhatsApp).',
    takeAway: 'Take away (retiro) para quienes estén en el cuadro de La Plata (casco urbano).',
  },

  precios: {
    // TODO: confirmar con Javi unidad y media docena (docena confirmada $20.000)
    unidad: 2000,
    mediaDocena: 11000,
    docena: 20000,
  },

  /* --------------------------------------------------------
     FIREBASE — proyecto propio del cliente (aún no creado).
     Cuando exista, pegá acá la config del proyecto y el sitio
     pasa solo de MODO DEMO a modo real. Instrucciones: README.md
     -------------------------------------------------------- */
  firebase: {
    apiKey: 'AIzaSyBxbcPW48RIxv_KC64sCd1kjW2ARLrnTJ0',
    authDomain: 'la-cocina-de-javi.firebaseapp.com',
    projectId: 'la-cocina-de-javi',
    storageBucket: 'la-cocina-de-javi.firebasestorage.app',
    messagingSenderId: '720128977718',
    appId: '1:720128977718:web:c54f02266e21d8aa182197',
  },

  /* Mails con acceso al panel de administración (crear/editar/borrar platos).
     Debe coincidir con la lista esAdmin() de firebase/firestore.rules.
     TODO: confirmá qué mail(es) usa Javi/vos como admin. */
  adminEmails: ['tukyquilme@gmail.com'],

  /* ------------------------------------------------------------
     VOTACIÓN — proyecto en pre-lanzamiento.
     Meta: reunir 40 votos antes del 1/10 para arrancar el sistema
     de votación semanal de comida casera. Cada persona vota UN plato
     y puede sugerir otros. Con Firebase real esto vive en el doc
     config/votacion (campos: activa, cupo=meta, fecha=deadline,
     opciones=nombres de las variedades). Editable desde la consola.
     ------------------------------------------------------------ */
  votacion: {
    meta: 40,
    fecha: '2026-10-01',          // fecha límite del pre-lanzamiento
    // variedades de comida casera posibles (la gente vota y sugiere más)
    variedades: [
      { nombre: 'Guiso de lentejas', emoji: '🍲' },
      { nombre: 'Locro', emoji: '🌽' },
      { nombre: 'Pastel de papa', emoji: '🥧' },
      { nombre: 'Milanesas con puré', emoji: '🍗' },
      { nombre: 'Tallarines caseros', emoji: '🍝' },
      { nombre: 'Pizza casera', emoji: '🍕' },
      { nombre: 'Canelones', emoji: '🥟' },
      { nombre: 'Ñoquis', emoji: '🥔' },
    ],
  },

  /* Fallback demo (solo si Firebase no está configurado). */
  votacionDemo: {
    activa: true,
    fecha: '2026-10-01',
    cupo: 40,                     // meta de votos
    opciones: ['Guiso de lentejas', 'Locro', 'Pastel de papa', 'Milanesas con puré', 'Tallarines caseros', 'Pizza casera', 'Canelones', 'Ñoquis'],
  },
};

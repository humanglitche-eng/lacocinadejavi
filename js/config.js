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
    zona: 'La Plata y alrededores',// TODO: confirmar zona de entrega
    horario: 'Pedidos de 10 a 21 h', // TODO: confirmar
    entrega: 'Retiro o envío a coordinar', // TODO: confirmar costo de envío
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

  /* Votación demo: se usa solo si Firebase no está configurado.
     Con Firebase real, esto vive en el doc config/votacion.
     Se vota UN plato entre 5 variantes; si se completa el cupo,
     Javi cocina el más votado. */
  votacionDemo: {
    activa: true,
    fecha: '2026-07-29',          // miércoles 29/07 (como el boceto)
    cupo: 20,                     // porciones para que se active la cocina
    opciones: [                   // TODO: variantes reales de Javi
      'Guiso de lentejas',
      'Locro criollo',
      'Pastel de papa',
      'Milanesas con puré',
      'Tallarines caseros',
    ],
  },
};

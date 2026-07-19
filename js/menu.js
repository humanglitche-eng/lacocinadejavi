/* ============================================================
   LA COCINA DE JAVI — Carta
   Sabores disponibles hoy. Para agregar fotos propias: guardá
   la imagen en img/ y poné su ruta en "foto".
   ============================================================ */

window.CARTA = [
  {
    id: 'carne',
    nombre: 'Carne',
    desc: 'Carne, cebolla, huevo y el toque de Javi.',
    color: '#e08f2c',
    foto: 'img/carne-rueda.jpg',   // medallón para la ruleta
    hero: 'img/carne-hero.jpg',    // escena completa para el detalle
    estrella: true,
  },
  {
    id: 'pollo',
    nombre: 'Pollo',
    desc: 'Pollo desmenuzado bien jugoso con verduras salteadas.',
    color: '#e8b64c',
    foto: null, // TODO: generar hero estilo "CARNE" y correr el recorte
    hero: null,
  },
  {
    id: 'jamon-queso',
    nombre: 'Jamón y queso',
    desc: 'Clásica infalible: jamón cocido y muzzarella que se estira.',
    color: '#f0cf7a',
    foto: null, // TODO: generar hero estilo "CARNE" y correr el recorte
    hero: null,
  },
];

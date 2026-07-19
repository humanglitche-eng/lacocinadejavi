# La cocina de Javi — lacocinadejavi.com

Web de pedidos de empanadas caseras (La Plata) + panel interno de gestión.
Sitio estático (GitHub Pages) con Firebase como backend opcional.
Primer cliente modelo del ecosistema Human Glitche.

## Estructura

```
index.html            Web pública: ruleta de carta, promo, votación, contacto, FAQ
interno/index.html    Panel de Javi: comandas, contabilidad, stream
interno/overlay.html  Overlay para OBS (Browser Source 1920×1080)
js/config.js          ⚙️ TODOS los datos editables (negocio, precios, Firebase)
js/menu.js            Sabores de la carta
js/db.js              Capa de datos: Firestore o MODO DEMO (localStorage)
firebase/firestore.rules  Reglas de seguridad listas para pegar
```

## Modo demo vs modo real

Sin credenciales de Firebase el sitio funciona igual (**MODO DEMO**): pedidos y
votos se guardan en el navegador y el pedido siempre puede confirmarse por
WhatsApp, así la web sirve desde el día uno.

## Puesta en producción (acciones humanas — cola de aprobación)

1. **Repo GitHub + Pages**: crear repo `la-cocina-de-javi`, pushear esto,
   activar Pages (branch `main`, root). El archivo `CNAME` ya apunta a
   `lacocinadejavi.com`.
2. **DNS del dominio**: en el registrador de `lacocinadejavi.com`, apuntar
   `A` → IPs de GitHub Pages (185.199.108-111.153) y `www` CNAME →
   `<usuario>.github.io`.
3. **Firebase (proyecto propio del cliente)**:
   - Crear proyecto `la-cocina-de-javi` en console.firebase.google.com.
   - Activar **Firestore** y pegar `firebase/firestore.rules` en Rules.
   - Activar **Authentication → Email/Password** y crear el usuario de Javi.
   - Copiar la config web del proyecto en `js/config.js` → `firebase: {...}`.
   - Crear el doc `config/votacion` (5 variantes a votar):
     `{ activa: true, fecha: '2026-07-29', cupo: 20, opciones: ['Plato 1','Plato 2','Plato 3','Plato 4','Plato 5'] }`.
4. Commit + push → el sitio pasa solo de demo a real.

## Pendientes de contenido (confirmar con Javi)

- Sabores reales, precio de unidad y media docena (`js/config.js`, `js/menu.js`).
- Fotos reales de empanadas (`img/` + campo `foto` en `js/menu.js`).
- Instagram, zona de entrega, horarios (`js/config.js`).
- Menú y cupo de la primera votación real.

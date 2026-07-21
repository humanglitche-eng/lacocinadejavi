/* ============================================================
   LA COCINA DE JAVI — Autenticación (Google + Email)
   Perfil del cliente guardado en users/{uid}.
   Requiere Firebase configurado (config.js). Sin Firebase queda
   inactivo (el sitio sigue navegable en modo demo).
   ============================================================ */

window.AUTH = (function () {
  const activo = window.DB && window.DB.activo;
  let _user = null;          // firebase user | null
  let _listo = false;
  const subs = [];

  async function _fb() { return window.DB.firebase(); }

  async function init() {
    if (!activo) { _listo = true; _emit(); return; }
    const { auth } = await _fb();
    auth.onAuthStateChanged(async u => {
      _user = u || null;
      if (_user) { try { await _upsertPerfil(_user); } catch (e) { console.warn(e); } }
      _listo = true;
      _emit();
    });
  }

  function _emit() { subs.forEach(fn => fn(_user)); }

  async function _upsertPerfil(u) {
    const { db } = await _fb();
    const ref = db.collection('users').doc(u.uid);
    const snap = await ref.get();
    const base = { nombre: u.displayName || '', email: u.email || '', foto: u.photoURL || '' };
    if (!snap.exists) await ref.set({ ...base, ts: Date.now() });
    else await ref.set(base, { merge: true });
  }

  /* ---------- login ---------- */
  async function loginGoogle() {
    const { auth } = await _fb();
    const prov = new firebase.auth.GoogleAuthProvider();
    prov.setCustomParameters({ prompt: 'select_account' });
    return auth.signInWithPopup(prov);
  }

  async function registrarEmail(email, pass, nombre) {
    const { auth } = await _fb();
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    if (nombre) await cred.user.updateProfile({ displayName: nombre });
    await _upsertPerfil(cred.user);
    return cred;
  }

  async function loginEmail(email, pass) {
    const { auth } = await _fb();
    return auth.signInWithEmailAndPassword(email, pass);
  }

  async function logout() { const { auth } = await _fb(); return auth.signOut(); }

  /* ---------- perfil ---------- */
  async function guardarPerfil(campos) {
    if (!_user) throw new Error('sin sesión');
    const { db } = await _fb();
    await db.collection('users').doc(_user.uid).set(campos, { merge: true });
  }
  async function perfil() {
    if (!_user) return null;
    const { db } = await _fb();
    const snap = await db.collection('users').doc(_user.uid).get();
    return snap.exists ? snap.data() : null;
  }

  /* ---------- estado ---------- */
  function user() { return _user; }
  function esAdmin() {
    const mails = (window.CONFIG.adminEmails || []).map(m => m.toLowerCase());
    return !!(_user && mails.includes((_user.email || '').toLowerCase()));
  }
  // cb se llama con el usuario (o null) apenas se sabe el estado y en cada cambio
  function onUser(cb) { subs.push(cb); if (_listo) cb(_user); }

  return {
    activo, init, loginGoogle, registrarEmail, loginEmail, logout,
    guardarPerfil, perfil, user, esAdmin, onUser,
  };
})();

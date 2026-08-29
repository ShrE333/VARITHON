export function readUser() {
  try { return JSON.parse(localStorage.getItem('varimitra_user') || 'null'); }
  catch { return null; }
}
export function saveUser(user) { localStorage.setItem('varimitra_user', JSON.stringify(user)); }
export function clearUser() { localStorage.removeItem('varimitra_user'); }

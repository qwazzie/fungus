const USERS_KEY = 'fungusroom_users';
const SESSION_KEY = 'fungusroom_session';
const EVENT = 'fungusroom-auth';

function readUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); } catch { return {}; }
}
function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function genId() {
  return 'local-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
function emit(session) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: session }));
}
function currentSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}

export const auth = {
  async signUp({ email, password, options }) {
    const users = readUsers();
    if (users[email]) {
      return { data: { user: null, session: null }, error: { message: 'User already registered' } };
    }
    const id = genId();
    const user = {
      id,
      email,
      password,
      user_metadata: options?.data || {},
      created_at: new Date().toISOString()
    };
    users[email] = user;
    writeUsers(users);
    const session = { user, access_token: 'local-' + id };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    emit(session);
    return { data: { user, session }, error: null };
  },

  async signInWithPassword({ email, password }) {
    const users = readUsers();
    const user = users[email];
    if (!user || user.password !== password) {
      return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } };
    }
    const session = { user, access_token: 'local-' + user.id };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    emit(session);
    return { data: { user, session }, error: null };
  },

  async signOut() {
    localStorage.removeItem(SESSION_KEY);
    emit(null);
    return { error: null };
  },

  async getSession() {
    return { data: { session: currentSession() }, error: null };
  },

  onAuthStateChange(callback) {
    const handler = (event) => callback('STATE_CHANGED', event.detail);
    window.addEventListener(EVENT, handler);
    return { unsubscribe: () => window.removeEventListener(EVENT, handler) };
  }
};

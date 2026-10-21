const SESSION_KEY = 'fungusroom_session';
const EVENT = 'fungusroom-auth';

function currentSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}

function emit(session) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: session }));
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || 'Не удалось выполнить запрос');
  return body;
}

function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  emit(session);
  return { data: { session }, error: null };
}

export const auth = {
  async signUp({ username, password, displayName }) {
    try {
      const result = await request('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ username, password, displayName })
      });
      return setSession(result.session);
    } catch (error) {
      return { data: { user: null, session: null }, error: { message: error.message } };
    }
  },

  async signInWithPassword({ username, password }) {
    try {
      const result = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      return setSession(result.session);
    } catch (error) {
      return { data: { user: null, session: null }, error: { message: error.message } };
    }
  },

  async signOut() {
    localStorage.removeItem(SESSION_KEY);
    emit(null);
    return { error: null };
  },

  async getSession() {
    const session = currentSession();
    if (!session?.access_token) return { data: { session: null }, error: null };
    try {
      const result = await request('/api/auth/session', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const updatedSession = { ...session, user: result.session.user };
      localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
      return { data: { session: updatedSession }, error: null };
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return { data: { session: null }, error: null };
    }
  },

  onAuthStateChange(callback) {
    const handler = (event) => callback('STATE_CHANGED', event.detail);
    window.addEventListener(EVENT, handler);
    return { unsubscribe: () => window.removeEventListener(EVENT, handler) };
  },

  accessToken() {
    return currentSession()?.access_token || '';
  }
};

export async function apiRequest(path, options = {}) {
  const token = auth.accessToken();
  return request(path, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` }
  });
}

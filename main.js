import './src/styles/style.css';
import './src/styles/responsive.css';
import './src/styles/settings.css';
import './src/styles/chat-features.css';
import { appHtml, initApp } from './app.js';
import { auth, apiRequest } from './src/auth.js';

document.getElementById('app').innerHTML = appHtml;

function snapshotState(ctx) {
  const chars = ctx.charsApi.snapshot();
  const settings = ctx.settingsApi.snapshot();
  return {
    ...chars,
    ...ctx.chatsApi.snapshot(),
    settings,
    me: { ...chars.me, settings }
  };
}

async function saveState(state) {
  await apiRequest('/api/state', { method: 'PUT', body: JSON.stringify({ data: state }) });
}

async function loadState() {
  const result = await apiRequest('/api/state');
  return result.data || null;
}

function showAuth() {
  document.getElementById('authScreen').hidden = false;
  document.querySelector('.app').hidden = true;
}
function showApp() {
  document.getElementById('authScreen').hidden = true;
  document.querySelector('.app').hidden = false;
}

async function loadProfileData(session, ctx) {
  const user = session.user || {};
  ctx.charsApi.setMe(user.display_name || 'Пользователь');
  if (user.username) ctx.charsApi.setMeUsername('@' + user.username.replace(/^@/, ''));
}

async function start(session) {
  showApp();
  const ctx = initApp();
  let saveTimer;

  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async function () {
      try {
        await saveState(snapshotState(ctx));
      } catch (error) {
        console.error('Could not save account data', error);
      }
    }, 250);
  }

  function applyState(state) {
    if (!state) return;
    ctx.charsApi.load(state);
    ctx.chatsApi.load(state);
    ctx.settingsApi.load(state.settings || state.me?.settings);
  }

  const state = await loadState();
  applyState(state);
  await loadProfileData(session, ctx);
  if (!state) save();

  ctx.charsApi.subscribe(save);
  ctx.chatsApi.subscribe(save);
  ctx.settingsApi.subscribe(save);
}

function initAuth() {
  const form = document.getElementById('authForm');
  const title = document.getElementById('authTitle');
  const lead = document.getElementById('authLead');
  const submit = document.getElementById('authSubmit');
  const switchButton = document.getElementById('authSwitch');
  const displayField = document.querySelector('.auth-display-field');
  const displayName = document.getElementById('authDisplayName');
  const username = document.getElementById('authUsername');
  const password = document.getElementById('authPassword');
  const errorBox = document.getElementById('authError');
  let registerMode = false;
  let booted = false;

  function setStatus(text, ok) {
    errorBox.textContent = text;
    errorBox.classList.toggle('auth-ok', !!ok && text !== '');
  }

  function renderMode() {
    title.textContent = registerMode ? 'Регистрация' : 'Вход в аккаунт';
    lead.textContent = registerMode ? 'Создайте аккаунт и укажите имя для чатов.' : 'Войдите, чтобы открыть свои чаты и персонажей.';
    submit.textContent = registerMode ? 'Зарегистрироваться' : 'Войти';
    switchButton.textContent = registerMode ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться';
    displayField.hidden = !registerMode;
    displayField.style.display = registerMode ? '' : 'none';
    displayName.required = registerMode;
    password.autocomplete = registerMode ? 'new-password' : 'current-password';
    errorBox.textContent = '';
    errorBox.classList.remove('auth-ok');
  }

  function bootSession(session) {
    if (!session || booted) return;
    booted = true;
    start(session).catch(function (error) {
      booted = false;
      showAuth();
      setStatus(error.message || 'Не удалось загрузить данные аккаунта. Попробуйте ещё раз.', false);
    });
  }

  function friendlyError(message) {
    if (message.includes('Invalid login credentials')) return 'Неверное имя пользователя или пароль.';
    if (message.includes('already registered')) return 'Такое имя пользователя уже занято.';
    return message || 'Не удалось выполнить действие. Попробуйте ещё раз.';
  }

  switchButton.addEventListener('click', function () {
    registerMode = !registerMode;
    renderMode();
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    setStatus('', false);
    submit.disabled = true;
    let usernameValue = username.value.trim();
    if (!usernameValue.startsWith('@')) usernameValue = `@${usernameValue}`;
    if (!/^@[A-Za-z0-9_]+$/.test(usernameValue)) {
      setStatus('Имя пользователя должно начинаться с @ и содержать только латинские буквы, цифры и _.', false);
      submit.disabled = false;
      return;
    }
    username.value = usernameValue;
    const credentials = { username: usernameValue, password: password.value };
    try {
      if (registerMode) {
        const name = displayName.value.trim() || usernameValue;
        const result = await auth.signUp({
          ...credentials,
          displayName: name
        });
        if (result.error) {
          if (result.error.message.includes('already registered')) {
            setStatus('Такое имя уже занято. Входим в существующий аккаунт…', true);
            const signIn = await auth.signInWithPassword(credentials);
            if (signIn.error) throw signIn.error;
            setStatus('Вход выполнен, открываем приложение…', true);
            bootSession(signIn.data.session);
            return;
          }
          throw result.error;
        }
        setStatus('Регистрация завершена, открываем приложение…', true);
        bootSession(result.data.session);
      } else {
        const result = await auth.signInWithPassword(credentials);
        if (result.error) throw result.error;
        setStatus('Вход выполнен, открываем приложение…', true);
        bootSession(result.data.session);
      }
    } catch (error) {
      setStatus(friendlyError(error.message), false);
    } finally {
      submit.disabled = false;
    }
  });

  auth.onAuthStateChange(function (event, session) {
    (async function () {
      if (session) {
        bootSession(session);
      } else if (booted) {
        booted = false;
        showAuth();
      }
    }());
  });

  auth.getSession().then(function (result) {
    if (!result.data.session) {
      showAuth();
      return;
    }
    bootSession(result.data.session);
  });
  renderMode();
}

initAuth();

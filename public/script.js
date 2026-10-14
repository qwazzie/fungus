(function () {
  'use strict';

  var socket = io();

  var STORE_KEY = 'gribofon.user.v1';
  var MAIN_ID = 'main';
  var MAX_TEXT = 1000;
  var MAX_STORED = 300;

  var HUES = [
    { b: '#3b4ca6', f: '#c8d2f0' }, { b: '#a8386a', f: '#f1cadd' },
    { b: '#2f7d3b', f: '#cdeacf' }, { b: '#a8691a', f: '#f3dfb9' },
    { b: '#6a3aa6', f: '#dcccf0' }, { b: '#1d7f87', f: '#c6e8ea' }
  ];

  var currentUser = localStorage.getItem(STORE_KEY) || null;
  var state = {
    counter: 0,
    chats: [{ id: MAIN_ID, title: 'ГРИБОНИКА ОБЩИЙ', msgs: [] }]
  };
  var cur = null;
  var stack = ['list'];

  var $ = function (s) { return document.querySelector(s); };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function hue(name) {
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return HUES[h % HUES.length];
  }

  function paint(node, name) {
    if (!name) return;
    var c = hue(name);
    node.style.setProperty('--b', c.b);
    node.style.setProperty('--f', c.f);
  }

  function findChat(id) {
    for (var i = 0; i < state.chats.length; i++) if (state.chats[i].id === id) return state.chats[i];
    return null;
  }
  function newId() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  var screens = {
    auth: $('#s-auth'), list: $('#s-list'), profile: $('#s-profile'), chat: $('#s-chat')
  };
  var input = $('#text'), msgsEl = $('#msgs');

  function showOnly(name) {
    Object.keys(screens).forEach(function (k) { if (screens[k]) screens[k].hidden = (k !== name); });
  }
  function go(name) { stack.push(name); showOnly(name); }
  function back() { if (stack.length > 1) { stack.pop(); showOnly(stack[stack.length - 1]); } }
  function chatIsOpen() { return !!cur && stack[stack.length - 1] === 'chat'; }

  // Авторизация
  var authForm = $('#authForm');
  var authErr = $('#authErr');

  if (authForm) {
    authForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var name = $('#authName').value.trim();
      var pass = $('#authPass').value.trim();
      if (!name || !pass) return;

      try {
        var res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: name, password: pass })
        });
        var data = await res.json();

        if (data.success) {
          currentUser = data.username;
          localStorage.setItem(STORE_KEY, currentUser);
          initApp();
        } else {
          authErr.textContent = data.message || 'Ошибка входа';
        }
      } catch (err) {
        authErr.textContent = 'Ошибка соединения с сервером';
      }
    });
  }

  function updateWho() {
    if ($('#whoName')) $('#whoName').textContent = currentUser || 'Имя';
    if ($('#whoBadge')) $('#whoBadge').textContent = currentUser ? currentUser.charAt(0) : '?';
  }

  function renderList() {
    var box = $('#chatList');
    if (!box) return;
    box.textContent = '';
    state.chats.forEach(function (c) {
      var b = el('button', 'paper card'); b.type = 'button';
      b.appendChild(el('span', 'ntag', c.title));
      var last = c.msgs.length ? c.msgs[c.msgs.length - 1] : null;
      b.appendChild(el('span', 'body clamp', last ? last.sender + ': ' + last.text : 'Пока пусто'));
      b.addEventListener('click', function () { openChat(c); });
      box.appendChild(b);
    });
  }

  function renderMsgs() {
    if (!msgsEl || !cur) return;
    msgsEl.textContent = '';
    if (!cur.msgs.length) {
      msgsEl.appendChild(el('p', 'wnote', 'Сообщений пока нет. Напишите первую реплику!'));
      return;
    }
    cur.msgs.forEach(function (m) {
      var d = el('div', 'paper msg');
      paint(d, m.sender);
      d.appendChild(el('span', 'ntag', m.sender));
      d.appendChild(el('div', 'body', m.text));
      msgsEl.appendChild(d);
    });
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function openChat(c) {
    cur = c;
    if ($('#chatTitle')) $('#chatTitle').textContent = c.title;
    go('chat');
    renderMsgs();
  }

  // Отправка сообщения
  var composer = $('#composer');
  if (composer) {
    composer.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!input) return;
      var t = input.value.trim();
      if (!t || !cur || !currentUser) return;

      socket.emit('chat message', {
        chat: cur.id,
        title: cur.title,
        sender: currentUser,
        text: t.slice(0, MAX_TEXT)
      });
      input.value = '';
      input.focus();
    });
  }

  socket.on('init history', function (history) {
    if (!Array.isArray(history)) return;
    var mainChat = findChat(MAIN_ID);
    if (mainChat) mainChat.msgs = [];

    history.forEach(function (item) {
      var chatId = item.chat || MAIN_ID;
      var c = findChat(chatId);
      if (!c) {
        c = { id: chatId, title: item.title || 'Чат', msgs: [] };
        state.chats.push(c);
      }
      c.msgs.push({ sender: item.sender, text: item.text });
    });

    if (!cur) cur = state.chats[0];
    if (currentUser) {
      renderMsgs();
      renderList();
    }
  });

  socket.on('chat message', function (data) {
    if (!data || !data.text || !data.sender) return;
    var chatId = data.chat || MAIN_ID;
    var c = findChat(chatId);
    if (!c) {
      c = { id: chatId, title: data.title || 'Чат', msgs: [] };
      state.chats.push(c);
    }
    c.msgs.push({ sender: data.sender, text: data.text });
    if (c.msgs.length > MAX_STORED) c.msgs.splice(0, c.msgs.length - MAX_STORED);

    if (chatIsOpen() && cur.id === c.id) renderMsgs();
    renderList();
  });

  // Навигация
  var newChatBtn = $('#newChat');
  if (newChatBtn) {
    newChatBtn.addEventListener('click', function () {
      state.counter += 1;
      var c = { id: newId(), title: 'Новый чат ' + state.counter, msgs: [] };
      state.chats.push(c);
      renderList();
      openChat(c);
    });
  }
  document.querySelectorAll('[data-back]').forEach(function (b) { b.addEventListener('click', back); });

  var logoutBtn = $('#logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      localStorage.removeItem(STORE_KEY);
      currentUser = null;
      stack = ['auth'];
      showOnly('auth');
    });
  }

  function initApp() {
    updateWho();
    stack = ['list'];
    showOnly('list');
    if (!cur) cur = state.chats[0];
    renderMsgs();
    renderList();
  }

  // Старт при загрузке
  if (currentUser) {
    initApp();
  } else {
    showOnly('auth');
  }
})();

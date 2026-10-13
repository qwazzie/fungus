// Грибофон: клиент. Сервер остаётся прежним: получает 'chat message' и рассылает всем.
// К сообщению добавлены поля chat (id чата) и title (его название). Сообщения без chat
// попадают в чат «Грибоника», так что старый формат { sender, text } тоже работает.
(function () {
  'use strict';

  var socket = io();

  var STORE_KEY = 'gribofon.v1';
  var MAIN_ID = 'main';
  var MAX_TEXT = 1000;
  var MAX_NAME = 24;
  var MAX_TITLE = 40;
  var MAX_STORED = 300;

  var DEFAULT_NAMES = ['РИН', 'КВАС', 'КИРОСИН', 'МАФ', 'БАРАБАН', 'НИЯ'];
  var HUES = [
    { b: '#3b4ca6', f: '#c8d2f0', l: '#d6dcf0' },
    { b: '#a8386a', f: '#f1cadd', l: '#f0d6e3' },
    { b: '#2f7d3b', f: '#cdeacf', l: '#d5e9d7' },
    { b: '#a8691a', f: '#f3dfb9', l: '#f1e2c8' },
    { b: '#6a3aa6', f: '#dcccf0', l: '#e1d6f0' },
    { b: '#1d7f87', f: '#c6e8ea', l: '#d2e8ea' }
  ];

  // ---------- состояние и сохранение ----------
  function seed() {
    return {
      names: DEFAULT_NAMES.slice(),
      who: DEFAULT_NAMES[0],
      counter: 0,
      chats: [{
        id: MAIN_ID, title: 'Грибоника', msgs: [
          { n: 'РИН', t: 'Пий зи спяшь отс рин' },
          { n: 'КВАС', t: 'Это. Бакий ян, всоди кали флы?' }
        ]
      }]
    };
  }

  function load() {
    var base = seed();
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return base;
      var d = JSON.parse(raw);
      if (!d || !Array.isArray(d.names) || !Array.isArray(d.chats)) return base;
      var names = d.names.filter(function (n) { return typeof n === 'string' && n; });
      var chats = d.chats.filter(function (c) {
        return c && typeof c.id === 'string' && typeof c.title === 'string' && Array.isArray(c.msgs);
      }).map(function (c) {
        return {
          id: c.id, title: c.title,
          msgs: c.msgs.filter(function (m) { return m && typeof m.n === 'string' && typeof m.t === 'string'; })
        };
      });
      if (!chats.length) return base;
      return {
        names: names,
        who: names.indexOf(d.who) >= 0 ? d.who : (names[0] || null),
        counter: +d.counter || 0,
        chats: chats
      };
    } catch (e) {
      return base;
    }
  }

  var state = load();
  var photo = null; // только для макета, не сохраняется
  var cur = null;
  var stack = ['list'];

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* без хранилища тоже работает */ }
  }

  // ---------- вспомогательное ----------
  var $ = function (s) { return document.querySelector(s); };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // Цвет считается по имени, поэтому у всех пользователей он одинаковый.
  function hue(name) {
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return HUES[h % HUES.length];
  }
  function paint(node, name) {
    if (!name) {
      ['--b', '--f', '--l'].forEach(function (k) { node.style.removeProperty(k); });
      return;
    }
    var c = hue(name);
    node.style.setProperty('--b', c.b);
    node.style.setProperty('--f', c.f);
    node.style.setProperty('--l', c.l);
  }

  function findChat(id) {
    for (var i = 0; i < state.chats.length; i++) if (state.chats[i].id === id) return state.chats[i];
    return null;
  }
  function newId() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  // ---------- экраны ----------
  var screens = {
    list: $('#s-list'), settings: $('#s-settings'), info: $('#s-info'),
    profile: $('#s-profile'), chat: $('#s-chat')
  };
  var drop = $('#drop'), whoBtn = $('#who'), input = $('#text'), msgsEl = $('#msgs');

  function showOnly(name) {
    closeDrop();
    Object.keys(screens).forEach(function (k) { screens[k].hidden = (k !== name); });
  }
  function go(name) { stack.push(name); showOnly(name); }
  function back() { if (stack.length > 1) stack.pop(); showOnly(stack[stack.length - 1]); }
  function chatIsOpen() { return !!cur && stack[stack.length - 1] === 'chat'; }

  // ---------- список чатов ----------
  function renderList() {
    var box = $('#chatList');
    box.textContent = '';
    if (!state.chats.length) { box.appendChild(el('p', 'wnote', 'Чатов пока нет. Нажмите «+», чтобы начать.')); return; }
    state.chats.forEach(function (c) {
      var b = el('button', 'paper card'); b.type = 'button';
      b.appendChild(el('span', 'ntag', c.title));
      var last = c.msgs.length ? c.msgs[c.msgs.length - 1] : null;
      b.appendChild(el('span', 'body clamp', last ? last.n + ': ' + last.t : 'Пока пусто'));
      b.addEventListener('click', function () { openChat(c); });
      box.appendChild(b);
    });
    box.scrollTop = box.scrollHeight;
  }

  // ---------- чат ----------
  function renderMsgs() {
    msgsEl.textContent = '';
    if (!cur.msgs.length) {
      msgsEl.appendChild(el('p', 'wnote', 'Сообщений пока нет. Выберите имя и напишите первую реплику.'));
      return;
    }
    cur.msgs.forEach(function (m) {
      var d = el('div', 'paper msg');
      paint(d, m.n);
      d.appendChild(el('span', 'ntag', m.n));
      d.appendChild(el('div', 'body', m.t));
      msgsEl.appendChild(d);
    });
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function openChat(c) {
    cur = c;
    $('#chatTitle').textContent = c.title;
    go('chat');
    renderMsgs();
  }

  function updateWho() {
    var w = state.who;
    $('#whoName').textContent = w || 'Имя';
    $('#whoBadge').textContent = w ? w.charAt(0) : '?';
    $('#draftTag').textContent = w || 'Имя';
    paint($('#draft'), w);
  }

  function renderDrop() {
    drop.textContent = '';
    if (!state.names.length) {
      drop.appendChild(el('p', 'none', 'Список пуст. Добавьте персонажей в настройках профиля.'));
      return;
    }
    state.names.forEach(function (n) {
      var b = el('button', 'pill mini'); b.type = 'button';
      b.setAttribute('role', 'option');
      b.setAttribute('aria-selected', n === state.who ? 'true' : 'false');
      b.appendChild(el('span', 'badge', n.charAt(0)));
      b.appendChild(el('span', 'nm', n));
      b.addEventListener('click', function () {
        state.who = n; save(); updateWho(); closeDrop(); input.focus();
      });
      drop.appendChild(b);
    });
  }
  function openDrop() { renderDrop(); drop.hidden = false; whoBtn.setAttribute('aria-expanded', 'true'); }
  function closeDrop() { drop.hidden = true; whoBtn.setAttribute('aria-expanded', 'false'); }

  whoBtn.addEventListener('click', function () { if (drop.hidden) openDrop(); else closeDrop(); });
  document.addEventListener('click', function (e) {
    if (!drop.hidden && !e.target.closest('#drop') && !e.target.closest('#who')) closeDrop();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrop(); });

  // Отправка: сообщение уходит на сервер и появляется, когда сервер вернёт его всем
  function sendMessage() {
    var t = input.value.trim();
    if (!t || !cur) return;
    if (!state.who) { openDrop(); return; }
    socket.emit('chat message', {
      chat: cur.id,
      title: cur.title,
      sender: state.who,
      text: t.slice(0, MAX_TEXT)
    });
    input.value = '';
    input.focus();
  }
  $('#composer').addEventListener('submit', function (e) { e.preventDefault(); sendMessage(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendMessage(); }
  });

  // Получение сообщения от сервера (в том числе своего)
  socket.on('chat message', function (data) {
    if (!data || typeof data.text !== 'string') return;
    var id = (typeof data.chat === 'string' && data.chat) ? data.chat.slice(0, 40) : MAIN_ID;
    var c = findChat(id);
    if (!c) {
      var title = typeof data.title === 'string' && data.title.trim() ? data.title.trim().slice(0, MAX_TITLE) : 'Чат';
      c = { id: id, title: title, msgs: [] };
      state.chats.push(c);
    }
    c.msgs.push({
      n: String(data.sender == null ? '?' : data.sender).slice(0, MAX_NAME),
      t: data.text.slice(0, MAX_TEXT)
    });
    if (c.msgs.length > MAX_STORED) c.msgs.splice(0, c.msgs.length - MAX_STORED);
    // чат с новым сообщением уходит в конец списка (внизу самые свежие)
    state.chats.splice(state.chats.indexOf(c), 1);
    state.chats.push(c);
    save();
    if (chatIsOpen() && cur.id === c.id) renderMsgs();
    renderList();
  });

  // ---------- кнопки ----------
  $('#newChat').addEventListener('click', function () {
    state.counter += 1;
    var c = { id: newId(), title: 'Новый чат ' + state.counter, msgs: [] };
    state.chats.push(c);
    save();
    renderList();
    openChat(c);
  });
  $('#openSettings').addEventListener('click', function () { go('settings'); });
  $('#openInfo').addEventListener('click', function () { go('info'); });
  $('#openProfile').addEventListener('click', function () { renderProfile(); go('profile'); });
  document.querySelectorAll('[data-back]').forEach(function (b) { b.addEventListener('click', back); });

  // ---------- настройки профиля: фото и персонажи ----------
  var errEl = $('#nameErr'), newName = $('#newName');

  function renderProfile() {
    var av = $('#avatar');
    av.textContent = '';
    if (photo) {
      var im = document.createElement('img');
      im.src = photo; im.alt = 'Фото профиля';
      av.appendChild(im);
    } else {
      av.innerHTML = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>';
    }
    $('#clearPhoto').hidden = !photo;

    var ul = $('#namesList');
    ul.textContent = '';
    if (!state.names.length) ul.appendChild(el('li', 'none', 'Пока ни одного персонажа.'));
    state.names.forEach(function (n, i) {
      var li = el('li', 'pill mini');
      li.appendChild(el('span', 'badge', n.charAt(0)));
      li.appendChild(el('span', 'nm', n));
      var b = el('button', 'chip'); b.type = 'button';
      b.setAttribute('aria-label', 'Убрать ' + n);
      b.innerHTML = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
      b.addEventListener('click', function () { removeName(i); });
      li.appendChild(b);
      ul.appendChild(li);
    });
  }

  function removeName(i) {
    var n = state.names.splice(i, 1)[0];
    if (state.who === n) { state.who = state.names[0] || null; updateWho(); }
    save();
    errEl.textContent = '';
    renderProfile();
  }

  $('#addName').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = newName.value.replace(/\s+/g, ' ').trim();
    if (!v) return;
    var dup = state.names.some(function (n) { return n.toLowerCase() === v.toLowerCase(); });
    if (dup) { errEl.textContent = 'Такой персонаж уже есть.'; return; }
    errEl.textContent = '';
    state.names.push(v);
    if (!state.who) { state.who = v; updateWho(); }
    save();
    newName.value = '';
    renderProfile();
    newName.focus();
  });
  newName.addEventListener('input', function () { errEl.textContent = ''; });

  $('#pickPhoto').addEventListener('click', function () { $('#photoFile').click(); });
  $('#photoFile').addEventListener('change', function () {
    var f = this.files && this.files[0];
    this.value = '';
    if (!f || f.type.indexOf('image/') !== 0) return;
    var r = new FileReader();
    r.onload = function () { photo = r.result; renderProfile(); };
    r.readAsDataURL(f);
  });
  $('#clearPhoto').addEventListener('click', function () { photo = null; renderProfile(); });

  // ---------- старт ----------
  updateWho();
  renderProfile();
  renderList();
})();

(function () {
  'use strict';

  var socket = io();

  var STORE_KEY = 'gribofon.v1';
  var MAIN_ID = 'main';
  var MAX_TEXT = 1000;
  var MAX_NAME = 24;
  var MAX_STORED = 300;

  var DEFAULT_NAMES = ['РИН 🍄', 'КВАС 💧', 'КИРОСИН 🔥', 'МАФ 🌿', 'БАРАБАН 🥁', 'НИЯ 🍄'];
  var HUES = [
    { b: '#3b4ca6', f: '#c8d2f0' }, { b: '#a8386a', f: '#f1cadd' },
    { b: '#2f7d3b', f: '#cdeacf' }, { b: '#a8691a', f: '#f3dfb9' },
    { b: '#6a3aa6', f: '#dcccf0' }, { b: '#1d7f87', f: '#c6e8ea' }
  ];

  function seed() {
    return {
      names: DEFAULT_NAMES.slice(),
      who: DEFAULT_NAMES[0],
      counter: 0,
      chats: [{ id: MAIN_ID, title: 'ГРИБОНИКА ОБЩИЙ', msgs: [] }]
    };
  }

  function load() {
    var base = seed();
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return base;
      var d = JSON.parse(raw);
      if (!d || !Array.isArray(d.names) || !Array.isArray(d.chats)) return base;
      return {
        names: d.names,
        who: d.names.includes(d.who) ? d.who : d.names[0],
        counter: +d.counter || 0,
        chats: d.chats
      };
    } catch (e) {
      return base;
    }
  }

  var state = load();
  var photo = null;
  var cur = null;
  var stack = ['list'];

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

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
    list: $('#s-list'), profile: $('#s-profile'), chat: $('#s-chat')
  };
  var drop = $('#drop'), whoBtn = $('#who'), input = $('#text'), msgsEl = $('#msgs');

  function showOnly(name) {
    closeDrop();
    Object.keys(screens).forEach(function (k) { if (screens[k]) screens[k].hidden = (k !== name); });
  }
  function go(name) { stack.push(name); showOnly(name); }
  function back() { if (stack.length > 1) { stack.pop(); showOnly(stack[stack.length - 1]); } }
  function chatIsOpen() { return !!cur && stack[stack.length - 1] === 'chat'; }

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

  function updateWho() {
    var w = state.who;
    if ($('#whoName')) $('#whoName').textContent = w || 'Имя';
    if ($('#whoBadge')) $('#whoBadge').textContent = w ? w.charAt(0) : '?';
    paint(whoBtn, w);
  }

  function renderDrop() {
    if (!drop) return;
    drop.textContent = '';
    state.names.forEach(function (n) {
      var b = el('button', 'pill mini'); b.type = 'button';
      b.appendChild(el('span', 'badge', n.charAt(0)));
      b.appendChild(el('span', 'nm', n));
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        state.who = n; save(); updateWho(); closeDrop(); if (input) input.focus();
      });
      drop.appendChild(b);
    });
  }
  function openDrop() { renderDrop(); if (drop) drop.hidden = false; }
  function closeDrop() { if (drop) drop.hidden = true; }

  if (whoBtn) {
    whoBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (drop.hidden) openDrop(); else closeDrop();
    });
  }
  document.addEventListener('click', function (e) {
    if (drop && !drop.hidden && !e.target.closest('#drop') && !e.target.closest('#who')) closeDrop();
  });

  // Отправка сообщения
  var composer = $('#composer');
  if (composer) {
    composer.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!input) return;
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
    });
  }

  // Получение истории из базы при входе
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

    save();
    if (!cur) cur = state.chats[0];
    renderMsgs();
    renderList();
  });

  // Получение нового сообщения в реальном времени
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

    save();
    if (chatIsOpen() && cur.id === c.id) renderMsgs();
    renderList();
  });

  // Кнопки навигации и профиля
  var newChatBtn = $('#newChat');
  if (newChatBtn) {
    newChatBtn.addEventListener('click', function () {
      state.counter += 1;
      var c = { id: newId(), title: 'Новый чат ' + state.counter, msgs: [] };
      state.chats.push(c);
      save();
      renderList();
      openChat(c);
    });
  }
  if ($('#openProfile')) $('#openProfile').addEventListener('click', function () { go('profile'); });
  document.querySelectorAll('[data-back]').forEach(function (b) { b.addEventListener('click', back); });

  updateWho();
  if (!cur) cur = state.chats[0];
  renderList();
})();

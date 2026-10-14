(function () {
  'use strict';

  var socket = io();

  var STORE_USER = 'gribofon.username.v1';
  var STORE_DISPLAY = 'gribofon.display.v1';
  var MAIN_ID = 'main';
  var MAX_TEXT = 1000;
  var MAX_STORED = 500;

  var HUES = [
    { b: '#3b4ca6', f: '#c8d2f0' }, { b: '#a8386a', f: '#f1cadd' },
    { b: '#2f7d3b', f: '#cdeacf' }, { b: '#a8691a', f: '#f3dfb9' },
    { b: '#6a3aa6', f: '#dcccf0' }, { b: '#1d7f87', f: '#c6e8ea' }
  ];

  var currentUsername = localStorage.getItem(STORE_USER) || null;
  var currentDisplay = localStorage.getItem(STORE_DISPLAY) || null;
  var myCharacters = ['Электробанан'];
  var currentSender = 'Электробанан';

  var state = {
    counter: 0,
    chats: [{ id: MAIN_ID, title: 'ГРИБОНИКА ОБЩИЙ', msgs: [] }]
  };
  var cur = null;
  var stack = ['list'];

  var selectedMsgIds = [];
  var selectedChatIds = [];
  var pendingDeleteAction = null;

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
  var input = $('#text'), msgsEl = $('#msgs'), drop = $('#drop');

  function showOnly(name) {
    closeDrop();
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
      var uname = $('#authUsername').value.trim();
      var pass = $('#authPass').value.trim();
      var dname = $('#authDisplay').value.trim();
      if (!uname || !pass || !dname) return;

      try {
        var res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: uname, password: pass, displayName: dname })
        });
        var data = await res.json();

        if (data.success) {
          currentUsername = data.username;
          currentDisplay = data.displayName;
          myCharacters = data.characters || [dname];
          currentSender = myCharacters[0];
          localStorage.setItem(STORE_USER, currentUsername);
          localStorage.setItem(STORE_DISPLAY, currentDisplay);
          initApp();
        } else {
          authErr.textContent = data.message || 'Ошибка входа';
        }
      } catch (err) {
        authErr.textContent = 'Ошибка сервера';
      }
    });
  }

  function updateWho() {
    if ($('#whoName')) $('#whoName').textContent = currentSender;
    if ($('#whoBadge')) $('#whoBadge').textContent = currentSender ? currentSender.charAt(0) : '?';
    if ($('#profileInfo')) $('#profileInfo').textContent = 'Логин: @' + currentUsername + '\nИмя: ' + currentDisplay;
  }

  // Рендер списка чатов
  function renderList() {
    var box = $('#chatList');
    if (!box) return;
    box.textContent = '';
    if (!state.chats.length) {
      box.appendChild(el('p', 'wnote', 'Чатов пока нет. Нажмите «+»'));
      return;
    }
    state.chats.forEach(function (c) {
      var b = el('div', 'paper card');
      if (selectedChatIds.indexOf(c.id) >= 0) b.classList.add('selected');

      b.appendChild(el('span', 'ntag', c.title));
      var last = c.msgs.length ? c.msgs[c.msgs.length - 1] : null;
      b.appendChild(el('span', 'body clamp', last ? last.sender + ': ' + last.text : 'Пока пусто'));

      b.addEventListener('click', function () {
        openChat(c);
      });
      b.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        toggleSelectChat(c.id);
      });
      box.appendChild(b);
    });
    $('#listActions').hidden = selectedChatIds.length === 0;
  }

  function toggleSelectChat(id) {
    var idx = selectedChatIds.indexOf(id);
    if (idx >= 0) selectedChatIds.splice(idx, 1);
    else selectedChatIds.push(id);
    renderList();
  }

  // Рендер сообщений
  function renderMsgs() {
    if (!msgsEl || !cur) return;
    msgsEl.textContent = '';
    if (!cur.msgs.length) {
      msgsEl.appendChild(el('p', 'wnote', 'Сообщений пока нет. Напишите первую реплику!'));
      return;
    }
    cur.msgs.forEach(function (m) {
      var d = el('div', 'paper msg');
      if (selectedMsgIds.indexOf(m._id) >= 0) d.classList.add('selected');
      paint(d, m.sender);

      var topRow = el('div', 'msg-header');
      topRow.appendChild(el('span', 'ntag', m.sender));

      var infoSpan = document.createElement('span');
      infoSpan.className = 'msg-username';
      var timeStr = m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      infoSpan.textContent = (m.username ? '@' + m.username : '') + (timeStr ? ' ' + timeStr : '');
      topRow.appendChild(infoSpan);

      d.appendChild(topRow);
      d.appendChild(el('div', 'body', m.text));

      d.addEventListener('click', function () {
        if (m._id) toggleSelectMsg(m._id);
      });
      msgsEl.appendChild(d);
    });
    msgsEl.scrollTop = msgsEl.scrollHeight;
    $('#msgActions').hidden = selectedMsgIds.length === 0;
  }

  function toggleSelectMsg(id) {
    var idx = selectedMsgIds.indexOf(id);
    if (idx >= 0) selectedMsgIds.splice(idx, 1);
    else selectedMsgIds.push(id);
    renderMsgs();
  }

  function openChat(c) {
    cur = c;
    selectedMsgIds = [];
    if ($('#chatTitle')) $('#chatTitle').textContent = c.title;
    go('chat');
    renderMsgs();
  }

  // Выпадающее меню персонажей
  function renderDrop() {
    if (!drop) return;
    drop.textContent = '';
    myCharacters.forEach(function (n) {
      var b = el('button', 'pill mini'); b.type = 'button';
      b.appendChild(el('span', 'badge', n.charAt(0)));
      b.appendChild(el('span', 'nm', n));
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        currentSender = n;
        updateWho();
        closeDrop();
        if (input) input.focus();
      });
      drop.appendChild(b);
    });
  }
  function openDrop() { renderDrop(); if (drop) drop.hidden = false; }
  function closeDrop() { if (drop) drop.hidden = true; }

  var whoBtn = $('#whoBtn');
  if (whoBtn) {
    whoBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (drop.hidden) openDrop(); else closeDrop();
    });
  }
  document.addEventListener('click', function (e) {
    if (drop && !drop.hidden && !e.target.closest('#drop') && !e.target.closest('#whoBtn')) closeDrop();
  });

  // Изменение названия чата по клику
  var chatTitleEl = $('#chatTitle');
  if (chatTitleEl) {
    chatTitleEl.addEventListener('click', function () {
      if (!cur) return;
      var newTitle = prompt('Введите новое название чата:', cur.title);
      if (newTitle && newTitle.trim()) {
        cur.title = newTitle.trim().slice(0, 40);
        chatTitleEl.textContent = cur.title;
        renderList();
      }
    });
  }

  // Отправка сообщения
  var composer = $('#composer');
  if (composer) {
    composer.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!input) return;
      var t = input.value.trim();
      if (!t || !cur || !currentUsername) return;

      socket.emit('chat message', {
        chat: cur.id,
        title: cur.title,
        sender: currentSender,
        username: currentUsername,
        text: t.slice(0, MAX_TEXT)
      });
      input.value = '';
      input.focus();
    });
  }

  // Модальное окно подтверждения
  var modal = $('#modalConfirm');
  function askConfirm(action) {
    pendingDeleteAction = action;
    modal.hidden = false;
  }
  $('#modalNo').addEventListener('click', function () {
    modal.hidden = true;
    pendingDeleteAction = null;
  });
  $('#modalYes').addEventListener('click', function () {
    modal.hidden = true;
    if (typeof pendingDeleteAction === 'function') pendingDeleteAction();
    pendingDeleteAction = null;
  });

  // Удаление выбранных
  $('#deleteMsgsBtn').addEventListener('click', function () {
    askConfirm(function () {
      selectedMsgIds.forEach(function (id) {
        socket.emit('delete message', id);
      });
      selectedMsgIds = [];
      $('#msgActions').hidden = true;
    });
  });

  $('#deleteChatsBtn').addEventListener('click', function () {
    askConfirm(function () {
      selectedChatIds.forEach(function (id) {
        socket.emit('delete chat', id);
      });
      selectedChatIds = [];
      $('#listActions').hidden = true;
    });
  });

  // Сокеты
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
      c.msgs.push(item);
    });

    if (!cur) cur = state.chats[0];
    if (currentUsername) {
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
    c.msgs.push(data);
    if (c.msgs.length > MAX_STORED) c.msgs.shift();

    if (chatIsOpen() && cur.id === c.id) renderMsgs();
    renderList();
  });

  socket.on('delete message', function (msgId) {
    state.chats.forEach(function (c) {
      c.msgs = c.msgs.filter(function (m) { return m._id !== msgId; });
    });
    if (cur) renderMsgs();
    renderList();
  });

  socket.on('delete chat', function (chatId) {
    state.chats = state.chats.filter(function (c) { return c.id !== chatId; });
    if (cur && cur.id === chatId) {
      cur = state.chats[0] || null;
      if (cur) openChat(cur); else go('list');
    }
    renderList();
  });

  // Профиль и персонажи
  function renderProfile() {
    updateWho();
    var ul = $('#namesList');
    if (!ul) return;
    ul.textContent = '';
    myCharacters.forEach(function (n, idx) {
      var li = el('li', 'pill mini');
      li.style.display = 'flex'; li.style.justifyContent = 'space-between'; li.style.alignItems = 'center';
      li.appendChild(el('span', 'nm', n));

      var delBtn = el('button', 'chip');
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', async function () {
        if (myCharacters.length <= 1) { alert('Нужно оставить хотя бы одного персонажа!'); return; }
        myCharacters.splice(idx, 1);
        if (currentSender === n) currentSender = myCharacters[0];
        await saveChars();
        renderProfile();
      });
      li.appendChild(delBtn);
      ul.appendChild(li);
    });
  }

  async function saveChars() {
    try {
      await fetch('/api/update-chars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUsername, characters: myCharacters })
      });
    } catch (err) {}
  }

  var addNameForm = $('#addName');
  if (addNameForm) {
    addNameForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var nameInp = $('#newName');
      var val = nameInp.value.trim();
      if (!val || myCharacters.indexOf(val) >= 0) return;
      myCharacters.push(val);
      nameInp.value = '';
      await saveChars();
      renderProfile();
    });
  }

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

  if ($('#openProfile')) $('#openProfile').addEventListener('click', function () { renderProfile(); go('profile'); });
  if ($('#openProfileBottom')) $('#openProfileBottom').addEventListener('click', function () { renderProfile(); go('profile'); });
  document.querySelectorAll('[data-back]').forEach(function (b) { b.addEventListener('click', back); });

  var logoutBtn = $('#logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      localStorage.removeItem(STORE_USER);
      localStorage.removeItem(STORE_DISPLAY);
      currentUsername = null;
      currentDisplay = null;
      stack = ['auth'];
      showOnly('auth');
    });
  }

  function initApp() {
    updateWho();
    stack = ['list'];
    showOnly('list');
    if (!cur) cur = state.chats[0];
    renderList();
  }

  if (currentUsername) {
    initApp();
  } else {
    showOnly('auth');
  }
})();

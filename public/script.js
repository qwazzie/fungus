(function () {
  // Инициализация WebSocket соединения с сервером
  var socket = io();

  var NAMES = ['РИН 🍄', 'КВАС 💧', 'КИРОСИН 🔥', 'МАФ 🌿', 'БАРАБАН 🥁', 'НИЯ 🍄'];
  var HUES = [
    { b: '#3b4ca6', f: '#c8d2f0', l: '#d6dcf0' },
    { b: '#a8386a', f: '#f1cadd', l: '#f0d6e3' },
    { b: '#2f7d3b', f: '#cdeacf', l: '#d5e9d7' },
    { b: '#a8691a', f: '#f3dfb9', l: '#f1e2c8' },
    { b: '#6a3aa6', f: '#dcccf0', l: '#e1d6f0' },
    { b: '#1d7f87', f: '#c6e8ea', l: '#d2e8ea' }
  ];
  var hueIdx = new Map(), hueNext = 0;
  function hue(n) {
    if (!hueIdx.has(n)) { hueIdx.set(n, hueNext % HUES.length); hueNext += 1; }
    return HUES[hueIdx.get(n)];
  }
  function paint(node, n) {
    if (!n) return;
    var c = hue(n);
    node.style.setProperty('--b', c.b);
    node.style.setProperty('--f', c.f);
    node.style.setProperty('--l', c.l);
  }
  NAMES.forEach(hue);

  var photo = null;
  var chats = [
    { id: 1, title: 'ГРИБОНИКА ОБЩИЙ', msgs: [] }
  ];
  var cur = chats[0], who = NAMES[0], stack = ['list'];

  var $ = function (s) { return document.querySelector(s); };
  var screens = { list: $('#s-list'), settings: $('#s-settings'), info: $('#s-info'), profile: $('#s-profile'), chat: $('#s-chat') };
  var drop = $('#drop'), whoBtn = $('#who'), input = $('#text'), msgsEl = $('#msgs');

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function showOnly(name) {
    closeDrop();
    Object.keys(screens).forEach(function (k) { screens[k].hidden = (k !== name); });
  }
  function go(name) { stack.push(name); showOnly(name); }
  function back() { if (stack.length > 1) stack.pop(); showOnly(stack[stack.length - 1]); }

  function renderList() {
    var box = $('#chatList');
    box.textContent = '';
    chats.forEach(function (c) {
      var b = el('button', 'paper card'); b.type = 'button';
      b.appendChild(el('span', 'ntag', c.title));
      var last = c.msgs.length ? c.msgs[c.msgs.length - 1] : null;
      b.appendChild(el('span', 'body clamp', last ? last.n + ': ' + last.t : 'Сообщений пока нет'));
      b.addEventListener('click', function () { openChat(c); });
      box.appendChild(b);
    });
  }

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
    $('#whoName').textContent = who || 'Имя';
    $('#whoBadge').textContent = who ? who.charAt(0) : '?';
    $('#draftTag').textContent = who || 'Имя';
    paint($('#draft'), who);
  }

  function renderDrop() {
    drop.textContent = '';
    NAMES.forEach(function (n) {
      var b = el('button', 'pill mini'); b.type = 'button';
      b.setAttribute('role', 'option');
      b.setAttribute('aria-selected', n === who ? 'true' : 'false');
      b.appendChild(el('span', 'badge', n.charAt(0)));
      b.appendChild(el('span', 'nm', n));
      b.addEventListener('click', function () { who = n; updateWho(); closeDrop(); input.focus(); });
      drop.appendChild(b);
    });
  }
  function openDrop() { renderDrop(); drop.hidden = false; whoBtn.setAttribute('aria-expanded', 'true'); }
  function closeDrop() { drop.hidden = true; whoBtn.setAttribute('aria-expanded', 'false'); }

  whoBtn.addEventListener('click', function () { if (drop.hidden) openDrop(); else closeDrop(); });

  // ОТПРАВКА СООБЩЕНИЯ НА СЕРВЕРчерез Socket.io
  $('#composer').addEventListener('submit', function (e) {
    e.preventDefault();
    var t = input.value.trim();
    if (!t || !cur) return;
    if (!who) { openDrop(); return; }

    // Передаем данные серверу
    socket.emit('chat message', { n: who, t: t });
    input.value = '';
    input.focus();
  });

  // ПОЛУЧЕНИЕ СООБЩЕНИЯ С СЕРВЕРА В РЕАЛЬНОМ ВРЕМЕНИ
  socket.on('chat message', function (data) {
    cur.msgs.push({ n: data.n, t: data.t });
    renderMsgs();
    renderList();
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      $('#composer').requestSubmit();
    }
  });

  $('#openSettings').addEventListener('click', function () { go('settings'); });
  $('#openInfo').addEventListener('click', function () { go('info'); });
  $('#openProfile').addEventListener('click', function () { renderProfile(); go('profile'); });
  document.querySelectorAll('[data-back]').forEach(function (b) { b.addEventListener('click', back); });

  var errEl = $('#nameErr'), newName = $('#newName');

  function renderProfile() {
    var av = $('#avatar');
    av.textContent = '';
    if (photo) {
      var im = document.createElement('img');
      im.src = photo; im.alt = 'Фото профиля';
      av.appendChild(im);
    } else {
      av.innerHTML = '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>';
    }
    $('#clearPhoto').hidden = !photo;

    var ul = $('#namesList');
    ul.textContent = '';
    NAMES.forEach(function (n, i) {
      var li = el('li', 'pill mini');
      li.appendChild(el('span', 'badge', n.charAt(0)));
      li.appendChild(el('span', 'nm', n));
      var b = el('button', 'chip'); b.type = 'button';
      b.innerHTML = '<svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
      b.addEventListener('click', function () {
        NAMES.splice(i, 1);
        if (who === n) { who = NAMES[0] || null; updateWho(); }
        renderProfile();
      });
      li.appendChild(b);
      ul.appendChild(li);
    });
  }

  $('#addName').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = newName.value.trim();
    if (!v) return;
    NAMES.push(v);
    hue(v);
    if (!who) { who = v; updateWho(); }
    newName.value = '';
    renderProfile();
  });

  updateWho();
  renderProfile();
  renderList();
})();
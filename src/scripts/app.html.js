export const appHtml = `
<div class="auth-screen" id="authScreen" hidden>
  <section class="auth-card" role="dialog" aria-label="Вход в аккаунт">
    <div class="auth-brand">Fungusroom</div>
    <h1 id="authTitle">Вход в аккаунт</h1>
    <p class="auth-lead" id="authLead">Войдите, чтобы открыть свои чаты и персонажей.</p>
    <form id="authForm">
      <label class="auth-field auth-display-field" hidden>Отображаемое имя<input id="authDisplayName" type="text" autocomplete="name" placeholder="Как вас показывать в чатах"></label>
      <label class="auth-field">Имя пользователя<input id="authUsername" type="text" autocomplete="username" required placeholder="@kvas" spellcheck="false"></label>
      <label class="auth-field">Пароль<input id="authPassword" type="password" autocomplete="current-password" minlength="1" required placeholder="Любой пароль"></label>
      <p class="auth-error" id="authError" role="alert"></p>
      <button class="auth-submit" id="authSubmit" type="submit">Войти</button>
    </form>
    <button class="auth-switch" id="authSwitch" type="button">Нет аккаунта? Зарегистрироваться</button>
  </section>
</div>
<div class="app" hidden>

  <aside class="side">
    <div class="side-top">
      <b>Чаты</b>
      <button class="icon-btn settings-trigger" id="settingsBtn" title="Настройки" aria-label="Настройки"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/></svg></button>
      <button class="icon-btn" id="addChatBtn" title="Добавить чат" aria-label="Добавить чат"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>
    </div>
    <div class="chats" id="chatsList"></div>
    <button class="profile" id="profileBtn">
      <span class="ava">Я</span>
      <span><b>Профиль и персонажи</b><small>0 персонажей</small></span>
    </button>
  </aside>

  <section class="main">
    <header class="head"><button class="mobile-back" id="mobileBack" title="Открыть чаты" aria-label="Открыть чаты"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7M8 12h12"/></svg></button><div class="title" id="chatTitle"></div></header>
    <div class="select-bar" id="selectBar"><span class="select-count" id="selectCount"></span><div class="select-actions"><button id="selectCopy"><svg viewBox="0 0 24 24"><path d="M8 8h11v11H8zM5 16H4V4h12v1"/></svg>Копировать</button><button id="selectForward"><svg viewBox="0 0 24 24"><path d="M12 5l7 7-7 7M5 12h14"/></svg>Переслать</button><button id="selectDelete" class="danger" style="color:#b42318"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>Удалить</button><button id="selectCancel"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>Отмена</button></div></div>

    <div class="stage">
    <div class="feed">
      <div class="pk-scrim" id="pkScrim" hidden></div>
      <div class="picker" id="picker" hidden>
        <div class="pk-list" id="pkList" role="listbox" aria-label="Отправитель">
        </div>
        <div class="pk-foot"><span id="pkCnt"></span><button class="ed-btn" id="pkCol">Свернуть</button></div>
        <button class="pk-exp" id="pkExp">Развернуть</button>
        <span class="pk-tail"></span><span class="pk-tail in"></span>
      </div>

      <div class="ed-wrap" id="edWrap" hidden>
        <section class="editor" id="editor" role="dialog" aria-label="Редактор текста">
          <div class="ed-top">
            <div class="tb" id="tb">
              <button data-cmd="bold" title="Жирный"><b>Ж</b></button>
              <button data-cmd="italic" title="Курсив"><i>К</i></button>
              <button data-cmd="underline" title="Подчёркнутый"><u>Ч</u></button>
              <button data-cmd="strikeThrough" title="Зачёркнутый"><s>З</s></button>
              <span class="sep"></span>
              <button data-cmd="formatBlock" data-val="h2" title="Заголовок">H</button>
              <button data-cmd="formatBlock" data-val="blockquote" title="Цитата"><svg viewBox="0 0 24 24"><path d="M5 18v-5a5 5 0 0 1 5-5M14 18v-5a5 5 0 0 1 5-5"/></svg></button>
              <button data-cmd="formatBlock" data-val="pre" title="Код">&lt;/&gt;</button>
              <span class="sep"></span>
              <button data-cmd="insertUnorderedList" title="Маркированный список"><svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg></button>
              <button data-cmd="insertOrderedList" title="Нумерованный список"><svg viewBox="0 0 24 24"><path d="M10 6h10M10 12h10M10 18h10"/><text x="2" y="8" font-size="7" fill="currentColor" stroke="none">1</text><text x="2" y="14" font-size="7" fill="currentColor" stroke="none">2</text><text x="2" y="20" font-size="7" fill="currentColor" stroke="none">3</text></svg></button>
              <button data-cmd="insertHorizontalRule" title="Разделитель">―</button>
              <span class="sep"></span>
              <button data-cmd="clean" title="Сбросить форматирование">T<small>x</small></button>
            </div>
            <button class="ed-q md" id="edRawBtn" aria-pressed="false" title="Показать разметку (**слово** вместо жирного)" aria-label="Показать разметку">MD</button>
            <button class="ed-q" id="edHelp" aria-expanded="false" title="Справка о форматировании" aria-label="Справка о форматировании">?</button>
            <button class="ed-x" id="edX" title="Закрыть окно" aria-label="Закрыть окно"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
          </div>
          <div class="ed-area" id="edArea" contenteditable="true" data-ph="Пишите или вставьте текст сюда"></div>
          <textarea class="ed-raw" id="edRawArea" hidden spellcheck="false" placeholder="Текст с разметкой"></textarea>
          <div class="ed-foot">
            <span id="cnt">Символов: 0</span>
            <button class="ed-btn" id="edClear">Очистить</button>
            <button class="ed-btn pri" id="edDone">Готово</button>
          </div>
          <div class="help" id="edHelpPanel" hidden>
            <div class="help-h">Справка о форматировании</div>
            <table>
              <thead><tr><th>Результат</th><th>Запись</th><th>Клавиши</th></tr></thead>
              <tbody>
                <tr><td><b>жирный</b></td><td><code>**жирный**</code></td><td>Ctrl+B</td></tr>
                <tr><td><i>курсив</i></td><td><code>*курсив*</code></td><td>Ctrl+I</td></tr>
                <tr><td><u>подчёркнутый</u></td><td><code>__подчёркнутый__</code></td><td>Ctrl+U</td></tr>
                <tr><td><s>зачёркнутый</s></td><td><code>~~зачёркнутый~~</code></td><td>—</td></tr>
                <tr><td><b>Заголовок</b></td><td><code># Заголовок</code></td><td>—</td></tr>
                <tr><td>Цитата</td><td><code>&gt; цитата</code></td><td>—</td></tr>
                <tr><td>Блок кода</td><td><code>\`\`\`код\`\`\`</code></td><td>—</td></tr>
                <tr><td>Список</td><td><code>- пункт</code></td><td>—</td></tr>
                <tr><td>Нумерованный</td><td><code>1. пункт</code></td><td>—</td></tr>
                <tr><td>Разделитель</td><td><code>---</code></td><td>—</td></tr>
              </tbody>
            </table>
            <p class="help-n">Запись работает прямо при наборе: напиши **слово**, и оно станет жирным. В начале строки «# », «> », «- » и «1. » дают заголовок, цитату и списки, «\`\`\`» открывает блок кода, а «---» и Enter ставят разделитель. Кнопка &lt;/&gt; включает режим кода, повторное нажатие его выключает. Shift+Enter переносит строку внутри кода. Кнопка MD показывает текст со знаками разметки, его можно править прямо так.</p>
          </div>
          <span class="tail"></span>
        </section>
      </div>
    </div>

    <footer class="composer">
      <div class="reply-preview" id="replyPreview" hidden><div class="reply-quote"><div class="rq-name" id="rqName"></div><div class="rq-text" id="rqText"></div></div><button class="reply-cancel" id="replyCancel" title="Отменить ответ" aria-label="Отменить ответ"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
      <div class="bar">
        <button class="cell sender" id="senderBtn" aria-haspopup="listbox" aria-expanded="false" title="Выбрать отправителя" aria-label="Выбрать отправителя">
          <span class="ava">Я</span>
          <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <textarea id="t" rows="1" placeholder="Введите сообщение"></textarea>
        <div class="mention-box" id="mentionBox" hidden role="listbox" aria-label="Упоминания"></div>
        <button class="cell end" id="edBtn" aria-expanded="false" title="Расширенный редактор текста" aria-label="Расширенный редактор текста">
          <svg viewBox="0 0 24 24"><path d="M5 19L11 5l6 14M7.5 14h7M19 5v6M16 8h6" /></svg>
        </button>
      </div>
      <button class="send">Отправить</button>
    </footer>
  </section>

  <div class="pf-wrap" id="pfWrap" hidden>
    <section class="pf" role="dialog" aria-label="Профиль и персонажи">
      <div class="pf-top">
        <b>Профиль и персонажи</b>
        <button class="icon-btn" id="pfX" title="Закрыть" aria-label="Закрыть"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
      <div class="pf-body">
        <div class="pf-sec">
          <h3>Мой профиль</h3>
          <div class="pf-me">
            <label class="avatar-upload" title="Изменить аватар"><span class="ava" id="pfMeAva">Я</span><input class="avatar-file" id="pfMeFile" type="file" accept="image/*"></label>
            <div class="pf-names">
              <input class="pf-input" id="pfMeInput" type="text" value="Я" placeholder="Отображаемое имя">
              <input class="pf-input pf-un" id="pfMeUnInput" type="text" value="@ya" placeholder="@username" pattern="@[A-Za-z0-9_]+" autocomplete="off"><span class="field-error" id="pfMeUnError"></span>
              <input class="pf-input" id="pfMeDescInput" type="text" placeholder="Описание профиля">
            </div>
          </div>
        </div>
        <div class="pf-sec">
          <h3>Персонажи</h3>
          <div class="pf-list" id="pfCharList"></div>
          <button class="pf-add" id="pfAdd"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Добавить персонажа</button>
        </div>
      </div>
      <div class="pf-foot">
        <button class="ed-btn danger" id="signOutBtn" type="button">Выйти</button>
        <button class="ed-btn pri" id="pfDone">Готово</button>
      </div>
    </section>
  </div>

  <div class="pf-wrap person-modal" id="personModal" hidden>
    <section class="person-card" role="dialog" aria-label="Профиль пользователя или персонажа">
      <button class="person-close icon-btn" id="personClose" title="Закрыть" aria-label="Закрыть">×</button>
      <div class="person-identity">
        <span class="ava person-ava" id="personAva"></span>
        <small class="person-activity" id="personActivity"></small>
      </div>
      <div class="person-info"><b id="personName"></b><small id="personUsername"></small></div>
      <div class="person-description"><span>Описание</span><p id="personDescription"></p></div>
      <div class="person-actions">
        <button class="ed-btn" id="personEdit" hidden>Изменить профиль</button>
        <button class="ed-btn pri" id="personMessage">Написать сообщение</button>
      </div>
    </section>
  </div>

  <div class="pf-wrap chat-modal" id="chatModal" hidden>
    <section class="pf" role="dialog" aria-label="Новый чат">
      <div class="pf-top chat-modal-top">
        <div class="chat-mode-switch" role="tablist" aria-label="Тип переписки">
          <button class="chat-mode active" data-mode="chat" role="tab" aria-selected="true">Новый чат</button>
          <button class="chat-mode" data-mode="direct" role="tab" aria-selected="false">Личные сообщения</button>
        </div>
        <b id="chatModalTitle" hidden>Новый чат</b>
        <button class="icon-btn" id="chatModalX" title="Закрыть" aria-label="Закрыть"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
      <div class="pf-body">
        <div class="chat-fields">
          <div class="chat-main-row">
            <label class="chat-avatar-block" title="Изменить аватар"><span>Аватар</span><span class="ava" id="chatAvatarPreview">?</span><input class="avatar-file" id="chatAvatarFile" type="file" accept="image/*"></label>
            <label class="chat-field">Название чата <input class="pf-input" id="chatNameInput" type="text" placeholder="Название чата"></label>
          </div>
          <label class="chat-field" id="chatDescriptionField">Описание <textarea class="pf-input chat-description-input" id="chatDescriptionInput" rows="3" placeholder="Короткое описание чата"></textarea></label>
          <label class="chat-field" id="chatLinkField">Ссылка для чата <input class="pf-input chat-link-input" id="chatLinkInput" type="text" placeholder="@latinskayassylka" autocomplete="off" pattern="@[A-Za-z0-9_]+"><span class="field-error" id="chatLinkError" role="alert"></span></label>
          <div class="chat-field chat-members-field"><span>Участники</span><div class="chat-members" id="chatMembers"></div><small class="chat-members-hint" id="chatMembersHint"></small></div>
          <label class="chat-pin" id="chatPinField"><input id="chatPinnedInput" type="checkbox"> Закрепить чат</label>
        </div>
      </div>
      <div class="pf-foot">
        <button class="ed-btn danger" id="chatDelete" hidden>Удалить</button>
        <button class="ed-btn" id="chatCancel">Отмена</button>
        <button class="ed-btn pri" id="chatSave">Готово</button>
      </div>
    </section>
  </div>

  <div class="pf-wrap fwd-modal" id="fwdModal" hidden>
    <section class="pf" role="dialog" aria-label="Переслать сообщение">
      <div class="pf-top"><b>Переслать в чат</b><button class="icon-btn" id="fwdX" title="Закрыть" aria-label="Закрыть"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
      <div class="pf-body"><div class="fwd-list" id="fwdList"></div></div>
    </section>
  </div>

  <div class="msg-menu" id="msgMenu" hidden>
    <button data-action="reply"><svg viewBox="0 0 24 24"><path d="M9 14l-5-5 5-5"/><path d="M4 9h11a5 5 0 0 1 5 5v3"/></svg>Ответить</button>
    <button data-action="forward"><svg viewBox="0 0 24 24"><path d="M12 5l7 7-7 7M5 12h14"/></svg>Переслать</button>
    <button data-action="copy"><svg viewBox="0 0 24 24"><path d="M8 8h11v11H8zM5 16H4V4h12v1"/></svg>Копировать</button>
    <div class="msg-menu-sep"></div>
    <button data-action="edit"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4M13.5 6.5l4 4"/></svg>Изменить</button>
    <button data-action="delete" class="danger"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>Удалить</button>
  </div>

  <div class="settings-wrap" id="settingsWrap" hidden>
    <section class="settings" role="dialog" aria-label="Настройки">
      <div class="pf-top">
        <b>Настройки</b>
        <button class="icon-btn" id="settingsX" title="Закрыть" aria-label="Закрыть"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
      <div class="settings-body">
        <div class="settings-section">
          <h3>Тема оформления</h3>
          <p>Выберите цвет оформления приложения.</p>
          <div class="theme-switch" id="themes" role="group" aria-label="Тема оформления">
            <button data-theme="white" class="theme-option on" title="Белая" aria-label="Белая тема"><span></span>Белая</button>
            <button data-theme="black" class="theme-option" title="Чёрная" aria-label="Чёрная тема"><span></span>Чёрная</button>
            <button data-theme="retro" class="theme-option" title="Ретро" aria-label="Ретро тема"><span></span>Ретро</button>
          </div>
        </div>
        <div class="settings-section about-section">
          <h3>О приложении</h3>
          <p>Fungusroom — спокойное пространство для личных переписок, персонажей и творческих диалогов.</p>
          <div class="about-card">
            <div><b>Версия</b><span>1.0</span></div>
            <div><b>Возможности</b><span>Чаты, персонажи, форматирование и темы оформления</span></div>
            <div><b>Подсказка</b><span>Зажмите сообщение, чтобы открыть дополнительные действия.</span></div>
          </div>
        </div>
      </div>
    </section>
  </div>

</div>
`;


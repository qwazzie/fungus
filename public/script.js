const socket = io();

const menuToggle = document.getElementById('menuToggle');
const dropdownMenu = document.getElementById('dropdownMenu');
const sendBtn = document.getElementById('sendBtn');
const messageInput = document.getElementById('messageInput');
const senderSelect = document.getElementById('senderSelect');
const chatMessages = document.getElementById('chatMessages');
const avatarToggle = document.getElementById('avatarToggle');

// Открытие/закрытие меню по клику на грибочек
menuToggle.addEventListener('click', () => {
    dropdownMenu.classList.toggle('hidden');
});

// Отправка сообщения
function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    const sender = senderSelect.value;

    // Отправляем данные на сервер через сокет
    socket.emit('chat message', { sender, text });
    messageInput.value = '';
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Получение сообщения от сервера
socket.on('chat message', (data) => {
    const bubble = document.createElement('div');
    bubble.classList.add('message-bubble');

    bubble.innerHTML = `
        <div class="msg-author">${data.sender}</div>
        <div class="msg-text">${escapeHtml(data.text)}</div>
    `;

    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Защита от XSS
function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

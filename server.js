const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Раздаем статику из папки public
app.use(express.static('public'));

// ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ MONGODB
const MONGO_URL = process.env.MONGO_URL || '';

if (MONGO_URL) {
  mongoose.connect(MONGO_URL)
    .then(() => console.log('Успешно подключено к MongoDB!'))
    .catch(err => console.error('Ошибка подключения к MongoDB:', err));
} else {
  console.log('Внимание: MONGO_URL не задана, база данных отключена.');
}

// Схема сообщения для базы данных
const messageSchema = new mongoose.Schema({
  chat: { type: String, default: 'main' },
  title: { type: String, default: 'ГРИБОНИКА ОБЩИЙ' },
  sender: String,
  text: String,
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// Логика веб-сокетов
io.on('connection', async (socket) => {
  console.log('Пользователь на связи:', socket.id);

  // При подключении отправляем всю историю сообщений клиенту
  try {
    if (MONGO_URL) {
      const history = await Message.find().sort({ createdAt: 1 }).limit(300);
      socket.emit('init history', history);
    }
  } catch (err) {
    console.error('Ошибка загрузки истории:', err);
  }

  // Принимаем сообщение от клиента
  socket.on('chat message', async (data) => {
    try {
      const chat = data.chat || 'main';
      const title = data.title || 'ГРИБОНИКА ОБЩИЙ';
      const sender = data.sender || data.n || 'Аноним';
      const text = data.text || data.t || '';

      if (!text.trim()) return;

      // Если подключена база — сохраняем туда
      if (MONGO_URL) {
        const newMessage = new Message({ chat, title, sender, text });
        await newMessage.save();
      }

      // Рассылаем сообщение всем участникам (включая отправителя)
      io.emit('chat message', { chat, title, sender, text });
    } catch (err) {
      console.error('Ошибка сохранения сообщения:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Пользователь отключился:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Грибофон запущен на порту ${PORT}`);
});

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Раздаем статику из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Подключение к MongoDB Atlas
const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error('КРИТИЧЕСКАЯ ОШИБКА: Не задана переменная окружения MONGO_URL!');
  process.exit(1);
}

mongoose.connect(MONGO_URL)
  .then(() => console.log('Успешно подключено к MongoDB!'))
  .catch(err => {
    console.error('Ошибка подключения к MongoDB:', err);
    process.exit(1);
  });

// Схема сообщения в базе данных
const messageSchema = new mongoose.Schema({
  chat: { type: String, default: 'main' },
  title: { type: String, default: 'ГРИБОНИКА ОБЩИЙ' },
  sender: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// Логика веб-сокетов
io.on('connection', async (socket) => {
  console.log('Пользователь подключился');

  try {
    // При входе отправляем клиенту всю историю из базы (до 300 сообщений)
    const history = await Message.find().sort({ createdAt: 1 }).limit(300);
    socket.emit('init history', history);
  } catch (err) {
    console.error('Ошибка при загрузке истории:', err);
  }

  // Получение нового сообщения от клиента
  socket.on('chat message', async (data) => {
    if (!data || !data.text || !data.sender) return;

    try {
      // Сохраняем в базу данных
      const newMessage = new Message({
        chat: data.chat || 'main',
        title: data.title || 'ГРИБОНИКА ОБЩИЙ',
        sender: data.sender,
        text: data.text
      });
      await newMessage.save();

      // Рассылаем всем подключенным пользователям
      io.emit('chat message', newMessage);
    } catch (err) {
      console.error('Ошибка при сохранении сообщения:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Пользователь отключился');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

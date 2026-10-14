const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Раздаем статику
app.use(express.static('public'));

// ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ (вставь свою строку из MongoDB Atlas вместо ссылки ниже)
const MONGO_URL = process.env.MONGO_URL || 'mongodb+srv://lololololoh410_db_userlololololoh410_db_user@cluster0.szxmv3r.mongodb.net/?appName=Cluster0';

mongoose.connect(MONGO_URL)
  .then(() => console.log('Успешно подключено к базе данных!'))
  .catch(err => console.error('Ошибка подключения к БД:', err));

// Схема сообщения для базы данных
const messageSchema = new mongoose.Schema({
  n: String, // Автор
  t: String, // Текст
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// Логика сокетов
io.on('connection', async (socket) => {
  console.log('Пользователь на связи:', socket.id);

  // При подключении сразу отправляем историю последних 50 сообщений
  try {
    const history = await Message.find().sort({ createdAt: 1 }).limit(50);
    socket.emit('init history', history);
  } catch (err) {
    console.error('Ошибка загрузки истории:', err);
  }

  // Принимаем новое сообщение
  socket.on('chat message', async (data) => {
    try {
      // Сохраняем в базу данных
      const newMessage = new Message({ n: data.n, t: data.t });
      await newMessage.save();

      // Рассылаем всем подключенным
      io.emit('chat message', data);
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

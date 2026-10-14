const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

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

// Схема пользователя (аккаунта)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// Схема сообщения
const messageSchema = new mongoose.Schema({
  chat: { type: String, default: 'main' },
  title: { type: String, default: 'ГРИБОНИКА ОБЩИЙ' },
  sender: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// REST API для регистрации и входа
app.post('/api/auth', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Заполните все поля' });
    }

    let user = await User.findOne({ username });
    if (user) {
      // Если пользователь существует, проверяем пароль
      if (user.password !== password) {
        return.status(400).json({ success: false, message: 'Неверный пароль' });
      }
      return res.json({ success: true, username: user.username });
    } else {
      // Если пользователя нет — создаем новый аккаунт автоматически
      user = new User({ username, password });
      await user.save();
      return res.json({ success: true, username: user.username });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// Веб-сокеты
io.on('connection', async (socket) => {
  console.log('Пользователь подключился');

  try {
    const history = await Message.find().sort({ createdAt: 1 }).limit(300);
    socket.emit('init history', history);
  } catch (err) {
    console.error('Ошибка при загрузке истории:', err);
  }

  socket.on('chat message', async (data) => {
    if (!data || !data.text || !data.sender) return;

    try {
      const newMessage = new Message({
        chat: data.chat || 'main',
        title: data.title || 'ГРИБОНИКА ОБЩИЙ',
        sender: data.sender,
        text: data.text
      });
      await newMessage.save();
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

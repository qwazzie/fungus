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

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  displayName: { type: String, required: true },
  characters: { type: [String], default: ['Электробанан'] }
});
const User = mongoose.model('User', userSchema);

const messageSchema = new mongoose.Schema({
  chat: { type: String, default: 'main' },
  title: { type: String, default: 'ГРИБОНИКА ОБЩИЙ' },
  sender: { type: String, required: true },
  username: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// Авторизация
app.post('/api/auth', async (req, res) => {
  try {
    const { username, password, displayName } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Заполните поля' });

    let user = await User.findOne({ username });
    if (user) {
      if (user.password !== password) return res.status(400).json({ success: false, message: 'Неверный пароль' });
      return res.json({ success: true, username: user.username, displayName: user.displayName, characters: user.characters });
    } else {
      user = new User({
        username,
        password,
        displayName: displayName || '@' + username,
        characters: [displayName || username]
      });
      await user.save();
      return res.json({ success: true, username: user.username, displayName: user.displayName, characters: user.characters });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// Обновление персонажей пользователя
app.post('/api/update-chars', async (req, res) => {
  try {
    const { username, characters } = req.body;
    await User.findOneAndUpdate({ username }, { characters });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

io.on('connection', async (socket) => {
  try {
    const history = await Message.find().sort({ createdAt: 1 }).limit(500);
    socket.emit('init history', history);
  } catch (err) {
    console.error('Ошибка истории:', err);
  }

  socket.on('chat message', async (data) => {
    if (!data || !data.text || !data.sender) return;
    try {
      const newMessage = new Message({
        chat: data.chat || 'main',
        title: data.title || 'ГРИБОНИКА ОБЩИЙ',
        sender: data.sender,
        username: data.username || 'unknown',
        text: data.text
      });
      await newMessage.save();
      io.emit('chat message', newMessage);
    } catch (err) {
      console.error('Ошибка сохранения:', err);
    }
  });

  // Удаление сообщения
  socket.on('delete message', async (msgId) => {
    try {
      await Message.findByIdAndDelete(msgId);
      io.emit('delete message', msgId);
    } catch (err) {
      console.error('Ошибка удаления сообщения:', err);
    }
  });

  // Удаление чата и всех его сообщений
  socket.on('delete chat', async (chatId) => {
    try {
      await Message.deleteMany({ chat: chatId });
      io.emit('delete chat', chatId);
    } catch (err) {
      console.error('Ошибка удаления чата:', err);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));

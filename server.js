const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Раздаем статику из папки public
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('Пользователь на связи:', socket.id);

    // Принимаем сообщение от одного и рассылаем всем в комнате
    socket.on('chat message', (data) => {
        io.emit('chat message', data);
    });

    socket.on('disconnect', () => {
        console.log('Пользователь отключился:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Грибофон запущен на порту ${PORT}`);
});

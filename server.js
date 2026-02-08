const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

/* 🔥 Render uyumasın diye ping */
app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

app.get('/', (req, res) => {
    res.send('Anonim Chat Server Çalışıyor 🚀');
});

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

/* RAM'de mesajlar */
let messageHistory = [];

io.on('connection', (socket) => {

    // 🔑 Frontend'den gelen anon ID
    let anonId = socket.handshake.auth?.anonId;

    // Geçersizse yeni üret
    if (!anonId || isNaN(anonId) || anonId < 1 || anonId > 2000) {
        anonId = Math.floor(Math.random() * 2000) + 1;
    }

    const userName = `Anonim ${anonId}`;
    console.log(`${userName} bağlandı`);

    socket.emit('set username', userName);
    socket.emit('chat history', messageHistory);

    socket.on('chat message', (msgText) => {
        if (!msgText || !msgText.trim()) return;

        const messageData = {
            id: Math.random().toString(36).substring(2, 11),
            user: userName,
            text: msgText,
            time: new Date().toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Istanbul'
            })
        };

        messageHistory.push(messageData);
        io.emit('chat message', messageData);

        // ⏳ 3 saat sonra sil
        setTimeout(() => {
            messageHistory = messageHistory.filter(m => m.id !== messageData.id);
            io.emit('delete message', messageData.id);
            console.log(`Mesaj silindi: ${messageData.id}`);
        }, 3 * 60 * 60 * 1000);
    });

    socket.on('disconnect', () => {
        console.log(`${userName} ayrıldı`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor`);
});

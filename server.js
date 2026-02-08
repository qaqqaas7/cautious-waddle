const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/ping', (req, res) => res.send('pong'));
app.get('/', (req, res) => res.send('Anonim Chat Aktif 🚀'));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

/* 🔐 AKTİF ANON HAVUZU */
const activeAnons = new Set(); // şu an kullanılan anon numaraları

/* RAM'de mesajlar */
let messageHistory = [];

function getFreeAnon() {
    for (let i = 1; i <= 2000; i++) {
        if (!activeAnons.has(i)) return i;
    }
    return null; // dolu
}

io.on('connection', (socket) => {

    let anonId = Number(socket.handshake.auth?.anonId);

    // Eğer client eski anon gönderdiyse ve boşsa onu ver
    if (anonId && !activeAnons.has(anonId) && anonId >= 1 && anonId <= 2000) {
        // OK
    } else {
        anonId = getFreeAnon();
    }

    if (!anonId) {
        socket.emit('system', 'Sunucu dolu (2000 kişi)');
        socket.disconnect();
        return;
    }

    activeAnons.add(anonId);
    socket.anonId = anonId;

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
        }, 3 * 60 * 60 * 1000);
    });

    socket.on('disconnect', () => {
        console.log(`Anonim ${socket.anonId} ayrıldı`);
        activeAnons.delete(socket.anonId);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () =>
    console.log(`Server ${PORT} portunda`)
);

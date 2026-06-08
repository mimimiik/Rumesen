```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
// Раздаем статические файлы (наш index.html) из папки public
app.use(express.static(path.join(__dirname, 'public')));

// --- БАЗА ДАННЫХ В ПАМЯТИ (In-Memory DB) ---
const db = {
    users: {},     // key: username, value: { id, name, username, pass, avatar, online, socketId }
    chats: {},     // key: chatId, value: { id, type, members: [userIds], name }
    messages: {}   // key: chatId, value: [ { id, from, text, time, ... } ]
};

// --- REST API ДЛЯ АВТОРИЗАЦИИ ---
app.post('/api/register', (req, res) => {
    const { name, username, pass } = req.body;
    const key = username.toLowerCase().replace('@', '');
    if (db.users[key]) return res.status(400).json({ error: 'Пользователь уже существует' });
    if (!name || !username || !pass) return res.status(400).json({ error: 'Заполните все поля' });

    const newUser = { id: key, name, username: '@' + key, pass, avatar: null, online: false, status: 'В сети' };
    db.users[key] = newUser;
    res.json({ token: key, user: newUser });
});

app.post('/api/login', (req, res) => {
    const { username, pass } = req.body;
    const key = username.toLowerCase().replace('@', '');
    const user = db.users[key];
    if (!user || user.pass !== pass) return res.status(400).json({ error: 'Неверный логин или пароль' });
    res.json({ token: key, user });
});

// --- SOCKET.IO ДЛЯ РЕАЛЬНОГО ВРЕМЕНИ ---
io.on('connection', (socket) => {
    let currentUser = null;

    // 1. Аутентификация сокета
    socket.on('auth', (token) => {
        if (db.users[token]) {
            currentUser = db.users[token];
            currentUser.online = true;
            currentUser.socketId = socket.id;

            // Собираем данные пользователя для отправки
            const myChats = Object.values(db.chats).filter(c => c.members.includes(currentUser.id));
            const myMessages = {};
            const contacts = []; // Все контакты, с кем есть чаты
            const contactIds = new Set();

            myChats.forEach(c => {
                socket.join(c.id); // Подключаемся к комнате чата
                myMessages[c.id] = db.messages[c.id] || [];
                c.members.forEach(m => {
                    if (m !== currentUser.id) contactIds.add(m);
                });
            });

            contactIds.forEach(id => {
                if (db.users[id]) contacts.push({ ...db.users[id], pass: undefined }); // Убираем пароль
            });

            socket.emit('auth_success', {
                user: { ...currentUser, pass: undefined },
                chats: myChats,
                messages: myMessages,
                contacts: contacts
            });

            // Оповещаем других, что юзер в сети
            socket.broadcast.emit('user_status', { id: currentUser.id, online: true });
        } else {
            socket.emit('auth_error');
        }
    });

    // 2. Настоящий поиск по базе
    socket.on('search_users', (query, callback) => {
        if (!query) return callback([]);
        const q = query.toLowerCase();
        const results = Object.values(db.users)
            .filter(u => u.id !== currentUser.id && (u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)))
            .map(u => ({ id: u.id, name: u.name, username: u.username, avatar: u.avatar, online: u.online, status: u.status }));
        callback(results);
    });

    // 3. Создание диалога
    socket.on('start_chat', (targetUserId, callback) => {
        // Проверяем, есть ли уже чат
        let chat = Object.values(db.chats).find(c => c.type === 'direct' && c.members.includes(currentUser.id) && c.members.includes(targetUserId));
        
        if (!chat) {
            const targetUser = db.users[targetUserId];
            if (!targetUser) return;
            chat = { id: 'ch_' + Date.now(), type: 'direct', members: [currentUser.id, targetUserId] };
            db.chats[chat.id] = chat;
            db.messages[chat.id] = [];
            
            socket.join(chat.id);
            if (targetUser.socketId) io.sockets.sockets.get(targetUser.socketId)?.join(chat.id);
            
            // Отправляем инфу обоим
            io.to(chat.id).emit('new_chat', { chat, members: [ { ...currentUser, pass: undefined }, { ...targetUser, pass: undefined } ] });
        }
        callback(chat.id);
    });

    // 4. Отправка сообщений
    socket.on('send_message', (data) => {
        const { chatId, text } = data;
        if (!db.chats[chatId] || !db.chats[chatId].members.includes(currentUser.id)) return;

        const msg = {
            id: 'm_' + Date.now(),
            from: currentUser.id,
            text,
            time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }),
            reactions: []
        };
        db.messages[chatId].push(msg);

        // Рассылаем всем в комнате
        io.to(chatId).emit('new_message', { chatId, msg });
    });

    // 5. Отключение
    socket.on('disconnect', () => {
        if (currentUser) {
            currentUser.online = false;
            currentUser.socketId = null;
            io.emit('user_status', { id: currentUser.id, online: false, status: 'был(а) недавно' });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));

```

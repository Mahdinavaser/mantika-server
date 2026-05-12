const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// 1. Setup the Server
const app = express();
app.use(cors()); // Allow connections from the Android app

const server = http.createServer(app);

// 2. Setup Socket.io for Real-Time Chat
const io = new Server(server, {
    cors: {
        origin: "*", // Accepts connection from any device/app
        methods: ["GET", "POST"]
    }
});

// 3. Temporary Database (Memory)
// We will store messages here so when a new student joins, they see old messages.
// (Later we can connect this to MongoDB for permanent storage)
let chatHistory = [];
let pinnedMessage = null;

// 4. Listen for User Connections
io.on('connection', (socket) => {
    console.log('یک کاربر جدید متصل شد:', socket.id);

    // وقتی کاربر وصل شد، تاریخچه پیام‌ها و پیام سنجاق شده را برایش بفرست
    socket.emit('load_history', chatHistory);
    if (pinnedMessage) {
        socket.emit('load_pin', pinnedMessage);
    }

    // گرفتن پیام جدید از کاربر و ارسال به همه
    socket.on('send_message', (msgData) => {
        /* msgData looks like: { id: 'msg-1', text: 'سلام', senderName: 'آرش', role: 'student' } */
        chatHistory.push(msgData);
        
        // io.emit means "send to EVERYONE including the sender"
        io.emit('receive_message', msgData); 
    });

    // گرفتن دستور حذف پیام از سمت استاد
    socket.on('delete_messages', (msgIdsArray) => {
        // حذف پیام‌ها از حافظه سرور
        chatHistory = chatHistory.filter(msg => !msgIdsArray.includes(msg.id));
        // اعلام به همه گوشی‌ها که این پیام‌ها را پاک کنند
        io.emit('messages_deleted', msgIdsArray);
    });

    // گرفتن دستور سنجاق پیام از سمت استاد
    socket.on('pin_message', (msgText) => {
        pinnedMessage = msgText;
        io.emit('message_pinned', msgText);
    });
    
    // برداشتن سنجاق پیام
    socket.on('unpin_message', () => {
        pinnedMessage = null;
        io.emit('message_unpinned');
    });

    // قطع اتصال
    socket.on('disconnect', () => {
        console.log('کاربر خارج شد:', socket.id);
    });
});

// 5. Start the Server
// Liara will automatically provide the PORT environment variable
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 ManTika Server is running on port ${PORT}`);
});

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// 1. Setup the Server
const app = express();
app.use(cors());

const server = http.createServer(app);

// 2. Setup Socket.io for Real-Time Chat
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 3. Temporary Database (Memory)
let chatHistory = [];
let pinnedMessage = null;

// 🟢 NEW: لیست کاربران آنلاین
// فرمت: { socketId: '...', name: 'علی', role: 'student' }
let onlineUsers = []; 

// 4. Listen for User Connections
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // ارسال دیتای اولیه
    socket.emit('load_history', chatHistory);
    if (pinnedMessage) socket.emit('load_pin', pinnedMessage);

    // 🟢 NEW: وقتی یک کاربر مشخصاتش را می‌فرستد (لاگین می‌کند)
    socket.on('user_joined', (userData) => {
        // اضافه کردن به لیست کاربران آنلاین
        const newUser = {
            id: socket.id,
            name: userData.name,
            role: userData.role
        };
        onlineUsers.push(newUser);
        
        // فرستادن لیست آپدیت شده برای همه
        io.emit('online_users_updated', onlineUsers);
    });

    socket.on('send_message', (msgData) => {
        chatHistory.push(msgData);
        // نگه داشتن نهایتا 100 پیام آخر در حافظه موقت سرور برای جلوگیری از پر شدن رم
        if (chatHistory.length > 100) chatHistory.shift(); 
        
        io.emit('receive_message', msgData); 
    });

    socket.on('delete_messages', (msgIdsArray) => {
        chatHistory = chatHistory.filter(msg => !msgIdsArray.includes(msg.id));
        io.emit('messages_deleted', msgIdsArray);
    });

    socket.on('pin_message', (msgText) => {
        pinnedMessage = msgText;
        io.emit('message_pinned', msgText);
    });
    
    socket.on('unpin_message', () => {
        pinnedMessage = null;
        io.emit('message_unpinned');
    });

    // 🟢 NEW: وقتی اینترنت کاربر قطع می‌شود یا از چت بیرون می‌رود
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // حذف کاربر از لیست آنلاین‌ها
        onlineUsers = onlineUsers.filter(user => user.id !== socket.id);
        // ارسال لیست جدید به بقیه
        io.emit('online_users_updated', onlineUsers);
    });
});

// 5. Start the Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 ManTika Server is running on port ${PORT}`);
});

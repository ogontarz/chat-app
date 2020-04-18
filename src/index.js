const express = require('express');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const Filter = require('bad-words');

const { generateMessage } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/user');

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public');

const app = express();

app.use(express.json());
app.use(express.static(publicDirectoryPath));

const server = http.createServer(app);
const io = socketio(server);

io.on('connect', (socket) => {
    console.log('New web socket connection');

    // socket.emit = emits to this connected user
    // io.emit = emits to to all connections
    // io.broadcast = emits to everyone except this socket
    // io.to().emit = emits to everybody in a given room
    // socket.broadcast.to().emit = emits to everybody except given user in a given room 
    
    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room });
        if (error) {
            return callback(error);
        } 
        socket.join(user.room);

        socket.emit('message', generateMessage('admin', 'Welcome!'));
        socket.broadcast.to(user.room).emit('message', generateMessage('admin', `${user.username} has joined`));
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        });
        callback();
    });

    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter();
        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed');
        }
        const user = getUser(socket.id);
        io.to(user.room).emit('message', generateMessage(user.username, message));
        callback();
    });

    socket.on('sendLocation', (location, callback) => {
        const user = getUser(socket.id);
        const url = `https://google.com/maps?q=${location.latitude},${location.longitude}`;
        io.to(user.room).emit('locationMessage', generateMessage(user.username, url));
        callback();
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);
        if (user) {
            io.to(user.room).emit('message', generateMessage('admin', `${user.username} has left`)); // can be emit bc this user is already disconnected
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        }
    }); 
});

server.listen(port, () => {
    console.log('Server is listening on port ' + port);
});

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const port = process.env.PORT || 3000;

app.use(express.static('public'));

const rooms = {};  // Track clients in each room

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('create or join', (room) => {
        if (!rooms[room]) {
            rooms[room] = [];
        }

        rooms[room].push(socket.id);
        socket.join(room);

        const otherClients = rooms[room].filter(id => id !== socket.id);
        console.log(`User ${socket.id} joined room ${room}. Others:`, otherClients);

        socket.emit('all-users', otherClients);

        otherClients.forEach(clientId => {
            io.to(clientId).emit('new-user', socket.id);
        });
    });

    socket.on('offer', (data) => {
        io.to(data.target).emit('offer', {
            sdp: data.sdp,
            sender: socket.id
        });
    });

    socket.on('answer', (data) => {
        io.to(data.target).emit('answer', {
            sdp: data.sdp,
            sender: socket.id
        });
    });

    socket.on('candidate', (data) => {
        io.to(data.target).emit('candidate', {
            candidate: data.candidate,
            sender: socket.id
        });
    });

    socket.on('disconnect', () => {
        for (let room in rooms) {
            if (rooms[room].includes(socket.id)) {
                rooms[room] = rooms[room].filter(id => id !== socket.id);
                socket.to(room).emit('user-disconnected', socket.id);
                if (rooms[room].length === 0) {
                    delete rooms[room];
                }
            }
        }
        console.log('User disconnected:', socket.id);
    });
});

http.listen(port, () => {
    console.log('Server listening on port', port);
});

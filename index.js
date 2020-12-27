const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const validate = require('validate.js');
const validator = require('./validators/validator');
const utils = require('./utils/utils');
const functions = require('./functions');

const PORT = process.env.PORT || 3000;

const rooms = [];
const users = {};
const usersInRooms = [];

app.use(express.static( 'public'));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
    console.log('a user connected: ', socket.id);

    // socket.broadcast.emit('hi');
    socket.on('disconnect', () => {
        console.log('user disconnected');
        if (users.hasOwnProperty(socket.id)) {
            users[socket.id]['online'] = false;
            socket.broadcast.emit('user offline', socket.user);
            functions.updateContact(io, socket, users);
            // io.emit('contact update', users);
        }
    });

    // On messaging
    socket.on('chat message', (msg) => {
        console.log('message received: ', msg);
        io.emit('chat message', msg);
    });

    // Validate user
    socket.on('validate user', (data) => {
        // const fU = Object.values(users).filter(u => {
        //     return u.nickname === data;
        // });

        const fI = Object.values(users).findIndex(u => {
            return u.nickname === data;
        });

        if (fI > -1) {
            // find index of key and assign new index
            const fK = Object.keys(users)[fI];
            const user = users[fK];
            Object.assign(user, {
                id: socket.id,
                online: true
            });
            users[socket.id] = user;

            // delete old user index
            delete users[fK];

            socket.user = user;
            functions.chatJoined(io, socket, user);
            functions.updateContact(io, socket, users);
            io.emit('rooms update', rooms);
        } else {
            io.emit('invalid user');
        }

        // if (fU.length > 0) {
        //     socket.emit('chat joined', Object.assign(fU[0], {
        //         id: socket.id
        //     }));
        //     functions.updateContact(io, socket, users);
        //     // io.emit('contact update', users);
        // } else {
        //     io.emit('invalid user');
        // }
       // if (Object.values(users).filter(data)) {
       //     console.log('User already exists: ', data);
       //     io.emit('chat joined', Object.assign(users[data], {
       //         id: socket.id
       //     }));
       // }
    });

    // Join new chat
    socket.on('join chat', (data) => {
        // Convert array to object
        const user = utils.serializeForm(data);

        // In case of validation error
        if (user instanceof Error) {
            io.emit('chat join error', user);
            return false;
        }

        // Set display_name if not provided
        if (!user.display_name) {
            user['display_name'] = user.nickname;
        }

        // Validate user rules
        const v = validate(user, validator.userRules);

        if (v) {
            io.emit('chat join error', v);
            return false;
        }

        // Validate of user already exists
        const uE = Object.values(users).filter(u => {
            return u.nickname === user.nickname;
        });

        if (uE.length > 0) {
            io.emit('chat join error', {
                'nickname': ['Nickname already taken']
            });
            return false;
        }

        // Add to users
        Object.assign(user, {
            avatar: `https://i.pravatar.cc/100?img=${Object.keys(users).length}`,
            online: true,
            id: socket.id
        });
        users[socket.id] = user;

        // Return joined
        console.log('user joined chat: ', user.nickname);
        functions.chatJoined(io, socket, user);
        functions.updateContact(io, socket, users);
        socket.user = user;
        io.emit('rooms update', rooms);
        return true;
    });

    // Create room
    socket.on('create room', (data) => {
        const roomData = utils.serializeForm(data);
        console.log('creating room: ', data);

        // In case of validation error
        if (roomData instanceof Error) {
            socket.emit('room create error', roomData);
            return false;
        }

        // Validate user rules
        const v = validate(roomData, validator.roomRules);

        if (v) {
            io.emit('room create error', v);
            return false;
        }

        // Validate of user already exists
        const uE = Object.values(rooms).filter(u => {
            return u.name === roomData.name;
        });

        if (uE.length > 0) {
            io.emit('room create error', {
                'name': ['Room already exists']
            });
            return false;
        }

        Object.assign(roomData, {
            creator: socket.user.nickname,
            icon: Math.floor(Math.random() * 10) + 1
        });

        // Push to rooms
        rooms.push(roomData);
        io.emit('rooms update', rooms);

        // Join the room
        socket.join(roomData.name);
        socket.emit('room joined', roomData);
    });

    // Delete room
    socket.on('delete room', (data) => {

    });

    // Join a room
    socket.on('join room', (data) => {
        console.log('joining room: ', data);
        // Check if room exists
        const roomIndex = rooms.findIndex(r => {
            return r.name === data;
        });

        if (roomIndex === -1) {
            socket.emit('room join error', `No room found: ${data}`);
            return false;
        }

        // Check if user user is not in the room
        const uRIndex = usersInRooms.findIndex(uR => {
            return uR.nickname === socket.user.nickname && uR.name === data;
        })
        if (uRIndex > -1) {
            // User already in the room
        } else {
            // Join the room
            usersInRooms.push({
                user_nickname: socket.user.nickname,
                room_name: data
            });

            // Join the room
            socket.join(data);
            socket.emit('room joined', data);
        }
    });

    socket.on('logout', () => {
        console.log('list of user: ', users);
        console.log('user requested for logout: ', socket.user);
        delete users[socket.id];
        io.to(socket.id).emit('logout success');
        functions.updateContact(io, socket, users);
        // io.emit('contact update', users);
    });
});

http.listen(PORT, () => {
   console.log(`Server running at port: ${PORT}`);
});

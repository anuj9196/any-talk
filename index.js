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
const users = [];
const usersInRooms = [];

/**
 * {
 *     from: <nickname>,
 *     to: <nickname>,
 *     room: <room-name>,
 *     message: <message>,
 *     sent: <date>
 * }
 */
const messageList = [];

app.use(express.static( 'public'));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

function joinRoom(io, socket, room) {
    socket.join(room.name);
    socket.room = room;
    socket.emit('room joined', room);

    console.log('users in room: ', usersInRooms);
    updateContacts(io, socket);
    // const usersList = usersInRooms.filter(_ => {return _.room_name === room.name}).map(_ => _.user_nickname);
    // const roomUsers = users.filter(_ => {
    //     return usersList.includes(_.nickname);
    // });
    //
    // console.log('new list u: ', roomUsers);
    // // socket.emit('contact update', roomUsers);
    // functions.updateContact(io, socket, roomUsers, room);
}

function updateContacts(io, socket) {
    const room = socket.room;
    console.log('updating contacts in room: ', room);
    if (room) {
        const usersList = usersInRooms.filter(_ => {
            return _.room_name === room.name
        }).map(_ => _.user_nickname);
        const roomUsers = users.filter(_ => {
            return usersList.includes(_.nickname);
        });

        console.log('new list u: ', roomUsers);
        // socket.emit('contact update', roomUsers);
        functions.updateContact(io, socket, roomUsers, room);
    }
}

function getMessages(io, socket) {
    console.log('message list: ', messageList);
    console.log('socket user: ', socket.user);
    console.log('room: ', socket.room);
    console.log('chat: ', socket.chat);
    const mF = messageList.filter(m => {
        // return (
        //     (m.from === socket.user.nickname && m.to === socket.chat) ||
        //     (m.from === socket.chat && m.to === socket.user.nickname)
        // ) && m.room === socket.room.name;
        return m.room === socket.room.name;
    });
    console.log('new msg list: ', mF);
    return mF;
}

io.on('connection', (socket) => {
    console.log('a user connected: ', socket.id);

    // socket.broadcast.emit('hi');
    socket.on('disconnect', () => {
        console.log('user disconnected');
        const u = users.filter(_ => {
            return _.id === socket.id;
        });
        if (u.length) {
            u[0]['online'] = false;
            socket.broadcast.emit('user offline', socket.user);
            // functions.updateContact(io, socket, users);
            updateContacts(io, socket);
        }
        // if (users.hasOwnProperty(socket.id)) {
        //
        //     // io.emit('contact update', users);
        // }
    });

    // On messaging
    socket.on('chat message', (msg) => {
        console.log('message received: ', msg);
        io.emit('chat message', msg);
    });

    socket.on('chat', (nickname) => {
        console.log('starting chat with: ', nickname);

        socket.chat = nickname;
        const messages = getMessages(io, socket);

        socket.emit('chat update', messages);
    });

    socket.on('send message', (data) => {
        console.log('message received: ', data);
        console.log('from: ', socket.user.nickname);
        // console.log('to: ', socket.chat);
        console.log('in room: ', socket.room);
        console.log('sent: ', new Date());
        if (socket.room) {
            messageList.push({
                from: socket.user.nickname,
                // to: socket.chat,
                room: socket.room.name,
                sent: new Date(),
                message: data.message
            });
            io.to(socket.room.name).emit('chat update', getMessages(io, socket));
        } else {
            socket.emit('send message error', 'Please join/create a room first');
        }


    });

    // Validate user
    socket.on('validate user', (data) => {
        // const fU = Object.values(users).filter(u => {
        //     return u.nickname === data;
        // });

        // const fI = Object.values(users).findIndex(u => {
        //     return u.nickname === data;
        // });

        const uI = users.findIndex(_ => {
            return _.nickname === data;
        });

        if (uI > -1) {
            const user = users[uI];
            Object.assign(user, {
                id: socket.id,
                online: true
            });
            users[uI] = user;

            socket.user = user;
            functions.chatJoined(io, socket, user);
            // Ask to join room first
            // updateContacts(io, socket);
            // functions.updateContact(io, socket, users);
            io.emit('rooms update', rooms);
        } else {
            io.emit('invalid user');
        }

        // if (fI > -1) {
        //     // find index of key and assign new index
        //     const fK = Object.keys(users)[fI];
        //     const user = users[fK];
        //     Object.assign(user, {
        //         id: socket.id,
        //         online: true
        //     });
        //     users[socket.id] = user;
        //
        //     // delete old user index
        //     delete users[fK];
        //
        //     socket.user = user;
        //     functions.chatJoined(io, socket, user);
        //     functions.updateContact(io, socket, users);
        //     io.emit('rooms update', rooms);
        // } else {
        //     io.emit('invalid user');
        // }

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
        users.push(user);
        // users[socket.id] = user;

        // Return joined
        console.log('user joined chat: ', user.nickname);
        functions.chatJoined(io, socket, user);
        // updateContacts(io, socket);
        // functions.updateContact(io, socket, users);
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

        // Validate if room already exists
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

        // join room
        usersInRooms.push({
            user_nickname: socket.user.nickname,
            room_name: roomData.name
        });

        // Join the room
        joinRoom(io, socket, roomData);
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
            return uR.user_nickname === socket.user.nickname && uR.room_name === data;
        })
        if (uRIndex > -1) {
            // User already in the room
            joinRoom(io, socket, rooms[roomIndex]);
        } else {
            // Join the room
            usersInRooms.push({
                user_nickname: socket.user.nickname,
                room_name: data
            });

            // Join the room
            joinRoom(io, socket, rooms[roomIndex]);
        }
    });

    socket.on('logout', () => {
        console.log('list of user: ', users);
        console.log('user requested for logout: ', socket.user);
        const uI = users.findIndex(_ => {
            return _.id === socket.id;
        });
        if (uI > -1) {
            users.splice(uI, 1);
        }
        // delete users[socket.id];
        io.to(socket.id).emit('logout success');
        functions.updateContact(io, socket, users);
        // io.emit('contact update', users);
    });
});

http.listen(PORT, () => {
   console.log(`Server running at port: ${PORT}`);
});

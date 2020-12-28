// Emit contacts update
exports.updateContact = (io, socket, users, room=null) => {
    // Send to all except the sender
    // socket.broadcast.emit('contact update', users);
    // Send to all
    if (room) {
        io.to(room.name).emit('contact update', users);
    } else {
        io.emit('contact update', users);
    }
};

exports.chatJoined = (io, socket, user) => {
    // Send to client
    socket.emit('chat joined', user);
}
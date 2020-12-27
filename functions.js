// Emit contacts update
exports.updateContact = (io, socket, users) => {
    // Send to all except the sender
    // socket.broadcast.emit('contact update', users);
    // Send to all
    io.emit('contact update', users);
};

exports.chatJoined = (io, socket, user) => {
    // Send to client
    socket.emit('chat joined', user);
}
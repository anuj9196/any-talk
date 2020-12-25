function submitMsg(socket) {
    const iMsg = $('#input-message');
    if (!iMsg.val()) {
        alert('Please enter some message');
    } else {
        socket.emit('chat message', iMsg.val());
        iMsg.val('');
    }
}

$(function () {
   const socket = io();

   // Listen to msg and append
   socket.on('chat message', (msg) => {
       $('#chat').append(
           '<div class="message stark">' +
           `${msg}` +
           '</div>'
       );
   });

   // Send on enter
   $('#input-message').keydown((e) => {
       let keyPressed = e.keyCode || e.which;
       if (keyPressed === 13) {
           submitMsg(socket);
       }
   });

   // Send on btn click
   $('#btn-send').click(() => {
       submitMsg(socket);
   });
});
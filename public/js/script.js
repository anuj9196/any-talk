const chat = document.getElementById('chat');
chat.scrollTop = chat.scrollHeight - chat.clientHeight;

const localKey = 'nickname';

const blockJoinChat = $('#join-chat');
const blockContacts = $('#contacts');
const blockChat = $('#chat');
const blockRooms = $('#rooms');
const blockChatUser = $('.chat-user');

const joinForm = $('#join-form');
const messageList = $('#message-list');
const contactsList = $('#contacts-list');
const logoutBtn = $('#logout');
const chatUser = $('#chat-user');
const newRoomBtn = $('.new-room-btn');
const roomAddForm = $('#room-add-form');
const roomsList = $('#rooms-list');
const noRoom = $('#no-room');
const roomsItem = $('#rooms-item');
const noContact = $('#no-contact');
const chatUserAvatar = $('#chat-user-avatar');
const chatUserBadge = $('#chat-user-badge');
const typingBlock = $('#typing');

const btnSend = $('#btn-send');
const inputMessage = $('#input-message');
const body = $('body');

// blockChatUser.hide();

function setKey(k) {
    localStorage.setItem(localKey, k);
}

function getKey() {
    return localStorage.getItem(localKey);
}

function deleteKey() {
    localStorage.removeItem(localKey);
}

function setUser(user) {
    if (!user) {
        chatUser.text('');
        blockChatUser.hide();
        chatUserAvatar.hide();
    } else {
        chatUser.text(user.display_name);
        chatUserAvatar.attr('src', user.avatar);
        chatUserBadge.css('background', user.color ? user.color : '#00bf00');
        chatUserAvatar.show();
        blockChatUser.show();
    }
}

function joinChat() {
    blockChat.hide();
    blockContacts.hide();
    blockRooms.hide();

    blockJoinChat.show();
}

function timeSince(date) {

    date = new Date(date);

    const seconds = Math.floor((new Date() - date) / 1000);

    let interval = seconds / 31536000;

    if (interval > 1) {
        return Math.floor(interval) + " years";
    }
    interval = seconds / 2592000;
    if (interval > 1) {
        return Math.floor(interval) + " months";
    }
    interval = seconds / 86400;
    if (interval > 1) {
        return Math.floor(interval) + " days";
    }
    interval = seconds / 3600;
    if (interval > 1) {
        return Math.floor(interval) + " hours";
    }
    interval = seconds / 60;
    if (interval > 1) {
        return Math.floor(interval) + " minutes";
    }
    return Math.floor(seconds) + " seconds";
}

function updateChatScroll() {
    const elem = document.getElementById('messages');
    elem.scrollTop = elem.scrollHeight;
}

function submitMessage(socket) {
    const message = inputMessage.val();
    if (!message) {
        return alert('Please enter message');
    }

    socket.emit('send message', {
        message: message
    });

    // Set input message to blank
    inputMessage.val('');
}

$(function () {

    // Hide room list
    roomsItem.hide();
    noRoom.show();
    contactsList.hide();
    noContact.show();
    typingBlock.hide();

    // document.querySelectorAll('.timestamp').timeago();
    // timeago().render(document.querySelectorAll('.need_to_be_rendered'));

    // deleteKey();
    const socket = io();

    if (!getKey()) {
        joinChat();
    } else {
        console.log('User already saved: ', getKey());
        socket.emit('validate user', getKey());
    }

    joinForm.submit((e) => {
        e.preventDefault();
        const joinData = joinForm.find('.form').serializeArray();
        socket.emit('join chat', joinData);
    });

    socket.on('invalid user', (data) => {
        deleteKey();
        joinChat();
    });

    socket.on('contact update', (data) => {
        // const users = Object.values(data);
        const users = data;
        console.log('users: ', users);

        if (users.length > 1) {
            noContact.hide();
            contactsList.show();

            contactsList.html('');
            for (let i = 0; i < users.length; i++) {
                if (users[i].nickname !== getKey()) {
                    contactsList.append(
                        '<div class="contact" data-nickname="' + users[i].nickname + '">' +
                        '<div class="pic"><img alt="" src="' + users[i].avatar + '"></div>' +
                        `<div class="badge ${users[i].online ? 'online' : 'offline'}"></div>` +
                        '<div class="name" data-nickname="'+ users[i].nickname +'">' + users[i].display_name +'</div>' +
                        '<div class="message">' +
                        '' +
                        '</div>' +
                        '</div>'
                    );
                }
            }
        } else {
            contactsList.hide();
            noContact.show();
        }
    });

    socket.on('rooms update', (data) => {
        console.log('rooms received: ', data);

        if (data.length) {
            roomsItem.html('');
            roomAddForm.hide();
            roomsList.show();
            noRoom.hide();
            roomsItem.show();

            for (let i = 0; i < data.length; i++) {
                roomsItem.append(
                    `<div class="room ${data[i].name}">` +
                    '<div class="pic"><img alt="" src="/icons/room_' + data[i].icon + '.svg"> </div>' +
                    `<div class="name">${data[i].name}</div>` +
                    '<div class="message"></div>' +
                    '</div>'
                );
            }
        }
    });

    socket.on('room join error', (data) => {
        console.error('Error joining room: ', data);
    });

    socket.on('chat update', (messages) => {
        console.log('messages received: ', messages);
        messageList.html('');
        for (let i = 0; i < messages.length; i++) {

            const msg = '<div class="message ' + (messages[i].from.nickname === getKey() ? 'me' : '') +'">' +
                '<div class="text">'+
                (messages[i].from.nickname !== getKey() ? `<div class="from" style="color: ${messages[i].from['color']}">` + messages[i].from.display_name + `</div>` : '') +
                messages[i].message +'</div>' +
                '<div class="timestamp" title="'+messages[i].sent+'">' + timeSince(messages[i].sent) +' ago</div>' +
                '</div>';

            messageList.append(msg)
        }

        updateChatScroll();
    });

    socket.on('send message error', (data) => {
        console.error('send message error: ', data);
    });

    socket.on('room joined', (data) => {
        console.log('You joined the room: ', data);
        body.find('.room').removeClass('selected');
        body.find('.room.' + data.name).addClass('selected');
        // $('.room').removeClass('selected');
        // $(`.room.${data.name}`).addClass('selected');
    });

    $(document).on('click', '.room', (e) => {
        console.log('room clicked: ', $(e.target).closest('.name').text());
        const roomName = $(e.target).closest('.name').text();
        if (roomName) {
            socket.emit('join room', roomName);
        } else {
            console.error('Room name is empty');
        }
    });

    $('body').on('click', '.contact', (e) => {
       console.log('contact clicked: ', e);
       console.log('this: ', $(this));
       const nickname = $(e.target).data('nickname');
       // if (nickname) {
       //     socket.emit('chat', nickname);
       // }
       console.log('nickname: ', nickname);
    });

    socket.on('user offline', (data) => {
        console.log('user has gone offline: ', data);
    });

    socket.on('chat joined', (data) => {
        console.log('Chat joined by: ', data);
        setKey(data.nickname);

        blockJoinChat.hide();

        blockChat.show();
        blockContacts.show();
        blockRooms.show();

        setUser(data);
    });

    socket.on('chat join error', (data) => {
        // Clear previous messages
        $('.error').remove();

        Object.keys(data).forEach(d => {
            let err = '';
            if (data[d] instanceof Array) {
                for (let i = 0; i < data[d].length; i++) {
                    err += `<li>${data[d][i]}</li>`;
                }
            } else {
                err = `<li>${data[d]}</li>`;
            }

            joinForm.find(`.form`).find(`input[name=${d}]`).parent('.input').append(
                `<div class="error"><ul>${err}</ul></div>`
            );
        });
    });

    socket.on('logout success', () => {
        console.log('logout success received');
        deleteKey();
        setUser(null);
        joinChat();
    });

    logoutBtn.click(() => {
       socket.emit('logout');
    });

    newRoomBtn.click(() => {
        roomAddForm.toggle();
        roomsList.toggle();
    })

    socket.on('room create error', (data) => {
        console.log('room create error: ', data);
    });

    socket.on('typing start', () => {
        typingBlock.show();
    });

    socket.on('typing stop', () => {
        typingBlock.hide();
    });

    inputMessage.keydown((e) => {
        if (inputMessage.val()) {
            socket.emit('typing');
        }

        if (e.which === 13) {
            submitMessage(socket);
            console.log('you pressed enter');
        }
    });
    btnSend.click(() => {
        console.log('send button clicked..');
        submitMessage(socket);
    });

    $('#room-join-submit').click((e) => {
        e.preventDefault();
        const d = roomAddForm.find('form').serializeArray();
        socket.emit('create room', d);
    });
    // $('#room-join-submit).submit((e) => {
    //     console.log('form submit: ', $(this)[0].serializeArray());
    //     e.preventDefault();
    // });

    // $('#btn-add-contact').click(() => {
    //     console.log('clicked: ');
    //     if ($('.contact-add-form').hasClass('visible')) {
    //         $('.contact-add-form').removeClass('visible');
    //         $('#contacts-list').removeClass('hide');
    //     } else {
    //         $('.contact-add-form').addClass('visible');
    //         $('#contacts-list').addClass('hide');
    //     }
    // });
});
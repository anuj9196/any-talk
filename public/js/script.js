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

blockChatUser.hide();

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
    } else {
        chatUser.text(user.display_name);
        blockChatUser.show();
    }
}

function joinChat() {
    blockChat.hide();
    blockContacts.hide();
    blockRooms.hide();

    blockJoinChat.show();
}

$(function () {

    // Hide room list
    roomsItem.hide();
    noRoom.show();
    contactsList.hide();
    noContact.show();

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
        const users = Object.values(data);
        console.log('users: ', users);

        if (users.length > 1) {
            noContact.hide();
            contactsList.show();

            contactsList.html('');
            console.log('kkk: ', getKey());
            for (let i = 0; i < users.length; i++) {
                if (users[i].nickname !== getKey()) {
                    contactsList.append(
                        '<div class="contact">' +
                        '<div class="pic"><img alt="" src="' + users[i].avatar + '"></div>' +
                        `<div class="badge ${users[i].online ? 'online' : 'offline'}"></div>` +
                        `<div class="name">${users[i].display_name}</div>` +
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
                    `<div class="contact room ${data[i].name}">` +
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

    socket.on('room joined', (data) => {
        console.log('You joined the room: ', data);
        $('.room').removeClass('selected');
        $(`.room ${data.name}`).addClass('selected');
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

    logoutBtn.click((e) => {
       socket.emit('logout');
    });

    newRoomBtn.click(() => {
        roomAddForm.toggle();
        roomsList.toggle();
    })

    socket.on('room create error', (data) => {
        console.log('room create error: ', data);
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
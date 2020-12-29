const validate = require('validate.js');

exports.userRules = {
    nickname: {
        presence: true,
        length: {
            minimum: 1,
            maximum: 10
        }
    },
    display_name: {
        presence: false,
        length: {
            minimum: 1,
            maximum: 10
        }
    },
    color: {
        presence: false
    }
};

exports.roomRules = {
    name: {
        presence: true,
        length: {
            minimum: 1,
            maximum: 10
        }
    },
    creator: {
        presence: false
    }
};

exports.userRoomRule = {
    user_nickname: {
        presence: true,
        numericality: 'onlyInteger'
    },
    room_name: {
        presence: true,
        numericality: 'onlyInteger'
    }
};
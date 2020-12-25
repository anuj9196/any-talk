var chat = document.getElementById('chat');
chat.scrollTop = chat.scrollHeight - chat.clientHeight;

$(function () {
    $('#btn-add-contact').click(() => {
        console.log('clicked: ');
        if ($('.contact-add-form').hasClass('visible')) {
            $('.contact-add-form').removeClass('visible');
            $('#contacts-list').removeClass('hide');
        } else {
            $('.contact-add-form').addClass('visible');
            $('#contacts-list').addClass('hide');
        }
    });
});
const socket = io();

// elements
const $messageForm = document.querySelector('#messageForm');
const $messageFormInput = $messageForm.querySelector('input');
const $messageFormButton = $messageForm.querySelector('button');
const $sendLocationButton = document.querySelector('#sendLocation');
const $messages = document.querySelector('#messages');
const $sidebar = document.querySelector('#sidebar');

// templates
const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

// options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });

const autoscroll = () => {
    // computing the height of the last new message
    const $newMessage = $messages.lastElementChild;
    const newMessageHeight = $newMessage.offsetHeight + parseInt(getComputedStyle($newMessage).marginBottom);

    // if the scoll is on the bottom - autoscroll, if it is heigher - don't
    const scrollOffset = $messages.scrollTop + $messages.offsetHeight;
    if ($messages.scrollHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight;
    }
};

socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert(error);;
        location.href = '/'; // redirect to join page
    }
});

socket.on('message', (message) => {
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        createdAt: moment(message.createdAt).format('h:mm a'),
        message: message.text
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
});

socket.on('locationMessage', (message) => {
    const html = Mustache.render(locationMessageTemplate, {
        username: message.username,
        createdAt: moment(message.createdAt).format('h:mm a'),
        url: message.text
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
});

socket.on('roomData', ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    });
    $sidebar.innerHTML = html;
});

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault(); // disable full page refresh
    $messageFormButton.setAttribute('disabled', 'disabled');

    // e.target = sth that we listen for, in this case the message form
    const message = e.target.elements.message.value; 
    
    socket.emit('sendMessage', message, (error) => {s
        $messageFormButton.removeAttribute('disabled');
        $messageFormInput.value = '';
        $messageFormInput.focus();
        if (error) {
            return alert(error);
        }
    });
});

document.querySelector('#sendLocation').addEventListener('click', ()  => {
    if (!navigator.geolocation) {
        return alert('Geolocation is not supported by your browser');
    }
    $sendLocationButton.setAttribute('disabled', 'disabled');

    navigator.geolocation.getCurrentPosition((position) => {
        const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        };
        socket.emit('sendLocation', location, () => {
            $sendLocationButton.removeAttribute('disabled');
        });
    })
});

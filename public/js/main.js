
document.addEventListener("DOMContentLoaded", function (event) {
    let socket = new WebSocket(location.origin.replace(/^http/, 'ws'));
    let roomCode = '';
    let nickname = '';
    let inGame = false;
    let inLobby = false;
    let playerNum = null;
    let fireing = false;
    let timerId;
    let joystick;

    document.querySelector('#join-game-button').addEventListener('click', function () {
        document.querySelector('#form-roomcode-invalid').classList.add('hidden');
        document.querySelector('#form-name-invalid').classList.add('hidden');
        roomCode = document.querySelector('#form-roomcode').value.toLowerCase();
        nickname = document.querySelector('#form-name').value.toLowerCase();
        let joinedMsg = {
            messageType: 'ROOM_JOIN_REQUEST',
            roomCode,
            nickname
        };
        socket.send(JSON.stringify(joinedMsg));
    });

    let sendInput = function (inputstr, content) {
        console.log("pressed a button: " + inputstr);
        let messageToGame = {
            messageType: 'PLAYER_INPUT',
            roomCode: roomCode,
            nickname: nickname,
            playerNum: playerNum,
            message: inputstr,
            content: content,
            method: "player_input"
        };
        socket.send(JSON.stringify(messageToGame));
    }

    // Throttle function: Input as function which needs to be throttled and delay is the time interval in milliseconds
    let throttleFunction = function (func, input, input2, delay) {
        // If setTimeout is already scheduled, no need to do anything
        if (timerId) {
            return
        }
        // Schedule a setTimeout after delay seconds
        timerId = setTimeout(function () {
            func(input, input2)
            // Once setTimeout function execution is finished, timerId = undefined so that in <br>
            // the next scroll event function execution can be scheduled by the setTimeout
            timerId = undefined;
        }, delay)
    }

    function activate_fire_button(ref) {
        ref.addEventListener('mousedown', function () {
            fireing = true;
            sendInput('fire',null)
        });
    
        ref.addEventListener('mousemove', function () {
            if (fireing) {
                fireing = false
                sendInput('fireup',null)
            }
        })
    
        ref.addEventListener('mouseup', function () {
            if (fireing) {
                fireing = false
                sendInput('fireup',null)
            }
        })
        ref.addEventListener('touchstart', function () {
            if (fireing) {
                fireing = false
                sendInput('fireup',null)
            }
        })
    }

    function createJoystick(parent) {
        console.log("Hello i was called with parent ", parent)
        const maxDiff = 100;
        const stick = document.createElement('div');
        stick.classList.add('joystick');
    
        stick.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        stick.addEventListener('touchstart', handleMouseDown);
        document.addEventListener('touchmove', handleMouseMove);
        document.addEventListener('touchend', handleMouseUp);
    
        let dragStart = null;
        let currentPos = { x: 0, y: 0 };
    
        function handleMouseDown(event) {
            stick.style.transition = '0s';
            if (event.changedTouches) {
                dragStart = {
                    x: event.changedTouches[0].clientX,
                    y: event.changedTouches[0].clientY,
                };
                return;
            }
            dragStart = {
                x: event.clientX,
                y: event.clientY,
            };
    
        }
    
        function handleMouseMove(event) {
            if (dragStart === null) return;
            event.preventDefault();
            if (event.changedTouches) {
                event.clientX = event.changedTouches[0].clientX;
                event.clientY = event.changedTouches[0].clientY;
            }
            const xDiff = event.clientX - dragStart.x;
            const yDiff = event.clientY - dragStart.y;
            const angle = Math.atan2(yDiff, xDiff);
            const distance = Math.min(maxDiff, Math.hypot(xDiff, yDiff));
            const xNew = distance * Math.cos(angle);
            const yNew = distance * Math.sin(angle);
            stick.style.transform = `translate3d(${xNew}px, ${yNew}px, 0px)`;
            currentPos = { x: xNew, y: yNew };

            throttleFunction(sendInput,'joystick',[xNew,yNew],200);
            //console.log("This is your position: ", currentPos)
        }
    
        function handleMouseUp(event) {
            if (dragStart === null) return;
            stick.style.transition = '.2s';
            stick.style.transform = `translate3d(0px, 0px, 0px)`;
            dragStart = null;
            currentPos = { x: 0, y: 0 };
            sendInput('joyoff',null);
            throttleFunction(sendInput,'joyoff',null,200);
        }
    
        parent.appendChild(stick);
        return {
            getPosition: () => currentPos,
        };
    }
    
    socket.onmessage = (event) => {
        console.log(event);
        var message = JSON.parse(event.data);
        var room = message.roomCode.toLowerCase();
        var nick = "";
        if (message.nickname) {
            nick = message.nickname.toLowerCase();
        }
        // Only respond to messages intended for our game
        if (room == roomCode) {
            switch (message.messageType) {
                case 'ERROR_INVALID_ROOM':
                    console.log("Invalid Room");
                    console.log(message);
                    document.querySelector('#form-roomcode-invalid').classList.remove('hidden');
                    break;
                case 'ERROR_NAME_TAKEN':
                    if (!inGame) {
                        document.querySelector('#form-name-invalid').classList.remove('hidden');
                    }
                    break;
                case 'PLAYER_JOINED':
                    if (nick == nickname) {
                        // We've joined!
                        inGame = true;
                        inLobby = true;
                        playerNum = message.playerNum;
                        document.querySelector('#room-code-form').classList.add('hidden');
                        fetch('/debate.html')
                            .then((response) => {
                                return response.text();
                            })
                            .then((body) => {
                                document.querySelector('#game-content').innerHTML = body;
                            });
                    }
                    break;
                case 'GAME_LOADED':
                    inLobby = false;
                    //Hide waiting message:
                    document.querySelector('#game-lobby').classList.add('hidden');
                    document.querySelector('#game-area').classList.remove('hidden');
                    
                    //Fire Button
                    activate_fire_button(document.querySelector('#bang-bang'));
                    //Get Joystick Ready
                    joystick = createJoystick(document.getElementById('wrapper'));
                    console.log(joystick.getPosition());

                    break;
                case 'GAME_TO_PLAYER':
                    if (message.dataType == "DEBATE_TOPICS") {
                        showDebateInputs(message);
                    }
                    break;
                case 'SEND_BROADCAST':
                    break;
            }
        }
    };
//Supress context menu on long tap  
window.oncontextmenu = function (event) {
    event.preventDefault();
    event.stopPropagation();
    return false;
};
    window.onbeforeunload = function () {
        var disconnectedMsg = {
            messageType: 'DISCONNECTED',
            roomCode,
            nickname
        }
        socket.send(JSON.stringify(disconnectedMsg));
        socket.onclose = function () { }; // disable onclose handler first
        socket.close();
    };
});

screen.orientation.lock('landscape');

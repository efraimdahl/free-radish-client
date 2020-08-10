'use strict';
const express = require('express');
const WebSocket = require('ws');
const server = require('http').createServer();
const app = require('./http-server');

const port = process.env.PORT || 3000;


// Mount our express HTTP router into our server
server.on('request', app);

// Rooms is a map of room codes to a list of players in that room
const rooms = new Map();
// RoomClients is a map of room codes to the room clients (hosts, ie unity instances) itself
const roomClients = new Map();

// TODO adding a room manually until game-side exists
rooms.set('test', []);

const wss = new WebSocket.Server({ server });
// Used for connection liveness testing
function noop() {};
function heartbeat() {
    this.isAlive = true;
};
function leaveRoom(ws) {
    if (ws.inGame === true) {
        // Remove the player from the game's lobby
        const players = rooms.get(ws.room);
        players.splice(players.indexOf(ws.nick), 1);
        rooms.set(ws.room, players);
        //if the player was the last in room:
        if (players.length<1){
            console.log("Room is empty");
            
        }
    }
}

// Establish connections and handle events
wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.room = '';
    ws.nick = '';
    ws.inGame = false;
    console.log("Websocket connected");
    ws.on('pong', heartbeat);

    ws.on('message', (message) => {
        console.log(message);
        try{
        var radishMsg = JSON.parse(message);
        } catch(e){
            const response = {
                messageType: 'UFHH',
                roomCode: 'noRoom',
                method: "big_ufh"    
            }
            ws.send(JSON.stringify(response));
            return;
        }
        console.log(radishMsg);
        ws.room = radishMsg.roomCode.toLowerCase();
        if (radishMsg.nickname) {
            ws.nick = radishMsg.nickname.toLowerCase();
        }
        switch (radishMsg.messageType) {
        case 'CREATE_ROOM_REQUEST': {
            let id = makeid(4);
            while (rooms.has(id)) {
                // Create random id's untill a new one is found
                id = makeid(4);
                }
            console.log("Made room id " + id);
            rooms.set(id, []);
            roomClients.set(id, ws);
            const response = {
                messageType: 'ROOM_CREATED_SUCCESS',
                roomCode: id,
                method: "server_back"
            }
            ws.send(JSON.stringify(response));
        }
        break;
        case 'ROOM_JOIN_REQUEST': {
            if (!rooms.has(ws.room)) {
                // Tried to connect to a non-existent room
                const response = {
                    messageType: 'ERROR_INVALID_ROOM',
                    roomCode: ws.room,
                    nickname: ws.nick,
                   }
                ws.send(JSON.stringify(response));
            } else {
                // Connected successfully
                if (findPlayerInRoom(ws.room, ws.nick) != undefined) {
                    // Tried to connect to a room where your name was already taken
                    const response = {
                        messageType: 'ERROR_NAME_TAKEN',
                        roomCode: ws.room,
                        nickname: ws.nick
                    }
                    ws.send(JSON.stringify(response));
                } else {
                    ws.inGame = true;
                    const players = rooms.get(ws.room);
                    players.push({
                        nick: ws.nick,
                        client: ws
                    });
                    rooms.set(ws.room, players);
                    const response = {
                        messageType: 'PLAYER_JOINED',
                        roomCode: ws.room,
                        nickname: ws.nick,
                        playerNum: rooms.get(ws.room).length,
                        method: 'player_joined',
                    }
                    ws.send(JSON.stringify(response))
                    sendToHost(response,ws.room);
                }
            }
        }
        break;
        case 'DISCONNECTED': {
            console.log("Disconnected");
            leaveRoom(ws);
        }
        break;
        case 'START_GAME': {
            const response = {
                messageType: 'GAME_STARTED',
                roomCode: ws.room,
                method: "start_game",
            }
            broadcast(JSON.stringify(response));
        }
        break;
        case 'SEND_PLAYER_DATA': {
            // The game is sending a message to a single player
            const target = findPlayerInRoom(ws.room, radishMsg.targetPlayer).client;
            const gameToPlayer = {...radishMsg};
            gameToPlayer.messageType = "GAME_TO_PLAYER";
            gameToPlayer.nickname = radishMsg.targetPlayer;
            target.send(JSON.stringify(gameToPlayer));
        }
        break;
        case 'SEND_GAME_DATA': {
            // A player is sending a message to the game
            const target = roomClients.get(ws.room);
            const playerToGame = {...radishMsg};
            playerToGame.messageType = "PLAYER_TO_GAME";
            target.send(JSON.stringify(playerToGame));
        }
        break;
        case 'PLAYER_INPUT': {
            // A player is sending a message to the game
            const target = roomClients.get(ws.room);
            target.send(message);
        }
        break;
        case 'GAME_LOADED': {
            broadcast(message);
        }
        break;
        case 'SEND_BROADCAST': {
            // Game is sending a message to all players
            broadcast(message);
        }
        break;
    }
    });
});
// Perform heartbeats to test for liveness
const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
        leaveRoom(ws);
        return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping(noop);
  });
}, 1000);

function sendToHost(message,room){
    const target = roomClients.get(room);
    target.send(JSON.stringify(message));
}

    
    
function broadcast(message) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function findPlayerInRoom(room, nickname) {
    const players = rooms.get(room);
    if (players === undefined) {
        return null;
    } else {
        return players.find((item) => item.nick == nickname);
    }
}


//Helper functions
function makeid(length) {
    var result           = '';
    var characters       = 'abcdefghijklmnopqrstuvwxyz';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }

server.listen(port, () => console.log(`Free Radish is listening on port ${port}`));

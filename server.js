
/*
  server.js
  ---------
  Main entry point. Launches a WebSocket server on port 3000.
  Clients can connect and send text commands. The server will parse commands,
  call gameLogic, and broadcast results to all connected clients.
*/

const WebSocket = require('ws');              // Using 'ws' library
const { GameState } = require('./gameLogic'); // Our game logic module

// Create a single global game state for POC
const game = new GameState();

// Keep track of connected clients for broadcasting
const clients = [];

const PORT = 3000;

// Create WebSocket server
const wss = new WebSocket.Server({ port: PORT }, () => {
  console.log(`Galactic Wars server running on ws://localhost:${PORT}`);
});

// Broadcast helper
function broadcast(message) {
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ broadcast: true, message }));
    }
  });
}

// On connection
wss.on('connection', (ws) => {
  clients.push(ws);

  // Send a welcome message
  ws.send(JSON.stringify({
    broadcast: false,
    message: 'Welcome to Galactic Wars! Type "help" for command info.'
  }));

  // Handle incoming messages
  ws.on('message', (data) => {
    const text = data.toString().trim();
    if (!text) return;

    // For simple POC, parse commands by splitting
    const [cmd, ...args] = text.split(' ');

    let response;

    switch (cmd.toLowerCase()) {
      case 'help':
        response = `
Available Commands:
- joinGame <playerName>
- startGame
- move <shipId> <x> <y>
- attack <shipId> <targetShipId>
- build <shipType>
- endTurn
        `;
        ws.send(JSON.stringify({ broadcast: false, message: response }));
        break;

      case 'joingame': {
        const playerName = args[0];
        if (!playerName) {
          ws.send(JSON.stringify({ error: 'Usage: joinGame <playerName>' }));
          return;
        }
        const result = game.createPlayer(playerName);
        if (result.error) {
          ws.send(JSON.stringify(result));
        } else {
          broadcast(`Player ${playerName} joined the game!`);
        }
        break;
      }

      case 'startgame': {
        const result = game.startGame();
        if (result.error) {
          ws.send(JSON.stringify(result));
        } else {
          broadcast(result.message);
        }
        break;
      }

      case 'move': {
        if (args.length < 3) {
          ws.send(JSON.stringify({ error: 'Usage: move <shipId> <x> <y>' }));
          return;
        }
        const [shipId, x, y] = args.map(a => Number(a));
        const result = game.moveShip(shipId, x, y);
        if (result.error) {
          ws.send(JSON.stringify(result));
        } else {
          broadcast(result.message);
        }
        break;
      }

      case 'attack': {
        if (args.length < 2) {
          ws.send(JSON.stringify({ error: 'Usage: attack <shipId> <targetShipId>' }));
          return;
        }
        const [shipId, targetId] = args.map(a => Number(a));
        const result = game.attackShip(shipId, targetId);
        if (result.error) {
          ws.send(JSON.stringify(result));
        } else {
          broadcast(result.message);
        }
        break;
      }

      case 'build': {
        if (args.length < 1) {
          ws.send(JSON.stringify({ error: 'Usage: build <shipType>' }));
          return;
        }
        const shipType = args[0];
        const result = game.buildShip(shipType);
        if (result.error) {
          ws.send(JSON.stringify(result));
        } else {
          broadcast(result.message);
        }
        break;
      }

      case 'endturn': {
        const result = game.endTurn();
        if (result.error) {
          ws.send(JSON.stringify(result));
        } else {
          broadcast(result.message);
        }
        break;
      }

      default:
        ws.send(JSON.stringify({ error: `Unrecognized command: ${cmd}` }));
        break;
    }
  });

  // On close, remove from clients
  ws.on('close', () => {
    const idx = clients.indexOf(ws);
    if (idx !== -1) {
      clients.splice(idx, 1);
    }
  });
});
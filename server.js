/*
  server.js (Express + WS)
  ------------------------
  - Serves the static "public/" folder via Express.
  - Creates a WebSocket server on the same HTTP server.
  - Integrates with the gameLogic.js to handle commands.
*/

const path = require('path');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const { GameState } = require('./gameLogic');

// Create global game instance
const game = new GameState();

// Create Express app & HTTP server
const app = express();
const server = http.createServer(app);

// Serve static files from "public/"
app.use(express.static(path.join(__dirname, 'public')));

// Fallback: just serve index.html if needed
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create WebSocket server attached to the same HTTP server
const wss = new WebSocket.Server({ server });

// Keep track of connected clients
const clients = [];

// Broadcast helper
function broadcast(message) {
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ broadcast: true, message }));
    }
  });
}

// On each new WebSocket connection
wss.on('connection', (ws) => {
  clients.push(ws);

  // Greet the new connection
  ws.send(JSON.stringify({
    broadcast: false,
    message: 'Welcome to Galactic Wars! Type "help" for command info.'
  }));

  ws.on('message', (data) => {
    const text = data.toString().trim();
    if (!text) return;

    // Naive parse: split by space
    const [cmd, ...args] = text.split(' ');

    let result;

    switch (cmd.toLowerCase()) {
      case 'help':
        ws.send(JSON.stringify({
          broadcast: false,
          message: `
Commands:
  joinGame <playerName>
  startGame
  move <shipId> <x> <y>
  attack <shipId> <targetShipId>
  build <shipType>
  endTurn
`       }));
        break;

      case 'joingame': {
        const playerName = args[0];
        if (!playerName) {
          ws.send(JSON.stringify({ error: 'Usage: joinGame <playerName>' }));
          return;
        }
        result = game.createPlayer(playerName);
        if (result.error) {
          ws.send(JSON.stringify(result));
        } else {
          broadcast(`Player ${playerName} joined the game!`);
        }
        break;
      }

      case 'startgame': {
        result = game.startGame();
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
        result = game.moveShip(shipId, x, y);
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
        result = game.attackShip(shipId, targetId);
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
        result = game.buildShip(shipType);
        if (result.error) {
          ws.send(JSON.stringify(result));
        } else {
          broadcast(result.message);
        }
        break;
      }

      case 'endturn': {
        result = game.endTurn();
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

// Start listening
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Galactic Wars server running on http://localhost:${PORT}`);
});
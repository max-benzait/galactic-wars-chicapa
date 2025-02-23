/*
  server.js
  ---------
  Main entry point:
   - Sets up Express
   - Mounts the /api router
   - Serves the "public" folder
   - Handles WebSocket for /ws/lobby/<lobbyId>
   - On game end, records highscore
*/

const path = require('path');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { parse } = require('url');

const apiRouter = require('./api');
const { getLobby, lobbies } = require('./serverState');
const { pushScore } = require('./scoreboard');

const app = express();
const server = http.createServer(app);

// Attach our /api routes
app.use('/api', apiRouter);

// Serve static files (React app, tutorial, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Fallback: serve index.html for anything else (SPA approach)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WebSocket server
const wss = new WebSocket.Server({ noServer: true });

function parseCommand(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const [cmd, ...args] = trimmed.split(' ');
  return { cmd: cmd.toLowerCase(), args };
}

function broadcastToLobby(lobbyId, message) {
  const lobby = getLobby(lobbyId);
  if (!lobby) return;
  for (const wsClient of lobby.clients) {
    if (wsClient.readyState === WebSocket.OPEN) {
      wsClient.send(JSON.stringify({ broadcast: true, message }));
    }
  }
}

// Check if the game ended, e.g. only 1 alive player remains
function maybeCheckGameEnd(lobbyId) {
  const lobby = getLobby(lobbyId);
  if (!lobby) return;
  const { game } = lobby;
  if (!game.gameStarted) return;

  // Count alive players
  const aliveCount = game.players.filter(p => p.alive).length;
  if (aliveCount <= 1) {
    // game ends
    const winner = game.players.find(p => p.alive) || { name: 'No One' };
    const winnerName = winner.name || 'No One';
    broadcastToLobby(lobbyId, `GAME OVER! Winner: ${winnerName}`);

    // Record in scoreboard
    pushScore(lobbyId, winnerName);
    game.gameStarted = false; 
  }
}

function handleWSMessage(ws, lobbyId, dataStr) {
  const lobby = getLobby(lobbyId);
  if (!lobby) return;
  const { game } = lobby;

  const parsed = parseCommand(dataStr);
  if (!parsed) return;

  let result;
  switch (parsed.cmd) {
    case 'help':
      ws.send(JSON.stringify({
        broadcast: false,
        message: 'Commands: joinGame <player>, startGame, move <shipId> <x> <y>, attack <shipId> <targetId>, build <shipType>, endTurn'
      }));
      break;

    case 'joingame': {
      const name = parsed.args[0];
      if (!name) {
        ws.send(JSON.stringify({ error: 'Usage: joinGame <playerName>' }));
        return;
      }
      result = game.createPlayer(name);
      if (result.error) {
        ws.send(JSON.stringify(result));
      } else {
        broadcastToLobby(lobbyId, `Player ${name} joined the game!`);
      }
      break;
    }

    case 'startgame':
      result = game.startGame();
      if (result.error) {
        ws.send(JSON.stringify(result));
      } else {
        broadcastToLobby(lobbyId, result.message);
      }
      break;

    case 'move': {
      if (parsed.args.length < 3) {
        ws.send(JSON.stringify({ error: 'Usage: move <shipId> <x> <y>' }));
        return;
      }
      const [shipId, x, y] = parsed.args.map(Number);
      result = game.moveShip(shipId, x, y);
      if (result.error) {
        ws.send(JSON.stringify(result));
      } else {
        broadcastToLobby(lobbyId, result.message);
      }
      break;
    }

    case 'attack': {
      if (parsed.args.length < 2) {
        ws.send(JSON.stringify({ error: 'Usage: attack <shipId> <targetShipId>' }));
        return;
      }
      const [shipId, targetId] = parsed.args.map(Number);
      result = game.attackShip(shipId, targetId);
      if (result.error) {
        ws.send(JSON.stringify(result));
      } else {
        broadcastToLobby(lobbyId, result.message);
        maybeCheckGameEnd(lobbyId);
      }
      break;
    }

    case 'build': {
      if (!parsed.args[0]) {
        ws.send(JSON.stringify({ error: 'Usage: build <shipType>' }));
        return;
      }
      const shipType = parsed.args[0];
      result = game.buildShip(shipType);
      if (result.error) {
        ws.send(JSON.stringify(result));
      } else {
        broadcastToLobby(lobbyId, result.message);
      }
      break;
    }

    case 'endturn':
      result = game.endTurn();
      if (result.error) {
        ws.send(JSON.stringify(result));
      } else {
        broadcastToLobby(lobbyId, result.message);
      }
      break;

    default:
      ws.send(JSON.stringify({ error: `Unrecognized command: ${parsed.cmd}` }));
      break;
  }
}

// WebSocket upgrade: /ws/lobby/<lobbyId>
server.on('upgrade', (req, socket, head) => {
  const urlParts = req.url.split('/').filter(Boolean);
  // e.g. /ws/lobby/1234 => ['ws','lobby','1234']
  if (urlParts.length === 3 && urlParts[0] === 'ws' && urlParts[1] === 'lobby') {
    const lobbyId = urlParts[2];
    const lobby = getLobby(lobbyId);
    if (!lobby) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }

    const wssConn = new WebSocket.Server({ noServer: true });
    wssConn.handleUpgrade(req, socket, head, (wsClient) => {
      // add to lobby
      lobby.clients.add(wsClient);

      // handle messages
      wsClient.on('message', (data) => handleWSMessage(wsClient, lobbyId, data.toString()));

      // on close
      wsClient.on('close', () => {
        lobby.clients.delete(wsClient);
      });

      wsClient.send(JSON.stringify({
        broadcast: false,
        message: `Joined lobby ${lobbyId}! Type "help" for commands.`
      }));
    });
  } else {
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
    socket.destroy();
  }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Galactic Wars listening on http://localhost:${PORT}`);
});
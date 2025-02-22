/*
  api/lobbyRouter.js
  ------------------
  - POST /api/lobby/new => create new lobby, return JSON { lobbyId }
  - POST /api/lobby/:lobbyId/join => join a lobby by name (HTTP-based approach)
*/

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { createGameState } = require('../game');
const { getLobby, lobbies } = require('../serverState');

const router = express.Router();

/*
  Create a new lobby. 
  The actual lobby storage is in serverState.js (in-memory).
*/
router.post('/new', (req, res) => {
  const lobbyId = uuidv4();
  // In serverState, we store { [lobbyId]: { game, clients } }
  lobbies[lobbyId] = {
    game: createGameState(),
    clients: new Set(),
    lobbyId,
  };
  return res.json({ lobbyId });
});

/*
  Join a lobby by name (HTTP-based).
  You can do:
    POST /api/lobby/1234/join
    body JSON => { "playerName": "Alice" }
*/
router.post('/:lobbyId/join', express.json(), (req, res) => {
  const { lobbyId } = req.params;
  const { playerName } = req.body;
  if (!playerName) {
    return res.status(400).json({ error: 'Missing "playerName" in JSON body' });
  }
  const lobby = getLobby(lobbyId);
  if (!lobby) {
    return res.status(404).json({ error: 'Lobby not found' });
  }
  const result = lobby.game.createPlayer(playerName);
  if (result.error) {
    return res.status(400).json(result);
  }
  // For demonstration, we also broadcast to the WebSocket clients (if any)
  for (const ws of lobby.clients) {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ broadcast: true, message: `Player ${playerName} joined (via HTTP).` }));
    }
  }

  return res.json({ ok: true, message: `Joined lobby ${lobbyId} as ${playerName}` });
});

module.exports = router;
/*
  api/lobbyRouter.js
  ------------------
  - POST /api/lobby/new => create new lobby, return JSON { lobbyId }
  - POST /api/lobby/:lobbyId/join => join a lobby by name (HTTP-based approach)
  - GET /api/lobby/list => returns an array of active lobby IDs
*/

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { createGameState } = require('../game');
const { getLobby, lobbies } = require('../serverState');

const router = express.Router();

// Create new
router.post('/new', (req, res) => {
  const lobbyId = uuidv4();
  lobbies[lobbyId] = {
    game: createGameState(),
    clients: new Set(),
    lobbyId,
  };
  return res.json({ lobbyId });
});

// Join
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
  // broadcast
  for (const wsClient of lobby.clients) {
    if (wsClient.readyState === 1) {
      wsClient.send(JSON.stringify({ broadcast: true, message: `Player ${playerName} joined (via HTTP).` }));
    }
  }
  return res.json({ ok: true, message: `Joined lobby ${lobbyId} as ${playerName}` });
});

// List
router.get('/list', (req, res) => {
  const activeLobbies = Object.keys(lobbies); // array of lobby IDs
  return res.json({ lobbies: activeLobbies });
});

// gameState
router.get('/:lobbyId/state', (req, res) => {
    const { lobbyId } = req.params;
    const lobby = getLobby(lobbyId);
    if (!lobby) {
      return res.status(404).json({ error: 'Lobby not found' });
    }
    // Return a minimal subset of the game
    const game = lobby.game;
    res.json({
      players: game.players,
      resourceMap: game.resourceMap,
      currentPlayerIndex: game.currentPlayerIndex,
      gameStarted: game.gameStarted,
    });
  });
module.exports = router;
/*
  api/index.js
  ------------
  Combines multiple routers into one "apiRouter".
  This will handle e.g.:
    POST /api/lobby/new
    POST /api/lobby/:lobbyId/join
    GET  /api/highscores
    GET  /api/highscores/view
*/

const express = require('express');
const lobbyRouter = require('./lobbyRouter');
const highscoresRouter = require('./highscoresRouter');

const apiRouter = express.Router();

// Mount the sub-routers
apiRouter.use('/lobby', lobbyRouter);
apiRouter.use('/highscores', highscoresRouter);

module.exports = apiRouter;
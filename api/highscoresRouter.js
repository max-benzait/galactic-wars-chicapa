/*
  api/highscoresRouter.js
  -----------------------
  - GET /api/highscores => returns JSON array of all historical records
  - GET /highscores => returns an HTML page with the scoreboard
*/

const express = require('express');
const { getScoreboard } = require('../scoreboard');

const router = express.Router();

/*
  GET /api/highscores => JSON array
*/
router.get('/', (req, res) => {
  const data = getScoreboard();
  res.json(data);
});

/*
  GET /highscores => simple HTML page
*/
router.get('/view', (req, res) => {
  const scores = getScoreboard(); // array of { winner, lobbyId, date, ...}
  let html = `
  <html>
    <head>
      <title>Galactic Wars - Highscores</title>
    </head>
    <body>
      <h1>Highscores</h1>
      <table border="1" cellpadding="5" cellspacing="0">
        <tr>
          <th>Date</th>
          <th>Winner</th>
          <th>Lobby ID</th>
        </tr>
  `;
  for (const row of scores) {
    html += `
      <tr>
        <td>${new Date(row.date).toLocaleString()}</td>
        <td>${row.winner}</td>
        <td>${row.lobbyId}</td>
      </tr>
    `;
  }
  html += `</table></body></html>`;
  res.send(html);
});

module.exports = router;
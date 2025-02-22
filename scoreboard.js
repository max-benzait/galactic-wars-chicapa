/*
  scoreboard.js
  -------------
  In-memory scoreboard for "historical records" of game endings:
    - array of { lobbyId, winner, date }
  We update it when a game ends.
*/

const scoreboard = [];

/*
  pushScore: add {lobbyId, winner, date: now} to scoreboard
*/
function pushScore(lobbyId, winner) {
  scoreboard.push({
    lobbyId,
    winner,
    date: Date.now(),
  });
}

/*
  getScoreboard: returns the array (or a copy)
*/
function getScoreboard() {
  return scoreboard;
}

module.exports = {
  pushScore,
  getScoreboard,
};
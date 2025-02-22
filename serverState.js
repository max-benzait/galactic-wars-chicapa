/*
  serverState.js
  --------------
  Stores the global lobbies object. 
  Also provides getLobby(), etc.
*/

const lobbies = {}; // { [lobbyId]: { game, clients: Set<WebSocket>, lobbyId } }

function getLobby(lobbyId) {
  return lobbies[lobbyId] || null;
}

module.exports = {
  lobbies,
  getLobby,
};
/*
  index.js
  --------
  - Central entry that ties together the resource generator + game state
  - Exports a createGameState() that returns a brand new GameState
    with a random resource map each time.
*/

const GameState = require('./gameState');
const { randomResourceMap } = require('./resourceGenerator');

/*
  createGameState:
  1) generate a random resource map
  2) create a new GameState with it
  3) return that instance
*/
function createGameState() {
  const resourceMap = randomResourceMap();
  return new GameState(resourceMap);
}

module.exports = { createGameState };
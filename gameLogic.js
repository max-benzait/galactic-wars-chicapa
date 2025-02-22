/*
  gameLogic.js
  ------------
  This version is split into multiple *sections* to demonstrate more modular organization:

   - constants for SHIP_STATS, RESOURCE_LOCATIONS, START_POSITIONS
   - a helper factory "createGameState()" that returns a new GameState instance
   - the GameState class is broken into smaller, clearer methods

  You could further split these into multiple files (like 'constants.js', 'gameState.js'),
  but here we keep them in a single file for clarity.
*/

// ---------------------------------------
// 1) CONSTANTS & DATA
// ---------------------------------------
const SHIP_STATS = {
  Scout:    { health: 1,  attack: 0, range: 0, speed: 3, cost: 3, ammo: 0,  fuel: 0  },
  Fighter:  { health: 2,  attack: 1, range: 1, speed: 2, cost: 5, ammo: 1,  fuel: 1  },
  Stinger:  { health: 1,  attack: 2, range: 1, speed: 3, cost: 5, ammo: 1,  fuel: 2  },
  Warrior:  { health: 3,  attack: 2, range: 1, speed: 2, cost: 7, ammo: 2,  fuel: 1  },
  Bulk:     { health: 5,  attack: 3, range: 1, speed: 1, cost:10, ammo: 3,  fuel: 2  },
  BigBoss:  { health:10,  attack: 5, range: 2, speed: 1, cost:20, ammo: 5,  fuel: 3  },
  Mothership:{health:20,  attack:10, range: 3, speed: 1, cost:30, ammo:10,  fuel: 5  },
  TITAN:    { health:30,  attack:15, range: 5, speed: 1, cost:50, ammo:15,  fuel:15 },
};

// Resource outposts/planets to demonstrate the concept
const RESOURCE_LOCATIONS = [
  {
    name: 'Planet Alpha',
    squares: [
      [9,9], [9,10], [9,11], [9,12],
      [10,9],[10,10],[10,11],[10,12],
      [11,9],[11,10],[11,11],[11,12],
      [12,9],[12,10],[12,11],[12,12],
    ],
    resources: { materials: 5, ammo: 5, fuel: 5 },
    multiSquare: true,
  },
  {
    name: 'Earth 1',
    squares: [[3,2],[3,3],[4,2],[4,3]],
    resources: { materials: 1, ammo: 1, fuel: 1 },
    multiSquare: true,
  },
  {
    name: 'Lost Warrior 1', squares: [[8,5]],  recruitAs: 'Warrior',
  },
  {
    name: 'Lost Warrior 2', squares: [[13,16]], recruitAs: 'Warrior',
  },
  {
    name: 'Lost Warrior 3', squares: [[16,8]],  recruitAs: 'Warrior',
  },
  {
    name: 'Lost Warrior 4', squares: [[5,13]],  recruitAs: 'Warrior',
  },
];

const START_POSITIONS = [
  { x: 1,  y: 1  },
  { x: 20, y: 20 },
  { x: 20, y: 1  },
  { x: 1,  y: 20 },
];

// ---------------------------------------
// 2) GAME STATE CLASS
// ---------------------------------------
class GameState {
  constructor() {
    this.players = [];
    this.currentPlayerIndex = 0;
    this.gameStarted = false;
    this.nextShipId = 1;
  }

  // Create a new player with a single Scout
  createPlayer(playerName) {
    if (this.players.length >= 4) {
      return { error: 'Max players reached (4)' };
    }
    const playerId = this.players.length + 1;
    const startPos = START_POSITIONS[playerId - 1] || { x:1, y:1 };

    const newPlayer = {
      id: playerId,
      name: playerName,
      resources: { materials:0, ammo:0, fuel:0 },
      ships: [],
      alive: true,
      startPosition: { x: startPos.x, y: startPos.y },
    };

    // Create the initial Scout
    newPlayer.ships.push(this.createShip('Scout', startPos.x, startPos.y, playerId));
    this.players.push(newPlayer);

    return { ok: true, player: newPlayer };
  }

  // Start the game
  startGame() {
    if (this.players.length < 2) {
      return { error: 'Need at least 2 players to start the game' };
    }
    this.gameStarted = true;
    // quick resource pass for the first player
    this.updateResourcesAtTurnStart(this.players[this.currentPlayerIndex]);
    return { ok: true, message: 'Game has started. Player 1 goes first!' };
  }

  // Helper to create ships
  createShip(type, x, y, ownerId) {
    const stats = SHIP_STATS[type];
    return {
      id: this.nextShipId++,
      type,
      x,
      y,
      ownerId,
      health: stats.health,
      ammo: stats.ammo,
      fuel: stats.fuel,
    };
  }

  // Current player's object
  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  // Move a ship
  moveShip(shipId, targetX, targetY) {
    if (!this.gameStarted) return { error: 'Game not started yet.' };

    const currentPlayer = this.getCurrentPlayer();
    const ship = currentPlayer.ships.find(s => s.id === shipId);
    if (!ship) {
      return { error: `No ship with id ${shipId} for current player.` };
    }

    const stats = SHIP_STATS[ship.type];
    // Calculate distance
    const dx = Math.abs(targetX - ship.x);
    const dy = Math.abs(targetY - ship.y);
    const distance = Math.max(dx, dy);

    if (distance > stats.speed) {
      return { error: `Cannot move more than speed ${stats.speed}.` };
    }
    // Fuel cost if not Scout
    if (ship.type !== 'Scout') {
      if (ship.fuel < distance) {
        return { error: `Not enough fuel (${ship.fuel}) to move ${distance} squares.` };
      }
      ship.fuel -= distance;
    }

    // Perform move
    ship.x = targetX;
    ship.y = targetY;

    // Resource pickup or lost warrior recruit
    const pickup = this.checkResourcePickup(ship, currentPlayer);
    const recruit = this.checkLostWarriorRecruit(ship, currentPlayer);

    let msg = `Ship ${shipId} moved to (${targetX},${targetY}).`;
    if (pickup) msg += ' ' + pickup;
    if (recruit) msg += ' ' + recruit;

    return { ok: true, message: msg };
  }

  // Check resource pickup
  checkResourcePickup(ship, player) {
    let result = '';
    RESOURCE_LOCATIONS.forEach(loc => {
      // If the ship is exactly on any of the squares
      loc.squares.forEach(([lx, ly]) => {
        if (ship.x === lx && ship.y === ly) {
          // If recruitAs is set, skip (that's handled in checkLostWarriorRecruit)
          if (!loc.recruitAs && loc.resources) {
            player.resources.materials += loc.resources.materials || 0;
            player.resources.ammo += loc.resources.ammo || 0;
            player.resources.fuel += loc.resources.fuel || 0;
            result = `Picked up resources from ${loc.name}`;
          }
        }
      });
    });
    return result;
  }

  // Check lost warrior adjacency
  checkLostWarriorRecruit(ship, player) {
    let result = '';
    RESOURCE_LOCATIONS.forEach(loc => {
      if (loc.recruitAs === 'Warrior') {
        // if ship is within 1 square (including diagonals)
        loc.squares.forEach(([lx, ly]) => {
          const dx = Math.abs(ship.x - lx);
          const dy = Math.abs(ship.y - ly);
          if (dx <= 1 && dy <= 1) {
            const warrior = this.createShip('Warrior', ship.x, ship.y, player.id);
            player.ships.push(warrior);
            result = `Lost Warrior at (${lx},${ly}) recruited as Warrior (id=${warrior.id})!`;
          }
        });
      }
    });
    return result;
  }

  // Attack logic
  attackShip(shipId, targetId) {
    if (!this.gameStarted) return { error: 'Game not started yet.' };

    const currentPlayer = this.getCurrentPlayer();
    const ship = currentPlayer.ships.find(s => s.id === shipId);
    if (!ship) {
      return { error: `No ship with id ${shipId} for current player.` };
    }
    if (ship.ammo <= 0) {
      return { error: `No ammo left on ship ${shipId}` };
    }

    // find the target in ANY player's fleet
    let targetShip = null;
    let targetOwner = null;
    for (const p of this.players) {
      const found = p.ships.find(s => s.id === targetId);
      if (found) {
        targetShip = found;
        targetOwner = p;
        break;
      }
    }
    if (!targetShip) {
      return { error: `No target with id ${targetId}` };
    }
    if (!targetOwner.alive) {
      return { error: 'Target owner is already eliminated' };
    }

    // Check range
    const stats = SHIP_STATS[ship.type];
    const dx = Math.abs(ship.x - targetShip.x);
    const dy = Math.abs(ship.y - targetShip.y);
    const distance = Math.max(dx, dy);
    if (distance > stats.range) {
      return { error: `Target is out of range (range=${stats.range}).` };
    }

    // Use ammo
    ship.ammo--;
    // Coin flip
    const isHit = Math.random() < 0.5;
    if (!isHit) {
      return { ok: true, message: `Attack from ship ${shipId} on ${targetId} MISSED!` };
    }

    // Apply damage
    targetShip.health -= stats.attack;
    let msg = `Attack from ship ${shipId} on ${targetId} HIT for ${stats.attack} damage.`;
    if (targetShip.health <= 0) {
      msg += ` Ship ${targetId} destroyed!`;
      // Remove the ship
      targetOwner.ships = targetOwner.ships.filter(s => s.id !== targetShip.id);
      if (targetOwner.ships.length === 0) {
        targetOwner.alive = false;
        msg += ` Player ${targetOwner.name} has no ships left and is eliminated!`;
      }
    }
    return { ok: true, message: msg };
  }

  // End turn
  endTurn() {
    if (!this.gameStarted) return { error: 'Game not started yet.' };
    let attempts = 0;
    do {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      attempts++;
      if (attempts > this.players.length) {
        return { error: 'No alive players left, game ends!' };
      }
    } while (!this.players[this.currentPlayerIndex].alive);

    const newPlayer = this.players[this.currentPlayerIndex];
    this.updateResourcesAtTurnStart(newPlayer);
    return { ok: true, message: `It's now Player ${newPlayer.id} (${newPlayer.name})'s turn.` };
  }

  // Gains resources for multi-square controlled planets
  updateResourcesAtTurnStart(player) {
    let gainMat = 0;
    let gainAmmo = 0;
    let gainFuel = 0;

    RESOURCE_LOCATIONS.forEach(loc => {
      if (loc.multiSquare && loc.resources) {
        // If any square is occupied by player's ships, they control it
        const control = loc.squares.some(([lx, ly]) => {
          return player.ships.some(ship => ship.x === lx && ship.y === ly);
        });
        if (control) {
          gainMat += loc.resources.materials || 0;
          gainAmmo += loc.resources.ammo || 0;
          gainFuel += loc.resources.fuel || 0;
        }
      }
    });

    player.resources.materials += gainMat;
    player.resources.ammo += gainAmmo;
    player.resources.fuel += gainFuel;
  }

  // Build a new ship
  buildShip(shipType) {
    const currentPlayer = this.getCurrentPlayer();
    const cost = SHIP_STATS[shipType]?.cost;
    if (cost == null) {
      return { error: `Unknown ship type ${shipType}` };
    }
    if (currentPlayer.resources.materials < cost) {
      return { error: `Not enough materials to build ${shipType}` };
    }
    currentPlayer.resources.materials -= cost;
    const newShip = this.createShip(
      shipType,
      currentPlayer.startPosition.x,
      currentPlayer.startPosition.y,
      currentPlayer.id
    );
    currentPlayer.ships.push(newShip);
    return { ok: true, message: `Building ${shipType} (id=${newShip.id}).` };
  }
}

// ---------------------------------------
// 3) FACTORY FUNCTION
// ---------------------------------------
function createGameState() {
  return new GameState();
}

// ---------------------------------------
// EXPORTS
// ---------------------------------------
module.exports = {
  createGameState,
};
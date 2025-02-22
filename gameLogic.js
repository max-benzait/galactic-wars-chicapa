/*
  gameLogic.js
  -------------
  This module encapsulates the core logic for the Galactic Wars proof-of-concept.
  It includes data structures for:
    - Players
    - Ships
    - Locations (planets, resource checkpoints)
    - Turn order
    - Basic command handling

  References the "Galactic Wars" rules you provided, including:
    - 20x20 grid
    - 2-4 players
    - Ship stats (Scout, Fighter, Stinger, Warrior, etc.)
    - Resource locations
    - Basic movement, attack, resource claims, and turn flow

  For brevity, not every single rule is fully enforced, but it's enough to demonstrate
  a live game via WebSocket.
*/

// -----------------------------------------------------------------------------
// CONSTANTS & GAME DATA
// -----------------------------------------------------------------------------

// Board dimensions
const BOARD_WIDTH = 20;
const BOARD_HEIGHT = 20;

// Ship stat definitions
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
// (This is a truncated version of your list; feel free to expand)
const RESOURCE_LOCATIONS = [
  // Planet Alpha (multi-square; just store the corners for POC)
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
  // Earth 1 (4 squares, +1/+1/+1)
  {
    name: 'Earth 1',
    squares: [[3,2],[3,3],[4,2],[4,3]],
    resources: { materials: 1, ammo: 1, fuel: 1 },
    multiSquare: true,
  },
  // Lost Warriors as single squares - recruit as Warrior
  {
    name: 'Lost Warrior 1',
    squares: [[8,5]],
    recruitAs: 'Warrior',
  },
  {
    name: 'Lost Warrior 2',
    squares: [[13,16]],
    recruitAs: 'Warrior',
  },
  {
    name: 'Lost Warrior 3',
    squares: [[16,8]],
    recruitAs: 'Warrior',
  },
  {
    name: 'Lost Warrior 4',
    squares: [[5,13]],
    recruitAs: 'Warrior',
  },
  // ... Add as many as you'd like ...
];

// Default starting positions for up to 4 players
const START_POSITIONS = [
  { x: 1,  y: 1  }, // Player1
  { x: 20, y: 20 }, // Player2
  { x: 20, y: 1  }, // Player3
  { x: 1,  y: 20 }, // Player4
];

// -----------------------------------------------------------------------------
// GAME STATE
// -----------------------------------------------------------------------------
class GameState {
  constructor() {
    // Store players as an array of objects
    this.players = [];
    // For turn rotation
    this.currentPlayerIndex = 0;
    // Track if game has started
    this.gameStarted = false;
    // Keep a global incrementing ID for ships
    this.nextShipId = 1;
    // Keep log messages if needed
    this.gameLog = [];
  }

  /*
    createPlayer(playerName)
    Creates a new player entry with a single Scout ship at their start position.
  */
  createPlayer(playerName) {
    // Limit to 4 players for demonstration
    if (this.players.length >= 4) {
      return { error: 'Max players reached (4)' };
    }

    const playerId = this.players.length + 1;
    const startPos = START_POSITIONS[playerId - 1];

    const newPlayer = {
      id: playerId,
      name: playerName,
      resources: {
        materials: 0,
        ammo: 0,
        fuel: 0,
      },
      ships: [],
      // We'll track which squares they control if needed
      controlledSquares: [],
      // Starting location
      startPosition: { x: startPos.x, y: startPos.y },
      // True if player is alive
      alive: true,
    };

    // Create the initial Scout
    const scout = this.createShip('Scout', startPos.x, startPos.y, playerId);
    newPlayer.ships.push(scout);

    this.players.push(newPlayer);

    return { ok: true, player: newPlayer };
  }

  /*
    startGame()
    Once all players have joined, we can start the game.
  */
  startGame() {
    if (this.players.length < 2) {
      return { error: 'Need at least 2 players to start the game' };
    }
    this.gameStarted = true;
    // For demonstration, we can do a quick resource pass
    this.updateResourcesAtTurnStart(this.players[this.currentPlayerIndex]);
    return { ok: true, message: 'Game has started. Player 1 goes first!' };
  }

  /*
    createShip(type, x, y, ownerId)
    Utility method to create a ship object from the SHIP_STATS.
  */
  createShip(type, x, y, ownerId) {
    const stats = SHIP_STATS[type];
    const ship = {
      id: this.nextShipId++,
      type,
      x,
      y,
      ownerId,
      health: stats.health,
      ammo: stats.ammo,
      fuel: stats.fuel,
    };
    return ship;
  }

  /*
    getCurrentPlayer()
    Returns the player object whose turn it is.
  */
  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  /*
    moveShip(shipId, targetX, targetY)
    Movement logic with speed & fuel constraints.
    - Speed: max squares a ship can move per turn
    - Fuel: subtract 1 fuel per square for non-Scout ships
  */
  moveShip(shipId, targetX, targetY) {
    if (!this.gameStarted) return { error: 'Game not started yet.' };

    const currentPlayer = this.getCurrentPlayer();
    // Find the ship
    const ship = currentPlayer.ships.find(s => s.id === Number(shipId));
    if (!ship) {
      return { error: `No ship with id ${shipId} for current player` };
    }

    const stats = SHIP_STATS[ship.type];
    // Calculate distance (let's allow diagonal for simplicity)
    const dx = Math.abs(targetX - ship.x);
    const dy = Math.abs(targetY - ship.y);
    const distance = Math.max(dx, dy); // Cheaty diagonal approach

    if (distance > stats.speed) {
      return { error: `Cannot move more than speed ${stats.speed}.` };
    }

    // Fuel cost for non-Scout
    if (ship.type !== 'Scout') {
      // We consider 1 fuel per square (roughly the distance).
      if (ship.fuel < distance) {
        return { error: `Not enough fuel (${ship.fuel}) to move ${distance} squares.` };
      }
      ship.fuel -= distance;
    }

    // Execute move
    ship.x = targetX;
    ship.y = targetY;

    // Check for resource pickups or Lost Warrior recruit
    const pickupRes = this.checkResourcePickup(ship, currentPlayer);
    const recruitMsg = this.checkLostWarriorRecruit(ship, currentPlayer);

    let msg = `Ship ${shipId} moved to (${targetX}, ${targetY}).`;
    if (pickupRes) msg += ' ' + pickupRes;
    if (recruitMsg) msg += ' ' + recruitMsg;

    return { ok: true, message: msg };
  }

  /*
    checkResourcePickup(ship, player)
    Checks if the ship landed on or passed through any resource squares.
    If so, add resources to player's stockpile immediately.
  */
  checkResourcePickup(ship, player) {
    let resultMsg = '';
    RESOURCE_LOCATIONS.forEach(loc => {
      // If squares are multi-square, check if this (x,y) is in that set
      loc.squares.forEach(sq => {
        if (sq[0] === ship.x && sq[1] === ship.y) {
          // If recruitAs is defined, that's handled elsewhere, skip
          if (loc.recruitAs) return;
          // Otherwise, pick up resources
          if (loc.resources) {
            player.resources.materials += loc.resources.materials || 0;
            player.resources.ammo += loc.resources.ammo || 0;
            player.resources.fuel += loc.resources.fuel || 0;
            resultMsg = `Picked up resources from ${loc.name}`;
          }
        }
      });
    });
    return resultMsg;
  }

  /*
    checkLostWarriorRecruit(ship, player)
    If the ship is adjacent to a Lost Warrior location, recruit a Warrior.
    (For simplicity, let's do a direct check at the new location)
  */
  checkLostWarriorRecruit(ship, player) {
    let resultMsg = '';
    RESOURCE_LOCATIONS.forEach(loc => {
      if (loc.recruitAs === 'Warrior') {
        loc.squares.forEach(sq => {
          const dx = Math.abs(sq[0] - ship.x);
          const dy = Math.abs(sq[1] - ship.y);
          if (dx <= 1 && dy <= 1) {
            // Recruit a free Warrior at ship.x, ship.y
            const newWarrior = this.createShip('Warrior', ship.x, ship.y, player.id);
            player.ships.push(newWarrior);
            resultMsg = `Lost Warrior at (${sq[0]},${sq[1]}) recruited as Warrior (id=${newWarrior.id})!`;
          }
        });
      }
    });
    return resultMsg;
  }

  /*
    attackShip(shipId, targetId)
    Basic attack logic: check range, ammo, coin flip for hit, apply damage.
  */
  attackShip(shipId, targetId) {
    if (!this.gameStarted) return { error: 'Game not started yet.' };
    const currentPlayer = this.getCurrentPlayer();
    const ship = currentPlayer.ships.find(s => s.id === Number(shipId));
    if (!ship) {
      return { error: `No ship with id ${shipId} for current player` };
    }

    // Check if we have ammo
    if (ship.ammo <= 0) {
      return { error: `No ammo left on ship ${shipId}` };
    }

    // Find the target in ANY player's fleet
    let targetShip = null;
    let targetOwner = null;
    for (const p of this.players) {
      const found = p.ships.find(s => s.id === Number(targetId));
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
      return { error: 'Target owner is already out of the game' };
    }
    // Check range
    const stats = SHIP_STATS[ship.type];
    const dx = Math.abs(ship.x - targetShip.x);
    const dy = Math.abs(ship.y - targetShip.y);
    const distance = Math.max(dx, dy);
    if (distance > stats.range) {
      return { error: `Target is out of range (${stats.range}).` };
    }
    // Consume ammo
    ship.ammo--;
    // Coin flip for hit
    const isHit = Math.random() < 0.5;
    if (!isHit) {
      return { ok: true, message: `Attack from ship ${shipId} on ${targetId} MISSED!` };
    }

    // Apply damage
    targetShip.health -= stats.attack;
    let msg = `Attack from ship ${shipId} on ${targetId} HIT for ${stats.attack} damage.`;
    if (targetShip.health <= 0) {
      msg += ` Ship ${targetId} destroyed!`;
      // Remove the ship from the owner's fleet
      targetOwner.ships = targetOwner.ships.filter(s => s.id !== targetShip.id);
      // Check if that player has no ships left
      if (targetOwner.ships.length === 0) {
        targetOwner.alive = false;
        msg += ` Player ${targetOwner.name} has no ships left and is eliminated!`;
      }
    }
    return { ok: true, message: msg };
  }

  /*
    endTurn()
    Moves to the next player if they are alive. Also does resource collection for next player.
  */
  endTurn() {
    if (!this.gameStarted) return { error: 'Game not started yet.' };

    // Move currentPlayerIndex forward
    let attempts = 0; // safeguard vs infinite loop
    do {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      attempts++;
      if (attempts > this.players.length) {
        return { error: 'No alive players left, game ends!' };
      }
    } while (!this.players[this.currentPlayerIndex].alive);

    // Do resource pass for the new current player
    const newPlayer = this.players[this.currentPlayerIndex];
    this.updateResourcesAtTurnStart(newPlayer);

    return {
      ok: true,
      message: `It's now Player ${newPlayer.id} (${newPlayer.name})'s turn.`,
    };
  }

  /*
    updateResourcesAtTurnStart(player)
    For demonstration, simply add resources from the squares they occupy (if multi-square).
    This is a naive version; expand as needed.
  */
  updateResourcesAtTurnStart(player) {
    let gainMat = 0;
    let gainAmmo = 0;
    let gainFuel = 0;

    // Check each resource location that is multiSquare
    // If the player occupies ANY squares of a multiSquare location, they control it
    RESOURCE_LOCATIONS.forEach(loc => {
      if (loc.multiSquare && loc.resources) {
        const anyOverlap = loc.squares.some(sq => {
          return player.ships.some(ship => ship.x === sq[0] && ship.y === sq[1]);
        });
        if (anyOverlap) {
          gainMat += loc.resources.materials;
          gainAmmo += loc.resources.ammo;
          gainFuel += loc.resources.fuel;
        }
      }
    });

    // Add them
    player.resources.materials += gainMat;
    player.resources.ammo += gainAmmo;
    player.resources.fuel += gainFuel;
  }

  /*
    buildShip(shipType)
    Spend materials at your starting square to build a new ship, which spawns at next turn.
    (Simplified version; build instantly for POC)
  */
  buildShip(shipType) {
    const currentPlayer = this.getCurrentPlayer();
    const cost = SHIP_STATS[shipType]?.cost;
    if (cost == null) {
      return { error: `Unknown ship type ${shipType}` };
    }
    if (currentPlayer.resources.materials < cost) {
      return { error: `Not enough materials to build ${shipType}` };
    }
    // Spend
    currentPlayer.resources.materials -= cost;
    // Create the ship
    const newShip = this.createShip(
      shipType,
      currentPlayer.startPosition.x,
      currentPlayer.startPosition.y,
      currentPlayer.id
    );
    currentPlayer.ships.push(newShip);

    return {
      ok: true,
      message: `Building ${shipType} (id=${newShip.id}) at (${newShip.x},${newShip.y}).`
    };
  }
}

module.exports = {
  GameState,
};
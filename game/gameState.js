/*
  gameState.js
  ------------
  Defines the GameState class that manipulates players, ships, moves, attacks, etc.
  Uses the resource map (passed in from outside) to check for resource pickups,
  lost warrior recruits, etc.
*/

const { SHIP_STATS, START_POSITIONS } = require('./constants');

class GameState {
  constructor(resourceMap) {
    this.resourceMap = resourceMap; // The array of resource definitions
    this.players = [];
    this.currentPlayerIndex = 0;
    this.gameStarted = false;
    this.nextShipId = 1;
  }

  createPlayer(playerName) {
    if (this.players.length >= 4) {
      return { error: 'Max players reached (4)' };
    }
    const playerId = this.players.length + 1;
    const startPos = START_POSITIONS[playerId - 1] || { x:1, y:1 };

    const newPlayer = {
      id: playerId,
      name: playerName,
      resources: { materials: 0, ammo: 0, fuel: 0 },
      ships: [],
      alive: true,
      startPosition: { x: startPos.x, y: startPos.y },
    };

    // Create a Scout ship
    newPlayer.ships.push(
      this.createShip('Scout', startPos.x, startPos.y, playerId)
    );

    this.players.push(newPlayer);
    return { ok: true, player: newPlayer };
  }

  startGame() {
    if (this.players.length < 2) {
      return { error: 'Need at least 2 players to start' };
    }
    this.gameStarted = true;
    // “Farm” resources for the first player
    this.updateResourcesAtTurnStart(this.players[this.currentPlayerIndex]);
    return { ok: true, message: 'Game started. Player 1 goes first!' };
  }

  // Utility: create a ship
  createShip(type, x, y, ownerId) {
    const stats = SHIP_STATS[type];
    if (!stats) {
      return { id: -1, type, x, y, ownerId, health:1, ammo:0, fuel:0 };
    }
    const newId = this.nextShipId++;
    return {
      id: newId,
      type,
      x,
      y,
      ownerId,
      health: stats.health,
      ammo: stats.ammo,
      fuel: stats.fuel,
    };
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  moveShip(shipId, tx, ty) {
    if (!this.gameStarted) return { error: 'Game not started' };
    const curPlayer = this.getCurrentPlayer();
    const ship = curPlayer.ships.find(s => s.id === shipId);
    if (!ship) {
      return { error: `Ship ${shipId} not found (current player).` };
    }

    const stats = SHIP_STATS[ship.type];
    const dx = Math.abs(tx - ship.x);
    const dy = Math.abs(ty - ship.y);
    const distance = Math.max(dx, dy);

    if (distance > stats.speed) {
      return { error: `Exceeds speed ${stats.speed}` };
    }
    // fuel usage for non-Scout
    if (ship.type !== 'Scout') {
      if (ship.fuel < distance) {
        return { error: `Not enough fuel: ${ship.fuel}` };
      }
      ship.fuel -= distance;
    }

    ship.x = tx;
    ship.y = ty;

    // Resource pickups
    const pickup = this.checkResourcePickup(ship, curPlayer);
    // Lost Warrior?
    const recruit = this.checkLostWarrior(ship, curPlayer);

    let msg = `Ship ${shipId} moved to (${tx},${ty}).`;
    if (pickup) msg += ' ' + pickup;
    if (recruit) msg += ' ' + recruit;
    return { ok: true, message: msg };
  }

  checkResourcePickup(ship, player) {
    let info = '';
    for (const loc of this.resourceMap) {
      if (loc.recruitAs) continue; // skip “lost warrior” logic
      for (const [lx, ly] of loc.squares) {
        if (lx === ship.x && ly === ship.y) {
          // pick up
          if (loc.resources) {
            player.resources.materials += loc.resources.materials || 0;
            player.resources.ammo += loc.resources.ammo || 0;
            player.resources.fuel += loc.resources.fuel || 0;
            info = `Picked up resources from ${loc.name}`;
          }
        }
      }
    }
    return info;
  }

  checkLostWarrior(ship, player) {
    let msg = '';
    for (const loc of this.resourceMap) {
      if (loc.recruitAs === 'Warrior') {
        // if adjacent
        for (const [lx, ly] of loc.squares) {
          const dx = Math.abs(ship.x - lx);
          const dy = Math.abs(ship.y - ly);
          if (dx <= 1 && dy <= 1) {
            const w = this.createShip('Warrior', ship.x, ship.y, player.id);
            player.ships.push(w);
            msg = `Lost Warrior at (${lx},${ly}) recruited as Warrior (id=${w.id})!`;
          }
        }
      }
    }
    return msg;
  }

  attackShip(shipId, targetId) {
    if (!this.gameStarted) return { error: 'Game not started' };
    const curPlayer = this.getCurrentPlayer();
    const ship = curPlayer.ships.find(s => s.id === shipId);
    if (!ship) return { error: `Ship ${shipId} not found` };
    if (ship.ammo <= 0) return { error: 'No ammo' };

    // find target in ANY player's fleet
    let tShip = null;
    let tOwner = null;
    for (const p of this.players) {
      const found = p.ships.find(s => s.id === targetId);
      if (found) {
        tShip = found;
        tOwner = p;
        break;
      }
    }
    if (!tShip) return { error: 'Target not found' };
    if (!tOwner.alive) return { error: 'Target owner is eliminated' };

    const stats = SHIP_STATS[ship.type];
    const dx = Math.abs(ship.x - tShip.x);
    const dy = Math.abs(ship.y - tShip.y);
    const distance = Math.max(dx, dy);
    if (distance > stats.range) return { error: 'Target out of range' };

    ship.ammo--;
    // coin flip
    const isHit = Math.random() < 0.5;
    if (!isHit) return { ok:true, message:`Attack from ${shipId} on ${targetId} missed!` };

    tShip.health -= stats.attack;
    let msg = `Ship ${shipId} hit ${targetId} for ${stats.attack} damage.`;
    if (tShip.health <= 0) {
      msg += ` Ship ${targetId} destroyed!`;
      tOwner.ships = tOwner.ships.filter(s => s.id !== tShip.id);
      if (tOwner.ships.length === 0) {
        tOwner.alive = false;
        msg += ` Player ${tOwner.name} is eliminated!`;
      }
    }
    return { ok:true, message: msg };
  }

  endTurn() {
    if (!this.gameStarted) return { error: 'Game not started' };

    let attempts = 0;
    do {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      attempts++;
      if (attempts > this.players.length) return { error: 'No alive players left' };
    } while (!this.players[this.currentPlayerIndex].alive);

    const np = this.players[this.currentPlayerIndex];
    this.updateResourcesAtTurnStart(np);
    return { ok:true, message:`It's now Player ${np.id} (${np.name})'s turn.` };
  }

  updateResourcesAtTurnStart(player) {
    let mat=0, amm=0, fuel=0;
    for (const loc of this.resourceMap) {
      if (loc.multiSquare && loc.resources) {
        // if any squares are occupied
        const control = loc.squares.some(([lx, ly]) => {
          return player.ships.some(s => s.x === lx && s.y === ly);
        });
        if (control) {
          mat += loc.resources.materials || 0;
          amm += loc.resources.ammo || 0;
          fuel += loc.resources.fuel || 0;
        }
      }
    }
    player.resources.materials += mat;
    player.resources.ammo += amm;
    player.resources.fuel += fuel;
  }

  buildShip(type) {
    const curPlayer = this.getCurrentPlayer();
    const stats = SHIP_STATS[type];
    if (!stats) return { error: `Unknown ship type ${type}` };
    if (curPlayer.resources.materials < stats.cost) {
      return { error: `Not enough materials to build ${type}` };
    }
    curPlayer.resources.materials -= stats.cost;
    const newShip = this.createShip(
      type,
      curPlayer.startPosition.x,
      curPlayer.startPosition.y,
      curPlayer.id
    );
    curPlayer.ships.push(newShip);
    return { ok:true, message:`Building ${type} (id=${newShip.id}).` };
  }
}

module.exports = GameState;
/*
  constants.js
  ------------
  Stores any shared, “static” definitions:
    - SHIP_STATS: definitions for each ship type
    - START_POSITIONS: Where each player spawns
*/

module.exports = {
    SHIP_STATS: {
      Scout:    { health: 1,  attack: 0, range: 0, speed: 3, cost: 3, ammo: 0,  fuel: 0  },
      Fighter:  { health: 2,  attack: 1, range: 1, speed: 2, cost: 5, ammo: 1,  fuel: 1  },
      Stinger:  { health: 1,  attack: 2, range: 1, speed: 3, cost: 5, ammo: 1,  fuel: 2  },
      Warrior:  { health: 3,  attack: 2, range: 1, speed: 2, cost: 7, ammo: 2,  fuel: 1  },
      Bulk:     { health: 5,  attack: 3, range: 1, speed: 1, cost:10, ammo: 3,  fuel: 2  },
      BigBoss:  { health:10,  attack: 5, range: 2, speed: 1, cost:20, ammo: 5,  fuel: 3  },
      Mothership:{health:20,  attack:10, range: 3, speed: 1, cost:30, ammo:10,  fuel: 5  },
      TITAN:    { health:30,  attack:15, range: 5, speed: 1, cost:50, ammo:15,  fuel:15 },
    },
  
    START_POSITIONS: [
      { x: 1,  y: 1  },
      { x: 20, y: 20 },
      { x: 20, y: 1  },
      { x: 1,  y: 20 },
    ],
  };
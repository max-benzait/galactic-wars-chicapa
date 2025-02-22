/*
  resourceGenerator.js
  --------------------
  Exports a function to generate random resource locations.
  This can replace or augment a static list, letting you vary 
  planet positions or resource amounts each time.

  For demo, we’ll just randomize a few squares and resources. 
  Adjust as needed.
*/

function randomResourceMap() {
    // Example approach: we generate some random single-square resource spots
    // plus maybe one big planet in the middle. 
    // In reality, you’d do something more interesting.
  
    const resources = [];
  
    // 1) Add a “big planet” in center
    resources.push({
      name: 'Planet Alpha',
      squares: [
        [9,9], [9,10], [9,11], [9,12],
        [10,9],[10,10],[10,11],[10,12],
        [11,9],[11,10],[11,11],[11,12],
        [12,9],[12,10],[12,11],[12,12],
      ],
      resources: { materials: 5, ammo: 5, fuel: 5 },
      multiSquare: true,
    });
  
    // 2) Randomly place 5 single-square “Lost Warriors”
    for (let i = 1; i <= 5; i++) {
      const rx = Math.floor(Math.random() * 20) + 1; // 1..20
      const ry = Math.floor(Math.random() * 20) + 1;
      resources.push({
        name: `Lost Warrior ${i}`,
        squares: [[rx, ry]],
        recruitAs: 'Warrior',
      });
    }
  
    // 3) Randomly place 5 “Resource spots” each giving +2 materials
    for (let i = 1; i <= 5; i++) {
      const rx = Math.floor(Math.random() * 20) + 1;
      const ry = Math.floor(Math.random() * 20) + 1;
      resources.push({
        name: `Random Spot #${i}`,
        squares: [[rx, ry]],
        resources: { materials: 2, ammo: 0, fuel: 0 },
        multiSquare: false,
      });
    }
  
    return resources;
  }
  
  module.exports = {
    randomResourceMap,
  };
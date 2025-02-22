# Galactic Wars POC

This is a proof-of-concept Node.js WebSocket server for the **Galactic Wars** board game.  
Players can connect via WebSocket, enter commands to play, and watch the console output.  

## Prerequisites
- Node.js (>= 14.x recommended)
- npm (>= 6.x)

## Setup & Run

### 1. Install dependencies  
```bash
make install
```

### 2. Start the server  
```bash
make start
```

### 3. Connect  
Use `wscat` or any WebSocket client to connect:
```bash
wscat -c ws://localhost:3000
```

Once connected, type commands, e.g.:
```bash
joinGame Alice
```
And watch the broadcast messages.

## Commands

- **`joinGame <playerName>`**  
  Joins the game as a new player.
- **`startGame`**  
  Once all players have joined, start the game.
- **`move <shipId> <x> <y>`**  
  Move the specified ship to (x,y).
- **`attack <shipId> <targetShipId>`**  
  Attempt to attack the target ship (must be in range, must have ammo).
- **`endTurn`**  
  End your turn, pass control to the next player.
- *(And more! Check code comments for additional commands or expansions.)*

## Notes

- The game is simplified in code but attempts to reflect the rules you specified.
- Everything is in-memory; restarting the server resets the game.
- Expand or modify the logic in `gameLogic.js` to suit your needs.
- **Lol you read me? WHAT A NOOB!!!**

---

## Usage Steps Recap

1. **Install:**
   ```bash
   make install
   ```
2. **Run:**
   ```bash
   make start  # Or use `make dev` if you want nodemon auto-reload.
   ```
3. **Connect:**
   ```bash
   wscat -c ws://localhost:3000
   ```
4. **Enter commands to play** (e.g. `joinGame Alice`, `joinGame Bob`, `startGame`, `move 1 2 2`, etc.).

This will broadcast the results to all connected WebSocket clients, so everyone can see real-time turn updates. Enjoy hacking on this proof-of-concept and expand as you wish!

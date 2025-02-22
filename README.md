# Galactic Wars POC (Express + WebSockets + Minimal HTML)

This is a proof-of-concept Node.js server for the **Galactic Wars** board game,  
enhanced to:
- Serve a minimal **HTML/JS** client via **Express**.
- Use **WebSockets** for real-time gameplay commands.
- Containerize & deploy to **Google Cloud Run** via Docker.

## Features
- **Local Development**: Start with `make start` or `make dev`.
- **Dockerized**: Build & run via `make build-docker` / `make run-docker`.
- **Cloud Run**: Deploy using `make push` + `make deploy`.
- **Destroy**: Cleanup service with `make destroy`.

## Quick Start (Local)

### 1. Install dependencies  
```bash
make install
```

### 2. Run the server  
```bash
make start
```

### 3. Open your browser to [http://localhost:8080](http://localhost:8080)  
- The server logs show you the WebSocket port used (also 8080).
- Or from the command line:
  ```bash
  wscat -c ws://localhost:8080
  ```

### 4. Use the UI on the page or send raw text commands from the console.

## Game Commands

From the client (see `script.js` usage), or via a WebSocket tool:

- **`joinGame <playerName>`**  
  Joins the game as a new player.
- **`startGame`**  
  After players join, start the game.
- **`move <shipId> <x> <y>`**  
  Move a ship to coordinates (x,y).
- **`attack <shipId> <targetShipId>`**  
  Attempt to attack target ship.
- **`build <shipType>`**  
  Build a new ship (Fighter, Stinger, Warrior, etc.) if you have materials.
- **`endTurn`**  
  End your turn.

## Deploy to Cloud Run

### 1. Set your environment variables in the `Makefile`:
```make
PROJECT_ID = your-gcp-project-id
SERVICE_NAME = galactic-wars-poc
REGION = us-central1
```

### 2. Push your image:
```bash
make push
```

### 3. Deploy:
```bash
make deploy
```

### 4. Grab the Service URL from the output, open in a browser, and enjoy.

## Destroy the Service

When you’re done:
```bash
make destroy
```
(This removes the Cloud Run service from GCP.)
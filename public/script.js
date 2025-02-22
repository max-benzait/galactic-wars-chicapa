(() => {
    // Grab UI elements
    const lobbyInfoDiv = document.getElementById('lobbyInfo');
    const messagesDiv = document.getElementById('messages');
    const commandInput = document.getElementById('commandInput');
    const sendBtn = document.getElementById('sendBtn');
    const helpBtn = document.getElementById('helpBtn');
  
    // Display a line in the #messages div
    function addMessage(msg) {
      const line = document.createElement('div');
      line.textContent = msg;
      messagesDiv.appendChild(line);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  
    // Parse window.location.pathname to see if it's /lobby/<uuid>
    // e.g. "/lobby/123e4567-e89b-12d3-a456-426614174000" => ["lobby","123e4567-e89b-12d3..."]
    const pathParts = window.location.pathname.split('/').filter(Boolean);
  
    // We'll store the WebSocket object here (if any)
    let ws = null;
  
    if (pathParts.length === 2 && pathParts[0] === 'lobby') {
      // We found a lobby ID in the path
      const lobbyId = pathParts[1];
  
      // Show some info
      lobbyInfoDiv.innerHTML = `You are in lobby: <strong>${lobbyId}</strong>`;
  
      // Decide WS protocol (ws: or wss:) based on current page
      const loc = window.location;
      const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
      // Construct the WS URL: e.g. "ws://localhost:8080/ws/lobby/1234"
      const wsUrl = `${protocol}//${loc.host}/ws/lobby/${lobbyId}`;
  
      // Connect
      ws = new WebSocket(wsUrl);
  
      // When connected
      ws.onopen = () => {
        addMessage('[WebSocket] Connected to lobby ' + lobbyId);
      };
  
      // When a message arrives
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.error) {
            addMessage('[ERROR] ' + data.error);
          } else if (data.message) {
            addMessage(data.message);
          } else {
            addMessage('[Unknown data] ' + event.data);
          }
        } catch (err) {
          addMessage('[Invalid JSON] ' + event.data);
        }
      };
  
      // When closed
      ws.onclose = () => {
        addMessage('[WebSocket] Disconnected');
      };
    } else {
      // If not at /lobby/<uuid>, show a default message
      lobbyInfoDiv.textContent =
        'No lobby ID detected in path. Go to /lobby/<uuid> or use /api/lobby/new.';
    }
  
    // Send a command to the WS (if open)
    function sendCommand(cmd) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(cmd);
        addMessage('[You] ' + cmd);
      } else {
        addMessage('[ERROR] WebSocket not connected');
      }
    }
  
    // Handle send button
    sendBtn.addEventListener('click', () => {
      const cmd = commandInput.value.trim();
      if (!cmd) return;
      sendCommand(cmd);
      commandInput.value = '';
    });
  
    // Handle help button
    helpBtn.addEventListener('click', () => {
      addMessage('Try these commands:');
      addMessage('  joinGame <name>');
      addMessage('  startGame');
      addMessage('  move <shipId> <x> <y>');
      addMessage('  attack <shipId> <targetShipId>');
      addMessage('  build <shipType>');
      addMessage('  endTurn');
    });
  
    // Press Enter => Send
    commandInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        sendBtn.click();
      }
    });
  })();
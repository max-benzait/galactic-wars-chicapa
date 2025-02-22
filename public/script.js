(() => {
    const commandInput = document.getElementById('commandInput');
    const sendBtn = document.getElementById('sendBtn');
    const helpBtn = document.getElementById('helpBtn');
    const messagesDiv = document.getElementById('messages');
  
    // Connect to WebSocket on the same host/port
    // For local dev: ws://localhost:8080
    // For Cloud Run (https), must use wss://
    // We'll do a quick scheme check:
    const loc = window.location;
    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${loc.host}`; // same host:port as the page
    const ws = new WebSocket(wsUrl);
  
    // Display messages in #messages div
    function addMessage(msg) {
      const line = document.createElement('div');
      line.innerText = msg;
      messagesDiv.appendChild(line);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  
    ws.onopen = () => {
      addMessage('[WebSocket] Connected');
    };
  
    ws.onmessage = (event) => {
      // The server sends JSON
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
  
    ws.onclose = () => {
      addMessage('[WebSocket] Disconnected');
    };
  
    // Send command
    function sendCommand(cmd) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(cmd);
      } else {
        addMessage('[ERROR] WebSocket not connected');
      }
    }
  
    // Button handlers
    sendBtn.addEventListener('click', () => {
      const cmd = commandInput.value.trim();
      if (!cmd) return;
      addMessage('[You] ' + cmd);
      sendCommand(cmd);
      commandInput.value = '';
    });
  
    helpBtn.addEventListener('click', () => {
      addMessage('Try these commands:');
      addMessage('  joinGame <name>');
      addMessage('  startGame');
      addMessage('  move <shipId> <x> <y>');
      addMessage('  attack <shipId> <targetShipId>');
      addMessage('  build <shipType>');
      addMessage('  endTurn');
    });
  
    // Press Enter = send
    commandInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        sendBtn.click();
      }
    });
  })();
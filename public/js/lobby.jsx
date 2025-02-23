// lobby.jsx
import React, { useState, useEffect } from 'react';

export default function LobbyPanel({ lobbyId, ws, messages, onSendCommand }) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    onSendCommand(input.trim());
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="card my-3">
      <div className="card-body">
        <h5 className="card-title">Lobby: {lobbyId}</h5>
        <div style={{ maxHeight: 150, overflowY: 'auto', marginBottom: '1rem', border: '1px solid #ddd', padding: '0.5rem' }}>
          {messages.map((m, idx) => (
            <div key={idx}>{m}</div>
          ))}
        </div>

        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder="Enter command (e.g. joinGame Alice)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="btn btn-primary" onClick={handleSend}>Send</button>
        </div>
      </div>
    </div>
  );
}
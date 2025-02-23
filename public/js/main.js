// main.jsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import LobbyPanel from './lobby.jsx';
import Board from './board.jsx';

// Additional sub-components:
function TutorialPage() {
  return (
    <div className="mt-4">
      <h2>Tutorial - How to Play Galactic Wars</h2>
      <p>
        Welcome to <strong>Galactic Wars</strong>! Here’s how to get started:
      </p>
      <ol>
        <li>Create a new lobby or join an existing one.</li>
        <li>Once you have joined, use commands like <code>joinGame Alice</code> to add players.</li>
        <li>When you have at least 2 players, type <code>startGame</code> to begin.</li>
        <li>Use <code>move &lt;shipId&gt; &lt;x&gt; &lt;y&gt;</code> to move your ships, <code>attack</code> to attack, etc.</li>
        <li>End your turn with <code>endTurn</code> and see if you can conquer the galaxy!</li>
      </ol>
      <p>Good luck, Commander!</p>
    </div>
  );
}

function HighscoresPage() {
  const [scores, setScores] = useState([]);

  useEffect(() => {
    // fetch /api/highscores
    async function loadScores() {
      try {
        const resp = await fetch('/api/highscores');
        if (resp.ok) {
          const data = await resp.json();
          setScores(data);
        }
      } catch (err) {
        console.error('Failed to load highscores', err);
      }
    }
    loadScores();
  }, []);

  return (
    <div className="mt-4">
      <h2>Highscores</h2>
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Date</th>
            <th>Winner</th>
            <th>Lobby ID</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((row, idx) => (
            <tr key={idx}>
              <td>{new Date(row.date).toLocaleString()}</td>
              <td>{row.winner}</td>
              <td>{row.lobbyId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AvailableLobbiesPage() {
  const [lobbies, setLobbies] = useState([]);

  useEffect(() => {
    // fetch /api/lobby/list
    async function loadLobbies() {
      try {
        const resp = await fetch('/api/lobby/list');
        if (resp.ok) {
          const data = await resp.json();
          setLobbies(data.lobbies || []);
        }
      } catch (err) {
        console.error('Failed to load lobbies', err);
      }
    }
    loadLobbies();
  }, []);

  return (
    <div className="mt-4">
      <h2>Available Lobbies</h2>
      {lobbies.length === 0 ? (
        <div className="alert alert-info">No active lobbies found. You can create one!</div>
      ) : (
        <ul className="list-group">
          {lobbies.map(lobbyId => (
            <li key={lobbyId} className="list-group-item">
              <strong>{lobbyId}</strong>{' '}
              <a href={`/lobby/${lobbyId}`} className="btn btn-sm btn-outline-primary ms-2">
                Join
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WelcomePage() {
  return (
    <div className="mt-4">
      <h2>Welcome to Galactic Wars!</h2>
      <p>
        This is a turn-based strategy game where you command ships,
        gather resources, and attempt to eliminate your rivals.
      </p>
      <p>
        To begin, click the <strong>Create a New Lobby</strong> button in the top 
        navigation, or check out <strong>Available Lobbies</strong>.
      </p>
      <p>
        Once you open <code>/lobby/&lt;some-id&gt;</code>, you can use 
        the in-game chat to <code>joinGame</code>, <code>startGame</code>, and more!
      </p>
      <p>
        Need more help? Check out the <strong>Tutorial</strong> link.
      </p>
    </div>
  );
}

function HomeContent({ lobbyId }) {
  // If there's no lobbyId, show the welcome info
  if (!lobbyId) {
    return <WelcomePage />;
  }

  // If there's a lobbyId, show the LobbyPanel and Board
  return <LobbyAndBoard lobbyId={lobbyId} />;
}

function LobbyAndBoard({ lobbyId }) {
  const [ws, setWs] = useState(null);
  const [messages, setMessages] = useState([]);
  const [boardData, setBoardData] = useState({});

  useEffect(() => {
    if (!lobbyId) return;
    const loc = window.location;
    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${loc.host}/ws/lobby/${lobbyId}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      addMsg(`[WebSocket] Connected to lobby ${lobbyId}`);
      fetchGameState(lobbyId);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          addMsg('[ERROR] ' + data.error);
        } else if (data.message) {
          addMsg(data.message);
          // Possibly refetch state
          fetchGameState(lobbyId);
        }
      } catch (err) {
        addMsg('[Invalid JSON] ' + event.data);
      }
    };

    socket.onclose = () => {
      addMsg('[WebSocket] Disconnected');
      setWs(null);
    };

    setWs(socket);
    return () => socket.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyId]);

  function addMsg(msg) {
    setMessages(prev => [...prev, msg]);
  }

  async function fetchGameState(id) {
    try {
      const resp = await fetch(`/api/lobby/${id}/state`);
      if (resp.ok) {
        const data = await resp.json();
        setBoardData(buildBoardData(data));
      }
    } catch (err) {
      console.error('Error fetching game state', err);
    }
  }

  // Convert the raw game data to squares
  function buildBoardData(game) {
    const squares = {};
    if (game.players) {
      for (const p of game.players) {
        for (const s of p.ships) {
          if (s.health <= 0) continue;
          const key = `${s.x},${s.y}`;
          if (!squares[key]) squares[key] = { numShips: 0, hasResource: false };
          squares[key].numShips = (squares[key].numShips || 0) + 1;
        }
      }
    }
    if (game.resourceMap) {
      for (const loc of game.resourceMap) {
        for (const [lx, ly] of loc.squares) {
          const key = `${lx},${ly}`;
          if (!squares[key]) squares[key] = { numShips: 0, hasResource: false };
          squares[key].hasResource = true;
        }
      }
    }
    return squares;
  }

  function handleSendCommand(cmd) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      addMsg('[ERROR] WebSocket not connected');
      return;
    }
    ws.send(cmd);
    addMsg('[You] ' + cmd);
  }

  // Board click
  function handleCellClick(x, y) {
    console.log(`Cell clicked: ${x},${y}`);
    // e.g. we could do more advanced UI
  }

  return (
    <div>
      <LobbyPanel
        lobbyId={lobbyId}
        messages={messages}
        onSendCommand={handleSendCommand}
      />
      <Board size={20} squares={boardData} onCellClick={handleCellClick} />
    </div>
  );
}

// Our LobbyPanel as a local component (we can re-use existing code).
function LobbyPanel({ lobbyId, messages, onSendCommand }) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') send();
  };
  function send() {
    if (!input.trim()) return;
    onSendCommand(input.trim());
    setInput('');
  }

  return (
    <div className="card my-3">
      <div className="card-body">
        <h5 className="card-title">Lobby: {lobbyId}</h5>
        <div
          style={{
            maxHeight: 150,
            overflowY: 'auto',
            marginBottom: '1rem',
            border: '1px solid #ddd',
            padding: '0.5rem',
          }}
        >
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
          <button className="btn btn-primary" onClick={send}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// The main App that includes a top navbar & page selection
function App() {
  // We’ll parse the path to see if we have a /lobby/<id>
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const isLobby = (pathParts.length === 2 && pathParts[0] === 'lobby');
  const foundLobbyId = isLobby ? pathParts[1] : null;

  // We'll track which "page" the user is on: 'home', 'tutorial', 'highscores', 'lobbies'
  // But if we detect a lobbyId, default to 'home' so that the user sees the board
  const [page, setPage] = useState('home');

  // This effect will check if we are in a /lobby/<id> path; if so, remain on 'home'
  useEffect(() => {
    if (foundLobbyId) {
      setPage('home');
    }
  }, [foundLobbyId]);

  function navTo(newPage) {
    // We'll just switch pages in the React state; 
    // a real SPA might also update history, etc.
    setPage(newPage);
  }

  // Navbar
  const NavBar = (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container-fluid">
        <a className="navbar-brand" href="#">
          Galactic Wars
        </a>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#gwNavbar"
          aria-controls="gwNavbar"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="gwNavbar">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <button
                className={`nav-link btn btn-link ${page === 'home' ? 'text-warning' : ''}`}
                onClick={() => navTo('home')}
              >
                Home
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link btn btn-link ${page === 'tutorial' ? 'text-warning' : ''}`}
                onClick={() => navTo('tutorial')}
              >
                Tutorial
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link btn btn-link ${page === 'highscores' ? 'text-warning' : ''}`}
                onClick={() => navTo('highscores')}
              >
                Highscores
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link btn btn-link ${page === 'lobbies' ? 'text-warning' : ''}`}
                onClick={() => navTo('lobbies')}
              >
                Available Lobbies
              </button>
            </li>
          </ul>
          <div className="d-flex">
            <a href="/api/lobby/new" className="btn btn-sm btn-outline-light">
              Create New Lobby
            </a>
          </div>
        </div>
      </div>
    </nav>
  );

  let content;
  switch (page) {
    case 'tutorial':
      content = <TutorialPage />;
      break;
    case 'highscores':
      content = <HighscoresPage />;
      break;
    case 'lobbies':
      content = <AvailableLobbiesPage />;
      break;
    default:
      // 'home'
      content = <HomeContent lobbyId={foundLobbyId} />;
      break;
  }

  return (
    <div>
      {NavBar}
      <div className="container mt-4">
        {content}
      </div>
    </div>
  );
}

// Render into #root
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
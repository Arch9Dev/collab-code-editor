import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import { useNavigate, useParams, Routes, Route } from 'react-router-dom';

const LANGUAGES = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'Python', value: 'python' },
  { label: 'Java', value: 'java' },
  { label: 'C++', value: 'cpp' },
  { label: 'C#', value: 'csharp' },
  { label: 'Go', value: 'go' },
  { label: 'Rust', value: 'rust' },
];

const inputStyle = {
  padding: '10px',
  width: '100%',
  marginBottom: '12px',
  background: '#3c3c3c',
  border: '1px solid #555',
  borderRadius: '6px',
  color: 'white',
  fontSize: '14px',
  boxSizing: 'border-box'
};

const buttonStyle = {
  padding: '10px',
  width: '100%',
  background: '#0078d4',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '16px',
  cursor: 'pointer'
};

function Auth({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const { data } = await axios.post(`http://localhost:3000${endpoint}`, { username, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('colour', data.colour);
      onAuth({ username: data.username, colour: data.colour, token: data.token });
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e1e1e', color: 'white' }}>
      <div style={{ width: '360px', background: '#2d2d2d', padding: '32px', borderRadius: '10px' }}>
        <h2 style={{ marginTop: 0, marginBottom: '24px' }}>{isLogin ? 'Login' : 'Register'}</h2>
        {error && <p style={{ color: '#ff6b6b', marginBottom: '12px' }}>{error}</p>}
        <input style={inputStyle} placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        <input style={inputStyle} placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        <button style={buttonStyle} onClick={handleSubmit}>{isLogin ? 'Login' : 'Register'}</button>
        <p style={{ textAlign: 'center', marginTop: '16px', color: '#888', cursor: 'pointer' }} onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
        </p>
      </div>
    </div>
  );
}

function Home({ user, onLogout }) {
  const navigate = useNavigate();

  const createRoom = () => {
    const roomId = Math.random().toString(36).substring(2, 9);
    navigate(`/room/${roomId}`);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1e1e1e', color: 'white' }}>
      <h1>Collab Code Editor</h1>
      <p>Welcome, <span style={{ color: user.colour }}>{user.username}</span>!</p>
      <p>Create a room and share the link to code together in real time.</p>
      <button onClick={createRoom} style={{ padding: '12px 24px', fontSize: '16px', cursor: 'pointer', background: '#0078d4', color: 'white', border: 'none', borderRadius: '6px', marginBottom: '12px' }}>
        Create Room
      </button>
      <button onClick={onLogout} style={{ padding: '8px 16px', cursor: 'pointer', background: 'transparent', color: '#888', border: '1px solid #555', borderRadius: '6px' }}>
        Logout
      </button>
    </div>
  );
}

function Room({ user }) {
  const { roomId } = useParams();
  const [connected, setConnected] = useState(false);
  const [code, setCode] = useState('// Start coding here...');
  const [language, setLanguage] = useState('javascript');
  const [copied, setCopied] = useState(false);
  const [socket, setSocket] = useState(null);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const newSocket = io('http://localhost:3000', {
      transports: ['polling', 'websocket']
    });

    newSocket.on('connect', () => {
      setConnected(true);
      newSocket.emit('authenticate', user.token);
    });

    newSocket.on('authenticated', () => {
      newSocket.emit('join_room', roomId);
    });

    newSocket.on('room_state', ({ code, language }) => {
      setCode(code);
      setLanguage(language);
    });

    newSocket.on('room_info', ({ owner, isLocked }) => {
      setIsOwner(owner === user.username);
      setIsLocked(isLocked);
    });

    newSocket.on('disconnect', () => setConnected(false));
    newSocket.on('code_update', (newCode) => setCode(newCode));
    newSocket.on('language_update', (newLanguage) => setLanguage(newLanguage));
    newSocket.on('code_output', ({ success, output }) => {
      setOutput(output);
      setIsRunning(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('leave_room', roomId);
      newSocket.disconnect();
    };
  }, [roomId, user]);

  const canEdit = isOwner || !isLocked;

  const handleEditorChange = (value) => {
    if (!canEdit) return;
    setCode(value);
    if (socket) socket.emit('code_update', { roomId, code: value });
  };

  const handleLanguageChange = (e) => {
    if (!canEdit) return;
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    if (socket) socket.emit('language_update', { roomId, language: newLanguage });
  };

  const runCode = () => {
    if (socket) {
      setIsRunning(true);
      setOutput('Running...');
      socket.emit('run_code', { code, language });
    }
  };

  const toggleLock = () => {
    if (socket) socket.emit('toggle_lock', roomId);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px 20px', background: '#1e1e1e', color: 'white', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Collab Code Editor</h2>
        <span>Room: {roomId}</span>
        <span>{connected ? '🟢 Connected' : '🔴 Disconnected'}</span>
        <span style={{ color: user.colour }}>● {user.username}</span>
        {isLocked && !isOwner && <span style={{ color: '#ff6b6b' }}>🔒 Read Only</span>}
        <select
          value={language}
          onChange={handleLanguageChange}
          disabled={!canEdit}
          style={{ padding: '6px 12px', background: '#3c3c3c', color: 'white', border: '1px solid #555', borderRadius: '6px', cursor: canEdit ? 'pointer' : 'not-allowed' }}
        >
          {LANGUAGES.map(lang => (
            <option key={lang.value} value={lang.value}>{lang.label}</option>
          ))}
        </select>
        <button onClick={runCode} disabled={isRunning} style={{ padding: '8px 16px', cursor: 'pointer', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', opacity: isRunning ? 0.6 : 1 }}>
          {isRunning ? '⏳ Running...' : '▶ Run'}
        </button>
        {isOwner && (
          <button onClick={toggleLock} style={{ padding: '8px 16px', cursor: 'pointer', background: isLocked ? '#dc3545' : '#6c757d', color: 'white', border: 'none', borderRadius: '6px' }}>
            {isLocked ? '🔒 Locked' : '🔓 Unlocked'}
          </button>
        )}
        <button onClick={copyLink} style={{ marginLeft: 'auto', padding: '8px 16px', cursor: 'pointer', background: '#0078d4', color: 'white', border: 'none', borderRadius: '6px' }}>
          {copied ? '✅ Copied!' : '🔗 Copy Link'}
        </button>
      </div>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1 }}>
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{ readOnly: !canEdit }}
          />
        </div>
        <div style={{ width: '35%', background: '#0d0d0d', color: '#00ff00', padding: '16px', fontFamily: 'monospace', fontSize: '14px', overflowY: 'auto', borderLeft: '1px solid #333' }}>
          <div style={{ color: '#888', marginBottom: '8px' }}>Output:</div>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{output}</pre>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const colour = localStorage.getItem('colour');
    if (token && username && colour) return { token, username, colour };
    return null;
  });

  const handleAuth = (userData) => setUser(userData);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('colour');
    setUser(null);
  };

  if (!user) return <Auth onAuth={handleAuth} />;

  return (
    <Routes>
      <Route path="/" element={<Home user={user} onLogout={handleLogout} />} />
      <Route path="/room/:roomId" element={<Room user={user} />} />
    </Routes>
  );
}

export default App;
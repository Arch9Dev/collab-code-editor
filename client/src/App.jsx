import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
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

function Home() {
  const navigate = useNavigate();

  const createRoom = () => {
    const roomId = Math.random().toString(36).substring(2, 9);
    navigate(`/room/${roomId}`);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1e1e1e', color: 'white' }}>
      <h1>Collab Code Editor</h1>
      <p>Create a room and share the link to code together in real time.</p>
      <button onClick={createRoom} style={{ padding: '12px 24px', fontSize: '16px', cursor: 'pointer', background: '#0078d4', color: 'white', border: 'none', borderRadius: '6px' }}>
        Create Room
      </button>
    </div>
  );
}

function Room() {
  const { roomId } = useParams();
  const [connected, setConnected] = useState(false);
  const [code, setCode] = useState('// Start coding here...');
  const [language, setLanguage] = useState('javascript');
  const [copied, setCopied] = useState(false);
  const [socket, setSocket] = useState(null);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const newSocket = io('http://localhost:3000', {
      transports: ['polling', 'websocket']
    });

    newSocket.on('connect', () => {
      setConnected(true);
      newSocket.emit('join_room', roomId);
    });

    newSocket.on('disconnect', () => setConnected(false));

    newSocket.on('room_state', ({ code, language }) => {
      setCode(code);
      setLanguage(language);
    });

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
  }, [roomId]);

  const handleEditorChange = (value) => {
    setCode(value);
    if (socket) socket.emit('code_update', { roomId, code: value });
  };

  const handleLanguageChange = (e) => {
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

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px 20px', background: '#1e1e1e', color: 'white', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <h2 style={{ margin: 0 }}>Collab Code Editor</h2>
        <span>Room: {roomId}</span>
        <span>{connected ? '🟢 Connected' : '🔴 Disconnected'}</span>
        <select
          value={language}
          onChange={handleLanguageChange}
          style={{ padding: '6px 12px', background: '#3c3c3c', color: 'white', border: '1px solid #555', borderRadius: '6px', cursor: 'pointer' }}
        >
          {LANGUAGES.map(lang => (
            <option key={lang.value} value={lang.value}>{lang.label}</option>
          ))}
        </select>
        <button onClick={runCode} disabled={isRunning} style={{ padding: '8px 16px', cursor: 'pointer', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', opacity: isRunning ? 0.6 : 1 }}>
          {isRunning ? '⏳ Running...' : '▶ Run'}
        </button>
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
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room/:roomId" element={<Room />} />
    </Routes>
  );
}

export default App;
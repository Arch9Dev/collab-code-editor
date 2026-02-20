import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import { useNavigate, useParams, Routes, Route } from 'react-router-dom';

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
  const [copied, setCopied] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3000', {
      transports: ['polling', 'websocket']
    });

    newSocket.on('connect', () => {
      setConnected(true);
      newSocket.emit('join_room', roomId);
    });

    newSocket.on('disconnect', () => setConnected(false));

    newSocket.on('code_update', (newCode) => {
      setCode(newCode);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('leave_room', roomId);
      newSocket.disconnect();
    };
  }, [roomId]);

  const handleEditorChange = (value) => {
    setCode(value);
    if (socket) {
      socket.emit('code_update', { roomId, code: value });
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
        <button onClick={copyLink} style={{ marginLeft: 'auto', padding: '8px 16px', cursor: 'pointer', background: '#0078d4', color: 'white', border: 'none', borderRadius: '6px' }}>
          {copied ? '✅ Copied!' : '🔗 Copy Link'}
        </button>
      </div>
      <Editor
        height="100%"
        defaultLanguage="javascript"
        value={code}
        onChange={handleEditorChange}
        theme="vs-dark"
      />
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
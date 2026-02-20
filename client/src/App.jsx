import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import Editor from '@monaco-editor/react';

function App() {
  const [connected, setConnected] = useState(false);
  const [code, setCode] = useState('// Start coding here...');
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3000', {
      transports: ['polling', 'websocket']
    });

    newSocket.on('connect', () => {
      console.log('Connected!', newSocket.id);
      setConnected(true);
    });

    newSocket.on('code_update', (newCode) => {
      setCode(newCode);
    });

    newSocket.on('disconnect', () => setConnected(false));

    setSocket(newSocket);

    return () => { newSocket.disconnect(); };
  }, []);

  const handleEditorChange = (value) => {
    setCode(value);
    if (socket) {
      socket.emit('code_update', value);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', background: '#1e1e1e', color: 'white' }}>
        <h2 style={{ margin: 0 }}>Collab Code Editor — {connected ? '🟢 Connected' : '🔴 Disconnected'}</h2>
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

export default App;
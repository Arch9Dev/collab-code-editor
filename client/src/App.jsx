import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

function App() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io('http://localhost:3000', {
      transports: ['polling', 'websocket']
    });

    socket.on('connect', () => {
      console.log('Connected!', socket.id);
      setConnected(true);
    });
    socket.on('connect_error', (err) => {
      console.log('Connection error:', err.message);
    });
    socket.on('disconnect', () => setConnected(false));

    return () => { socket.disconnect(); };
  }, []);

  return (
    <div>
      <h1>Collab Code Editor</h1>
      <p>Status: {connected ? '🟢 Connected to server' : '🔴 Disconnected'}</p>
    </div>
  );
}

export default App;
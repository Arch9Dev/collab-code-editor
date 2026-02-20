import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { register, login, verifyToken } from './auth';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST']
  }
});

const roomState: Record<string, { code: string; language: string; owner: string; isLocked: boolean }> = {};

// Auth routes
app.post('/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }
  const result = await register(username, password);
  if (!result) {
    res.status(409).json({ error: 'Username already taken' });
    return;
  }
  res.json(result);
});

app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await login(username, password);
  if (!result) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }
  res.json(result);
});

app.get('/', (req, res) => {
  res.send('Server is running');
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  let currentUser: { id: string; username: string; colour: string } | null = null;

  socket.on('authenticate', (token) => {
    const user = verifyToken(token);
    if (user) {
      currentUser = user;
      socket.emit('authenticated', user);
    } else {
      socket.emit('auth_error', 'Invalid token');
    }
  });

  socket.on('join_room', (roomId) => {
    if (!currentUser) {
      socket.emit('auth_error', 'You must be logged in to join a room');
      return;
    }

    socket.join(roomId);
    console.log(`${currentUser.username} joined room ${roomId}`);

    if (!roomState[roomId]) {
      roomState[roomId] = { code: '', language: 'javascript', owner: currentUser.username, isLocked: false };
    }

    socket.emit('room_state', roomState[roomId]);
    io.to(roomId).emit('room_info', { owner: roomState[roomId].owner, isLocked: roomState[roomId].isLocked });
  });

  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
  });

  socket.on('toggle_lock', (roomId) => {
    if (!currentUser || !roomState[roomId]) return;
    if (roomState[roomId].owner !== currentUser.username) {
      socket.emit('error', 'Only the room owner can lock/unlock the room');
      return;
    }
    roomState[roomId].isLocked = !roomState[roomId].isLocked;
    io.to(roomId).emit('room_info', { owner: roomState[roomId].owner, isLocked: roomState[roomId].isLocked });
  });

  socket.on('code_update', ({ roomId, code }) => {
    if (!currentUser) return;
    if (roomState[roomId]?.isLocked && roomState[roomId]?.owner !== currentUser.username) return;
    if (!roomState[roomId]) roomState[roomId] = { code: '', language: 'javascript', owner: currentUser.username, isLocked: false };
    roomState[roomId].code = code;
    socket.to(roomId).emit('code_update', code);
  });

  socket.on('language_update', ({ roomId, language }) => {
    if (!currentUser) return;
    if (roomState[roomId]?.isLocked && roomState[roomId]?.owner !== currentUser.username) return;
    if (!roomState[roomId]) roomState[roomId] = { code: '', language: 'javascript', owner: currentUser.username, isLocked: false };
    roomState[roomId].language = language;
    socket.to(roomId).emit('language_update', language);
  });

  socket.on('run_code', (({ code, language }) => {
    const { exec } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const tmpDir = os.tmpdir();
    let filename: string;
    let command: string;

    try {
      switch (language) {
        case 'javascript':
          filename = path.join(tmpDir, 'code.js');
          fs.writeFileSync(filename, code);
          command = `node ${filename}`;
          break;
        case 'typescript':
          filename = path.join(tmpDir, 'code.ts');
          fs.writeFileSync(filename, code);
          command = `npx ts-node ${filename}`;
          break;
        case 'python':
          filename = path.join(tmpDir, 'code.py');
          fs.writeFileSync(filename, code);
          command = `python ${filename}`;
          break;
        case 'java':
          filename = path.join(tmpDir, 'Main.java');
          fs.writeFileSync(filename, code);
          command = `cd ${tmpDir} && javac Main.java && java Main`;
          break;
        case 'cpp':
          filename = path.join(tmpDir, 'code.cpp');
          fs.writeFileSync(filename, code);
          command = `g++ ${filename} -o ${path.join(tmpDir, 'code_out')} && ${path.join(tmpDir, 'code_out')}`;
          break;
        case 'csharp':
          filename = path.join(tmpDir, 'code.csx');
          fs.writeFileSync(filename, code);
          command = `dotnet script ${filename}`;
          break;
        case 'go':
          filename = path.join(tmpDir, 'code.go');
          fs.writeFileSync(filename, code);
          command = `go run ${filename}`;
          break;
        case 'rust':
          filename = path.join(tmpDir, 'code.rs');
          fs.writeFileSync(filename, code);
          command = `rustc ${filename} -o ${path.join(tmpDir, 'code_out')} && ${path.join(tmpDir, 'code_out')}`;
          break;
        default:
          socket.emit('code_output', { success: false, output: `Language ${language} is not supported.` });
          return;
      }

      exec(command, { timeout: 10000 }, (error: any, stdout: string, stderr: string) => {
        if (error && !stdout) {
          socket.emit('code_output', { success: false, output: stderr || error.message });
        } else {
          socket.emit('code_output', { success: true, output: stdout || 'Code ran successfully with no output.' });
        }
      });

    } catch (err: any) {
      socket.emit('code_output', { success: false, output: err.message });
    }
  }));

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

httpServer.listen(3000, () => {
  console.log('Server listening on port 3000');
});
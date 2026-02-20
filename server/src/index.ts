import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
        methods: ['GET', 'POST']
    }
});
app.get('/', (req, res) => {
    res.send('Server is running');
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('code_update', (code) => {
    socket.broadcast.emit('code_update', code);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

httpServer.listen(3000, () => {
    console.log('Server listening on port 3000');
});
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

import { RoomManager } from './managers/RoomManager.js';

// ... (imports)

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const roomManager = new RoomManager(io);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('find_match', (data = {}) => {
    console.log(`User ${socket.id} looking for match (DB ID: ${data.userId || 'Guest'})`);
    roomManager.addPlayerToQueue(socket.id, data.userId);
  });

  socket.on('cancel_match', () => {
    roomManager.removePlayerFromQueue(socket.id);
  });

  socket.on('player_move', (data) => {
    // data: { grid: serialized, score: number, ... }
    // We can also send attacks here if lines cleared > 1
    roomManager.handleUpdate(socket.id, data);
  });

  socket.on('game_over', (data) => {
    // handle explicit game over (lost)
    roomManager.handleGameOver(socket.id, data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    roomManager.removePlayer(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

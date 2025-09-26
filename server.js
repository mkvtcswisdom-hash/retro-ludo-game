const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const Database = require('./database');
const GameManager = require('./gameManager');
const AuthManager = require('./authManager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const db = new Database();
const gameManager = new GameManager(io, db);
const authManager = new AuthManager(db);

// Auth routes
app.post('/api/register', async (req, res) => {
  try {
    const result = await authManager.register(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const result = await authManager.login(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Game routes
app.get('/api/rooms', (req, res) => {
  res.json(gameManager.getPublicRooms());
});

app.get('/api/players', async (req, res) => {
  try {
    const players = await db.getAllPlayers();
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/history/:userId', async (req, res) => {
  try {
    const history = await db.getPlayerHistory(req.params.userId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket connections
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (data) => {
    gameManager.joinRoom(socket, data);
  });

  socket.on('create-room', (data) => {
    gameManager.createRoom(socket, data);
  });

  socket.on('invite-player', (data) => {
    gameManager.invitePlayer(socket, data);
  });

  socket.on('roll-dice', (data) => {
    gameManager.rollDice(socket, data);
  });

  socket.on('move-piece', (data) => {
    gameManager.movePiece(socket, data);
  });

  socket.on('disconnect', () => {
    gameManager.handleDisconnect(socket);
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
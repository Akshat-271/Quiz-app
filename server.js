require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');

const Quiz = require('./models/Quiz');
const { verifyToken } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ── Database ──
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => { console.error('MongoDB error:', err.message); process.exit(1); });

// ── Middleware ──
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ──
app.use('/api/auth', require('./routes/auth'));
app.use('/api/quiz',  require('./routes/quiz'));

// ── Game Routes ──
const games = new Map(); // pin → game state

app.post('/api/game/start/:quizId', verifyToken, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.quizId, ownerId: req.user.id });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    if (quiz.questions.length === 0) return res.status(400).json({ error: 'Quiz has no questions' });

    const pin = String(Math.floor(100000 + Math.random() * 900000));
    games.set(pin, {
      quiz,
      hostId: null,
      players: [],
      currentQ: -1,
      answers: new Map(),
      startTime: null,
      timer: null
    });

    setTimeout(() => games.delete(pin), 2 * 60 * 60 * 1000); // auto-cleanup after 2h
    res.json({ pin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/game/:pin', (req, res) => {
  const game = games.get(req.params.pin);
  if (!game) return res.status(404).json({ error: 'Game not found. Check the PIN.' });
  res.json({ title: game.quiz.title, players: game.players.length });
});

// ── Socket.io Game Logic ──
io.on('connection', (socket) => {

  // Host joins the room
  socket.on('host-join', (pin) => {
    const game = games.get(pin);
    if (!game) return socket.emit('game-error', 'Game not found');
    game.hostId = socket.id;
    socket.join(pin);
    socket.data.pin = pin;
    socket.data.role = 'host';
    socket.emit('player-list', game.players);
  });

  // Player joins the room
  socket.on('player-join', ({ pin, name, avatar }) => {
    const game = games.get(pin);
    if (!game) return socket.emit('game-error', 'Game not found');

    // Handle reconnect (player with same name)
    const existing = game.players.find(p => p.name === name);
    if (existing) {
      existing.id = socket.id;
      socket.join(pin);
      socket.data = { pin, role: 'player', name };
      return socket.emit('join-ok', { name, score: existing.score });
    }

    if (game.currentQ >= 0) return socket.emit('game-error', 'Game already started');

    const player = { id: socket.id, name, avatar, score: 0 };
    game.players.push(player);
    socket.join(pin);
    socket.data = { pin, role: 'player', name };

    io.to(game.hostId).emit('player-list', game.players);
    socket.emit('join-ok', { name, score: 0 });
  });

  // Host starts the game
  socket.on('start-game', (pin) => {
    const game = games.get(pin);
    if (!game || game.hostId !== socket.id) return;
    if (game.players.length === 0) return socket.emit('game-error', 'No players have joined yet!');

    io.to(pin).emit('game-started');
    setTimeout(() => sendQuestion(pin, 0), 1500);
  });

  // Player submits an answer
  socket.on('submit-answer', ({ pin, index }) => {
    const game = games.get(pin);
    if (!game || game.currentQ < 0 || game.answers.has(socket.id)) return;

    const timeTaken = Date.now() - game.startTime;
    const q = game.quiz.questions[game.currentQ];
    const correct = index === q.correctIndex;
    const points = correct ? Math.max(100, Math.round(1000 * (1 - timeTaken / 20000))) : 0;

    game.answers.set(socket.id, { index, correct });

    const player = game.players.find(p => p.id === socket.id);
    if (player) player.score += points;

    socket.emit('answer-result', { correct, points, correctIndex: q.correctIndex });

    if (game.answers.size >= game.players.length) {
      clearTimeout(game.timer);
      endQuestion(pin);
    }
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    const { pin, role, name } = socket.data || {};
    if (!pin) return;
    const game = games.get(pin);
    if (!game) return;

    if (role === 'player') {
      game.players = game.players.filter(p => p.name !== name);
      if (game.hostId) io.to(game.hostId).emit('player-list', game.players);
    }
  });
});

function sendQuestion(pin, index) {
  const game = games.get(pin);
  if (!game) return;

  game.currentQ = index;
  game.answers = new Map();
  game.startTime = Date.now();

  const q = game.quiz.questions[index];
  io.to(pin).emit('question', {
    index,
    total: game.quiz.questions.length,
    text: q.text,
    options: q.options,
    time: 20
  });

  game.timer = setTimeout(() => endQuestion(pin), 20000);
}

function endQuestion(pin) {
  const game = games.get(pin);
  if (!game) return;

  const q = game.quiz.questions[game.currentQ];
  const scores = [...game.players]
    .sort((a, b) => b.score - a.score)
    .map(p => ({ name: p.name, avatar: p.avatar, score: p.score }));

  io.to(pin).emit('question-end', { correctIndex: q.correctIndex, scores });

  const next = game.currentQ + 1;
  if (next < game.quiz.questions.length) {
    setTimeout(() => sendQuestion(pin, next), 4000);
  } else {
    setTimeout(() => {
      io.to(pin).emit('game-over', scores);
      games.delete(pin);
    }, 4000);
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

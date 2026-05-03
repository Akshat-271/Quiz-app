// ── Auth helpers ──
function getToken()    { return localStorage.getItem('token'); }
function getUsername() { return localStorage.getItem('username'); }
function logout()      { localStorage.clear(); window.location.href = '/'; }

async function api(url, method, body) {
  const opts = {
    method: method || 'GET',
    headers: { 'Content-Type': 'application/json' }
  };
  if (getToken()) opts.headers['Authorization'] = 'Bearer ' + getToken();
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  return res.json();
}

function renderNav() {
  const el = document.getElementById('nav-links');
  if (!el) return;
  if (getToken()) {
    el.innerHTML = '<span class="nav-user">👤 ' + getUsername() + '</span>'
      + '<a href="/dashboard.html" class="btn btn-outline">Dashboard</a>'
      + '<button class="btn btn-outline" onclick="logout()">Sign Out</button>';
  } else {
    el.innerHTML = '<a href="/login.html" class="btn btn-outline">Log In</a>'
      + '<a href="/signup.html" class="btn btn-yellow">Sign Up</a>';
  }
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.style.display = 'block';
}


// ═══════════════════════════════════
// HOME PAGE
// ═══════════════════════════════════

function initHome() {
  renderNav();

  document.getElementById('join-btn').addEventListener('click', function () {
    const pin = document.getElementById('pin-input').value.trim();
    if (!pin) { alert('Enter a Game PIN!'); return; }
    window.location.href = '/waiting.html?pin=' + pin;
  });

  document.getElementById('host-btn').addEventListener('click', function () {
    window.location.href = getToken() ? '/dashboard.html' : '/login.html';
  });
}


// ═══════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════

function initLogin() {
  if (getToken()) { window.location.href = '/dashboard.html'; return; }

  document.getElementById('login-btn').addEventListener('click', async function () {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    if (!username || !password) { showError('error', 'Please fill in all fields.'); return; }

    const data = await api('/api/auth/login', 'POST', { username, password });
    if (data.error) { showError('error', data.error); return; }

    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    window.location.href = '/dashboard.html';
  });
}


// ═══════════════════════════════════
// SIGNUP PAGE
// ═══════════════════════════════════

function initSignup() {
  if (getToken()) { window.location.href = '/dashboard.html'; return; }

  document.getElementById('signup-btn').addEventListener('click', async function () {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    if (!username || !password) { showError('error', 'Please fill in all fields.'); return; }

    const data = await api('/api/auth/signup', 'POST', { username, password });
    if (data.error) { showError('error', data.error); return; }

    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    window.location.href = '/dashboard.html';
  });
}


// ═══════════════════════════════════
// DASHBOARD PAGE
// ═══════════════════════════════════

async function initDashboard() {
  if (!getToken()) { window.location.href = '/login.html'; return; }
  renderNav();

  document.getElementById('hello-name').textContent = getUsername();

  document.getElementById('new-quiz-btn').addEventListener('click', function () {
    window.location.href = '/create.html';
  });

  loadQuizzes();
}

async function loadQuizzes() {
  const quizzes = await api('/api/quiz');
  if (quizzes.error) { alert(quizzes.error); return; }

  const totalQ = quizzes.reduce(function (s, q) { return s + q.questions.length; }, 0);
  document.getElementById('stat-quizzes').textContent   = quizzes.length;
  document.getElementById('stat-questions').textContent = totalQ;
  document.getElementById('limit-fill').style.width     = (quizzes.length / 5 * 100) + '%';
  document.getElementById('limit-count').textContent    = quizzes.length + ' / 5';

  const grid = document.getElementById('quiz-grid');
  const colors = ['#f5e642', '#00e5ff', '#ff2d78', '#00e676', '#ff6d2e'];

  if (quizzes.length === 0) {
    grid.innerHTML = '<div class="card empty"><div class="icon">🎯</div><h3>No quizzes yet</h3>'
      + '<p class="note">Create your first quiz and host it live!</p>'
      + '<a href="/create.html" class="btn btn-yellow">+ Create First Quiz</a></div>';
    return;
  }

  var html = '';
  quizzes.forEach(function (q, i) {
    html += '<div class="card qcard" style="border-top-color:' + colors[i % 5] + '">'
      + '<h3>' + q.title + '</h3>'
      + '<p class="meta">❓ ' + q.questions.length + ' questions</p>'
      + '<div class="actions">'
      + '<button class="btn btn-yellow" onclick="hostQuiz(\'' + q._id + '\')">▶ Host</button>'
      + '<a href="/create.html?edit=' + q._id + '" class="btn btn-outline">Edit</a>'
      + '<button class="btn btn-red" onclick="deleteQuiz(\'' + q._id + '\')">🗑</button>'
      + '</div></div>';
  });
  grid.innerHTML = html;
}

async function hostQuiz(id) {
  const data = await api('/api/game/start/' + id, 'POST');
  if (data.error) { alert(data.error); return; }
  sessionStorage.setItem('host_pin', data.pin);
  window.location.href = '/waiting.html?pin=' + data.pin + '&host=1';
}

async function deleteQuiz(id) {
  if (!confirm('Delete this quiz?')) return;
  await api('/api/quiz/' + id, 'DELETE');
  loadQuizzes();
}


// ═══════════════════════════════════
// CREATE / EDIT QUIZ PAGE
// ═══════════════════════════════════

var qCount = 0;

async function initCreate() {
  if (!getToken()) { window.location.href = '/login.html'; return; }
  renderNav();

  const editId = new URLSearchParams(window.location.search).get('edit');
  if (editId) {
    const quizzes = await api('/api/quiz');
    const quiz = quizzes.find(function (q) { return q._id === editId; });
    if (quiz) {
      document.getElementById('quiz-title').value = quiz.title;
      document.getElementById('edit-id').value    = quiz._id;
      quiz.questions.forEach(addQuestion);
    }
  } else {
    addQuestion(null);
  }

  document.getElementById('add-question-btn').addEventListener('click', function () { addQuestion(null); });
  document.getElementById('save-btn').addEventListener('click', saveQuiz);
  document.getElementById('cancel-btn').addEventListener('click', function () { window.location.href = '/dashboard.html'; });
}

function addQuestion(data) {
  qCount++;
  var n    = qCount;
  var opts = data ? data.options : ['', '', ''];
  var ci   = data ? data.correctIndex : 0;

  var optsHtml = '';
  opts.forEach(function (opt, i) {
    optsHtml += '<div class="option-row">'
      + '<input type="radio" name="correct-' + n + '" value="' + i + '"' + (i === ci ? ' checked' : '') + '>'
      + '<input type="text" placeholder="Option ' + (i + 1) + '" value="' + opt + '">'
      + '</div>';
  });

  var html = '<div class="card q-block" id="qblock-' + n + '">'
    + '<div class="q-block-head"><b>Question ' + n + '</b>'
    + '<button class="btn btn-red" onclick="document.getElementById(\'qblock-' + n + '\').remove()">✕ Remove</button></div>'
    + '<label>Question Text</label>'
    + '<input type="text" id="qtext-' + n + '" placeholder="Type your question..."' + (data ? ' value="' + data.text + '"' : '') + '>'
    + '<label>Options — tick the correct answer</label>'
    + '<div id="opts-' + n + '">' + optsHtml + '</div>'
    + '<button class="btn btn-outline mt" onclick="addOption(' + n + ')">+ Add Option</button>'
    + '</div>';

  document.getElementById('questions-area').insertAdjacentHTML('beforeend', html);
}

function addOption(n) {
  var opts = document.getElementById('opts-' + n);
  if (opts.children.length >= 5) { alert('Max 5 options!'); return; }
  var i = opts.children.length;
  opts.insertAdjacentHTML('beforeend',
    '<div class="option-row">'
    + '<input type="radio" name="correct-' + n + '" value="' + i + '">'
    + '<input type="text" placeholder="Option ' + (i + 1) + '">'
    + '</div>');
}

async function saveQuiz() {
  const title = document.getElementById('quiz-title').value.trim();
  if (!title) { alert('Add a quiz title!'); return; }

  const blocks    = document.querySelectorAll('.q-block');
  const questions = [];

  for (var i = 0; i < blocks.length; i++) {
    const n      = blocks[i].id.split('-')[1];
    const text   = document.getElementById('qtext-' + n).value.trim();
    const inputs = blocks[i].querySelectorAll('.option-row input[type="text"]');
    const options = Array.from(inputs).map(function (el) { return el.value.trim(); });
    const correct = blocks[i].querySelector('input[type="radio"]:checked');

    if (!text)                    { alert('Question ' + n + ' has no text!'); return; }
    if (options.some(function(o){ return !o; })) { alert('Fill all options in Question ' + n + '!'); return; }
    questions.push({ text: text, options: options, correctIndex: correct ? +correct.value : 0 });
  }

  if (questions.length === 0) { alert('Add at least one question!'); return; }

  const editId = document.getElementById('edit-id').value;
  var data;
  if (editId) {
    data = await api('/api/quiz/' + editId, 'PUT', { title, questions });
  } else {
    data = await api('/api/quiz', 'POST', { title, questions });
  }

  if (data.error) { alert(data.error); return; }
  window.location.href = '/dashboard.html';
}


// ═══════════════════════════════════
// WAITING ROOM PAGE
// ═══════════════════════════════════

var selectedAvatar = '🦊';
var AVATARS = ['🦊','🐼','🦁','🐸','🐨','🦄','🦋','🐯','🐙','🦩'];

function initWaiting() {
  const params = new URLSearchParams(window.location.search);
  const pin    = params.get('pin');
  const isHost = params.get('host') === '1';

  if (!pin) { window.location.href = '/'; return; }

  document.getElementById('game-pin').textContent = pin;
  sessionStorage.setItem('game_pin', pin);

  // Build avatar buttons
  const avGrid = document.getElementById('avatar-grid');
  AVATARS.forEach(function (av, i) {
    const btn = document.createElement('button');
    btn.className   = 'av-btn' + (i === 0 ? ' selected' : '');
    btn.textContent = av;
    btn.onclick = function () {
      document.querySelectorAll('.av-btn').forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedAvatar = av;
    };
    avGrid.appendChild(btn);
  });

  const socket = io();

  if (isHost) {
    document.getElementById('join-panel').classList.add('hidden');
    document.getElementById('host-bar').style.display = 'flex';

    socket.emit('host-join', pin);
    socket.on('player-list', renderPlayers);

    document.getElementById('start-btn').addEventListener('click', function () {
      socket.emit('start-game', pin);
    });

    socket.on('game-error', function (msg) { alert(msg); });

  } else {
    document.getElementById('host-bar').style.display = 'none';

    document.getElementById('join-game-btn').addEventListener('click', function () {
      const name = document.getElementById('player-name').value.trim();
      if (!name) { alert('Enter your name!'); return; }
      sessionStorage.setItem('player_name',   name);
      sessionStorage.setItem('player_avatar', selectedAvatar);
      socket.emit('player-join', { pin, name, avatar: selectedAvatar });
    });

    socket.on('join-ok', function () {
      document.getElementById('join-panel').classList.add('hidden');
      document.getElementById('joined-msg').classList.remove('hidden');
    });

    socket.on('game-error', function (msg) { alert(msg); });
  }

  socket.on('game-started', function () {
    window.location.href = '/quiz.html?pin=' + pin + (isHost ? '&host=1' : '');
  });
}

function renderPlayers(players) {
  document.getElementById('players-section').classList.remove('hidden');
  document.getElementById('player-count').textContent = players.length;
  var html = players.map(function (p) {
    return '<div class="player-chip"><div class="av">' + p.avatar + '</div><div class="name">' + p.name + '</div></div>';
  }).join('');
  document.getElementById('players-grid').innerHTML = html || '<p style="color:#7b7d9a">No players yet.</p>';
}


// ═══════════════════════════════════
// QUIZ GAMEPLAY PAGE
// ═══════════════════════════════════

var myScore = 0;
var timerInterval = null;

function initQuiz() {
  const params = new URLSearchParams(window.location.search);
  const pin    = params.get('pin') || sessionStorage.getItem('game_pin');
  const isHost = params.get('host') === '1';
  const name   = sessionStorage.getItem('player_name');
  const avatar = sessionStorage.getItem('player_avatar') || '🦊';

  if (!pin) { window.location.href = '/'; return; }

  const socket = io();

  // Reconnect to room
  if (isHost) {
    socket.emit('host-join', pin);
  } else {
    socket.emit('player-join', { pin, name, avatar });
    // join-ok: already joined, just acknowledge
    socket.on('join-ok', function (data) { myScore = data.score; });
  }

  socket.on('question', function (data) {
    showQuestion(data, socket, pin, isHost);
  });

  socket.on('answer-result', function (data) {
    myScore += data.points;
    showAnswerFeedback(data);
  });

  socket.on('question-end', function (data) {
    clearInterval(timerInterval);
    showScores(data.scores);
  });

  socket.on('game-over', function (scores) {
    sessionStorage.setItem('final_scores', JSON.stringify(scores));
    window.location.href = '/leaderboard.html';
  });

  socket.on('game-error', function (msg) { alert(msg); window.location.href = '/'; });
}

function showQuestion(data, socket, pin, isHost) {
  document.getElementById('waiting-view').classList.add('hidden');
  document.getElementById('result-view').classList.add('hidden');
  document.getElementById('question-view').classList.remove('hidden');

  document.getElementById('q-num').textContent   = (data.index + 1) + ' / ' + data.total;
  document.getElementById('q-score').textContent = '⭐ ' + myScore;
  document.getElementById('q-text').textContent  = data.text;

  // Build answer buttons
  const letters = ['A', 'B', 'C', 'D', 'E'];
  var html = '';
  data.options.forEach(function (opt, i) {
    html += '<button class="answer-btn" data-index="' + i + '">'
      + '<span class="ans-letter">' + letters[i] + '</span>' + opt + '</button>';
  });
  const grid = document.getElementById('answers-grid');
  grid.innerHTML = html;

  if (!isHost) {
    grid.querySelectorAll('.answer-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        grid.querySelectorAll('.answer-btn').forEach(function (b) { b.disabled = true; });
        socket.emit('submit-answer', { pin, index: +btn.dataset.index });
      });
    });
  } else {
    grid.querySelectorAll('.answer-btn').forEach(function (btn) { btn.disabled = true; });
  }

  // Timer
  var timeLeft = data.time;
  document.getElementById('timer-fill').style.width  = '100%';
  document.getElementById('timer-text').textContent  = timeLeft + 's';

  clearInterval(timerInterval);
  timerInterval = setInterval(function () {
    timeLeft--;
    var pct = (timeLeft / data.time * 100);
    document.getElementById('timer-fill').style.width = pct + '%';
    document.getElementById('timer-text').textContent = timeLeft + 's';
    if (pct < 30) document.getElementById('timer-fill').style.background = 'linear-gradient(90deg, #ff2d78, #ff6d2e)';
    if (timeLeft <= 0) clearInterval(timerInterval);
  }, 1000);
}

function showAnswerFeedback(data) {
  const grid = document.getElementById('answers-grid');
  grid.querySelectorAll('.answer-btn').forEach(function (btn) {
    btn.disabled = true;
    if (+btn.dataset.index === data.correctIndex) btn.classList.add('correct');
    else btn.classList.add('wrong');
  });
}

function showScores(scores) {
  document.getElementById('question-view').classList.add('hidden');
  document.getElementById('result-view').classList.remove('hidden');

  var html = '';
  scores.slice(0, 5).forEach(function (p, i) {
    var medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
    html += '<div class="score-row">'
      + '<span class="score-rank">' + medals[i] + '</span>'
      + '<span class="score-av">' + p.avatar + '</span>'
      + '<span class="score-name">' + p.name + '</span>'
      + '<span class="score-pts">' + p.score + ' pts</span>'
      + '</div>';
  });
  document.getElementById('scores-list').innerHTML = html;
}


// ═══════════════════════════════════
// LEADERBOARD PAGE
// ═══════════════════════════════════

function initLeaderboard() {
  const scores = JSON.parse(sessionStorage.getItem('final_scores') || '[]');

  if (scores.length === 0) {
    document.getElementById('podium').innerHTML = '<p style="color:#7b7d9a">No scores found.</p>';
    return;
  }

  // Podium (top 3)
  const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd
  const placeClass  = ['place-2', 'place-1', 'place-3'];
  const medals      = ['🥈', '🥇', '🥉'];

  var podiumHtml = '';
  podiumOrder.forEach(function (rank, col) {
    const p = scores[rank];
    if (!p) return;
    podiumHtml += '<div class="podium-slot ' + placeClass[col] + '">'
      + '<div class="podium-avatar">' + p.avatar + '</div>'
      + '<div class="podium-name">' + p.name + '</div>'
      + '<div class="podium-score">' + p.score + ' pts</div>'
      + '<div class="podium-bar"></div>'
      + '<div class="place-medal">' + medals[col] + '</div>'
      + '</div>';
  });
  document.getElementById('podium').innerHTML = podiumHtml;

  // Full list
  var listHtml = '';
  scores.forEach(function (p, i) {
    listHtml += '<div class="score-row">'
      + '<span class="score-rank" style="font-size:0.9rem">#' + (i + 1) + '</span>'
      + '<span class="score-av">' + p.avatar + '</span>'
      + '<span class="score-name">' + p.name + '</span>'
      + '<span class="score-pts">' + p.score + ' pts</span>'
      + '</div>';
  });
  document.getElementById('full-list').innerHTML = listHtml;
}

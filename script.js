// ===== STORAGE =====

function getUsers()   { return JSON.parse(localStorage.getItem('users')   || '[]'); }
function getQuizzes() { return JSON.parse(localStorage.getItem('quizzes') || '[]'); }
function getSession() { return JSON.parse(localStorage.getItem('session') || 'null'); }
function saveUsers(d)   { localStorage.setItem('users',   JSON.stringify(d)); }
function saveQuizzes(d) { localStorage.setItem('quizzes', JSON.stringify(d)); }
function saveSession(d) { localStorage.setItem('session', JSON.stringify(d)); }

function logout() {
  localStorage.removeItem('session');
  window.location.href = 'index.html';
}

function showError(id, msg) {
  var el = document.getElementById(id);
  el.textContent = msg;
  el.style.display = 'block';
}


// ===== NAV =====

function renderNav() {
  var el = document.getElementById('nav-links');
  if (!el) return;
  var s = getSession();
  if (s) {
    el.innerHTML = '<span class="nav-user">👤 ' + s.username + '</span>'
      + '<a href="dashboard.html" class="btn btn-outline">Dashboard</a>'
      + '<button class="btn btn-outline" onclick="logout()">Sign Out</button>';
  } else {
    el.innerHTML = '<a href="login.html" class="btn btn-outline">Log In</a>'
      + '<a href="signup.html" class="btn btn-yellow">Sign Up</a>';
  }
}


// ===== HOME =====

function initHome() {
  renderNav();
  document.getElementById('join-btn').addEventListener('click', function () {
    var pin = document.getElementById('pin-input').value.trim();
    if (!pin) { alert('Enter a Game PIN!'); return; }
    window.location.href = 'waiting.html?pin=' + pin;
  });
  document.getElementById('host-btn').addEventListener('click', function () {
    window.location.href = getSession() ? 'dashboard.html' : 'login.html';
  });
}


// ===== LOGIN =====

function initLogin() {
  if (getSession()) { window.location.href = 'dashboard.html'; return; }
  document.getElementById('login-btn').addEventListener('click', function () {
    var username = document.getElementById('username').value.trim();
    var password = document.getElementById('password').value;
    if (!username || !password) { showError('error', 'Please fill in all fields.'); return; }
    var user = getUsers().find(function (u) { return u.username === username && u.password === password; });
    if (!user) { showError('error', 'Wrong username or password.'); return; }
    saveSession({ id: user.id, username: user.username });
    window.location.href = 'dashboard.html';
  });
}


// ===== SIGNUP =====

function initSignup() {
  if (getSession()) { window.location.href = 'dashboard.html'; return; }
  document.getElementById('signup-btn').addEventListener('click', function () {
    var username = document.getElementById('username').value.trim();
    var password = document.getElementById('password').value;
    if (!username || !password) { showError('error', 'Please fill in all fields.'); return; }
    if (password.length < 6)    { showError('error', 'Password must be at least 6 characters.'); return; }
    if (getUsers().find(function (u) { return u.username === username; })) {
      showError('error', 'Username already taken.'); return;
    }
    var user = { id: Date.now(), username: username, password: password };
    var users = getUsers();
    users.push(user);
    saveUsers(users);
    saveSession({ id: user.id, username: user.username });
    window.location.href = 'dashboard.html';
  });
}


// ===== DASHBOARD =====

function initDashboard() {
  if (!getSession()) { window.location.href = 'login.html'; return; }
  renderNav();

  var session   = getSession();
  var myQuizzes = getQuizzes().filter(function (q) { return q.ownerId === session.id; });
  var colors    = ['#f5e642', '#00e5ff', '#ff2d78', '#00e676', '#ff6d2e'];

  document.getElementById('hello-name').textContent     = session.username;
  document.getElementById('stat-quizzes').textContent   = myQuizzes.length;
  document.getElementById('stat-questions').textContent = myQuizzes.reduce(function (s, q) { return s + q.questions.length; }, 0);
  document.getElementById('limit-fill').style.width     = (myQuizzes.length / 5 * 100) + '%';
  document.getElementById('limit-count').textContent    = myQuizzes.length + ' / 5';

  document.getElementById('new-quiz-btn').addEventListener('click', function () {
    if (myQuizzes.length >= 5) { alert('Delete a quiz first — max 5 allowed!'); return; }
    window.location.href = 'create.html';
  });

  var grid = document.getElementById('quiz-grid');
  if (myQuizzes.length === 0) {
    grid.innerHTML = '<div class="card empty"><p class="icon">🎯</p><h3>No quizzes yet</h3>'
      + '<p class="note">Create your first quiz and start hosting!</p>'
      + '<a href="create.html" class="btn btn-yellow">+ Create First Quiz</a></div>';
    return;
  }

  var html = '';
  myQuizzes.forEach(function (q, i) {
    html += '<div class="card qcard" style="border-top-color:' + colors[i % 5] + '">'
      + '<h3>' + q.title + '</h3>'
      + '<p class="meta">❓ ' + q.questions.length + ' questions</p>'
      + '<div class="actions">'
      + '<button class="btn btn-yellow" onclick="hostQuiz(' + q.id + ')">▶ Host</button>'
      + '<a href="create.html?edit=' + q.id + '" class="btn btn-outline">Edit</a>'
      + '<button class="btn btn-red" onclick="deleteQuiz(' + q.id + ')">🗑</button>'
      + '</div></div>';
  });
  grid.innerHTML = html;
}

function hostQuiz(id) {
  var pin = Math.floor(100000 + Math.random() * 900000);
  window.location.href = 'waiting.html?pin=' + pin + '&host=1&quiz=' + id;
}

function deleteQuiz(id) {
  if (!confirm('Delete this quiz?')) return;
  saveQuizzes(getQuizzes().filter(function (q) { return q.id !== id; }));
  initDashboard();
}


// ===== CREATE QUIZ =====

var qCount = 0;

function initCreate() {
  if (!getSession()) { window.location.href = 'login.html'; return; }
  renderNav();

  var editId = new URLSearchParams(window.location.search).get('edit');
  if (editId) {
    var quiz = getQuizzes().find(function (q) { return q.id == editId; });
    if (quiz) {
      document.getElementById('quiz-title').value = quiz.title;
      document.getElementById('edit-id').value    = quiz.id;
      quiz.questions.forEach(addQuestion);
    }
  } else {
    addQuestion(null);
  }

  document.getElementById('add-question-btn').addEventListener('click', function () { addQuestion(null); });
  document.getElementById('save-btn').addEventListener('click', saveQuiz);
  document.getElementById('cancel-btn').addEventListener('click', function () { window.location.href = 'dashboard.html'; });
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
    + '<label>Options (tick the correct one)</label>'
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

function saveQuiz() {
  var title = document.getElementById('quiz-title').value.trim();
  if (!title) { alert('Add a quiz title!'); return; }

  var blocks    = document.querySelectorAll('.q-block');
  var questions = [];

  for (var i = 0; i < blocks.length; i++) {
    var n       = blocks[i].id.split('-')[1];
    var text    = document.getElementById('qtext-' + n).value.trim();
    var inputs  = blocks[i].querySelectorAll('.option-row input[type="text"]');
    var options = Array.from(inputs).map(function (el) { return el.value.trim(); });
    var correct = blocks[i].querySelector('input[type="radio"]:checked');
    if (!text)                               { alert('Question ' + n + ' has no text!'); return; }
    if (options.some(function(o){ return !o; })) { alert('Fill all options in Question ' + n + '!'); return; }
    questions.push({ text: text, options: options, correctIndex: correct ? +correct.value : 0 });
  }

  var all    = getQuizzes();
  var editId = document.getElementById('edit-id').value;
  if (editId) {
    var idx = all.findIndex(function (q) { return q.id == editId; });
    if (idx !== -1) { all[idx].title = title; all[idx].questions = questions; }
  } else {
    all.push({ id: Date.now(), ownerId: getSession().id, title: title, questions: questions });
  }
  saveQuizzes(all);
  alert('Quiz saved!');
  window.location.href = 'dashboard.html';
}


// ===== WAITING ROOM =====

var selectedAvatar = '🦊';
var playerList     = [];
var AVATARS        = ['🦊','🐼','🦁','🐸','🐨','🦄','🦋','🐯'];

function initWaiting() {
  var params = new URLSearchParams(window.location.search);
  var pin    = params.get('pin') || '------';
  var isHost = params.get('host') === '1';

  document.getElementById('game-pin').textContent = pin;

  var grid = document.getElementById('avatar-grid');
  AVATARS.forEach(function (av, i) {
    var btn = document.createElement('button');
    btn.className   = 'av-btn' + (i === 0 ? ' selected' : '');
    btn.textContent = av;
    btn.onclick = function () {
      document.querySelectorAll('.av-btn').forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedAvatar = av;
    };
    grid.appendChild(btn);
  });

  if (isHost) {
    document.getElementById('join-panel').style.display = 'none';
    document.getElementById('host-bar').style.display   = 'flex';
  }

  document.getElementById('join-game-btn').addEventListener('click', function () {
    var name = document.getElementById('player-name').value.trim();
    if (!name) { alert('Enter your name!'); return; }
    playerList.push({ name: name, avatar: selectedAvatar });
    document.getElementById('join-panel').style.display  = 'none';
    document.getElementById('joined-msg').style.display  = 'block';
    renderPlayers();
  });
}

function renderPlayers() {
  var section = document.getElementById('players-section');
  section.style.display = 'block';
  document.getElementById('player-count').textContent = playerList.length;
  var html = '';
  playerList.forEach(function (p) {
    html += '<div class="player-chip"><div class="av">' + p.avatar + '</div><div class="name">' + p.name + '</div></div>';
  });
  document.getElementById('players-grid').innerHTML = html || '<p style="color:#7b7d9a">No players yet.</p>';
}
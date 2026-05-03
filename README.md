# Quizzy — Live Multiplayer Quiz Platform

A real-time quiz platform built with Node.js, Socket.io, Express, and MongoDB.  
Players join using a 6-digit PIN, answer questions live, and see a final leaderboard.

---

## Features

- Signup / Login with hashed passwords (bcrypt + JWT)
- Create, edit, delete quizzes (max 5 per user)
- Host a live quiz session — generates a unique 6-digit PIN
- Players join without needing an account
- Real-time questions, countdown timer, live scoring via Socket.io
- Final podium leaderboard

---

## Project Structure

```
quizzy/
├── server.js           # Main server (Express + Socket.io)
├── package.json
├── .env                # Your environment variables (not committed)
├── .env.example        # Template for .env
├── middleware/
│   └── auth.js         # JWT verification middleware
├── models/
│   ├── User.js
│   └── Quiz.js
├── routes/
│   ├── auth.js         # /api/auth/signup, /api/auth/login
│   └── quiz.js         # /api/quiz CRUD
└── public/             # All frontend files (HTML, CSS, JS)
    ├── index.html
    ├── login.html
    ├── signup.html
    ├── dashboard.html
    ├── create.html
    ├── waiting.html
    ├── quiz.html
    ├── leaderboard.html
    ├── style.css
    └── app.js
```

---

## Local Setup (Linux)

### 1. Install Node.js (if not installed)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # should print v20.x.x
```

### 2. Clone / unzip the project

```bash
unzip quizzy.zip
cd quizzy
```

### 3. Install dependencies

```bash
npm install
```

### 4. Set up MongoDB

**Option A — MongoDB Atlas (free cloud database, recommended)**

1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) and create a free account
2. Create a new **free cluster** (M0)
3. Under **Database Access** → Add a database user with username + password
4. Under **Network Access** → Add IP `0.0.0.0/0` (allow all — fine for development)
5. Click **Connect** → **Drivers** → copy the connection string

It looks like:
```
mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### 5. Create your `.env` file

```bash
cp .env.example .env
nano .env
```

Fill it in:

```
MONGO_URI=mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/quizzy?retryWrites=true&w=majority
JWT_SECRET=pick_any_long_random_string_here
PORT=3000
```

Save and exit (`Ctrl+X`, then `Y`, then `Enter`).

### 6. Run locally

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**For development with auto-restart:**
```bash
npm run dev
```

---

## Deploy to Render (Free)

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "first commit"
```

Create a new repo on [https://github.com](https://github.com), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/quizzy.git
git branch -M main
git push -u origin main
```

### Step 2 — Create a Render Web Service

1. Go to [https://render.com](https://render.com) and sign in with GitHub
2. Click **New** → **Web Service**
3. Connect your **quizzy** repository
4. Fill in the settings:

| Field | Value |
|---|---|
| **Name** | quizzy |
| **Region** | Any |
| **Branch** | main |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | Free |

### Step 3 — Add Environment Variables on Render

In the Render dashboard, scroll down to **Environment** and add:

| Key | Value |
|---|---|
| `MONGO_URI` | your full MongoDB Atlas connection string |
| `JWT_SECRET` | your secret string |
| `PORT` | `3000` |

### Step 4 — Deploy

Click **Create Web Service**. Render will build and deploy automatically.  
Your app will be live at `https://quizzy.onrender.com` (or similar).

> **Note:** Free Render instances spin down after 15 minutes of inactivity.  
> The first request after sleep takes ~30 seconds to wake up. Upgrade to paid to avoid this.

---

## How to Use

### As a Host
1. Sign up or log in
2. Go to Dashboard → Create a Quiz
3. Add questions and options, tick the correct answer for each
4. Save the quiz
5. Click **▶ Host** — a 6-digit PIN is generated
6. Share the PIN with players
7. When everyone has joined, click **Start Quiz**

### As a Player
1. Go to the homepage
2. Enter the Game PIN given by the host
3. Pick an avatar and enter your name
4. Wait for the host to start
5. Answer questions before the timer runs out — faster correct answers score more points

---

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | No | Register new user |
| POST | `/api/auth/login` | No | Login, get JWT |
| GET | `/api/quiz` | Yes | Get my quizzes |
| POST | `/api/quiz` | Yes | Create quiz |
| PUT | `/api/quiz/:id` | Yes | Update quiz |
| DELETE | `/api/quiz/:id` | Yes | Delete quiz |
| POST | `/api/game/start/:quizId` | Yes | Start a game, get PIN |
| GET | `/api/game/:pin` | No | Check if game exists |

---

## Socket.io Events

| Event | Direction | Description |
|---|---|---|
| `host-join` | Client → Server | Host joins room with PIN |
| `player-join` | Client → Server | Player joins with name + avatar |
| `join-ok` | Server → Client | Confirms player joined |
| `player-list` | Server → Host | Updated player list |
| `start-game` | Host → Server | Host starts the quiz |
| `game-started` | Server → All | Redirect to quiz page |
| `question` | Server → All | Send next question |
| `submit-answer` | Player → Server | Player submits answer index |
| `answer-result` | Server → Player | Whether answer was correct + points |
| `question-end` | Server → All | Show scores between questions |
| `game-over` | Server → All | Final scores, redirect to leaderboard |
| `game-error` | Server → Client | Error message |

---

## Troubleshooting

**MongoDB connection fails**
- Check your `MONGO_URI` is correct in `.env`
- Make sure you whitelisted `0.0.0.0/0` in MongoDB Atlas Network Access
- Make sure the database user password has no special characters that need URL-encoding

**Port already in use**
```bash
kill $(lsof -t -i:3000)
npm start
```

**Players can't join**
- Make sure the game PIN is correct (6 digits)
- The host must have clicked **Host** from the dashboard first
- Games expire after 2 hours automatically

**Render deploy fails**
- Check the build logs on Render
- Make sure all environment variables are set
- Make sure `npm start` is the start command

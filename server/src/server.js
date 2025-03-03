const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");

// Use environment port for deployment (fallback to 4000 locally)
const PORT = process.env.PORT || 4000;

const app = express();
const server = http.createServer(app);

// Allow frontend access from any origin for Render deployment
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));

const io = socketIO(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// Default route for checking server status
app.get("/", (req, res) => {
  res.send("✅ Server is running. Use WebSockets to connect.");
});

// Game state variables
let maxTimeInSeconds = 30;
let timer = maxTimeInSeconds;
let numOfPlayers = 7;
let dealer = 0;
let firstPlayer = 3;
let currentPlayer = firstPlayer;
let isFirstRound = true;
let isRunning = false;
let intervalId = null;

// Function to broadcast game state
function broadcastTimerUpdate() {
  io.emit("timerUpdate", { timer, dealer, firstPlayer, currentPlayer, isRunning, numOfPlayers });
}

// Handle end of round
function handleEndRound() {
  console.log("End Round...");
  clearInterval(intervalId);
  isRunning = false;
  if (isFirstRound) {
    firstPlayer = (dealer + 1) % numOfPlayers;
  }
  timer = maxTimeInSeconds;
  currentPlayer = firstPlayer;
  isFirstRound = false;
  broadcastTimerUpdate();
}

// WebSocket connection
io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Send initial game state
  socket.emit("timerUpdate", { timer, dealer, firstPlayer, currentPlayer, isRunning, numOfPlayers });

  // End turn logic
  socket.on("endTurn", () => {
    if (!isRunning) return;
    timer = maxTimeInSeconds;
    let nextPlayer = (currentPlayer + 1) % numOfPlayers;
    if (nextPlayer === firstPlayer) {
      handleEndRound();
    } else {
      currentPlayer = nextPlayer;
      broadcastTimerUpdate();
    }
  });

  // Toggle timer
  socket.on("toggleTimer", () => {
    isRunning = !isRunning;
    if (isRunning) {
      intervalId = setInterval(() => {
        if (timer > 0) {
          timer--;
        } else {
          currentPlayer = (currentPlayer + 1) % numOfPlayers;
          timer = maxTimeInSeconds;
        }
        broadcastTimerUpdate();
      }, 1000);
    } else {
      clearInterval(intervalId);
    }
    broadcastTimerUpdate();
  });

  // Set total number of players
  socket.on("setPlayersCount", (newCount) => {
    numOfPlayers = parseInt(newCount, 10) || 1;
    if (numOfPlayers < 1) numOfPlayers = 1;
    dealer = dealer % numOfPlayers;
    currentPlayer = currentPlayer % numOfPlayers;
    console.log(`Number of players set to: ${numOfPlayers}`);
    broadcastTimerUpdate();
  });

  // End round only
  socket.on("endRound", handleEndRound);

  // Start a new game
  socket.on("newGame", () => {
    console.log("New game requested");
    clearInterval(intervalId);
    isRunning = false;
    timer = maxTimeInSeconds;
    dealer = (dealer + 1) % numOfPlayers;
    firstPlayer = (dealer + 3) % numOfPlayers;
    currentPlayer = firstPlayer;
    isFirstRound = true;
    broadcastTimerUpdate();
    console.log("Game reset to default state");
  });

  // Reset the game
  socket.on("resetGame", () => {
    console.log("Game reset requested");
    clearInterval(intervalId);
    isRunning = false;
    timer = maxTimeInSeconds;
    dealer = 0;
    firstPlayer = (dealer + 3) % numOfPlayers;
    currentPlayer = firstPlayer;
    isFirstRound = true;
    broadcastTimerUpdate();
  });

  // Set starting player
  socket.on("setStartingPlayer", (playerIndex) => {
    let index = parseInt(playerIndex, 10);
    if (isNaN(index) || index < 0 || index >= numOfPlayers) {
      index = 0;
    }
    currentPlayer = index;
    console.log(`Starting player set to: ${currentPlayer}`);
    broadcastTimerUpdate();
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

  // Set starting player
socket.on("setTimeInSeconds", (timeInSeconds) => {
    let timeInSecondsInt = parseInt(timeInSeconds, 30);
    if (isNaN(time) || timeInSecondsInt < 0 ) {
        timeInSecondsInt = 0;
    }
    maxTimeInSeconds = timeInSecondsInt;
    timer = maxTimeInSeconds
    console.log(`Starting time set to: ${maxTimeInSeconds}`);
    broadcastTimerUpdate();
  });

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

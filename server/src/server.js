// server.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST']
}));

const io = socketIO(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

let timer = 30;
let numOfPlayers = 7;
let isFirstRound = true;
let dealer = 0;
let firstPlayer = 3;
let currentPlayer = 3;
let isRunning = false;
let intervalId = null;

const PORT = 4000;

// Broadcast state to all clients
function broadcastTimerUpdate() {
  io.emit('timerUpdate', {
    timer,
    dealer,
    firstPlayer,
    currentPlayer,
    isRunning,
    numOfPlayers
  });
}

// Handle end of round
function handleEndRound() {
    console.log('End Round...');
    // Stop the timer if it's running
    clearInterval(intervalId);
    isRunning = false;
  
    timer = 30;
    currentPlayer = firstPlayer;
    broadcastTimerUpdate();
    console.log('End Round');
  }

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Send the current state immediately
  socket.emit('timerUpdate', {
    timer,
    dealer,
    firstPlayer,
    currentPlayer,
    isRunning,
    numOfPlayers
  });

  // End turn
  socket.on('endTurn', () => {
    timer = 30;
    let nextPlayer = (currentPlayer + 1) % numOfPlayers;
    if (nextPlayer === firstPlayer) {
        handleEndRound();
    } else {
      currentPlayer = nextPlayer;
      broadcastTimerUpdate();
    }
  });

  // Toggle timer
  socket.on('toggleTimer', () => {
    isRunning = !isRunning;
    if (isRunning) {
      intervalId = setInterval(() => {
        if (timer > 0) {
          timer--;
          if (timer === 0) {
            currentPlayer = (currentPlayer + 1) % numOfPlayers;
            timer = 30;
          }
          broadcastTimerUpdate();
        }
      }, 1000);
    } else {
      clearInterval(intervalId);
    }
    broadcastTimerUpdate();
  });

  // Set the total number of players
  socket.on('setPlayersCount', (newCount) => {
    numOfPlayers = parseInt(newCount, 10) || 1;
    if (numOfPlayers < 1) numOfPlayers = 1;
    console.log('Number of players set to:', numOfPlayers);

    // Ensure currentPlayer is within range
    dealer = dealer % numOfPlayers;
    currentPlayer = currentPlayer % numOfPlayers;
    broadcastTimerUpdate();
  });

  // End round only
  socket.on('endRound', handleEndRound);

  // New game
  socket.on('newGame', () => {
    console.log('New game requested');
    // Stop the timer if it's running
    clearInterval(intervalId);
    isRunning = false;

    // Reset logic
    timer = 30;
    // currentPlayer should increament by 1
    dealer = (dealer + 1) % numOfPlayers;
    firstPlayer = (dealer + 3) % numOfPlayers;
    currentPlayer = firstPlayer;

    isFirstRound = true;
    broadcastTimerUpdate();
    console.log('Game was reset to default state');
  });

 // Reset game
 socket.on('resetGame', () => {
     console.log('Reset game requested');
     // Stop the timer if it's running
     clearInterval(intervalId);
     isRunning = false;
 
     // Reset logic
     timer = 30;
     dealer = 0;
     currentPlayer = (dealer + 3) % numOfPlayers;
     isFirstRound = true;
     broadcastTimerUpdate();
     console.log('Game was reset to default state');
   });

  // Set the starting player
  socket.on('setStartingPlayer', (playerIndex) => {
    let index = parseInt(playerIndex, 10);
    if (isNaN(index) || index < 0 || index >= numOfPlayers) {
      index = 0; // fallback or do nothing
    }
    currentPlayer = index;
    console.log('Starting player set to:', currentPlayer);

    broadcastTimerUpdate();
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Serve static files if needed
app.use(express.static('public'));

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

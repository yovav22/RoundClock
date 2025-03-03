import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

document.addEventListener('wheel', function(event) {
  if (event.ctrlKey) {
    event.preventDefault();
  }
}, { passive: false });

document.addEventListener('gesturestart', function(event) {
  event.preventDefault();
});


const isLocal = window.location.hostname === "localhost";

// Set the socket URL based on the environment
const socket = io(isLocal ? "http://localhost:4000" : "https://roundclock-mrbs.onrender.com");


function App() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [timer, setTimer] = useState(30);
  const [dealer, setDealerPlayer] = useState(0);
  const [firstPlayer, setFirstPlayer] = useState(3);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [timeInSeconds, setTimeInSeconds] = useState(30);
  const [numOfPlayers, setNumOfPlayers] = useState(7);
  const [playersInput, setPlayersInput] = useState(7);
  const [role, setRole] = useState("player"); // "player" or "admin"
  const [adminControlsVisible, setAdminControlsVisible] = useState(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  useEffect(() => {
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isInStandaloneMode) {
      setShowInstallPrompt(true);
    }
  }, []);
  
  const ticSound = useRef(null);
  const buzzerSound = useRef(null);
  
  useEffect(() => {
    // Initialize sounds inside useEffect
    ticSound.current = new Audio("/sounds/tic.mp3");
    buzzerSound.current = new Audio("/sounds/bell.mp3");
  
    // Unlock audio on user interaction (Needed for iOS/Android)
    const unlockAudio = () => {
      if (ticSound.current) {
        ticSound.current.play().catch(() => {});
        ticSound.current.pause();
        ticSound.current.currentTime = 0;
      }
  
      if (buzzerSound.current) {
        buzzerSound.current.play().catch(() => {});
        buzzerSound.current.pause();
        buzzerSound.current.currentTime = 0;
      }
  
      setIsAudioUnlocked(true);
      document.removeEventListener("click", unlockAudio);
    };
  
    document.addEventListener("click", unlockAudio);
    return () => document.removeEventListener("click", unlockAudio);
  }, []);  

  useEffect(() => {
    socket.on('timerUpdate', (data) => {
      setTimer(data.timer);
      setDealerPlayer(data.dealer);
      setFirstPlayer(data.firstPlayer);
      setCurrentPlayer(data.currentPlayer);
      setIsRunning(data.isRunning);
      setNumOfPlayers(data.numOfPlayers);

      // ✅ Play ticSound every second in the last 5 seconds
      if (isAudioUnlocked) {
        if (data.isRunning && data.timer <= 5 && data.timer > 0) {
          ticSound.current.currentTime = 0; // Reset for overlapping sounds
          ticSound.current.play().catch(() => {});
        }

        // ✅ Play buzzerSound when timer reaches 0
        if (data.isRunning && data.timer === 0) {
          buzzerSound.current.currentTime = 0;
          buzzerSound.current.play().catch(() => {});
        }
      }
    });

    return () => socket.off('timerUpdate');
  }, [isAudioUnlocked]);

  // Socket event handlers
  // Socket event handlers
  const handleEndTurn = () => socket.emit('endTurn');
  const handleToggleTimer = () => socket.emit('toggleTimer');
  const handleEndRound = () => socket.emit('endRound');
  const handleNewGame = () => socket.emit('newGame');
  const handleResetGame = () => socket.emit('resetGame');
  const handleSetPlayersCount = () => socket.emit('setPlayersCount', playersInput);
  const handleSetStartingPlayer = (playerIndex) => socket.emit('setStartingPlayer', playerIndex);
  const handleSetTimeInSeconds = () => socket.emit('setTimeInSeconds', timeInSeconds);


  return (
    <div className="page">
      <div>
        {showInstallPrompt && (
          <div className="install-prompt">
            📲 Tap **"Share"** → **"Add to Home Screen"** to install RoundClock.
          </div>
        )}
      </div>
      <div className="container">
        <h1 className="header">Poker Timer</h1>

        {/* =================== MAIN SECTION (Visible to Everyone) =================== */}
        <div className="mainSection">
          <div className="infoRow">
            <div className="infoBox">
              <div>Timer</div>
              <div className="infoBoxTimer">
                <div>{timer}</div>
              </div>
            </div>
            <div className="infoBox">
              <div>Current Player</div>
              <div className="infoBoxCurrentPlayer">
                <div>{currentPlayer + 1}</div>
              </div>
            </div>
          </div>

          {/* End Turn Button */}
          <div className="endTurnRow">
            <button className={`buttonEl ${!isRunning ? "disabled" : ""}`} onClick={handleEndTurn}>
              <div className="endTurnBox">
                End Turn
              </div>
            </button>
          </div>

          {/* Role Selection */}
          <div className="roleSelector">
            <label className="roleLabel">Select Role:</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="player">Player</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        {/* ================= ADMIN SECTION (Collapsible) ================= */}
        {role === "admin" && (
          <>
            <button
              className="adminToggleBtn"
              onClick={() => setAdminControlsVisible(!adminControlsVisible)}
            >
              {adminControlsVisible ? "Hide Admin Controls" : "Show Admin Controls"}
            </button>

            {adminControlsVisible && (
              <div className="secondarySection">
                <div className="buttonRow">
                  <button className="buttonEl" onClick={handleToggleTimer}>
                    {isRunning ? "Stop Round" : "Start Round"}
                  </button>

                  <button className="buttonEl" onClick={handleEndRound}>
                    End Round
                  </button>

                  <button className="buttonEl" onClick={handleNewGame}>
                    New Game
                  </button>

                  <button className="buttonEl" style={{ backgroundColor: 'orange' }} onClick={handleResetGame}>
                    Reset
                  </button>
                </div>

                <div className="inputRow">
                  <label>Number of Players:</label>
                  <input
                    type="number"
                    min="1"
                    value={playersInput}
                    onChange={(e) => setPlayersInput(e.target.value)}
                    style={{ width: '60px', padding: '5px' }}
                  />
                  <button className="buttonEl" onClick={handleSetPlayersCount}>
                    Set Players
                  </button>
                </div>
                <div className="inputRow">
                  <label>Timer Duration (seconds):</label>
                  <input
                    type="number"
                    min="10"
                    value={timeInSeconds}
                    onChange={(e) => setTimeInSeconds(e.target.value)}
                    style={{ width: '60px', padding: '5px' }}
                  />
                  <button className="buttonEl" onClick={handleSetTimeInSeconds}>
                    Set Timer
                  </button>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <p>Dealer: Player {dealer + 1} | First Player: Player {firstPlayer + 1}</p>
                </div>

                <h3 style={{ textAlign: 'center' }}>Set Starting Player</h3>
                <div className="playerButtonsRow">
                  {Array.from({ length: numOfPlayers }, (_, idx) => {
                    let classes = "buttonEl";
                    if (idx === currentPlayer) classes += " currentPlayer";
                    if (idx === dealer) classes += " dealer";

                    return (
                      <button key={idx} className={classes} onClick={() => handleSetStartingPlayer(idx)}>
                        {`Player ${idx + 1}${idx === dealer ? " (Dealer)" : ""}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;

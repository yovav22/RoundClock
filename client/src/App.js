import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import './App.css';

// const socket = io('http://localhost:4000');
const socket = io("https://roundclock-mrbs.onrender.com");

function App() {
  const [timer, setTimer] = useState(30);
  const [dealer, setDealerPlayer] = useState(0);
  const [firstPlayer, setFirstPlayer] = useState(3);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [numOfPlayers, setNumOfPlayers] = useState(7);
  const [playersInput, setPlayersInput] = useState(7);
  const [role, setRole] = useState("player"); // "player" or "admin"
  const [adminControlsVisible, setAdminControlsVisible] = useState(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [ticSound, setTicSound] = useState(null);
  const [buzzerSound, setBuzzerSound] = useState(null);

  useEffect(() => {
    // Load sounds only once
    const tic = new Audio("/sounds/tic.mp3");
    const buzzer = new Audio("/sounds/bell.mp3");

    setTicSound(tic);
    setBuzzerSound(buzzer);

    // Unlock audio on user interaction
    const unlockAudio = () => {
      tic.play().catch(() => {}); // Try playing silently to unlock
      buzzer.play().catch(() => {});
      setIsAudioUnlocked(true);
      document.removeEventListener("click", unlockAudio);
    };

    document.addEventListener("click", unlockAudio);
    return () => document.removeEventListener("click", unlockAudio);
  }, []);

  useEffect(() => {
    if (!ticSound || !buzzerSound) return;

    socket.on('timerUpdate', (data) => {
      setTimer(data.timer);
      setDealerPlayer(data.dealer);
      setFirstPlayer(data.firstPlayer);
      setCurrentPlayer(data.currentPlayer);
      setIsRunning(data.isRunning);
      setNumOfPlayers(data.numOfPlayers);

      if (isAudioUnlocked) {
        if (data.isRunning && data.timer <= 5 && data.timer > 0) {
          ticSound.currentTime = 0; // Reset for overlapping sounds
          ticSound.play().catch(() => {});
        }
        if (data.isRunning && data.timer === 0) {
          buzzerSound.currentTime = 0;
          buzzerSound.play().catch(() => {});
        }
      }
    });

    return () => socket.off('timerUpdate');
  }, [isAudioUnlocked, ticSound, buzzerSound]);

  // Socket event handlers
  const handleEndTurn = () => {
    socket.emit('endTurn');
  };

  const handleToggleTimer = () => {
    socket.emit('toggleTimer');
  };

  const handleEndRound = () => {
    socket.emit('endRound');
  };

  const handleNewGame = () => {
    socket.emit('newGame');
  };

  const handleResetGame = () => {
    socket.emit('resetGame');
  };

  const handleSetPlayersCount = () => {
    socket.emit('setPlayersCount', playersInput);
  };

  const handleSetStartingPlayer = (playerIndex) => {
    socket.emit('setStartingPlayer', playerIndex);
  };

  return (
    <div className="page">
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

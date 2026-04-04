import { useState, useCallback, useEffect } from 'react';
import HexStrategy from './client/hex-strategy.jsx';
import Lobby from './client/lobby.jsx';
import OnlineGame from './client/online-game.jsx';
import { MenuMusic } from './client/sfx.js';

export default function App() {
  const [onlineRoom, setOnlineRoom] = useState(null);
  const [playerName, setPlayerName] = useState(null);
  const [showLobby, setShowLobby] = useState(false);

  useEffect(() => {
    if (showLobby || onlineRoom) {
      MenuMusic.stop();
    }
  }, [showLobby, onlineRoom]);

  const handleBackToMenu = useCallback(() => {
    setOnlineRoom(null);
    setPlayerName(null);
    setShowLobby(false);
    MenuMusic.play();
  }, []);

  // Online game in progress
  if (onlineRoom) {
    return <OnlineGame roomId={onlineRoom} playerName={playerName} onBack={handleBackToMenu} />;
  }

  // Online lobby
  if (showLobby) {
    return (
      <Lobby
        onJoinRoom={(code, name) => { setOnlineRoom(code); setPlayerName(name); }}
        onBack={() => { setShowLobby(false); }}
      />
    );
  }

  // Pass onShowOnline to the game component so it can add an "Online" button
  return <HexStrategy onShowOnline={() => setShowLobby(true)} />;
}

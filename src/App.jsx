import { useState } from 'react';
import HexStrategy from './client/hex-strategy.jsx';
import Lobby from './client/lobby.jsx';
import OnlineGame from './client/online-game.jsx';

export default function App() {
  const [onlineRoom, setOnlineRoom] = useState(null);
  const [showLobby, setShowLobby] = useState(false);

  // Online game in progress
  if (onlineRoom) {
    return <OnlineGame roomId={onlineRoom} onBack={() => setOnlineRoom(null)} />;
  }

  // Online lobby
  if (showLobby) {
    return (
      <Lobby
        onJoinRoom={(code) => setOnlineRoom(code)}
        onBack={() => setShowLobby(false)}
      />
    );
  }

  // Pass onShowOnline to the game component so it can add an "Online" button
  return <HexStrategy onShowOnline={() => setShowLobby(true)} />;
}

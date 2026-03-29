import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import HexStrategyGame from "./HexStrategyGame.jsx";
import OnlineGame from "./components/OnlineGame.jsx";
import Lobby from "./components/Lobby.jsx";
import { ModeSelectScreen } from "./components/GameScreens.jsx";

function App() {
  const [gameMode, setGameMode] = useState(null); // null | "offline" | "online"
  const [onlineRoomId, setOnlineRoomId] = useState(null);

  // Online flow: lobby → room → OnlineGame (which renders HexStrategyGame with onlineMode)
  if (gameMode === "online" && !onlineRoomId) {
    return <Lobby onJoinRoom={(code) => setOnlineRoomId(code)} onBack={() => { setGameMode(null); setOnlineRoomId(null); }} />;
  }
  if (gameMode === "online" && onlineRoomId) {
    return <OnlineGame roomId={onlineRoomId} onBack={() => { setOnlineRoomId(null); setGameMode(null); }} />;
  }

  // Mode select or offline game
  if (!gameMode) {
    return <ModeSelectScreen setGameMode={setGameMode} />;
  }

  // Offline mode
  return <HexStrategyGame onBack={() => setGameMode(null)} />;
}

createRoot(document.getElementById("root")).render(<App />);

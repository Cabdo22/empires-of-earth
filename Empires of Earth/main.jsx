import React, { useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import HexStrategyGame from "./HexStrategyGame.jsx";
import OnlineGame from "./components/OnlineGame.jsx";
import Lobby from "./components/Lobby.jsx";
import { ModeSelectScreen } from "./components/GameScreens.jsx";
import { MenuMusic } from "./sfx.js";

function App() {
  const [gameMode, setGameMode] = useState(null); // null | "offline" | "online"
  const [onlineRoomId, setOnlineRoomId] = useState(null);

  const handleBack = useCallback(() => {
    setGameMode(null);
    setOnlineRoomId(null);
    MenuMusic.play();
  }, []);

  // Online flow: lobby → room → OnlineGame (which renders HexStrategyGame with onlineMode)
  if (gameMode === "online" && !onlineRoomId) {
    return <Lobby onJoinRoom={(code) => setOnlineRoomId(code)} onBack={handleBack} />;
  }
  if (gameMode === "online" && onlineRoomId) {
    return <OnlineGame roomId={onlineRoomId} onBack={handleBack} />;
  }

  // Mode select or offline game
  if (!gameMode) {
    return <ModeSelectScreen setGameMode={setGameMode} />;
  }

  // Offline mode
  return <HexStrategyGame onBack={handleBack} />;
}

createRoot(document.getElementById("root")).render(<App />);

// ============================================================
// USE-PARTY — PartySocket hook for online multiplayer
// ============================================================
import { useState, useEffect, useRef, useCallback } from "react";
import PartySocket from "partysocket";

const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST || "localhost:1999";

export function useMultiplayerGame(roomId) {
  const [gameState, setGameState] = useState(null);
  const [connected, setConnected] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [error, setError] = useState(null);
  const [roomPhase, setRoomPhase] = useState("WAITING");
  const [civPicks, setCivPicks] = useState({});
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [events, setEvents] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;

    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: roomId,
    });

    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setConnected(true);
      setError(null);
    });

    socket.addEventListener("close", () => {
      setConnected(false);
    });

    socket.addEventListener("message", (evt) => {
      try {
        const data = JSON.parse(evt.data);

        switch (data.type) {
          case "assigned":
            setMyPlayerId(data.playerId);
            setRoomPhase(data.phase);
            break;

          case "state":
            setGameState(data.state);
            if (data.events?.length > 0) setEvents(data.events);
            break;

          case "error":
            setError(data.message);
            setTimeout(() => setError(null), 3000);
            break;

          case "phase_change":
            setRoomPhase(data.phase);
            break;

          case "civ_picks":
            setCivPicks(data.picks);
            break;

          case "opponent_disconnected":
            setOpponentDisconnected(true);
            break;

          case "opponent_reconnected":
            setOpponentDisconnected(false);
            break;
        }
      } catch (e) {
        console.error("Failed to parse message:", e);
      }
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [roomId]);

  const sendAction = useCallback((action) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(action));
    }
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    gameState,
    connected,
    myPlayerId,
    sendAction,
    error,
    roomPhase,
    civPicks,
    opponentDisconnected,
    events,
    clearEvents,
  };
}

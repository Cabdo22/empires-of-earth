// ============================================================
// USE-PARTY — PartySocket hook for online multiplayer
// ============================================================
import { useState, useEffect, useRef, useCallback } from "react";
import PartySocket from "partysocket";

const PARTYKIT_HOST = import.meta.env?.VITE_PARTYKIT_HOST || "localhost:1999";
const SESSION_STORAGE_PREFIX = "empires-online-session:";

const getRoomSessionKey = (roomId) => `${SESSION_STORAGE_PREFIX}${roomId}`;

const getOrCreateSessionId = (roomId) => {
  if (!roomId || typeof window === "undefined") return null;

  const storageKey = getRoomSessionKey(roomId);
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;

  const sessionId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  window.localStorage.setItem(storageKey, sessionId);
  return sessionId;
};

export function useMultiplayerGame(roomId) {
  const [gameState, setGameState] = useState(null);
  const [connected, setConnected] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [error, setError] = useState(null);
  const [roomPhase, setRoomPhase] = useState("WAITING");
  const [civPicks, setCivPicks] = useState({});
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [events, setEvents] = useState([]);
  const [aiSlots, setAiSlots] = useState([]);
  const [mapSize, setMapSize] = useState("medium");
  const socketRef = useRef(null);
  const sessionIdRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;

    const sessionId = getOrCreateSessionId(roomId);
    sessionIdRef.current = sessionId;

    setConnected(false);
    setMyPlayerId(null);
    setGameState(null);
    setError(null);
    setRoomPhase("WAITING");
    setCivPicks({});
    setAiSlots([]);
    setMapSize("medium");
    setEvents([]);
    setOpponentDisconnected(false);

    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: roomId,
    });

    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setConnected(true);
      setError(null);
      socket.send(JSON.stringify({
        type: "HELLO",
        sessionId,
      }));
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
            if (data.state) setGameState(data.state);
            setOpponentDisconnected(Boolean(data.opponentDisconnected));
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
            if (data.aiSlots) setAiSlots(data.aiSlots);
            if (data.mapSize) setMapSize(data.mapSize);
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
    aiSlots,
    mapSize,
  };
}

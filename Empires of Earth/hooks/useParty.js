// ============================================================
// USE-PARTY — PartySocket hook for online multiplayer
// ============================================================
import { useState, useEffect, useRef, useCallback } from "react";
import PartySocket from "partysocket";

const PARTYKIT_HOST = import.meta.env?.VITE_PARTYKIT_HOST || "localhost:1999";
const SESSION_STORAGE_PREFIX = "empires-online-session:";
const DEV_MULTIPLAYER_DEBUG = Boolean(import.meta.env?.DEV);

const ERROR_COPY = {
  ROOM_FULL: "This room already has two human players.",
  RECONNECT_EXPIRED: "The reconnect window expired for this room.",
  HOST_ONLY_SETUP: "Only the host can change match settings.",
  INVALID_MAP_SIZE: "That map size is not valid.",
  INVALID_AI_CONFIGURATION: "Those AI slot settings are not valid.",
  SESSION_REPLACED: "This session was replaced by a newer connection.",
  ACTION_REJECTED: "That move was rejected by the server.",
};

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

const summarizeMessage = (data) => {
  if (!data || typeof data !== "object") return data;
  return {
    type: data.type,
    code: data.code,
    phase: data.phase,
    playerId: data.playerId,
    stateVersion: data.stateVersion,
    setupLocked: data.setupLocked,
  };
};

const debugLog = (direction, data) => {
  if (!DEV_MULTIPLAYER_DEBUG) return;
  console.debug(`[multiplayer:${direction}]`, summarizeMessage(data));
};

const toUserError = (data) => ({
  code: data.code || "UNKNOWN",
  message: ERROR_COPY[data.code] || data.message || "Multiplayer error",
  rawMessage: data.message || "",
  serverNow: data.serverNow || null,
});

export function useMultiplayerGame(roomId) {
  const [gameState, setGameState] = useState(null);
  const [connected, setConnected] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [hostPlayerId, setHostPlayerId] = useState("p1");
  const [error, setError] = useState(null);
  const [roomPhase, setRoomPhase] = useState("WAITING");
  const [civPicks, setCivPicks] = useState({});
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [events, setEvents] = useState([]);
  const [aiSlots, setAiSlots] = useState([]);
  const [mapSize, setMapSize] = useState("medium");
  const [roomReset, setRoomReset] = useState(false);
  const [setupLocked, setSetupLocked] = useState(false);
  const [stateVersion, setStateVersion] = useState(0);
  const [connectionState, setConnectionState] = useState("idle");
  const [roomStatus, setRoomStatus] = useState("idle");
  const [serverNow, setServerNow] = useState(null);
  const [reconnectWindowMs, setReconnectWindowMs] = useState(null);
  const [opponentDisconnectedAt, setOpponentDisconnectedAt] = useState(null);
  const [reconnectDeadlineAt, setReconnectDeadlineAt] = useState(null);
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
    setHostPlayerId("p1");
    setRoomPhase("WAITING");
    setCivPicks({});
    setAiSlots([]);
    setMapSize("medium");
    setEvents([]);
    setOpponentDisconnected(false);
    setRoomReset(false);
    setSetupLocked(false);
    setStateVersion(0);
    setConnectionState("connecting");
    setRoomStatus("waiting_assignment");
    setServerNow(null);
    setReconnectWindowMs(null);
    setOpponentDisconnectedAt(null);
    setReconnectDeadlineAt(null);

    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: roomId,
    });

    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setConnected(true);
      setError(null);
      setConnectionState("connected");
      const hello = {
        type: "HELLO",
        sessionId,
      };
      debugLog("out", hello);
      socket.send(JSON.stringify(hello));
    });

    socket.addEventListener("close", () => {
      setConnected(false);
      setConnectionState(prev => (prev === "connected" ? "reconnecting" : "closed"));
    });

    socket.addEventListener("message", (evt) => {
      try {
        const data = JSON.parse(evt.data);
        debugLog("in", data);

        switch (data.type) {
          case "assigned":
            setError(null);
            setMyPlayerId(data.playerId);
            setRoomPhase(data.phase);
            if (data.state) setGameState(data.state);
            setOpponentDisconnected(Boolean(data.opponentDisconnected));
            if (data.hostPlayerId) setHostPlayerId(data.hostPlayerId);
            setRoomReset(Boolean(data.roomReset));
            setSetupLocked(Boolean(data.setupLocked));
            if (data.aiSlots) setAiSlots(data.aiSlots);
            if (data.mapSize) setMapSize(data.mapSize);
            setServerNow(data.serverNow || null);
            setReconnectWindowMs(data.reconnectWindowMs || null);
            setStateVersion(data.stateVersion || 0);
            setConnectionState(data.reclaimed ? "reconnected" : "connected");
            setRoomStatus(data.phase === "WAITING" ? "waiting_opponent" : data.phase === "PLAYING" || data.phase === "FINISHED" ? "in_game" : "assigned");
            if (!data.opponentDisconnected) {
              setOpponentDisconnectedAt(null);
              setReconnectDeadlineAt(null);
            }
            break;

          case "state":
            setError(null);
            setGameState(data.state);
            if (data.events?.length > 0) setEvents(data.events);
            setStateVersion(data.stateVersion || 0);
            setServerNow(data.serverNow || null);
            if (data.reconnectWindowMs) setReconnectWindowMs(data.reconnectWindowMs);
            setRoomStatus("in_game");
            break;

          case "error":
            setError(toUserError(data));
            if (data.serverNow) setServerNow(data.serverNow);
            if (data.reconnectWindowMs) setReconnectWindowMs(data.reconnectWindowMs);
            if (data.code === "ROOM_FULL") setRoomStatus("room_full");
            if (data.code === "RECONNECT_EXPIRED") setRoomStatus("reconnect_expired");
            setTimeout(() => setError(null), 3000);
            break;

          case "phase_change":
            setError(null);
            setRoomPhase(data.phase);
            setSetupLocked(!["WAITING", "CIV_SELECT"].includes(data.phase));
            if (data.serverNow) setServerNow(data.serverNow);
            setRoomStatus(data.phase === "CIV_SELECT" ? "setup" : data.phase === "WAITING" ? "waiting_opponent" : "in_game");
            break;

          case "civ_picks":
            setError(null);
            setCivPicks(data.picks);
            if (data.aiSlots) setAiSlots(data.aiSlots);
            if (data.mapSize) setMapSize(data.mapSize);
            if (data.hostPlayerId) setHostPlayerId(data.hostPlayerId);
            setSetupLocked(Boolean(data.setupLocked));
            if (data.serverNow) setServerNow(data.serverNow);
            if (data.reconnectWindowMs) setReconnectWindowMs(data.reconnectWindowMs);
            setRoomStatus("setup");
            break;

          case "opponent_disconnected":
            setOpponentDisconnected(true);
            setOpponentDisconnectedAt(data.disconnectedAt || null);
            setReconnectDeadlineAt(data.reconnectDeadlineAt || null);
            if (data.serverNow) setServerNow(data.serverNow);
            if (data.reconnectWindowMs) setReconnectWindowMs(data.reconnectWindowMs);
            setRoomStatus("opponent_disconnected");
            break;

          case "opponent_reconnected":
            setOpponentDisconnected(false);
            setOpponentDisconnectedAt(null);
            setReconnectDeadlineAt(null);
            if (data.serverNow) setServerNow(data.serverNow);
            setRoomStatus(roomPhase === "PLAYING" || roomPhase === "FINISHED" ? "in_game" : "assigned");
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
    hostPlayerId,
    sendAction,
    error,
    roomPhase,
    civPicks,
    opponentDisconnected,
    events,
    clearEvents,
    aiSlots,
    mapSize,
    roomReset,
    setupLocked,
    stateVersion,
    connectionState,
    roomStatus,
    serverNow,
    reconnectWindowMs,
    opponentDisconnectedAt,
    reconnectDeadlineAt,
  };
}

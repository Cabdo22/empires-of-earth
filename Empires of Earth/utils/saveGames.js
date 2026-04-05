const SAVES_STORAGE_KEY = "eoe_saves";
export const CURRENT_SAVE_VERSION = 1;

const isLegacyGameState = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Array.isArray(value.hexes) && Array.isArray(value.players);
};

const normalizeSaveEnvelope = (value) => {
  if (isLegacyGameState(value)) {
    return {
      saveVersion: 0,
      gameState: value,
    };
  }

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof value.saveVersion === "number" &&
    isLegacyGameState(value.gameState)
  ) {
    return {
      saveVersion: value.saveVersion,
      gameState: value.gameState,
    };
  }

  return null;
};

const parseJson = (rawValue) => {
  if (typeof rawValue !== "string") return rawValue;
  return JSON.parse(rawValue);
};

const detectStoredSaveVersion = (saveData) => {
  try {
    const envelope = normalizeSaveEnvelope(parseJson(saveData));
    if (!envelope) return CURRENT_SAVE_VERSION;
    return envelope.saveVersion;
  } catch {
    return CURRENT_SAVE_VERSION;
  }
};

export const serializeGameState = (gameState) =>
  JSON.stringify({
    saveVersion: CURRENT_SAVE_VERSION,
    gameState,
  });

export const migrateSave = (rawValue, fromVersion = 0) => {
  const envelope = normalizeSaveEnvelope(rawValue);
  if (!envelope) {
    throw new Error("Invalid save data");
  }

  if (fromVersion <= 0) {
    return {
      saveVersion: CURRENT_SAVE_VERSION,
      gameState: envelope.gameState,
    };
  }

  return {
    saveVersion: CURRENT_SAVE_VERSION,
    gameState: envelope.gameState,
  };
};

export const deserializeGameState = (rawValue) => {
  const parsed = parseJson(rawValue);
  const envelope = normalizeSaveEnvelope(parsed);
  if (!envelope) {
    throw new Error("Invalid save data");
  }
  return migrateSave(envelope, envelope.saveVersion).gameState;
};

export const readSavedGames = () => {
  try {
    const parsed = parseJson(localStorage.getItem(SAVES_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((save) => save && typeof save === "object")
      .map((save) => ({
        ...save,
        saveVersion:
          typeof save.saveVersion === "number"
            ? save.saveVersion
            : detectStoredSaveVersion(save.data),
      }));
  } catch {
    return [];
  }
};

export const writeSavedGames = (saves) => {
  localStorage.setItem(SAVES_STORAGE_KEY, JSON.stringify(saves));
};

export const createSavedGameEntry = ({ name, gameState, id = Date.now(), date = new Date().toLocaleString() }) => ({
  id,
  name,
  date,
  saveVersion: CURRENT_SAVE_VERSION,
  data: serializeGameState(gameState),
});

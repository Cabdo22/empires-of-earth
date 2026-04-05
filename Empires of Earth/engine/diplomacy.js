import { LEADER_DEFS } from '../data/leaders.js';

export const DIPLOMACY_STATUSES = {
  NEUTRAL: "neutral",
  WAR: "war",
  PEACE: "peace",
  ALLIANCE: "alliance",
};

export const DIPLOMACY_PROPOSAL_TYPES = {
  PEACE: "peace",
  ALLIANCE: "alliance",
  TRADE_PACT: "trade_pact",
};

const clampScore = (score) => Math.max(-100, Math.min(100, score));

export const getRelationKey = (playerAId, playerBId) =>
  [playerAId, playerBId].sort().join(":");

const makeEmptyRelation = (turnNumber = 1) => ({
  status: DIPLOMACY_STATUSES.NEUTRAL,
  score: 0,
  activeTreaties: [],
  scoreLog: [],
  lastChangedTurn: turnNumber,
});

export const createInitialDiplomacyState = (players, turnNumber = 1) => {
  const relationsByPair = {};
  const leaderEventsSeen = {};

  for (const player of players) {
    leaderEventsSeen[player.id] = [];
  }

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      relationsByPair[getRelationKey(players[i].id, players[j].id)] = makeEmptyRelation(turnNumber);
    }
  }

  return {
    relationsByPair,
    pendingProposals: [],
    leaderEventsSeen,
    nextProposalId: 1,
  };
};

export const ensureDiplomacyState = (state) => {
  if (!state.diplomacy) {
    state.diplomacy = createInitialDiplomacyState(state.players || [], state.turnNumber || 1);
  }
  if (!state.diplomacy.relationsByPair) state.diplomacy.relationsByPair = {};
  if (!state.diplomacy.pendingProposals) state.diplomacy.pendingProposals = [];
  if (!state.diplomacy.leaderEventsSeen) {
    state.diplomacy.leaderEventsSeen = Object.fromEntries((state.players || []).map((p) => [p.id, []]));
  }
  if (!state.diplomacy.nextProposalId) state.diplomacy.nextProposalId = 1;
  return state.diplomacy;
};

export const getRelation = (state, playerAId, playerBId) => {
  const diplomacy = ensureDiplomacyState(state);
  const key = getRelationKey(playerAId, playerBId);
  if (!diplomacy.relationsByPair[key]) {
    diplomacy.relationsByPair[key] = makeEmptyRelation(state.turnNumber || 1);
  }
  return diplomacy.relationsByPair[key];
};

export const areAtWar = (state, playerAId, playerBId) =>
  getRelation(state, playerAId, playerBId).status === DIPLOMACY_STATUSES.WAR;

export const areAllied = (state, playerAId, playerBId) =>
  getRelation(state, playerAId, playerBId).status === DIPLOMACY_STATUSES.ALLIANCE;

export const hasTradePact = (state, playerAId, playerBId) =>
  getRelation(state, playerAId, playerBId).activeTreaties.some((t) => t.type === DIPLOMACY_PROPOSAL_TYPES.TRADE_PACT);

export const canAttack = (state, attackerId, defenderId) =>
  !defenderId || areAtWar(state, attackerId, defenderId);

export const markLeaderEventSeen = (state, playerId, eventKey) => {
  const diplomacy = ensureDiplomacyState(state);
  const seen = new Set(diplomacy.leaderEventsSeen[playerId] || []);
  if (seen.has(eventKey)) return false;
  seen.add(eventKey);
  diplomacy.leaderEventsSeen[playerId] = [...seen];
  return true;
};

export const applyRelationModifier = (state, playerAId, playerBId, delta, reason) => {
  const relation = getRelation(state, playerAId, playerBId);
  relation.score = clampScore((relation.score || 0) + delta);
  relation.scoreLog = [...(relation.scoreLog || []).slice(-7), { turn: state.turnNumber || 1, delta, reason }];
  return relation;
};

const upsertTreaty = (relation, treaty) => {
  relation.activeTreaties = (relation.activeTreaties || []).filter((t) => t.type !== treaty.type);
  relation.activeTreaties.push(treaty);
};

const removeTreaty = (relation, treatyType) => {
  relation.activeTreaties = (relation.activeTreaties || []).filter((t) => t.type !== treatyType);
};

export const declareWar = (state, fromPlayerId, toPlayerId) => {
  const relation = getRelation(state, fromPlayerId, toPlayerId);
  relation.status = DIPLOMACY_STATUSES.WAR;
  relation.lastChangedTurn = state.turnNumber || 1;
  relation.activeTreaties = [];
  applyRelationModifier(state, fromPlayerId, toPlayerId, -20, "Declared war");
  return relation;
};

export const makePeace = (state, fromPlayerId, toPlayerId) => {
  const relation = getRelation(state, fromPlayerId, toPlayerId);
  relation.status = DIPLOMACY_STATUSES.PEACE;
  relation.lastChangedTurn = state.turnNumber || 1;
  upsertTreaty(relation, { type: DIPLOMACY_PROPOSAL_TYPES.PEACE, expiresOnTurn: (state.turnNumber || 1) + 6 });
  applyRelationModifier(state, fromPlayerId, toPlayerId, 10, "Peace signed");
  return relation;
};

export const formAlliance = (state, fromPlayerId, toPlayerId) => {
  const relation = getRelation(state, fromPlayerId, toPlayerId);
  relation.status = DIPLOMACY_STATUSES.ALLIANCE;
  relation.lastChangedTurn = state.turnNumber || 1;
  upsertTreaty(relation, { type: DIPLOMACY_PROPOSAL_TYPES.ALLIANCE, expiresOnTurn: null });
  removeTreaty(relation, DIPLOMACY_PROPOSAL_TYPES.PEACE);
  applyRelationModifier(state, fromPlayerId, toPlayerId, 16, "Alliance formed");
  return relation;
};

export const addTradePact = (state, fromPlayerId, toPlayerId) => {
  const relation = getRelation(state, fromPlayerId, toPlayerId);
  upsertTreaty(relation, { type: DIPLOMACY_PROPOSAL_TYPES.TRADE_PACT, expiresOnTurn: (state.turnNumber || 1) + 12 });
  if (relation.status === DIPLOMACY_STATUSES.NEUTRAL) {
    relation.status = DIPLOMACY_STATUSES.PEACE;
  }
  applyRelationModifier(state, fromPlayerId, toPlayerId, 8, "Trade pact signed");
  return relation;
};

export const createProposal = (state, fromPlayerId, toPlayerId, type, payload = {}) => {
  const diplomacy = ensureDiplomacyState(state);
  const proposal = {
    id: `dp-${diplomacy.nextProposalId++}`,
    fromPlayerId,
    toPlayerId,
    type,
    payload,
    createdTurn: state.turnNumber || 1,
  };
  diplomacy.pendingProposals.push(proposal);
  return proposal;
};

export const removeProposal = (state, proposalId) => {
  const diplomacy = ensureDiplomacyState(state);
  diplomacy.pendingProposals = diplomacy.pendingProposals.filter((p) => p.id !== proposalId);
};

export const acceptProposal = (state, proposalId) => {
  const diplomacy = ensureDiplomacyState(state);
  const proposal = diplomacy.pendingProposals.find((p) => p.id === proposalId);
  if (!proposal) return null;

  if (proposal.type === DIPLOMACY_PROPOSAL_TYPES.PEACE) {
    makePeace(state, proposal.fromPlayerId, proposal.toPlayerId);
  } else if (proposal.type === DIPLOMACY_PROPOSAL_TYPES.ALLIANCE) {
    formAlliance(state, proposal.fromPlayerId, proposal.toPlayerId);
  } else if (proposal.type === DIPLOMACY_PROPOSAL_TYPES.TRADE_PACT) {
    addTradePact(state, proposal.fromPlayerId, proposal.toPlayerId);
  }

  removeProposal(state, proposalId);
  return proposal;
};

export const rejectProposal = (state, proposalId) => {
  const diplomacy = ensureDiplomacyState(state);
  const proposal = diplomacy.pendingProposals.find((p) => p.id === proposalId);
  if (!proposal) return null;
  applyRelationModifier(state, proposal.fromPlayerId, proposal.toPlayerId, -4, "Proposal rejected");
  removeProposal(state, proposalId);
  return proposal;
};

export const tickDiplomacy = (state) => {
  const diplomacy = ensureDiplomacyState(state);
  for (const relation of Object.values(diplomacy.relationsByPair)) {
    if (relation.score > 0) relation.score -= 1;
    if (relation.score < 0) relation.score += 1;
    relation.activeTreaties = (relation.activeTreaties || []).filter((treaty) => {
      if (!treaty.expiresOnTurn) return true;
      return treaty.expiresOnTurn > (state.turnNumber || 1);
    });
    const hasAlliance = relation.activeTreaties.some((t) => t.type === DIPLOMACY_PROPOSAL_TYPES.ALLIANCE);
    const hasPeace = relation.activeTreaties.some((t) => t.type === DIPLOMACY_PROPOSAL_TYPES.PEACE);
    if (hasAlliance) relation.status = DIPLOMACY_STATUSES.ALLIANCE;
    else if (hasPeace) relation.status = DIPLOMACY_STATUSES.PEACE;
    else if (relation.status !== DIPLOMACY_STATUSES.WAR) relation.status = DIPLOMACY_STATUSES.NEUTRAL;
  }
};

export const getDiplomacyIncomeBonus = (state, playerId) => {
  if (!state?.players?.length || !state?.diplomacy?.relationsByPair) return 0;
  let bonus = 0;
  for (const other of state.players) {
    if (other.id === playerId) continue;
    if (areAllied(state, playerId, other.id)) bonus += 1;
    if (hasTradePact(state, playerId, other.id)) bonus += 2;
  }
  return bonus;
};

export const getKnownPlayers = (state, playerId) => {
  const met = state.metPlayers?.[playerId] || [];
  return (state.players || []).filter((player) => met.includes(player.id));
};

export const getLeaderScenePayload = (state, viewerId, otherPlayerId, context = "firstMeet") => {
  const player = (state.players || []).find((p) => p.id === otherPlayerId);
  if (!player) return null;
  const leader = LEADER_DEFS[player.civilization] || null;
  const relation = getRelation(state, viewerId, otherPlayerId);
  return {
    playerId: otherPlayerId,
    civilization: player.civilization,
    civName: player.name,
    leaderName: leader?.leader || player.name,
    leaderTitle: leader?.title || "Ruler",
    portrait: leader?.portrait || null,
    portraitPosition: leader?.portraitPosition || "50% 50%",
    portraitScale: leader?.portraitScale || 1,
    dialogue: leader?.dialogue?.[context] || leader?.dialogue?.firstMeet || "A new civilization has entered the world stage.",
    historicalQuote: context === "firstMeet" ? (leader?.historicalQuote || null) : null,
    quoteAttribution: context === "firstMeet" ? (leader?.quoteAttribution || null) : null,
    quoteSourceUrl: context === "firstMeet" ? (leader?.quoteSourceUrl || null) : null,
    personality: leader?.personality || { aggression: 0.5, loyalty: 0.5, greed: 0.5 },
    context,
    relation,
  };
};

export const scoreAiDiplomacyOffer = (state, fromPlayerId, toPlayerId, type) => {
  const relation = getRelation(state, fromPlayerId, toPlayerId);
  const fromPlayer = state.players.find((p) => p.id === fromPlayerId);
  const toPlayer = state.players.find((p) => p.id === toPlayerId);
  const fromLeader = LEADER_DEFS[fromPlayer?.civilization];
  const toLeader = LEADER_DEFS[toPlayer?.civilization];
  const aggression = toLeader?.personality?.aggression ?? 0.5;
  const loyalty = toLeader?.personality?.loyalty ?? 0.5;
  const greed = toLeader?.personality?.greed ?? 0.5;

  if (type === DIPLOMACY_PROPOSAL_TYPES.PEACE) {
    return relation.status === DIPLOMACY_STATUSES.WAR && relation.score > (-65 - aggression * 10);
  }
  if (type === DIPLOMACY_PROPOSAL_TYPES.ALLIANCE) {
    return relation.status !== DIPLOMACY_STATUSES.WAR && relation.score > (10 - loyalty * 5);
  }
  if (type === DIPLOMACY_PROPOSAL_TYPES.TRADE_PACT) {
    return relation.status !== DIPLOMACY_STATUSES.WAR && relation.score > (-10 - greed * 5);
  }
  return false;
};

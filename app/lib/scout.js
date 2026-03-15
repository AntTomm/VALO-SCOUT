import agentsData from "../agents.json";
import mapGuides from "../mapGuides.json";
import patchNotes from "../patchNotes.json";
import statsData from "../../stats.json";

const ROLE_BY_AGENT = {
  Astra: "Controller",
  Breach: "Initiator",
  Brimstone: "Controller",
  Chamber: "Sentinel",
  Cypher: "Sentinel",
  Fade: "Initiator",
  Gekko: "Initiator",
  Harbor: "Controller",
  Iso: "Duelist",
  Jett: "Duelist",
  Kayo: "Initiator",
  Killjoy: "Sentinel",
  Neon: "Duelist",
  Omen: "Controller",
  Phoenix: "Duelist",
  Raze: "Duelist",
  Reyna: "Duelist",
  Sage: "Sentinel",
  Skye: "Initiator",
  Sova: "Initiator",
  Viper: "Controller",
  Yoru: "Duelist",
};

const PLAYSTYLE_HINTS = {
  aggressive: ["entry", "tempo", "fast-hit", "space", "pressure"],
  tactical: ["macro", "retake", "default", "mid-control", "information"],
  supportive: ["post-plant", "recon", "utility", "anchor", "structure"],
};

const normalize = (value = "") => value.toString().trim().toLowerCase();

export function getFilters() {
  return {
    agents: [...new Set(statsData.stats.map((player) => player.most_used_hero))].sort(),
    maps: mapGuides.map((guide) => guide.map),
    playstyles: ["aggressive", "tactical", "supportive"],
    streaming: ["any", "regular-only"],
  };
}

export function buildScoutReport({
  query = "",
  agent = "Any",
  map = "Any",
  playstyle = "tactical",
  streaming = "any",
}) {
  const normalizedQuery = normalize(query);
  const selectedAgent = agent === "Any" ? "" : agent;
  const selectedMap = map === "Any" ? "" : map;
  const styleTerms = PLAYSTYLE_HINTS[playstyle] ?? [];
  const mapGuide = selectedMap
    ? mapGuides.find((guide) => guide.map === selectedMap)
    : null;
  const agentRecord = selectedAgent
    ? agentsData.agents.find((entry) => entry.name === selectedAgent)
    : null;

  const playerPool = statsData.stats
    .filter((player) => {
      if (selectedAgent && player.most_used_hero !== selectedAgent) {
        return false;
      }
      if (streaming === "regular-only" && !player.stream_schedule.streams_regularly) {
        return false;
      }
      return true;
    })
    .map((player) => scorePlayer(player, { normalizedQuery, selectedAgent, mapGuide, styleTerms }))
    .sort((left, right) => right.fitScore - left.fitScore)
    .slice(0, 3);

  const sources = buildSources({ agentRecord, mapGuide, selectedAgent, selectedMap, playstyle });
  const summary = createSummary({ playerPool, selectedAgent, selectedMap, playstyle });

  return {
    summary,
    recommendations: playerPool,
    rationale: buildRationale({ playerPool, selectedAgent, selectedMap, playstyle, sources }),
    sources,
    filters: {
      agent,
      map,
      playstyle,
      streaming,
    },
  };
}

function scorePlayer(player, { normalizedQuery, selectedAgent, mapGuide, styleTerms }) {
  let score = Number(player.recent_performance.average_kda) * 30 + player.recent_performance.wins;
  const reasons = [];
  const citations = [];
  const playerAgent = player.most_used_hero;
  const playerRole = ROLE_BY_AGENT[playerAgent] ?? "Flex";

  if (selectedAgent && playerAgent === selectedAgent) {
    score += 24;
    reasons.push(`Direct agent match on ${playerAgent}.`);
    citations.push(`Player stats: ${player.player_name} most-used hero is ${playerAgent}.`);
  }

  if (mapGuide?.recommendedAgents.includes(playerAgent)) {
    score += 18;
    reasons.push(`${playerAgent} fits the recommended pool for ${mapGuide.map}.`);
    citations.push(`Map guide: ${mapGuide.map} recommends ${mapGuide.recommendedAgents.join(", ")}.`);
  }

  if (player.stream_schedule.streams_regularly) {
    score += 8;
    reasons.push(`Regular streamer with watchable VOD patterns on ${player.stream_schedule.days.join(", ")}.`);
    citations.push(`Stream schedule: ${player.stream_schedule.time || "varied times"}.`);
  }

  if (styleTerms.some((term) => matchStyle(playerAgent, playerRole, term))) {
    score += 14;
    reasons.push(`${capitalize(playerRole)} profile fits a ${styleTerms[0]} scouting brief.`);
    citations.push(`Role mapping: ${playerAgent} is treated as a ${playerRole}.`);
  }

  if (normalizedQuery) {
    const haystack = normalize(
      `${player.player_name} ${playerAgent} ${player.top_used_weapon} ${playerRole}`
    );
    if (haystack.includes(normalizedQuery)) {
      score += 12;
      reasons.push(`Matches the free-text scouting query.`);
      citations.push(`Query overlap detected in player profile fields.`);
    }
  }

  reasons.push(`Strong recent form with ${player.recent_performance.average_kda} average KDA across ${player.recent_performance.matches_played} matches.`);
  citations.push(`Performance stats: ${player.recent_performance.wins} wins in ${player.recent_performance.matches_played} matches.`);

  return {
    playerName: player.player_name,
    fitScore: Math.min(99, Math.round(score)),
    mostUsedAgent: playerAgent,
    role: playerRole,
    topWeapon: player.top_used_weapon,
    averageKda: player.recent_performance.average_kda,
    wins: player.recent_performance.wins,
    matchesPlayed: player.recent_performance.matches_played,
    streamSummary: player.stream_schedule.streams_regularly
      ? `${player.stream_schedule.days.join(", ")} | ${player.stream_schedule.time}`
      : "No regular stream schedule listed",
    reasons: reasons.slice(0, 3),
    citations: citations.slice(0, 3),
  };
}

function buildSources({ agentRecord, mapGuide, selectedAgent, selectedMap, playstyle }) {
  const sources = [];

  if (agentRecord) {
    sources.push({
      title: `${selectedAgent} ability reference`,
      type: "Agent guide",
      detail: agentRecord.abilities.map((ability) => `${ability.name}: ${ability.description}`).join(" "),
    });
  }

  if (mapGuide) {
    sources.push({
      title: `${selectedMap} map guide`,
      type: "Map guide",
      detail: `${mapGuide.summary} ${mapGuide.tips.join(" ")}`,
    });
  }

  const patchMatch = patchNotes.find((entry) =>
    entry.impactTags.some((tag) => PLAYSTYLE_HINTS[playstyle]?.includes(tag) || normalize(entry.recommendation).includes(selectedAgent.toLowerCase()))
  ) || patchNotes[0];

  sources.push({
    title: patchMatch.title,
    type: "Patch note",
    detail: `${patchMatch.summary} ${patchMatch.recommendation}`,
  });

  sources.push({
    title: "Player performance dataset",
    type: "Stats dataset",
    detail: "Structured player stats, preferred agents, weapons, and stream schedules.",
  });

  return sources;
}

function buildRationale({ playerPool, selectedAgent, selectedMap, playstyle, sources }) {
  return [
    selectedAgent
      ? `${selectedAgent} was prioritized, so direct specialists received a large score boost.`
      : "No single agent lock was applied, so the ranking favored recent form and map fit.",
    selectedMap
      ? `${selectedMap} guide data shaped the ranking using recommended agents and tactical tips.`
      : "Without a map filter, the ranking leaned on broad role fit rather than map-specific utility.",
    `The ${playstyle} playstyle bias influenced role weighting before final ranking.`,
    `Grounding sources used: ${sources.map((source) => source.type).join(", ")}.`,
    playerPool.length
      ? `Top recommendation: ${playerPool[0].playerName} with a fit score of ${playerPool[0].fitScore}.`
      : "No candidates matched the selected filters.",
  ];
}

function createSummary({ playerPool, selectedAgent, selectedMap, playstyle }) {
  if (!playerPool.length) {
    return "No players matched the current filters. Try broadening the agent or streaming requirements.";
  }

  const leader = playerPool[0];
  const focus = [selectedAgent, selectedMap, playstyle].filter(Boolean).join(" / ");
  return `${leader.playerName} leads this scout report${focus ? ` for ${focus}` : ""} because they combine strong form, role fit, and grounded source support.`;
}

function matchStyle(agent, role, term) {
  const agentKey = normalize(agent);
  const roleKey = normalize(role);

  if (term === "entry" || term === "tempo" || term === "fast-hit" || term === "pressure" || term === "space") {
    return roleKey === "duelist" || ["jett", "raze", "reyna", "phoenix", "yoru"].includes(agentKey);
  }

  if (term === "macro" || term === "retake" || term === "default" || term === "mid-control" || term === "information") {
    return ["controller", "initiator"].includes(roleKey);
  }

  if (term === "post-plant" || term === "recon" || term === "utility" || term === "anchor" || term === "structure") {
    return ["sentinel", "controller", "initiator"].includes(roleKey);
  }

  return false;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

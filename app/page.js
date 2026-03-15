'use client'

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { buildScoutReport, getFilters } from "@/app/lib/scout";

const REPORT_CACHE_PREFIX = "valo-scout-report:";
const reportCache = new Map();
const DEFAULT_AVAILABLE_FILTERS = getFilters();

const EMPTY_REPORT = {
  summary: "Set your filters and generate a scout report.",
  recommendations: [],
  rationale: [],
  sources: [],
};

export default function Home() {
  const [query, setQuery] = useState("Find me a reliable Jett player for a fast Ascent comp.");
  const [filters, setFilters] = useState({
    agent: "Jett",
    map: "Ascent",
    playstyle: "aggressive",
    streaming: "any",
  });
  const [availableFilters, setAvailableFilters] = useState({
    agents: DEFAULT_AVAILABLE_FILTERS.agents,
    maps: DEFAULT_AVAILABLE_FILTERS.maps,
    playstyles: DEFAULT_AVAILABLE_FILTERS.playstyles,
    streaming: DEFAULT_AVAILABLE_FILTERS.streaming,
  });
  const [report, setReport] = useState(EMPTY_REPORT);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const hydratedRef = useRef(false);

  const runScout = useCallback(async ({ useCache }) => {
    const payload = {
      query,
      ...filters,
    };
    const cacheKey = `${REPORT_CACHE_PREFIX}${JSON.stringify(payload)}`;

    if (useCache) {
      const cached = readCachedReport(cacheKey);
      if (cached) {
        setReport(cached.report);
        setAvailableFilters(cached.availableFilters);
        setError("");
        return;
      }
    }

    setError("");
    setIsLoading(true);

    try {
      const nextReport = buildScoutReport(payload);
      setReport(nextReport);
      setAvailableFilters(DEFAULT_AVAILABLE_FILTERS);
      cacheReport(cacheKey, {
        report: nextReport,
        availableFilters: DEFAULT_AVAILABLE_FILTERS,
      });
    } catch (nextError) {
      setError(nextError.message || "Unable to build a scout report.");
    } finally {
      setIsLoading(false);
    }
  }, [filters, query]);

  useEffect(() => {
    if (hydratedRef.current) {
      return;
    }

    hydratedRef.current = true;
    runScout({ useCache: true });
  }, [runScout]);

  return (
    <Box sx={styles.shell}>
      <Box sx={styles.backdrop} />
      <Stack sx={styles.container} spacing={3}>
        <Stack spacing={1.5}>
          <Chip label="VALO-Scout" sx={styles.badge} />
          <Typography variant="h2" sx={styles.title}>
            AI Scout Reports for your VALORANT Agent Selection!
          </Typography>
          <Typography sx={styles.subtitle}>
            Filter by map, agent, and playstyle to get grounded player recommendations, rationale notes, and source cards.
          </Typography>
        </Stack>

        <Card sx={styles.panel}>
          <CardContent>
            <Stack spacing={2.5}>
              <TextField
                label="Scouting brief"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                fullWidth
                multiline
                minRows={3}
                InputLabelProps={{ sx: styles.inputLabel }}
                InputProps={{ sx: styles.inputField }}
              />

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <FilterSelect
                  label="Agent"
                  value={filters.agent}
                  options={["Any", ...availableFilters.agents]}
                  onChange={(value) => setFilters((current) => ({ ...current, agent: value }))}
                />
                <FilterSelect
                  label="Map"
                  value={filters.map}
                  options={["Any", ...availableFilters.maps]}
                  onChange={(value) => setFilters((current) => ({ ...current, map: value }))}
                />
                <FilterSelect
                  label="Playstyle"
                  value={filters.playstyle}
                  options={availableFilters.playstyles}
                  onChange={(value) => setFilters((current) => ({ ...current, playstyle: value }))}
                />
                <FilterSelect
                  label="Streaming"
                  value={filters.streaming}
                  options={availableFilters.streaming}
                  onChange={(value) => setFilters((current) => ({ ...current, streaming: value }))}
                />
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Button variant="contained" onClick={() => runScout({ useCache: true })} sx={styles.primaryButton}>
                  Generate Report
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    clearCachedReports();
                    runScout({ useCache: false });
                  }}
                  sx={styles.secondaryButton}
                >
                  Refresh Sources
                </Button>
                {isLoading ? <CircularProgress size={24} sx={{ alignSelf: "center" }} /> : null}
              </Stack>

              {error ? <Alert severity="error">{error}</Alert> : null}
            </Stack>
          </CardContent>
        </Card>

        <Stack direction={{ xs: "column", xl: "row" }} spacing={3} alignItems="stretch">
          <Card sx={{ ...styles.panel, flex: 1.3 }}>
            <CardContent>
              <Stack spacing={2.5}>
                <Typography variant="h5" sx={styles.sectionTitle}>
                  Scout summary
                </Typography>
                <Typography sx={styles.summaryCopy}>{report.summary}</Typography>
                <Divider />
                <Stack spacing={2}>
                  {report.recommendations.length ? (
                    report.recommendations.map((player, index) => (
                      <Card key={player.playerName} sx={styles.recommendationCard} variant="outlined">
                        <CardContent>
                          <Stack spacing={1.5}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Box>
                                <Typography variant="h6" sx={styles.playerName}>
                                  {index + 1}. {player.playerName}
                                </Typography>
                                <Typography sx={styles.metaCopy}>
                                  {player.mostUsedAgent} | {player.role} | {player.topWeapon}
                                </Typography>
                              </Box>
                              <Chip label={`Fit ${player.fitScore}`} sx={styles.scoreChip} />
                            </Stack>
                            <Typography sx={styles.metaCopy}>
                              {player.averageKda} KDA across {player.matchesPlayed} matches with {player.wins} wins.
                            </Typography>
                            <Typography sx={styles.metaCopy}>{player.streamSummary}</Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              {player.reasons.map((reason) => (
                                <Chip key={reason} label={reason} sx={styles.reasonChip} />
                              ))}
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Typography sx={styles.metaCopy}>
                      Recommendations will appear here after you generate a report.
                    </Typography>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Stack spacing={3} sx={{ flex: 1 }}>
            <Card sx={styles.panel}>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h5" sx={styles.sectionTitle}>
                    Rationale panel
                  </Typography>
                  {report.rationale.length ? (
                    report.rationale.map((item) => (
                      <Typography key={item} sx={styles.metaCopy}>
                        {item}
                      </Typography>
                    ))
                  ) : (
                    <Typography sx={styles.metaCopy}>
                      Ranking logic and tradeoffs will show up here.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Card sx={styles.panel}>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h5" sx={styles.sectionTitle}>
                    Organized sources
                  </Typography>
                  {report.sources.length ? (
                    report.sources.map((source) => (
                      <Card key={`${source.type}-${source.title}`} sx={styles.sourceCard} variant="outlined">
                        <CardContent>
                          <Stack spacing={1}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography sx={styles.sourceTitle}>{source.title}</Typography>
                              <Chip label={source.type} size="small" sx={styles.sourceChip} />
                            </Stack>
                            <Typography sx={styles.metaCopy}>{source.detail}</Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Typography sx={styles.metaCopy}>
                      The source rail will populate from player stats, map guides, patch notes, and agent notes.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <FormControl fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        label={label}
        sx={styles.selectField}
        MenuProps={{
          PaperProps: {
            sx: styles.menuPaper,
          },
        }}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <MenuItem key={option} value={option}>
            {prettify(option)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function readCachedReport(cacheKey) {
  if (reportCache.has(cacheKey)) {
    return reportCache.get(cacheKey);
  }

  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(cacheKey);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    reportCache.set(cacheKey, parsed);
    return parsed;
  } catch {
    window.localStorage.removeItem(cacheKey);
    return null;
  }
}

function cacheReport(cacheKey, value) {
  reportCache.set(cacheKey, value);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(cacheKey, JSON.stringify(value));
  }
}

function clearCachedReports() {
  reportCache.clear();
  if (typeof window === "undefined") {
    return;
  }

  Object.keys(window.localStorage)
    .filter((key) => key.startsWith(REPORT_CACHE_PREFIX))
    .forEach((key) => window.localStorage.removeItem(key));
}

function prettify(value) {
  return value
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

const styles = {
  shell: {
    minHeight: "100vh",
    width: "100%",
    position: "relative",
    overflow: "hidden",
    bgcolor: "#08111f",
    color: "#f6efe6",
    px: { xs: 2, md: 4 },
    py: { xs: 3, md: 5 },
  },
  backdrop: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background:
      "radial-gradient(circle at top left, rgba(255, 70, 85, 0.28), transparent 35%), radial-gradient(circle at bottom right, rgba(62, 173, 227, 0.2), transparent 30%), linear-gradient(135deg, rgba(8, 17, 31, 0.95), rgba(16, 33, 53, 0.96))",
  },
  container: {
    position: "relative",
    zIndex: 1,
    maxWidth: "1280px",
    mx: "auto",
    pt: { xs: 2, md: 3 },
  },
  badge: {
    alignSelf: "flex-start",
    bgcolor: "rgba(255,255,255,0.08)",
    color: "#ff8a7a",
    border: "1px solid rgba(255,138,122,0.35)",
    fontWeight: 700,
    letterSpacing: "0.08em",
  },
  title: {
    fontSize: { xs: "2.5rem", md: "4.15rem" },
    lineHeight: { xs: 1.08, md: 1.02 },
    letterSpacing: { xs: "-0.02em", md: "-0.03em" },
    maxWidth: { xs: "10ch", md: "14ch" },
    fontWeight: 800,
    textWrap: "balance",
  },
  subtitle: {
    maxWidth: "760px",
    color: "rgba(255, 239, 230, 0.9)",
    fontSize: { xs: "1rem", md: "1.05rem" },
    lineHeight: 1.55,
  },
  panel: {
    bgcolor: "rgba(7, 18, 31, 0.78)",
    border: "1px solid rgba(255,255,255,0.08)",
    backdropFilter: "blur(18px)",
    boxShadow: "0 24px 70px rgba(0,0,0,0.28)",
    borderRadius: 4,
  },
  primaryButton: {
    bgcolor: "#ff4655",
    color: "#fff7f2",
    px: 3,
    "&:hover": {
      bgcolor: "#ff5f6d",
    },
  },
  secondaryButton: {
    color: "#fff2eb",
    borderColor: "rgba(255,255,255,0.28)",
    "&:hover": {
      borderColor: "rgba(255, 70, 85, 0.5)",
      bgcolor: "rgba(255, 70, 85, 0.06)",
    },
  },
  sectionTitle: {
    fontWeight: 700,
    color: "#fff6f1",
  },
  summaryCopy: {
    color: "#fff7f2",
    fontSize: "1.05rem",
    lineHeight: 1.7,
  },
  recommendationCard: {
    borderRadius: 3,
    borderColor: "rgba(255,255,255,0.08)",
    bgcolor: "rgba(255,255,255,0.03)",
  },
  sourceCard: {
    borderRadius: 3,
    borderColor: "rgba(255,255,255,0.08)",
    bgcolor: "rgba(8, 17, 31, 0.7)",
  },
  playerName: {
    fontWeight: 700,
    color: "#fff7f2",
  },
  metaCopy: {
    color: "rgba(255, 239, 230, 0.82)",
    lineHeight: 1.7,
  },
  scoreChip: {
    bgcolor: "rgba(61, 214, 140, 0.18)",
    color: "#8cf0bb",
    fontWeight: 700,
  },
  reasonChip: {
    bgcolor: "rgba(255, 138, 122, 0.14)",
    color: "#ffd3cc",
    maxWidth: "100%",
    "& .MuiChip-label": {
      whiteSpace: "normal",
      display: "block",
      paddingTop: "8px",
      paddingBottom: "8px",
    },
  },
  sourceTitle: {
    fontWeight: 700,
    color: "#fff7f2",
  },
  sourceChip: {
    bgcolor: "rgba(62, 173, 227, 0.15)",
    color: "#8fdcff",
  },
  inputLabel: {
    color: "rgba(255, 239, 230, 0.78)",
    "&.Mui-focused": {
      color: "#ff8f7d",
    },
  },
  inputField: {
    color: "#fff6f1",
    bgcolor: "rgba(14, 28, 46, 0.96)",
    borderRadius: 2,
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "rgba(255, 239, 230, 0.12)",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: "rgba(255, 125, 112, 0.42)",
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "#ff4655",
      borderWidth: "1px",
    },
    "& textarea, & input": {
      color: "#fff6f1",
      WebkitTextFillColor: "#fff6f1",
    },
  },
  selectField: {
    color: "#fff6f1",
    bgcolor: "rgba(14, 28, 46, 0.96)",
    borderRadius: 2,
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "rgba(255, 239, 230, 0.12)",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: "rgba(255, 125, 112, 0.42)",
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "#ff4655",
    },
    "& .MuiSvgIcon-root": {
      color: "#ffb1a6",
    },
  },
  menuPaper: {
    bgcolor: "#11243a",
    color: "#fff6f1",
    border: "1px solid rgba(255,255,255,0.08)",
    "& .MuiMenuItem-root": {
      color: "#fff6f1",
    },
    "& .MuiMenuItem-root.Mui-selected": {
      bgcolor: "rgba(255, 70, 85, 0.18)",
    },
    "& .MuiMenuItem-root.Mui-selected:hover, & .MuiMenuItem-root:hover": {
      bgcolor: "rgba(255, 125, 112, 0.16)",
    },
  },
};

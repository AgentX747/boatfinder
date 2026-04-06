// services/predictionService.ts

const FASTAPI_BASE = process.env.FASTAPI_URL ?? "http://localhost:8000";

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${FASTAPI_BASE}${path}`, options);
  if (!res.ok) throw new Error(`FastAPI ${res.status}: ${res.statusText} (${path})`);
  return res.json();
}

// ── Forecast endpoints ────────────────────────────────────────

export const getNationalForecast  = () => apiFetch("/forecast/national");
export const getYearlyForecast    = () => apiFetch("/forecast/yearly");
export const getSeasonalForecast  = () => apiFetch("/forecast/seasonal");
export const getFolds             = () => apiFetch("/forecast/folds");

export const getPMOForecast = (pmo: string, n_months = 12) =>
  apiFetch("/forecast/pmo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pmo, n_months }),
  });

// ── Scenario endpoints ────────────────────────────────────────

export const getScenarioOptions = () => apiFetch("/scenario/options");
export const getAllScenarios     = () => apiFetch("/scenario/all");

export const applyScenario = (scenario: string) =>
  apiFetch("/scenario/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario }),
  });
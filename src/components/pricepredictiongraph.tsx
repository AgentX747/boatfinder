import { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────

interface NationalPoint {
  date: string;
  year: number;
  month: string;
  month_num: number;
  actual: number | null;
  predicted: number | null;
  lower: number | null;
  upper: number | null;
  pct_change: number | null;
  oil_shock: boolean;
}

interface SeasonalRow {
  month: string;
  month_num: number;
  hist_avg: number | null;
  fc_avg: number | null;
  pct_change: number | null;
  insufficient: boolean;
}

interface ScenarioRow {
  scenario: string;
  label: string;
  oil_change_pct: number;
  demand_change_pct: number;
  adjusted_M: number;
  diesel_php: number;
  color: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const API_NATIONAL  = "https://ferryai.onrender.com/forecast/national";
const API_SEASONAL  = "https://ferryai.onrender.com/forecast/seasonal";
const API_SCENARIOS = "https://ferryai.onrender.com/scenario/all";

const SCENARIO_COLOR_MAP: Record<string, string> = {
  baseline: "#22c55e",
  mild:     "#f59e0b",
  moderate: "#f97316",
  severe:   "#dc2626",
};

const SCENARIO_LABEL_MAP: Record<string, string> = {
  baseline: "Baseline",
  mild:     "Mild (+15%)",
  moderate: "Moderate (+35%)",
  severe:   "Severe (+60%)",
};

// ── Helpers ────────────────────────────────────────────────────────────────

const fmtM = (v: number) => `${(v / 1_000_000).toFixed(1)}M`;

/** Format a date object or date string to "Mon YYYY" e.g. "Jul 2020" */
function fmtMonthYear(month: string, year: number): string {
  return `${month} ${year}`;
}

function pctColor(v: number | null) {
  if (v == null) return "#475569";
  if (v > 10)  return "#22c55e";
  if (v > 0)   return "#86efac";
  if (v > -10) return "#fca5a5";
  return "#ef4444";
}

function pctBg(v: number | null) {
  if (v == null) return "rgba(71,85,105,0.1)";
  if (v > 10)  return "rgba(34,197,94,0.12)";
  if (v > 0)   return "rgba(134,239,172,0.1)";
  if (v > -10) return "rgba(252,165,165,0.1)";
  return "rgba(239,68,68,0.12)";
}

// ── Safe parsers ──────────────────────────────────────────────────────────

/**
 * API returns: { historical: [{year, month, month_num, date, total}], forecast: [{year, month, month_num, date, predicted, lower, upper}], accuracy, mean_mape }
 */
function parseNational(raw: any): { points: NationalPoint[]; accuracy: string; mape: string } {
  const accuracy = String(raw?.accuracy ?? raw?.accuracy_pct ?? "");
  const mape     = String(raw?.mean_mape ?? raw?.mean_mape_pct ?? "");

  let arr: NationalPoint[] = [];

  // ── Handle { historical, forecast } shape (actual API) ──
  if (Array.isArray(raw?.historical) || Array.isArray(raw?.forecast)) {
    const histPoints: NationalPoint[] = (raw.historical ?? []).map((d: any) => ({
      date:       fmtMonthYear(String(d.month ?? ""), Number(d.year ?? 0)),
      year:       Number(d.year ?? 0),
      month:      String(d.month ?? ""),
      month_num:  Number(d.month_num ?? 0),
      actual:     d.total != null ? Number(d.total) : null,
      predicted:  null,
      lower:      null,
      upper:      null,
      pct_change: null,
      oil_shock:  false,
    }));

    const fcPoints: NationalPoint[] = (raw.forecast ?? []).map((d: any) => ({
      date:       fmtMonthYear(String(d.month ?? ""), Number(d.year ?? 0)),
      year:       Number(d.year ?? 0),
      month:      String(d.month ?? ""),
      month_num:  Number(d.month_num ?? 0),
      actual:     null,
      predicted:  d.predicted != null ? Number(d.predicted) : null,
      lower:      d.lower     != null ? Number(d.lower)     : null,
      upper:      d.upper     != null ? Number(d.upper)     : null,
      pct_change: null,
      oil_shock:  Boolean(d.oil_shock ?? false),
    }));

    arr = [...histPoints, ...fcPoints];
  } else {
    // Fallback: chartData / data / bare array shapes
    const fallbackArr: any[] = Array.isArray(raw)            ? raw
                             : Array.isArray(raw?.chartData) ? raw.chartData
                             : Array.isArray(raw?.data)      ? raw.data
                             : [];

    arr = fallbackArr.map((d: any) => ({
      date:       d.date ?? fmtMonthYear(String(d.month ?? ""), Number(d.year ?? 0)),
      year:       Number(d.year ?? 0),
      month:      String(d.month ?? ""),
      month_num:  Number(d.month_num ?? 0),
      actual:     d.actual    != null ? Number(d.actual)    : d.total     != null ? Number(d.total)    : null,
      predicted:  d.predicted != null ? Number(d.predicted) : d.forecast  != null ? Number(d.forecast) : null,
      lower:      d.lower     != null ? Number(d.lower)     : null,
      upper:      d.upper     != null ? Number(d.upper)     : null,
      pct_change: d.pct_change != null ? Number(d.pct_change) : null,
      oil_shock:  Boolean(d.oil_shock ?? false),
    }));
  }

  // ── Compute MoM % change ──
  for (let i = 1; i < arr.length; i++) {
    const prev = arr[i - 1].actual ?? arr[i - 1].predicted;
    const curr = arr[i].actual     ?? arr[i].predicted;
    if (prev != null && curr != null && prev !== 0) {
      arr[i].pct_change = +((curr - prev) / prev * 100).toFixed(1);
    }
  }

  // ── Flag oil shock month (Mar 2026) ──
  arr = arr.map(d =>
    d.month === "Mar" && d.year === 2026 ? { ...d, oil_shock: true } : d
  );

  return { points: arr, accuracy, mape };
}

/**
 * API returns: { historical: [{month_num, month, avg}], forecast: [{month_num, month, avg}] }
 */
function parseSeasonal(raw: any): { data: SeasonalRow[]; peak: string; trough: string } {
  // ── Handle { historical, forecast } shape (actual API) ──
  if (Array.isArray(raw?.historical) || Array.isArray(raw?.forecast)) {
    const histMap = new Map<number, number>();
    for (const d of (raw.historical ?? [])) {
      histMap.set(Number(d.month_num), Number(d.avg));
    }
    const fcMap = new Map<number, number>();
    for (const d of (raw.forecast ?? [])) {
      fcMap.set(Number(d.month_num), Number(d.avg));
    }

    // Build merged array keyed by month_num, using forecast array for month names
    const allMonths: any[] = Array.isArray(raw.forecast) ? raw.forecast : raw.historical ?? [];
    const data: SeasonalRow[] = allMonths.map((d: any) => {
      const mn       = Number(d.month_num);
      const hist_avg = histMap.get(mn) ?? null;
      const fc_avg   = fcMap.get(mn)   ?? null;
      const pct = hist_avg != null && fc_avg != null && hist_avg !== 0
        ? +((fc_avg - hist_avg) / hist_avg * 100).toFixed(1)
        : null;
      return {
        month:       String(d.month ?? ""),
        month_num:   mn,
        hist_avg,
        fc_avg,
        pct_change:  pct,
        insufficient: false,
      };
    }).sort((a, b) => a.month_num - b.month_num);

    const fcOnly    = data.filter(r => r.fc_avg != null);
    const peakRow   = fcOnly.length ? fcOnly.reduce((a, b) => a.fc_avg! > b.fc_avg! ? a : b) : null;
    const troughRow = fcOnly.length ? fcOnly.reduce((a, b) => a.fc_avg! < b.fc_avg! ? a : b) : null;

    return { data, peak: peakRow?.month ?? "Apr", trough: troughRow?.month ?? "Jul" };
  }

  // Fallback shapes
  const fallbackArr: any[] = Array.isArray(raw)           ? raw
                           : Array.isArray(raw?.seasonal) ? raw.seasonal
                           : Array.isArray(raw?.data)     ? raw.data
                           : [];

  const data: SeasonalRow[] = fallbackArr.map((d: any) => ({
    month:       String(d.month ?? ""),
    month_num:   Number(d.month_num ?? 0),
    hist_avg:    d.hist_avg    != null ? Number(d.hist_avg)    : d.historical_avg != null ? Number(d.historical_avg) : null,
    fc_avg:      d.fc_avg      != null ? Number(d.fc_avg)      : d.forecast_avg   != null ? Number(d.forecast_avg)   : null,
    pct_change:  d.pct_change  != null ? Number(d.pct_change)  : null,
    insufficient: Boolean(d.insufficient ?? false),
  }));

  const fcOnly    = data.filter(r => r.fc_avg != null);
  const peakRow   = fcOnly.length ? fcOnly.reduce((a, b) => a.fc_avg! > b.fc_avg! ? a : b) : null;
  const troughRow = fcOnly.length ? fcOnly.reduce((a, b) => a.fc_avg! < b.fc_avg! ? a : b) : null;

  return {
    data,
    peak:   String(raw?.peakMonth ?? raw?.peak_month ?? peakRow?.month   ?? "Apr"),
    trough: String(raw?.troughMonth ?? raw?.trough_month ?? troughRow?.month ?? "Jul"),
  };
}

/**
 * API returns: { scenarios: [{scenario, oil_change_pct, demand_change_pct, adjusted_M, diesel_php, ...}], baseline_M }
 */
function parseScenarios(raw: any): { rows: ScenarioRow[]; baseline_M: number } {
  const arr: any[] = Array.isArray(raw)            ? raw
                   : Array.isArray(raw?.scenarios) ? raw.scenarios
                   : Array.isArray(raw?.options)   ? raw.options
                   : Array.isArray(raw?.data)      ? raw.data
                   : [];

  const rows: ScenarioRow[] = arr.map((d: any) => {
    const key = String(d.scenario ?? d.key ?? d.label ?? "").toLowerCase();
    return {
      scenario:          key,
      label:             SCENARIO_LABEL_MAP[key] ?? String(d.label ?? d.name ?? key),
      oil_change_pct:    Number(d.oil_change_pct    ?? d.oil_pct     ?? 0),
      demand_change_pct: Number(d.demand_change_pct ?? d.demand_pct  ?? 0),
      adjusted_M:        Number(d.adjusted_M        ?? d.predicted_M ?? 0),
      diesel_php:        Number(d.diesel_php         ?? 0),
      color:             SCENARIO_COLOR_MAP[key]     ?? String(d.color ?? "#64748b"),
    };
  });

  const baselineRow = rows.find(r => r.scenario === "baseline");
  const baseline_M  = Number(raw?.baseline_M ?? baselineRow?.adjusted_M ?? 91.11);

  return { rows, baseline_M };
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────

function NationalTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as NationalPoint;
  return (
    <div style={S.tooltip}>
      <p style={{ color: "#0369a1", fontWeight: 700, marginBottom: 8, fontSize: 12 }}>{label}</p>
      {d.actual != null && (
        <p style={{ margin: "3px 0" }}>
          <span style={{ color: "#0369a1" }}>● Historical: </span>
          <b style={{ color: "#0c4a6e" }}>{fmtM(d.actual)}</b>
        </p>
      )}
      {d.predicted != null && (
        <p style={{ margin: "3px 0" }}>
          <span style={{ color: "#ea580c" }}>◆ Forecast: </span>
          <b style={{ color: "#0c4a6e" }}>{fmtM(d.predicted)}</b>
        </p>
      )}
      {d.upper != null && d.lower != null && (
        <p style={{ margin: "3px 0", color: "#0369a1", fontSize: 11 }}>
          Band: {fmtM(d.lower)} – {fmtM(d.upper)}
        </p>
      )}
      {d.pct_change != null && (
        <p style={{ margin: "6px 0 0", color: pctColor(d.pct_change), fontWeight: 700 }}>
          {d.pct_change > 0 ? "▲" : "▼"} {d.pct_change > 0 ? "+" : ""}{d.pct_change.toFixed(1)}% MoM
        </p>
      )}
      {d.oil_shock && (
        <p style={{ margin: "6px 0 0", color: "#dc2626", fontSize: 11 }}>⚠ Oil Shock Month</p>
      )}
    </div>
  );
}

// ── XAxis tick: only show label every 6 months to avoid crowding ──────────

function MonthYearTick({ x, y, payload, data }: any) {
  // Show Jan of each year + Jul of each year for readability
  const d = data?.find((p: NationalPoint) => p.date === payload?.value);
  if (!d) return null;
  const show = d.month_num === 1 || d.month_num === 7;
  if (!show) return null;
  return (
    <text x={x} y={y + 12} textAnchor="middle" fill="#0369a1" fontSize={10} fontWeight={600}>
      {payload.value}
    </text>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function PricePredictionGraph() {
  const [national,  setNational]  = useState<NationalPoint[]>([]);
  const [seasonal,  setSeasonal]  = useState<{ data: SeasonalRow[]; peak: string; trough: string } | null>(null);
  const [scenarios, setScenarios] = useState<{ rows: ScenarioRow[]; baseline_M: number } | null>(null);
  const [accuracy,  setAccuracy]  = useState("—");
  const [mape,      setMape]      = useState("—");
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [tab,       setTab]       = useState<"monthly" | "yearly" | "seasonal" | "scenarios">("monthly");

  useEffect(() => {
    Promise.all([
      fetch(API_NATIONAL).then(r  => { if (!r.ok) throw new Error(`/forecast/national — HTTP ${r.status}`);  return r.json(); }),
      fetch(API_SEASONAL).then(r  => { if (!r.ok) throw new Error(`/forecast/seasonal — HTTP ${r.status}`);  return r.json(); }),
      fetch(API_SCENARIOS).then(r => { if (!r.ok) throw new Error(`/scenario/all — HTTP ${r.status}`);       return r.json(); }),
    ])
    .then(([nat, sea, scen]) => {
      const { points, accuracy: acc, mape: mp } = parseNational(nat);
      if (!points.length) throw new Error("API returned 0 national data points");
      setNational(points);
      if (acc) setAccuracy(acc);
      if (mp)  setMape(mp);
      setSeasonal(parseSeasonal(sea));
      setScenarios(parseScenarios(scen));
      setLoading(false);
    })
    .catch(e => {
      console.error("Ferry API error:", e);
      setError(e.message);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div style={S.center}>
      <div style={S.spinner} />
      <p style={{ color: "#475569", fontFamily: "monospace", letterSpacing: 3, fontSize: 11 }}>LOADING MODEL DATA</p>
    </div>
  );

  if (error) return (
    <div style={{ ...S.center, flexDirection: "column", gap: 12 }}>
      <p style={{ color: "#ef4444", fontSize: 18 }}>⚠ Failed to load data</p>
      <p style={{ color: "#94a3b8", fontSize: 12, fontFamily: "monospace", maxWidth: 600, textAlign: "center" }}>{error}</p>
    </div>
  );

  // ── Yearly aggregation ──
  const yearlyMap = new Map<number, { hist: number; fc: number }>();
  for (const d of national) {
    if (!yearlyMap.has(d.year)) yearlyMap.set(d.year, { hist: 0, fc: 0 });
    const y = yearlyMap.get(d.year)!;
    if (d.actual    != null) y.hist += d.actual;
    if (d.predicted != null) y.fc   += d.predicted;
  }
  const yearlyData = Array.from(yearlyMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, v]) => ({
      year: String(year),
      historical: v.hist > 0 ? Math.round(v.hist) : null,
      forecast:   v.fc   > 0 ? Math.round(v.fc)   : null,
    }));

  const iranShockDate = "Mar 2026";

  return (
    <div style={S.shell}>

      {/* ── Header ── */}
      <div style={S.header}>
        <div>
          <p style={S.eyebrow}>MARINA · FERRY INTELLIGENCE SYSTEM v5</p>
          <h1 style={S.title}>Philippines Ferry Passenger Forecast</h1>
          <p style={S.subtitle}>XGBoost · 597 trees · 33 features · National + 27 PMOs</p>
        </div>
        <div style={S.kpiRow}>
          <KPI label="ACCURACY"      value={accuracy} color="#22c55e" />
          <KPI label="MEAN MAPE"     value={mape}     color="#fb923c" />
          <KPI label="2026 FORECAST" value="91.1M"    color="#60a5fa" />
          <KPI label="2027 FORECAST" value="93.5M"    color="#a78bfa" />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={S.tabBar}>
        {([
          ["monthly",   "📈 Monthly Trend"],
          ["yearly",    "📊 Yearly Total"],
          ["seasonal",  "🌊 Seasonal Shape"],
          ["scenarios", "⚡ Oil Scenarios"],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={S.tab(tab === key)}>{label}</button>
        ))}
      </div>

      {/* ════ MONTHLY TAB ════ */}
      {tab === "monthly" && (
        <div style={S.panel}>
          <SectionTitle
            title="National Monthly Passenger Volume (2016–2028)"
            sub="Blue = historical actuals · Orange dashed = model forecast · Band = ±23% MAPE"
          />
          <div style={S.shockBanner}>
            <span style={{ fontSize: 16 }}>🛢️</span>
            <p style={{ margin: 0, fontSize: 12, color: "#7f1d1d", lineHeight: 1.6 }}>
              <b>Iran Shock (Mar 2026)</b> — modelled as +36% Brent crude spike.
              MARINA approved 20% fare hike Mar 16 2026, validating the moderate scenario.
            </p>
          </div>

          <p style={S.chartMeta}>Month-over-Month Change (%)</p>
          <ResponsiveContainer width="100%" height={70}>
            <BarChart data={national.filter(d => d.pct_change != null)} barSize={4} margin={{ left: 10, right: 10 }}>
              <ReferenceLine y={0} stroke="#7dd3fc" />
              <Bar dataKey="pct_change" radius={[2, 2, 0, 0]}>
                {national.filter(d => d.pct_change != null).map((d, i) => (
                  <Cell key={i} fill={pctColor(d.pct_change)} />
                ))}
              </Bar>
              <Tooltip
                formatter={(v: any) => [`${Number(v) > 0 ? "+" : ""}${Number(v).toFixed(1)}%`, "MoM"]}
                contentStyle={S.tt}
                labelFormatter={(label) => label}
              />
            </BarChart>
          </ResponsiveContainer>

          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={national} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
              <defs>
                <linearGradient id="gHist" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="#fed7aa" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#fed7aa" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
              <XAxis
                dataKey="date"
                tick={<MonthYearTick data={national} />}
                interval={0}
                height={40}
                label={{ value: "Month / Year", position: "insideBottom", offset: -10, fill: "#0369a1", fontSize: 11 }}
              />
              <YAxis tickFormatter={fmtM} tick={{ fill: "#0369a1", fontSize: 10 }} />
              <Tooltip content={<NationalTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "#0369a1", fontWeight: 600 }} />
              <Area dataKey="upper" stroke="none" fill="url(#gBand)" name="±23% band" legendType="rect" connectNulls dot={false} />
              <Area dataKey="actual" name="Historical" stroke="#3b82f6" strokeWidth={2} fill="url(#gHist)" connectNulls dot={false} />
              <Line
                dataKey="predicted" name="Forecast"
                stroke="#fb923c" strokeWidth={2.5} strokeDasharray="6 3"
                connectNulls
                dot={(p: any) => p.payload?.oil_shock
                  ? <circle key={p.key} cx={p.cx} cy={p.cy} r={5} fill="#ef4444" stroke="#fff" strokeWidth={1.5} />
                  : <circle key={p.key} r={0} />
                }
              />
              <ReferenceLine
                x={iranShockDate} stroke="#ef4444" strokeDasharray="6 3" strokeWidth={1.5}
                label={{ value: "Iran shock ⚠", fill: "#ef4444", fontSize: 10, position: "insideTopRight" }}
              />
            </ComposedChart>
          </ResponsiveContainer>

          {/* ── Key date callouts ── */}
          <div style={S.dateCallouts}>
            {[
              { date: "Apr 2020", label: "COVID lockdown low", value: "217K", color: "#dc2626" },
              { date: "May 2022", label: "Post-COVID rebound", value: "5.9M",  color: "#0369a1" },
              { date: "May 2025", label: "2025 peak (latest)", value: "9.8M",  color: "#0369a1" },
              { date: "Apr 2026", label: "2026 forecast peak", value: "9.4M",  color: "#ea580c" },
            ].map(c => (
              <div key={c.date} style={{ ...S.dateChip, borderColor: c.color + "44" }}>
                <p style={{ fontSize: 10, color: "#64748b", margin: "0 0 2px", letterSpacing: 0.5 }}>{c.date}</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: c.color, margin: "0 0 2px" }}>{c.value}</p>
                <p style={{ fontSize: 10, color: "#0369a1", margin: 0 }}>{c.label}</p>
              </div>
            ))}
          </div>

          <p style={{ ...S.chartMeta, marginTop: 28 }}>Top Model Features (XGBoost Importance)</p>
          <div style={S.featureGrid}>
            {[
              { name: "Lag_2",             pct: 29, color: "#3b82f6" },
              { name: "Lag_6",             pct: 17, color: "#3b82f6" },
              { name: "Rolling3_mean",     pct: 10, color: "#3b82f6" },
              { name: "SameMonthLastYear", pct:  6, color: "#3b82f6" },
              { name: "IsSummerMonth",     pct:  5, color: "#3b82f6" },
              { name: "Brent_vs_trend",    pct:  2, color: "#ef4444" },
              { name: "Fuel_Diesel_Lag3",  pct:  1, color: "#fb923c" },
              { name: "Oil_Shock_Flag",    pct:  1, color: "#fb923c" },
            ].map(f => (
              <div key={f.name} style={S.featureRow}>
                <span style={{ ...S.featureDot, background: f.color }} />
                <span style={{ fontSize: 11, color: "#475569", flex: 1 }}>{f.name}</span>
                <div style={S.featureBarBg}>
                  <div style={{ ...S.featureBarFill, width: `${(f.pct / 29) * 100}%`, background: f.color }} />
                </div>
                <span style={{ fontSize: 11, color: f.color, width: 32, textAlign: "right" }}>{f.pct}%</span>
              </div>
            ))}
          </div>
          <p style={S.note}>🔴 Red = oil/Brent · 🟠 Orange = fuel pump prices · 🔵 Blue = passenger & time features</p>
        </div>
      )}

      {/* ════ YEARLY TAB ════ */}
      {tab === "yearly" && (
        <div style={S.panel}>
          <SectionTitle
            title="National Yearly Total Passengers (2016–2027)"
            sub="COVID trough 2020 (6.2M) → 2024 recovery (78.2M) → 2026 forecast (91.1M)"
          />
          <div style={S.yearCallouts}>
            {[
              { year: "2020", val: "6.2M",  label: "COVID trough",    color: "#dc2626" },
              { year: "2024", val: "78.2M", label: "Recovery peak",   color: "#0369a1" },
              { year: "2025", val: "84.4M", label: "Last historical", color: "#0369a1" },
              { year: "2026", val: "91.1M", label: "Forecast",        color: "#ea580c" },
              { year: "2027", val: "93.5M", label: "Forecast",        color: "#7c3aed" },
            ].map(c => (
              <div key={c.year} style={{ ...S.yearCard, borderColor: c.color + "33" }}>
                <p style={{ fontSize: 11, color: "#0c4a6e", margin: "0 0 4px", letterSpacing: 1, fontWeight: 700 }}>{c.year}</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: c.color, margin: "0 0 4px" }}>{c.val}</p>
                <p style={{ fontSize: 11, color: "#0369a1", margin: 0 }}>{c.label}</p>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={yearlyData} barCategoryGap="20%" margin={{ top: 5, right: 10, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: "#0369a1", fontSize: 11 }} />
              <YAxis tickFormatter={v => `${(v / 1_000_000).toFixed(0)}M`} tick={{ fill: "#0369a1", fontSize: 10 }} />
              <Tooltip formatter={(v: any, name: any) => [fmtM(Number(v)), name]} contentStyle={S.tt} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#0369a1", fontWeight: 600 }} />
              <Bar dataKey="historical" name="Historical" fill="#0369a1" opacity={0.85} radius={[4, 4, 0, 0]} />
              <Bar dataKey="forecast"   name="Forecast"   fill="#ea580c" opacity={0.85} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={S.insightGrid}>
            <InsightCard icon="📉" title="COVID Collapse"
              body="2020 saw a 71% YoY drop to just 6.2M passengers — the sharpest single-year decline in Philippine ferry history." />
            <InsightCard icon="🚀" title="Explosive Recovery"
              body="From the 2020 trough, ridership surged 13x by 2024 (78.2M), driven by pent-up demand and restored routes." />
            <InsightCard icon="📈" title="2026–2027 Outlook"
              body="The model forecasts 91.1M in 2026 (+7.9% YoY) and 93.5M in 2027 (+2.6%), assuming no severe oil shock." />
          </div>
        </div>
      )}

      {/* ════ SEASONAL TAB ════ */}
      {tab === "seasonal" && seasonal && (
        <div style={S.panel}>
          <SectionTitle
            title="Average Monthly Seasonal Pattern"
            sub="Historical avg (2016–2025 incl. COVID years) vs Forecast avg (2026–2027 post-recovery level)"
          />
          <div style={S.contextNote}>
            <span style={{ fontSize: 16 }}>ℹ️</span>
            <p style={{ margin: 0, fontSize: 12, color: "#1e3a5f", lineHeight: 1.7 }}>
              The historical average (blue) spans 2016–2025 including COVID years. The forecast (orange) reflects
              2026–2027 at the post-recovery level. The <b>seasonal shape</b> —
              peaks in {seasonal.peak}, trough in {seasonal.trough} — is what matters here.
            </p>
          </div>
          <div style={S.calloutRow}>
            <Callout icon="🏔️" label="PEAK MONTH"   value={seasonal.peak}   sub="Holy Week + summer surge" color="#15803d" />
            <Callout icon="🕳️" label="TROUGH MONTH" value={seasonal.trough} sub="Typhoon season low"       color="#dc2626" />
          </div>

          {/* ── Seasonal line chart ── */}
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={seasonal.data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
              <XAxis dataKey="month" tick={{ fill: "#0369a1", fontSize: 12, fontWeight: 600 }} />
              <YAxis tickFormatter={fmtM} tick={{ fill: "#0369a1", fontSize: 10 }} />
              <Tooltip
                formatter={(v: any, name: any) => [fmtM(Number(v)), name]}
                contentStyle={S.tt}
                labelStyle={{ color: "#0c4a6e", fontWeight: 700 }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "#0369a1", fontWeight: 600 }} />
              <Line
                dataKey="hist_avg" name="Avg Historical (2016–2025)"
                stroke="#0369a1" strokeWidth={2.5}
                dot={{ r: 5, fill: "#0369a1", stroke: "#fff", strokeWidth: 2 }}
                connectNulls
              />
              <Line
                dataKey="fc_avg" name="Avg Forecast (2026–2027)"
                stroke="#ea580c" strokeWidth={2.5}
                strokeDasharray="6 3"
                dot={{ r: 6, fill: "#ea580c", stroke: "#fff", strokeWidth: 2 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>

          {/* ── Month-by-month comparison table ── */}
          <p style={{ ...S.chartMeta, marginTop: 28 }}>Monthly Breakdown: Historical vs Forecast Average</p>
          <div style={S.seasonTable}>
            {/* Header */}
            <div style={{ ...S.seasonRow, background: "#0369a1", borderRadius: "8px 8px 0 0" }}>
              <span style={{ ...S.seasonCell, color: "#fff", fontWeight: 700 }}>Month</span>
              <span style={{ ...S.seasonCell, color: "#bfdbfe", fontWeight: 700 }}>Hist Avg</span>
              <span style={{ ...S.seasonCell, color: "#fed7aa", fontWeight: 700 }}>Fcst Avg</span>
              <span style={{ ...S.seasonCell, color: "#fff", fontWeight: 700 }}>YoY Δ</span>
            </div>
            {seasonal.data.map((row, i) => (
              <div key={row.month} style={{
                ...S.seasonRow,
                background: i % 2 === 0 ? "#f0f9ff" : "#ffffff",
                borderRadius: i === seasonal.data.length - 1 ? "0 0 8px 8px" : undefined,
              }}>
                <span style={{ ...S.seasonCell, fontWeight: 700, color: "#0c4a6e" }}>{row.month}</span>
                <span style={{ ...S.seasonCell, color: "#0369a1" }}>
                  {row.hist_avg != null ? fmtM(row.hist_avg) : "—"}
                </span>
                <span style={{ ...S.seasonCell, color: "#ea580c", fontWeight: 700 }}>
                  {row.fc_avg != null ? fmtM(row.fc_avg) : "—"}
                </span>
                <span style={{ ...S.seasonCell, color: pctColor(row.pct_change), fontWeight: 700 }}>
                  {row.pct_change != null
                    ? `${row.pct_change > 0 ? "▲+" : "▼"}${row.pct_change.toFixed(1)}%`
                    : "—"}
                </span>
              </div>
            ))}
          </div>

          {/* ── Shape cards ── */}
          <p style={{ ...S.chartMeta, marginTop: 28 }}>Forecast Month vs Annual Forecast Average (Seasonal Shape)</p>
          <div style={S.monthGrid}>
            {seasonal.data.map(row => {
              const fcVals   = seasonal.data.filter(r => r.fc_avg != null).map(r => r.fc_avg as number);
              const fcAnnAvg = fcVals.length > 0 ? fcVals.reduce((a, b) => a + b, 0) / fcVals.length : 1;
              const shapePct = row.fc_avg != null ? +((row.fc_avg - fcAnnAvg) / fcAnnAvg * 100).toFixed(1) : null;
              return (
                <div key={row.month} style={{ ...S.monthCard, background: pctBg(shapePct) }}>
                  <p style={S.monthName}>{row.month}</p>
                  {row.fc_avg != null
                    ? <p style={{ ...S.monthVal, color: "#ea580c" }}>{fmtM(row.fc_avg)}</p>
                    : <p style={{ ...S.monthVal, color: "#cbd5e1" }}>—</p>
                  }
                  <p style={{ ...S.monthPct, color: pctColor(shapePct) }}>
                    {shapePct != null ? `${shapePct > 0 ? "▲+" : "▼"}${shapePct}%` : "—"}
                  </p>
                </div>
              );
            })}
          </div>
          <p style={S.note}>% vs forecast annual average — shows seasonal shape relative to the yearly mean.</p>

          <div style={S.insightGrid}>
            <InsightCard icon="🌞" title={`${seasonal.peak} Peak`}
              body={`${seasonal.peak} is the model's peak month (${seasonal.data.find(r => r.month === seasonal.peak)?.fc_avg != null ? fmtM(seasonal.data.find(r => r.month === seasonal.peak)!.fc_avg!) : "—"} avg), driven by Holy Week — the largest inter-island passenger event in the Philippines.`} />
            <InsightCard icon="🌧️" title={`${seasonal.trough} Trough`}
              body={`${seasonal.trough} is the forecasted trough (${seasonal.data.find(r => r.month === seasonal.trough)?.fc_avg != null ? fmtM(seasonal.data.find(r => r.month === seasonal.trough)!.fc_avg!) : "—"} avg), correlating with typhoon season onset.`} />
            <InsightCard icon="🎄" title="December Rebound"
              body={`December shows a strong recovery at ${seasonal.data.find(r => r.month === "Dec")?.fc_avg != null ? fmtM(seasonal.data.find(r => r.month === "Dec")!.fc_avg!) : "—"} avg, as Balikbayan and holiday travel drives an end-of-year surge.`} />
          </div>
        </div>
      )}

      {/* ════ SCENARIOS TAB ════ */}
      {tab === "scenarios" && scenarios && (
        <div style={S.panel}>
          <SectionTitle
            title="Oil Price Shock Scenarios — 2026 Impact"
            sub={`Elasticity = −0.025 per 10% diesel rise · Current diesel ₱${scenarios.rows.find(r => r.scenario === "baseline")?.diesel_php ?? 60}/L · Baseline 2026 = ${scenarios.baseline_M}M passengers`}
          />
          <div style={S.shockBanner}>
            <span style={{ fontSize: 16 }}>🌍</span>
            <p style={{ margin: 0, fontSize: 12, color: "#7f1d1d", lineHeight: 1.7 }}>
              <b>Active scenario: Iran/Hormuz Shock (+36% Brent)</b> — MARINA's Mar 16 2026 fare hike of 20%
              directly validates the moderate (+35%) scenario.
            </p>
          </div>
          <div style={S.scenarioGrid}>
            {scenarios.rows.map(s => {
              const isBaseline = s.scenario === "baseline";
              const diffM = +(s.adjusted_M - scenarios.baseline_M).toFixed(2);
              return (
                <div key={s.scenario} style={{ ...S.scenCard, borderColor: s.color + "66", borderWidth: 2 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: s.color, margin: 0 }}>{s.label}</p>
                    {!isBaseline && (
                      <span style={{ ...S.pill, background: s.color + "22", color: s.color }}>
                        +{s.oil_change_pct}% oil
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 30, fontWeight: 800, color: "#0c4a6e", margin: "0 0 6px", fontVariantNumeric: "tabular-nums" }}>
                    {s.adjusted_M}M
                  </p>
                  <p style={{ fontSize: 13, color: s.demand_change_pct < 0 ? "#dc2626" : "#15803d", fontWeight: 700, margin: "0 0 10px" }}>
                    {s.demand_change_pct < 0 ? "▼" : "▲"} {s.demand_change_pct > 0 ? "+" : ""}{s.demand_change_pct}% demand
                    {!isBaseline && ` (${diffM > 0 ? "+" : ""}${diffM}M pax)`}
                  </p>
                  <div style={{ background: "#e0f2fe", borderRadius: 8, padding: "10px 12px" }}>
                    <p style={{ fontSize: 11, color: "#0369a1", margin: "0 0 2px", fontWeight: 600 }}>Diesel pump price</p>
                    <p style={{ fontSize: 16, fontWeight: 800, color: "#0c4a6e", margin: 0 }}>
                      ₱{s.diesel_php.toLocaleString()}/L
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ ...S.chartMeta, marginTop: 16 }}>Projected 2026 Annual Passengers by Scenario</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={scenarios.rows} layout="vertical" barSize={28} margin={{ left: 80, right: 40, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" horizontal={false} />
              <XAxis type="number" domain={[70, 95]} tickFormatter={v => `${v}M`} tick={{ fill: "#0369a1", fontSize: 10 }} />
              <YAxis dataKey="scenario" type="category" width={100}
                tickFormatter={k => scenarios.rows.find(r => r.scenario === k)?.label ?? k}
                tick={{ fill: "#0369a1", fontSize: 11, fontWeight: 600 }}
              />
              <Tooltip formatter={(v: any) => [`${v}M passengers`, "Projected"]} contentStyle={S.tt} />
              <ReferenceLine x={scenarios.baseline_M} stroke="#0369a1" strokeDasharray="4 3"
                label={{ value: `Baseline ${scenarios.baseline_M}M`, fill: "#0369a1", fontSize: 10, position: "insideTopRight" }}
              />
              <Bar dataKey="adjusted_M" radius={[0, 6, 6, 0]}>
                {scenarios.rows.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={S.insightGrid}>
            <InsightCard icon="⛽" title="Elasticity Model"
              body="Each 10% diesel rise reduces demand by 2.5%. Oil features (Brent_vs_trend, Fuel_Diesel_Lag3) contribute ~4% of model importance." />
            <InsightCard icon="🚢" title="Severe Scenario"
              body={`A Strait of Hormuz closure (+60% diesel, ₱${scenarios.rows.find(r => r.scenario === "severe")?.diesel_php ?? 95}/L) would reduce 2026 ridership to ${scenarios.rows.find(r => r.scenario === "severe")?.adjusted_M ?? 77.45}M.`} />
            <InsightCard icon="📋" title="Policy Response"
              body="MARINA's 20% fare hike on Mar 16 2026 validates the moderate scenario. Fare subsidies could buffer demand loss on essential routes." />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: "left" }}>
      <p style={{ fontSize: 9, color: "#e0f2fe", letterSpacing: 1.5, margin: "0 0 3px", fontWeight: 600 }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 800, color: "#ffffff", margin: 0, fontVariantNumeric: "tabular-nums" }}>{value}</p>
    </div>
  );
}

function SectionTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0c4a6e", margin: "0 0 4px" }}>{title}</h2>
      <p style={{ fontSize: 11, color: "#0369a1", margin: 0, lineHeight: 1.5 }}>{sub}</p>
    </div>
  );
}

function InsightCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div style={S.insightCard}>
      <p style={{ fontSize: 18, margin: "0 0 8px" }}>{icon}</p>
      <p style={{ fontSize: 13, fontWeight: 800, color: "#0c4a6e", margin: "0 0 6px" }}>{title}</p>
      <p style={{ fontSize: 11, color: "#0369a1", margin: 0, lineHeight: 1.5 }}>{body}</p>
    </div>
  );
}

function Callout({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ ...S.calloutCard, borderColor: color + "33", border: `1px solid ${color}33` }}>
      <span style={{ fontSize: 24 }}>{icon}</span>
      <div style={{ width: "100%" }}>
        <p style={{ fontSize: 9, color: "#0c4a6e", letterSpacing: 1.5, margin: "0 0 3px", fontWeight: 700 }}>{label}</p>
        <p style={{ fontSize: 16, fontWeight: 800, color, margin: "0 0 3px" }}>{value}</p>
        <p style={{ fontSize: 11, color: "#0369a1", margin: 0 }}>{sub}</p>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const S = {
  shell: {
    fontFamily: "'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', sans-serif",
    background: "linear-gradient(135deg, #f0f5ff 0%, #e8f1ff 100%)",
    minHeight: "100vh", 
    padding: "16px 12px", 
    "@media (min-width: 768px)": { padding: "28px 24px" },
    color: "#0c4a6e",
    overflowX: "hidden" as const,
  } as React.CSSProperties,
  center: {
    display: "flex", flexDirection: "column" as const,
    alignItems: "center", justifyContent: "center", height: "60vh", gap: 16,
  } as React.CSSProperties,
  spinner: {
    width: 40, height: 40, borderRadius: "50%",
    border: "3px solid #dbeafe", borderTop: "3px solid #0369a1",
    animation: "spin 0.9s linear infinite",
  } as React.CSSProperties,
  header: {
    display: "flex", 
    flexDirection: "column" as const,
    justifyContent: "space-between", 
    alignItems: "flex-start",
    marginBottom: 20, 
    gap: 16,
    background: "linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)",
    padding: "20px 16px", 
    borderRadius: "16px",
    boxShadow: "0 10px 40px rgba(6, 105, 161, 0.15)",
  } as React.CSSProperties,
  eyebrow:  { fontSize: 9, letterSpacing: 2, color: "#e0f2fe", fontWeight: 700, margin: "0 0 6px" } as React.CSSProperties,
  title:    { fontSize: 20, fontWeight: 800, margin: "0 0 6px", color: "#ffffff", letterSpacing: -0.5 } as React.CSSProperties,
  subtitle: { fontSize: 11, color: "#cffafe", margin: 0 } as React.CSSProperties,
  kpiRow:   { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, width: "100%" } as React.CSSProperties,
  tabBar:   { display: "flex", gap: 6, marginBottom: 16, borderBottom: "1px solid #bfdbfe", paddingBottom: 10, overflowX: "auto" as const, scrollBehavior: "smooth" as const } as React.CSSProperties,
  tab: (active: boolean) => ({
    background: active ? "#0369a1" : "#ffffff", 
    border: "none",
    color: active ? "#ffffff" : "#0c4a6e", 
    fontWeight: 700, 
    fontSize: "11px",
    padding: "8px 12px", 
    cursor: "pointer", 
    borderRadius: "8px",
    fontFamily: "inherit",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
    boxShadow: active ? "0 4px 12px rgba(6,105,161,0.25)" : "0 2px 4px rgba(0,0,0,0.05)",
    transition: "all 0.3s ease",
  } as React.CSSProperties),
  panel: {
    background: "#ffffff", 
    borderRadius: "16px", 
    padding: "16px 12px", 
    border: "1px solid #bfdbfe", 
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  } as React.CSSProperties,
  shockBanner: {
    display: "flex", gap: 10, alignItems: "flex-start",
    background: "#fee2e2", border: "1px solid #fca5a5",
    borderRadius: 12, padding: "12px", marginBottom: 16,
    fontSize: "13px",
  } as React.CSSProperties,
  contextNote: {
    display: "flex", gap: 10, alignItems: "flex-start",
    background: "#dbeafe", border: "1px solid #93c5fd",
    borderRadius: 12, padding: "12px", marginBottom: 16,
    fontSize: "13px",
  } as React.CSSProperties,
  chartMeta:   { fontSize: 11, color: "#0c4a6e", margin: "0 0 10px", fontWeight: 700 } as React.CSSProperties,
  note:        { fontSize: 11, color: "#64748b", textAlign: "center" as const, margin: "10px 0 16px", fontWeight: 500 } as React.CSSProperties,
  dateCallouts:{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, marginTop: 16 } as React.CSSProperties,
  dateChip: {
    background: "#f0f9ff", borderRadius: 10,
    padding: "10px 8px", border: "1px solid #bfdbfe", textAlign: "center" as const,
  } as React.CSSProperties,
  yearCallouts:{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, marginBottom: 16 } as React.CSSProperties,
  yearCard: {
    background: "#f0f9ff", borderRadius: 12,
    padding: "12px", border: "1px solid #bfdbfe", textAlign: "center" as const,
  } as React.CSSProperties,
  insightGrid: {
    display: "grid", 
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", 
    gap: 12, 
    marginTop: 16,
  } as React.CSSProperties,
  insightCard: { background: "#f0f9ff", borderRadius: 12, padding: "12px", border: "1px solid #bfdbfe" } as React.CSSProperties,
  calloutRow:  { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 } as React.CSSProperties,
  calloutCard: {
    display: "flex", 
    flexDirection: "column" as const,
    gap: 10, 
    alignItems: "flex-start", 
    background: "#f0f9ff",
    borderRadius: 12, 
    padding: "12px", 
    border: "1px solid #bfdbfe", 
  } as React.CSSProperties,
  // ── Seasonal table ──
  seasonTable: { border: "1px solid #bfdbfe", borderRadius: 10, overflow: "hidden", marginBottom: 8, overflowX: "auto" as const } as React.CSSProperties,
  seasonRow:   { display: "grid", gridTemplateColumns: "minmax(60px, 1fr) minmax(80px, 1.2fr) minmax(80px, 1.2fr) minmax(70px, 1fr)", padding: "8px 12px", borderBottom: "1px solid #e0f2fe", minWidth: "100%" } as React.CSSProperties,
  seasonCell:  { fontSize: 11, color: "#0c4a6e" } as React.CSSProperties,
  // ── Month shape cards ──
  monthGrid:   { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(70px, 1fr))", gap: 8, marginTop: 10 } as React.CSSProperties,
  monthCard:   { borderRadius: 8, padding: "8px 4px", textAlign: "center" as const, border: "1px solid #bfdbfe" } as React.CSSProperties,
  monthName:   { fontSize: 10, color: "#0c4a6e", fontWeight: 700, margin: "0 0 3px" } as React.CSSProperties,
  monthVal:    { fontSize: 12, fontWeight: 800, margin: "0 0 2px" } as React.CSSProperties,
  monthPct:    { fontSize: 10, fontWeight: 700, margin: 0 } as React.CSSProperties,
  // ── Scenarios ──
  scenarioGrid:{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 } as React.CSSProperties,
  scenCard:    { background: "#f0f9ff", borderRadius: 12, padding: "14px", border: "1px solid #bfdbfe" } as React.CSSProperties,
  pill:        { fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "4px 10px" } as React.CSSProperties,
  // ── Feature importance ──
  featureGrid: { display: "flex", flexDirection: "column" as const, gap: 8, marginTop: 10 } as React.CSSProperties,
  featureRow:  {
    display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
    background: "#f0f9ff", borderRadius: 8, border: "1px solid #bfdbfe",
    fontSize: "12px",
  } as React.CSSProperties,
  featureDot:    { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 } as React.CSSProperties,
  featureBarBg:  { flex: 1, height: 5, background: "#e0f2fe", borderRadius: 3, overflow: "hidden", minWidth: "40px" } as React.CSSProperties,
  featureBarFill:{ height: "100%", borderRadius: 3, transition: "width 0.3s" } as React.CSSProperties,
  tooltip: {
    background: "#ffffff", border: "1px solid #bfdbfe", borderRadius: 12,
    padding: "10px 12px", fontSize: 11, color: "#0c4a6e",
    boxShadow: "0 10px 30px rgba(6, 105, 161, 0.12)",
    maxWidth: "200px",
  } as React.CSSProperties,
  tt: {
    background: "#ffffff", border: "1px solid #bfdbfe", borderRadius: 12, fontSize: 10, color: "#0c4a6e",
    maxWidth: "180px",
  } as React.CSSProperties,
};

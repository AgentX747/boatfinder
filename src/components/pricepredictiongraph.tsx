import { useEffect, useState, useCallback } from "react";

// ─── API endpoints ────────────────────────────────────────────────────────────
const API_N  = "https://ferryai.onrender.com/forecast/national";
const API_S  = "https://ferryai.onrender.com/forecast/seasonal";
const API_SC = "https://ferryai.onrender.com/scenario/all";
const API_AI = "https://api.anthropic.com/v1/messages";

// ─── Constants ────────────────────────────────────────────────────────────────
const SCENARIO_COLOR: Record<string, string> = {
  baseline: "#378ADD",
  mild:     "#BA7517",
  moderate: "#D85A30",
  severe:   "#E24B4A",
};
const SCENARIO_LABEL: Record<string, string> = {
  baseline: "Baseline",
  mild:     "Mild (+15% oil)",
  moderate: "Moderate (+35% oil)",
  severe:   "Severe (+60% oil)",
};

const BLUE = {
  50:  "#E6F1FB",
  100: "#B5D4F4",
  200: "#85B7EB",
  400: "#378ADD",
  600: "#185FA5",
  800: "#0C447C",
  900: "#042C53",
};

const GREEN = { bg: "#EAF3DE", txt: "#27500A" };
const RED   = { bg: "#FCEBEB", txt: "#791F1F" };
const AMBER = { bg: "#FAEEDA", txt: "#633806" };

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "monthly" | "yearly" | "seasonal" | "scenarios";

type DataPoint = {
  year: number;
  mn: number;
  month: string;
  val: number;
  isFc: boolean;
  oil_shock?: boolean;
  mom?: number | null;
};

type ScenRow = {
  scenario: string;
  demand_change_pct: number;
  diesel_php: number;
  adjusted_M: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v: number | null, d = 1): string {
  if (v == null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(d)}%`;
}

function pillStyle(v: number | null): React.CSSProperties {
  const base: React.CSSProperties = {
    fontSize: 11, fontWeight: 500, padding: "3px 9px",
    borderRadius: 99, minWidth: 60, textAlign: "center",
    whiteSpace: "nowrap", display: "inline-block",
  };
  if (v == null) return { ...base, background: BLUE[50],   color: BLUE[800] };
  if (v > 0)     return { ...base, background: GREEN.bg,   color: GREEN.txt };
  return           { ...base, background: RED.bg,     color: RED.txt };
}

function shapeColor(v: number | null): string {
  return v == null ? BLUE[600] : v > 0 ? GREEN.txt : RED.txt;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function BarTrack({ pct, color, width = 90 }: { pct: number; color: string; width?: number }) {
  return (
    <div style={{ width, height: 3, background: BLUE[50], borderRadius: 99, overflow: "hidden", flexShrink: 0 }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: color, borderRadius: 99 }} />
    </div>
  );
}

function KPI({ label, value, sub, valueColor }: { label: string; value: string; sub: string; valueColor?: string }) {
  return (
    <div style={{ background: BLUE[50], borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ fontSize: 10, color: BLUE[600], textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontWeight: 500 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 500, color: valueColor ?? BLUE[900], marginBottom: 3 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: BLUE[600] }}>{sub}</div>
    </div>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#fff", border: `0.5px solid ${BLUE[100]}`,
      borderRadius: 14, padding: "1.1rem 1.25rem", marginBottom: 12,
    }}>
      <div style={{ fontSize: 10, color: BLUE[600], textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, fontWeight: 500 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Alert({ text, warn }: { text: string; warn?: boolean }) {
  return (
    <div style={{
      padding: "11px 14px", borderRadius: 10, fontSize: 12, lineHeight: 1.65, marginBottom: 12,
      background: warn ? AMBER.bg : BLUE[50],
      border:     `0.5px solid ${warn ? "#EF9F27" : BLUE[200]}`,
      color:      warn ? AMBER.txt : BLUE[800],
    }}>
      {text}
    </div>
  );
}

function ColHeader({ cols }: { cols: { label: string; align?: "left" | "right" | "center"; width?: number; flex?: number }[] }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottom: `0.5px solid ${BLUE[100]}`, marginBottom: 4 }}>
      {cols.map((c, i) => (
        <span key={i} style={{
          fontSize: 10, color: BLUE[600], fontWeight: 500,
          textTransform: "uppercase", letterSpacing: "0.07em",
          minWidth: c.width, textAlign: c.align ?? "left",
          flex: c.flex != null ? c.flex : i === 1 ? 1 : "none",
          paddingLeft: i > 0 ? 8 : 0,
        }}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

const ROW: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "10px 0", borderBottom: `0.5px solid ${BLUE[50]}`,
};

// ─── AI Insight Panel ─────────────────────────────────────────────────────────
function AiInsightPanel({ prompt, cacheKey }: { prompt: string; cacheKey: string }) {
  const [text, setText]       = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState<string | null>(null);
  const [open, setOpen]       = useState(false);

  const load = useCallback(async () => {
    if (text || loading) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(API_AI, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const raw = await res.json();
      const out = (raw.content ?? []).map((b: any) => b.text ?? "").join("").trim();
      setText(out);
    } catch (e: any) {
      setErr(e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [prompt, text, loading]);

  const toggle = () => {
    if (!open) load();
    setOpen(o => !o);
  };

  return (
    <div style={{
      border: `0.5px solid ${BLUE[200]}`,
      borderRadius: 12,
      marginBottom: 12,
      overflow: "hidden",
      background: "#fff",
    }}>
      {/* Header / toggle */}
      <button
        onClick={toggle}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px", background: "none", border: "none",
          cursor: "pointer", fontFamily: "inherit",
        }}
      >
        <div style={{
          width: 8, height: 8, borderRadius: "50%", background: BLUE[400], flexShrink: 0,
          animation: loading ? "pulse 1.5s infinite" : "none",
        }} />
        <div style={{ fontSize: 11, fontWeight: 500, color: BLUE[600], textTransform: "uppercase", letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>
          Claude AI · forecast insight
        </div>
        <div style={{ fontSize: 12, color: BLUE[400] }}>
          {open ? "▲ hide" : "▼ show analysis"}
        </div>
      </button>

      {/* Body */}
      {open && (
        <div style={{ padding: "0 16px 14px" }}>
          {loading && (
            <div style={{ display: "flex", gap: 6, alignItems: "center", height: 40 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: "50%", background: BLUE[400],
                  animation: `bounce 1.2s ${i * 0.2}s infinite`,
                }} />
              ))}
              <span style={{ fontSize: 12, color: BLUE[600], marginLeft: 4 }}>Analysing…</span>
            </div>
          )}
          {err && <div style={{ fontSize: 12, color: RED.txt }}>{err}</div>}
          {!loading && text && (
            <div style={{ fontSize: 13, lineHeight: 1.75, color: BLUE[900], whiteSpace: "pre-line" }}>
              {text}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-5px);opacity:1} }
      `}</style>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function FerryForecastDashboard() {
  const [tab,   setTab]   = useState<Tab>("monthly");
  const [data,  setData]  = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(API_N ).then(r => { if (!r.ok) throw new Error(`national HTTP ${r.status}`);  return r.json(); }),
      fetch(API_S ).then(r => { if (!r.ok) throw new Error(`seasonal HTTP ${r.status}`);  return r.json(); }),
      fetch(API_SC).then(r => { if (!r.ok) throw new Error(`scenarios HTTP ${r.status}`); return r.json(); }),
    ])
      .then(([nat, sea, scen]) => setData({ nat, sea, scen }))
      .catch(e => setError(e.message));
  }, []);

  if (error) return (
    <div style={{ padding: "2rem", color: RED.txt, fontSize: 13 }}>
      Failed to load: {error}
    </div>
  );
  if (!data) return (
    <div style={{ padding: "2rem", color: BLUE[600], fontSize: 13 }}>
      Loading forecast data…
    </div>
  );

  // ── Data processing ──────────────────────────────────────────────────────
  const { nat, sea, scen } = data;
  const mape = String(nat?.mean_mape ?? nat?.mean_mape_pct ?? "—");

  const hist: DataPoint[] = (nat?.historical ?? []).map((d: any) => ({
    year: +d.year, mn: +d.month_num, month: String(d.month), val: +d.total, isFc: false,
  }));
  const fcRaw: DataPoint[] = (nat?.forecast ?? []).map((d: any) => ({
    year: +d.year, mn: +d.month_num, month: String(d.month), val: +d.predicted,
    isFc: true, oil_shock: !!d.oil_shock,
  }));
  const all: DataPoint[] = [...hist, ...fcRaw].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.mn - b.mn
  );
  for (let i = 1; i < all.length; i++) {
    const p = all[i - 1].val, c = all[i].val;
    all[i].mom = p ? (c - p) / p * 100 : null;
  }

  const peak     = Math.max(...all.map(d => d.val), 1);
  const fcOnly   = all.filter(d => d.isFc);
  const maxFcVal = Math.max(...fcOnly.map(d => d.val), 1);
  const shockPt  = fcOnly.find(d => d.oil_shock);

  // Yearly
  const yearMap: Record<number, { h: number; f: number; isFc: boolean }> = {};
  all.forEach(d => {
    yearMap[d.year] = yearMap[d.year] || { h: 0, f: 0, isFc: false };
    if (d.isFc) { yearMap[d.year].f += d.val; yearMap[d.year].isFc = true; }
    else          yearMap[d.year].h += d.val;
  });
  const years    = Object.keys(yearMap).map(Number).sort();
  const yData    = years.map((y, i) => {
    const cur  = yearMap[y].h || yearMap[y].f;
    const prev = i > 0 ? (yearMap[years[i - 1]].h || yearMap[years[i - 1]].f) : null;
    return { year: y, total: cur, yoy: prev ? (cur - prev) / prev * 100 : null, isFc: yearMap[y].isFc };
  });
  const yFiltered = yData.filter(y => y.yoy != null);
  const maxYoy    = Math.max(...yFiltered.map(y => Math.abs(y.yoy!)), 1);
  const y26       = yData.find(y => y.year === 2026);
  const y27       = yData.find(y => y.year === 2027);

  // Seasonal
  const hm: Record<number, { month: string; avg: number }> = {};
  const fm: Record<number, { month: string; avg: number }> = {};
  (sea?.historical ?? []).forEach((d: any) => hm[+d.month_num] = { month: d.month, avg: +d.avg });
  (sea?.forecast   ?? []).forEach((d: any) => fm[+d.month_num] = { month: d.month, avg: +d.avg });
  const mns      = [...new Set([...Object.keys(hm), ...Object.keys(fm)].map(Number))].sort((a, b) => a - b);
  const fcAvgs   = mns.map(mn => fm[mn]?.avg).filter(Boolean) as number[];
  const fcMean   = fcAvgs.length ? fcAvgs.reduce((a, b) => a + b, 0) / fcAvgs.length : 1;
  const peakMn   = mns.reduce((best, mn) => (fm[mn]?.avg || 0) > (fm[best]?.avg || 0) ? mn : best, mns[0]);
  const troughMn = mns.reduce((best, mn) => (fm[mn]?.avg ?? 999) < (fm[best]?.avg ?? 999) ? mn : best, mns[0]);
  const maxSeaPct = Math.max(...mns.map(mn => {
    const h = hm[mn]?.avg, f = fm[mn]?.avg;
    return h && f ? Math.abs((f - h) / h * 100) : 0;
  }), 1);

  // Scenarios
  const scenArr: ScenRow[] = Array.isArray(scen)
    ? scen
    : Array.isArray(scen?.scenarios) ? scen.scenarios : [];
  const baselineM = scen?.baseline_M || 0;
  const modRow    = scenArr.find(s => s.scenario === "moderate");

  // ── AI prompts ────────────────────────────────────────────────────────────
  const monthlyAiPrompt = (() => {
    const monthStr = fcOnly.slice(0, 12)
      .map(d => `${d.month} ${d.year}: MoM=${d.mom != null ? d.mom.toFixed(1) + "%" : "—"}${d.oil_shock ? " [OIL SHOCK]" : ""}`)
      .join(", ");
    return `You are a maritime transport analyst for the Philippines. Here is the monthly ferry passenger forecast for the next 12 months: ${monthStr}. Context: MARINA approved a 20% fare hike effective March 16 2026 due to an Iran/Hormuz oil shock (+36% Brent).

Write 2 short paragraphs (plain text, no markdown, no bullet points) as an analyst commentary on:
1. The standout monthly movements — which months surge or dip and why (mention oil shock, holidays, seasonal patterns).
2. Practical advice for Filipino ferry passengers on when to book and what to expect on fares.
Be specific: name months and percentages. Keep it concise and sharp.`;
  })();

  const yearlyAiPrompt = (() => {
    const yearStr = yFiltered
      .map(y => `${y.year}${y.isFc ? " (fc)" : ""}: YoY=${y.yoy != null ? (y.yoy >= 0 ? "+" : "") + y.yoy.toFixed(1) + "%" : "—"}`)
      .join(", ");
    return `You are a maritime transport analyst for the Philippines. Here is the year-over-year ferry passenger growth data: ${yearStr}. Context: MARINA approved a 20% fare hike effective March 16 2026 due to an Iran/Hormuz oil shock (+36% Brent).

Write 2 short paragraphs (plain text, no markdown, no bullet points) as analyst commentary on:
1. The long-run growth trend — what's driving growth or contraction across years, and how the oil shock affects the 2026 forecast.
2. The 2027 outlook and what it signals about the Philippine maritime sector's recovery or expansion.
Be specific: cite the actual percentages. Keep it concise and sharp.`;
  })();

  // ── Tab definitions ──────────────────────────────────────────────────────
  const TABS: { key: Tab; label: string }[] = [
    { key: "monthly",   label: "Monthly"   },
    { key: "yearly",    label: "Yearly"    },
    { key: "seasonal",  label: "Seasonal"  },
    { key: "scenarios", label: "Scenarios" },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: "1.5rem 0", maxWidth: 680, color: BLUE[900],
    }}>

      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ fontSize: 10, color: BLUE[600], marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>
          MARINA · Ferry Intelligence System v5
        </div>
        <div style={{ fontSize: 22, fontWeight: 500, marginBottom: 4, color: BLUE[900] }}>
          Ferry passenger forecast
        </div>
        <div style={{ fontSize: 12, color: BLUE[400] }}>
          XGBoost · 597 trees · 33 features · national coverage
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: "1.25rem" }}>
        <KPI
          label="Mean MAPE"
          value={mape !== "—" ? `${mape}%` : "—"}
          sub="avg prediction error"
        />
        <KPI
          label="2026 forecast"
          value={y26?.yoy != null ? fmt(y26.yoy) : "—"}
          sub="YoY vs 2025"
          valueColor={y26?.yoy != null ? (y26.yoy > 0 ? GREEN.txt : RED.txt) : undefined}
        />
        <KPI
          label="2027 forecast"
          value={y27?.yoy != null ? fmt(y27.yoy) : "—"}
          sub="YoY vs 2026"
          valueColor={y27?.yoy != null ? (y27.yoy > 0 ? GREEN.txt : RED.txt) : undefined}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: "1.25rem", borderBottom: `0.5px solid ${BLUE[100]}`, paddingBottom: 12, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              fontSize: 12, fontWeight: 500, padding: "7px 15px", borderRadius: 8,
              border: `0.5px solid ${tab === t.key ? BLUE[600] : BLUE[100]}`,
              background: tab === t.key ? BLUE[600] : "transparent",
              color:      tab === t.key ? "#fff"    : BLUE[600],
              cursor: "pointer", transition: "all .15s",
              fontFamily: "inherit",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── MONTHLY ── */}
      {tab === "monthly" && (
        <>
          {shockPt && (
            <Alert warn text={`Oil shock: ${shockPt.month} ${shockPt.year} — Iran/Hormuz modelled as +36% Brent spike. MARINA approved 20% fare hike Mar 16 2026.`} />
          )}

          {/* AI insight for monthly */}
          <AiInsightPanel prompt={monthlyAiPrompt} cacheKey="monthly" />

          <Card label="Forecast — predicted passengers & month-over-month change">
            {/* Legend */}
            <div style={{ display: "flex", gap: 16, fontSize: 11, color: BLUE[600], marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: BLUE[400], display: "inline-block" }} />
                Volume bar
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 22, height: 8, borderRadius: 3, background: GREEN.bg, display: "inline-block" }} />
                Rising MoM
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 22, height: 8, borderRadius: 3, background: RED.bg, display: "inline-block" }} />
                Falling MoM
              </span>
            </div>

            <ColHeader cols={[
              { label: "Month",   width: 100, flex: 0 },
              { label: "Volume",  flex: 1,    align: "left" },
              { label: "MoM",     width: 62,  align: "center", flex: 0 },
              { label: "% peak",  width: 48,  align: "right",  flex: 0 },
            ]} />

            {fcOnly.map(d => {
              const peakPct = d.val / peak * 100;
              const barW    = d.val / maxFcVal * 100;
              return (
                <div key={`${d.month}-${d.year}`} style={{ ...ROW }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: BLUE[900], minWidth: 96, flexShrink: 0 }}>
                      {d.month} {d.year}
                      {d.oil_shock && (
                        <span style={{ fontSize: 9, color: "#A32D2D", marginLeft: 5, fontWeight: 500, verticalAlign: "middle" }}>
                          OIL
                        </span>
                      )}
                    </span>
                    <div style={{ flex: 1, maxWidth: 110, height: 3, background: BLUE[50], borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ width: `${barW}%`, height: "100%", background: BLUE[400], borderRadius: 99 }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={pillStyle(d.mom ?? null)}>{fmt(d.mom ?? null)}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: BLUE[800], minWidth: 44, textAlign: "right" }}>
                      {peakPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </Card>
        </>
      )}

      {/* ── YEARLY ── */}
      {tab === "yearly" && (
        <>
          {/* AI insight for yearly */}
          <AiInsightPanel prompt={yearlyAiPrompt} cacheKey="yearly" />

          <Card label="Year-over-year passenger growth">
            <ColHeader cols={[
              { label: "Year",       width: 150, flex: 0 },
              { label: "Trend",      flex: 1 },
              { label: "YoY change", width: 70,  align: "right", flex: 0 },
            ]} />
            {yFiltered.map(y => (
              <div key={y.year} style={{ ...ROW }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: BLUE[900], minWidth: 150 }}>
                  {y.isFc ? `${y.year} ` : String(y.year)}
                  {y.isFc && <span style={{ fontSize: 10, color: BLUE[600] }}>(forecast)</span>}
                </span>
                <div style={{ flex: 1, paddingLeft: 8 }}>
                  <BarTrack pct={Math.abs(y.yoy!) / maxYoy * 100} color={y.yoy! >= 0 ? "#639922" : "#E24B4A"} width={90} />
                </div>
                <span style={pillStyle(y.yoy)}>{fmt(y.yoy)}</span>
              </div>
            ))}
          </Card>
        </>
      )}

      {/* ── SEASONAL ── */}
      {tab === "seasonal" && (
        <>
          <Alert text={`Peak: ${fm[peakMn]?.month ?? "—"} · Trough: ${fm[troughMn]?.month ?? "—"} — shape index vs forecast annual average`} />

          <Card label="Monthly shape — forecast vs annual average">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 8 }}>
              {mns.map(mn => {
                const fc_a  = fm[mn]?.avg;
                const shape = fc_a != null ? (fc_a - fcMean) / fcMean * 100 : null;
                return (
                  <div key={mn} style={{ border: `0.5px solid ${BLUE[100]}`, borderRadius: 10, padding: "10px 4px", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: BLUE[600], marginBottom: 5 }}>
                      {fm[mn]?.month ?? hm[mn]?.month}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: shapeColor(shape) }}>
                      {shape != null ? fmt(shape, 1) : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card label="Historical → forecast change by month">
            <ColHeader cols={[
              { label: "Month",  flex: 1 },
              { label: "Trend",  width: 90, flex: 0 },
              { label: "Change", width: 62, align: "right", flex: 0 },
            ]} />
            {mns.map(mn => {
              const h   = hm[mn]?.avg, f = fm[mn]?.avg;
              const pct = h && f ? (f - h) / h * 100 : null;
              const name = fm[mn]?.month ?? hm[mn]?.month ?? String(mn);
              return (
                <div key={mn} style={{ ...ROW }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: BLUE[900], flex: 1 }}>{name}</span>
                  <BarTrack
                    pct={pct != null ? Math.abs(pct) / maxSeaPct * 100 : 0}
                    color={pct != null && pct >= 0 ? "#639922" : "#E24B4A"}
                    width={90}
                  />
                  <span style={{ ...pillStyle(pct), marginLeft: 8 }}>{fmt(pct)}</span>
                </div>
              );
            })}
          </Card>
        </>
      )}

      {/* ── SCENARIOS ── */}
      {tab === "scenarios" && (
        <>
          {modRow && (
            <Alert
              warn
              text={`Active: Iran/Hormuz shock (+36% Brent). MARINA fare hike Mar 2026 validates moderate scenario. Demand impact: ${modRow.demand_change_pct >= 0 ? "+" : ""}${(+modRow.demand_change_pct).toFixed(1)}%`}
            />
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {scenArr.map(s => {
              const key     = String(s.scenario ?? "").toLowerCase();
              const dPct    = +s.demand_change_pct || 0;
              const diesel  = +s.diesel_php || 0;
              const adjM    = +s.adjusted_M || 0;
              const diffPct = baselineM && key !== "baseline" ? (adjM - baselineM) / baselineM * 100 : null;
              const col     = SCENARIO_COLOR[key] ?? BLUE[400];
              return (
                <div key={key} style={{ border: `0.5px solid ${BLUE[100]}`, borderRadius: 14, padding: 16, background: "#fff" }}>
                  <div style={{ height: 3, borderRadius: 99, background: col, marginBottom: 12 }} />
                  <div style={{ fontSize: 10, color: BLUE[600], textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontWeight: 500 }}>
                    {SCENARIO_LABEL[key] ?? key}
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 500, color: col, marginBottom: 4 }}>
                    {dPct >= 0 ? "+" : ""}{dPct.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 12, color: BLUE[600] }}>
                    {key === "baseline" ? "reference level" : `${fmt(diffPct)} vs baseline`}
                  </div>
                  {diesel > 0 && (
                    <div style={{
                      marginTop: 10, display: "inline-block", padding: "4px 10px",
                      background: BLUE[50], borderRadius: 6, fontSize: 11, color: BLUE[800],
                    }}>
                      Diesel ₱{diesel.toFixed(0)}/L
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
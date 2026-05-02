import { useEffect, useState } from "react";

const API_N  = "https://ferryai.onrender.com/forecast/national";
const API_S  = "https://ferryai.onrender.com/forecast/seasonal";
const API_SC = "https://ferryai.onrender.com/scenario/all";

const SCENARIO_COLOR: Record<string, string> = {
  baseline: "#378ADD", mild: "#BA7517", moderate: "#D85A30", severe: "#E24B4A",
};
const SCENARIO_LABEL: Record<string, string> = {
  baseline: "Baseline", mild: "Mild (+15% oil)",
  moderate: "Moderate (+35% oil)", severe: "Severe (+60% oil)",
};

const BLUE = {
  50: "#E6F1FB", 100: "#B5D4F4", 200: "#85B7EB",
  400: "#378ADD", 600: "#185FA5", 800: "#0C447C", 900: "#042C53",
};

function fmt(v: number | null, d = 1): string {
  return v != null ? `${v >= 0 ? "+" : ""}${v.toFixed(d)}%` : "—";
}

function fmtPax(n: number | null): string {
  if (n == null) return "—";
  // Replaced the 'M' for millions with '%' as requested
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(2)}%`;
  if (n >= 1_000)     return `₱${(n / 1_000).toFixed(1)}K`;
  return `₱${Math.round(n).toLocaleString()}`;
}

function fmtFull(n: number | null): string {
  if (n == null) return "—";
  return `₱${Math.round(n).toLocaleString()}`;
}

function pillStyle(v: number | null): React.CSSProperties {
  const base: React.CSSProperties = {
    fontSize: 11, fontWeight: 500, padding: "3px 8px",
    borderRadius: 99, minWidth: 62, textAlign: "center", whiteSpace: "nowrap",
  };
  if (v == null) return { ...base, background: BLUE[50],    color: BLUE[800] };
  if (v > 0)     return { ...base, background: "#EAF3DE",   color: "#27500A" };
  return           { ...base, background: "#FCEBEB",   color: "#791F1F" };
}

function shapeColor(v: number | null) {
  return v == null ? BLUE[600] : v > 0 ? "#27500A" : "#791F1F";
}

function BarTrack({ pct, color, width = 110 }: { pct: number; color: string; width?: number }) {
  return (
    <div style={{ width, height: 4, background: BLUE[50], borderRadius: 99, overflow: "hidden", flexShrink: 0 }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: color, borderRadius: 99 }} />
    </div>
  );
}

function KPI({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ background: BLUE[50], borderRadius: 8, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: BLUE[600], textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, color: BLUE[900] }}>{value}</div>
      <div style={{ fontSize: 12, color: BLUE[600], marginTop: 3 }}>{sub}</div>
    </div>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: `0.5px solid ${BLUE[100]}`, borderRadius: 12, padding: "1.25rem", marginBottom: "1rem" }}>
      <div style={{ fontSize: 11, color: BLUE[600], textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16, fontWeight: 500 }}>{label}</div>
      {children}
    </div>
  );
}

function Alert({ text, warn }: { text: string; warn?: boolean }) {
  return (
    <div style={{
      padding: "12px 14px", borderRadius: 8, fontSize: 12, lineHeight: 1.7, marginBottom: "1rem",
      background: warn ? "#FAECE7" : BLUE[50],
      border: `0.5px solid ${warn ? "#F0997B" : BLUE[200]}`,
      color: warn ? "#4A1B0C" : BLUE[900],
    }}>{text}</div>
  );
}

function ColHeader({ cols }: { cols: { label: string; align?: "left" | "right" | "center"; width?: number }[] }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 0 8px", borderBottom: `0.5px solid ${BLUE[100]}`, marginBottom: 4 }}>
      {cols.map((c, i) => (
        <span key={i} style={{ fontSize: 11, color: BLUE[600], fontWeight: 500, minWidth: c.width, textAlign: c.align || "left", flex: i === 0 ? "none" : i === 1 ? 1 : "none", paddingLeft: i > 0 ? 8 : 0 }}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

type DataPoint = {
  year: number; mn: number; month: string; val: number;
  isFc: boolean; oil_shock?: boolean; mom?: number | null;
};

export default function FerryForecastDashboard() {
  const [tab, setTab] = useState<"monthly" | "yearly" | "seasonal" | "scenarios">("monthly");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(API_N).then(r  => { if (!r.ok) throw new Error(`national HTTP ${r.status}`);  return r.json(); }),
      fetch(API_S).then(r  => { if (!r.ok) throw new Error(`seasonal HTTP ${r.status}`);  return r.json(); }),
      fetch(API_SC).then(r => { if (!r.ok) throw new Error(`scenarios HTTP ${r.status}`); return r.json(); }),
    ])
      .then(([nat, sea, scen]) => setData({ nat, sea, scen }))
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div style={{ padding: "2rem", color: "#A32D2D", fontSize: 13 }}>Failed to load: {error}</div>;
  if (!data)  return <div style={{ padding: "2rem", color: BLUE[600], fontSize: 13 }}>Loading forecast data…</div>;

  const { nat, sea, scen } = data;
  const mape = String(nat?.mean_mape ?? nat?.mean_mape_pct ?? "—");

  const hist = (nat?.historical ?? []).map((d: any) => ({
    year: +d.year, mn: +d.month_num, month: String(d.month), val: +d.total, isFc: false,
  }));
  const fcRaw = (nat?.forecast ?? []).map((d: any) => ({
    year: +d.year, mn: +d.month_num, month: String(d.month), val: +d.predicted, isFc: true, oil_shock: !!d.oil_shock,
  }));
  const all: DataPoint[] = [...hist, ...fcRaw].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.mn - b.mn
  );
  for (let i = 1; i < all.length; i++) {
    const p = all[i - 1].val, c = all[i].val;
    all[i].mom = p ? (c - p) / p * 100 : null;
  }

  const peak      = Math.max(...all.map(d => d.val), 1);
  const fcOnly    = all.filter(d => d.isFc);
  const maxFcVal  = Math.max(...fcOnly.map(d => d.val), 1);
  const shockPt   = fcOnly.find(d => d.oil_shock);

  // Yearly
  const yearMap: Record<number, { h: number; f: number; isFc: boolean }> = {};
  all.forEach(d => {
    yearMap[d.year] = yearMap[d.year] || { h: 0, f: 0, isFc: false };
    if (d.isFc) { yearMap[d.year].f += d.val; yearMap[d.year].isFc = true; }
    else          yearMap[d.year].h += d.val;
  });
  const years     = Object.keys(yearMap).map(Number).sort();
  const yData     = years.map((y, i) => {
    const cur  = yearMap[y].h || yearMap[y].f;
    const prev = i > 0 ? (yearMap[years[i - 1]].h || yearMap[years[i - 1]].f) : null;
    return { year: y, total: cur, yoy: prev ? (cur - prev) / prev * 100 : null, isFc: yearMap[y].isFc };
  });
  const yFiltered = yData.filter(y => y.yoy != null);
  const maxYoy    = Math.max(...yFiltered.map(y => Math.abs(y.yoy!)), 1);
  const y26       = yData.find(y => y.year === 2026);
  const y27       = yData.find(y => y.year === 2027);

  // Seasonal
  const seaHist = sea?.historical ?? [];
  const seaFc   = sea?.forecast   ?? [];
  const hm: Record<number, { month: string; avg: number }> = {};
  const fm: Record<number, { month: string; avg: number }> = {};
  seaHist.forEach((d: any) => hm[+d.month_num] = { month: d.month, avg: +d.avg });
  seaFc.forEach((d: any)   => fm[+d.month_num] = { month: d.month, avg: +d.avg });
  const mns       = [...new Set([...Object.keys(hm), ...Object.keys(fm)].map(Number))].sort((a, b) => a - b);
  const fcAvgs    = mns.map(mn => fm[mn]?.avg).filter(Boolean) as number[];
  const fcMean    = fcAvgs.length ? fcAvgs.reduce((a, b) => a + b, 0) / fcAvgs.length : 1;
  const peakMn    = mns.reduce((best, mn) => (fm[mn]?.avg || 0) > (fm[best]?.avg || 0) ? mn : best, mns[0]);
  const troughMn  = mns.reduce((best, mn) => (fm[mn]?.avg ?? 999) < (fm[best]?.avg ?? 999) ? mn : best, mns[0]);
  const maxSeaPct = Math.max(...mns.map(mn => {
    const h = hm[mn]?.avg, f = fm[mn]?.avg;
    return h && f ? Math.abs((f - h) / h * 100) : 0;
  }), 1);

  // Scenarios
  const scenArr   = Array.isArray(scen) ? scen : Array.isArray(scen?.scenarios) ? scen.scenarios : [];
  const baselineM = scen?.baseline_M || 0;
  const modRow    = scenArr.find((s: any) => s.scenario === "moderate");

  const TABS = [
    { key: "monthly",   label: "Monthly"   },
    { key: "yearly",    label: "Yearly"    },
    { key: "seasonal",  label: "Seasonal"  },
    { key: "scenarios", label: "Scenarios" },
  ] as const;

  const rowBase: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 0", borderBottom: `0.5px solid ${BLUE[50]}`,
  };

  return (
    <div style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif", padding: "1.5rem 0", maxWidth: 680, color: BLUE[900] }}>

      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ fontSize: 11, color: BLUE[600], marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          MARINA · Ferry Intelligence System v5
        </div>
        <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Ferry passenger forecast</div>
        <div style={{ fontSize: 12, color: BLUE[400] }}>XGBoost · 597 trees · 33 features · national coverage</div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: "1.5rem" }}>
        <KPI label="Mean MAPE"     value={mape}                                     sub="avg prediction error" />
        <KPI label="2026 forecast" value={y26?.yoy != null ? fmt(y26.yoy) : "—"} sub="YoY vs 2025" />
        <KPI label="2027 forecast" value={y27?.yoy != null ? fmt(y27.yoy) : "—"} sub="YoY vs 2026" />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: "1.25rem", borderBottom: `0.5px solid ${BLUE[100]}`, paddingBottom: 12 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            fontSize: 12, fontWeight: 500, padding: "7px 16px", borderRadius: 8,
            border: `0.5px solid ${BLUE[100]}`,
            background: tab === t.key ? BLUE[600] : "transparent",
            color: tab === t.key ? "#fff" : BLUE[600],
            cursor: "pointer", transition: "all .15s", fontFamily: "inherit",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── MONTHLY ── */}
      {tab === "monthly" && (
        <>
          {shockPt && <Alert warn text={`Oil shock: ${shockPt.month} ${shockPt.year} — Iran/Hormuz modelled as +36% Brent spike. MARINA approved 20% fare hike Mar 16 2026.`} />}
          <Card label="Forecast — predicted passengers & month-over-month change">
            {/* Legend */}
            <div style={{ display: "flex", gap: 16, fontSize: 11, color: BLUE[600], marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: BLUE[400], display: "inline-block" }} /> Volume bar
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 24, height: 8, borderRadius: 3, background: "#EAF3DE", display: "inline-block" }} /> Rising MoM
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 24, height: 8, borderRadius: 3, background: "#FCEBEB", display: "inline-block" }} /> Falling MoM
              </span>
            </div>
            <ColHeader cols={[
              { label: "Month", width: 72 },
              { label: "Volume", align: "left" },
              { label: "Predicted", align: "right", width: 80 },
              { label: "MoM", align: "center", width: 62 },
              { label: "% Peak", align: "right", width: 44 },
            ]} />
            {fcOnly.map(d => {
              const peakPct = d.val / peak * 100;
              const barW    = d.val / maxFcVal * 100;
              return (
                <div key={`${d.month}-${d.year}`} style={{ ...rowBase }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, color: BLUE[900], fontWeight: 500, minWidth: 72, flexShrink: 0 }}>
                      {d.month} {d.year}
                      {d.oil_shock && <span style={{ fontSize: 10, color: "#A32D2D", marginLeft: 4, fontWeight: 500 }}>OIL</span>}
                    </span>
                    <div style={{ flex: 1, maxWidth: 120, height: 4, background: BLUE[50], borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ width: `${barW}%`, height: "100%", background: BLUE[400], borderRadius: 99 }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: BLUE[600], minWidth: 80, textAlign: "right", fontWeight: 500 }}>
                      {fmtPax(d.val)}
                    </span>
                    <span style={pillStyle(d.mom ?? null)}>{fmt(d.mom ?? null)}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: BLUE[900], minWidth: 44, textAlign: "right" }}>
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
        <Card label="Year-over-year passenger growth">
          <ColHeader cols={[
            { label: "Year", width: 140 },
            { label: "Total predicted", align: "right", width: 110 },
            { label: "YoY change", align: "right", width: 62 },
          ]} />
          {yFiltered.map(y => (
            <div key={y.year} style={{ ...rowBase }}>
              <span style={{ fontSize: 13, color: BLUE[900], fontWeight: 500, minWidth: 140 }}>
                {y.isFc ? `${y.year} (forecast)` : String(y.year)}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: BLUE[600], minWidth: 110, textAlign: "right", fontWeight: 500 }}>
                  {fmtFull(y.total)}
                </span>
                <BarTrack pct={Math.abs(y.yoy!) / maxYoy * 100} color={y.yoy! >= 0 ? "#639922" : "#E24B4A"} width={80} />
                <span style={pillStyle(y.yoy)}>{fmt(y.yoy)}</span>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* ── SEASONAL ── */}
      {tab === "seasonal" && (
        <>
          <Alert text={`Peak: ${fm[peakMn]?.month || "—"} · Trough: ${fm[troughMn]?.month || "—"} — shape index vs forecast annual average`} />
          <Card label="Monthly shape — forecast vs annual average">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginBottom: "1rem" }}>
              {mns.map(mn => {
                const fc_a  = fm[mn]?.avg;
                const shape = fc_a != null ? (fc_a - fcMean) / fcMean * 100 : null;
                return (
                  <div key={mn} style={{ border: `0.5px solid ${BLUE[100]}`, borderRadius: 8, padding: "10px 4px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: BLUE[600], marginBottom: 5 }}>{fm[mn]?.month || hm[mn]?.month}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: shapeColor(shape) }}>
                      {shape != null ? `${shape >= 0 ? "+" : ""}${shape.toFixed(1)}%` : "—"}
                    </div>
                    <div style={{ fontSize: 10, color: BLUE[600], marginTop: 3 }}>{fmtPax(fc_a)}</div>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card label="Historical → forecast change by month">
            {mns.map(mn => {
              const h = hm[mn]?.avg, f = fm[mn]?.avg;
              const pct = h && f ? (f - h) / h * 100 : null;
              const name = fm[mn]?.month || hm[mn]?.month || String(mn);
              return (
                <div key={mn} style={{ ...rowBase }}>
                  <span style={{ fontSize: 13, color: BLUE[900], fontWeight: 500 }}>{name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: BLUE[600], minWidth: 80, textAlign: "right", fontWeight: 500 }}>
                      {fmtPax(f ?? null)}
                    </span>
                    <BarTrack pct={pct != null ? Math.abs(pct) / maxSeaPct * 100 : 0} color={pct != null && pct >= 0 ? "#639922" : "#E24B4A"} width={80} />
                    <span style={pillStyle(pct)}>{fmt(pct)}</span>
                  </div>
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
            <Alert warn text={`Active: Iran/Hormuz shock (+36% Brent). MARINA fare hike Mar 2026 validates moderate scenario. Demand impact: ${modRow.demand_change_pct >= 0 ? "+" : ""}${(+modRow.demand_change_pct).toFixed(1)}%`} />
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {scenArr.map((s: any) => {
              const key     = String(s.scenario || "").toLowerCase();
              const dPct    = +s.demand_change_pct || 0;
              const diesel  = +s.diesel_php || 0;
              const adjM    = +s.adjusted_M || 0;
              const diffPct = baselineM && key !== "baseline" ? (adjM - baselineM) / baselineM * 100 : null;
              const col     = SCENARIO_COLOR[key] || BLUE[400];
              return (
                <div key={key} style={{ border: `0.5px solid ${BLUE[100]}`, borderRadius: 12, padding: 16, background: "#fff" }}>
                  <div style={{ fontSize: 11, color: BLUE[600], textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                    {SCENARIO_LABEL[key] || key}
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 500, color: col, marginBottom: 4 }}>
                    {dPct >= 0 ? "+" : ""}{dPct.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: BLUE[900], marginBottom: 4 }}>
                    {fmtFull(adjM)}
                    <span style={{ fontSize: 11, color: BLUE[600], marginLeft: 4 }}>passengers</span>
                  </div>
                  <div style={{ fontSize: 12, color: BLUE[600] }}>
                    {key === "baseline" ? "reference level" : fmt(diffPct) + " vs baseline"}
                  </div>
                  {diesel > 0 && (
                    <div style={{ marginTop: 10, display: "inline-block", padding: "5px 10px", background: BLUE[50], borderRadius: 6, fontSize: 12, color: BLUE[800] }}>
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
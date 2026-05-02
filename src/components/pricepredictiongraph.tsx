import { useEffect, useState } from "react";

const API_N = "https://ferryai.onrender.com/forecast/national";
const API_S = "https://ferryai.onrender.com/forecast/seasonal";
const API_SC = "https://ferryai.onrender.com/scenario/all";

const LABEL_MAP: Record<string, string> = {
  baseline: "Baseline",
  mild: "Mild (+15% oil)",
  moderate: "Moderate (+35% oil)",
  severe: "Severe (+60% oil)",
};

const COLOR_MAP: Record<string, string> = {
  baseline: "#378ADD",
  mild: "#BA7517",
  moderate: "#D85A30",
  severe: "#E24B4A",
};

function fmt(v: number | null, d = 1): string {
  return v != null ? `${v >= 0 ? "+" : ""}${v.toFixed(d)}%` : "—";
}

function pctColor(v: number | null): string {
  return v == null ? "#888" : v > 0 ? "#3B6D11" : "#A32D2D";
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ width: 90, height: 4, background: "#e5e7eb", borderRadius: 99, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: color, borderRadius: 99 }} />
    </div>
  );
}

function KPI({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ background: "#f9fafb", borderRadius: 8, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, color: "#111827" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>{sub}</div>
    </div>
  );
}

function Row({ label, value, pct, barPct, barColor }: { label: string; value: string; pct: number | null; barPct: number; barColor: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "0.5px solid #f3f4f6" }}>
      <span style={{ fontSize: 13, color: "#6b7280" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Bar pct={barPct} color={barColor} />
        <span style={{ fontSize: 13, fontWeight: 500, color: pctColor(pct), minWidth: 52, textAlign: "right" }}>{value}</span>
      </div>
    </div>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: "1.25rem", marginBottom: "1rem" }}>
      <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>{label}</div>
      {children}
    </div>
  );
}

function Alert({ text, warn }: { text: string; warn?: boolean }) {
  return (
    <div style={{
      padding: "12px 14px", borderRadius: 8, fontSize: 12, lineHeight: 1.7, marginBottom: "1rem",
      background: warn ? "#FAECE7" : "#E6F1FB",
      border: `0.5px solid ${warn ? "#F0997B" : "#85B7EB"}`,
      color: warn ? "#4A1B0C" : "#042C53",
    }}>{text}</div>
  );
}

export default function FerryForecastDashboard() {
  const [tab, setTab] = useState<"monthly" | "yearly" | "seasonal" | "scenarios">("monthly");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(API_N).then(r => { if (!r.ok) throw new Error(`national HTTP ${r.status}`); return r.json(); }),
      fetch(API_S).then(r => { if (!r.ok) throw new Error(`seasonal HTTP ${r.status}`); return r.json(); }),
      fetch(API_SC).then(r => { if (!r.ok) throw new Error(`scenarios HTTP ${r.status}`); return r.json(); }),
    ])
      .then(([nat, sea, scen]) => setData({ nat, sea, scen }))
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div style={{ padding: "2rem", color: "#A32D2D", fontSize: 13 }}>Failed to load: {error}</div>;
  if (!data) return <div style={{ padding: "2rem", color: "#9ca3af", fontSize: 13 }}>Loading forecast data…</div>;

  const { nat, sea, scen } = data;

  const hist = (nat?.historical ?? []).map((d: any) => ({ year: +d.year, month: String(d.month), month_num: +d.month_num, actual: +d.total }));
  const fc   = (nat?.forecast   ?? []).map((d: any) => ({ year: +d.year, month: String(d.month), month_num: +d.month_num, predicted: +d.predicted, oil_shock: !!d.oil_shock }));
  const peak = Math.max(...hist.map((d: any) => d.actual), ...fc.map((d: any) => d.predicted), 1);
  const mape = String(nat?.mean_mape ?? nat?.mean_mape_pct ?? "—");

  const yearMap: Record<number, { h: number; f: number }> = {};
  hist.forEach((d: any) => { yearMap[d.year] = yearMap[d.year] || { h: 0, f: 0 }; yearMap[d.year].h += d.actual; });
  fc.forEach((d: any)   => { yearMap[d.year] = yearMap[d.year] || { h: 0, f: 0 }; yearMap[d.year].f += d.predicted; });
  const years = Object.keys(yearMap).map(Number).sort();
  const yData = years.map((y, i) => {
    const cur  = yearMap[y].h  || yearMap[y].f;
    const prev = i > 0 ? (yearMap[years[i - 1]].h || yearMap[years[i - 1]].f) : null;
    return { year: y, yoy: prev ? (cur - prev) / prev * 100 : null, isFc: yearMap[y].h === 0 };
  });

  const y26 = yData.find(y => y.year === 2026);
  const y27 = yData.find(y => y.year === 2027);

  const seaHist = (sea?.historical ?? []);
  const seaFc   = (sea?.forecast   ?? []);
  const histMap: Record<number, { month: string; avg: number }> = {};
  const fcSeaMap: Record<number, { month: string; avg: number }> = {};
  seaHist.forEach((d: any) => histMap[+d.month_num] = { month: d.month, avg: +d.avg });
  seaFc.forEach((d: any)   => fcSeaMap[+d.month_num] = { month: d.month, avg: +d.avg });
  const allMnums = [...new Set([...Object.keys(histMap), ...Object.keys(fcSeaMap)].map(Number))].sort((a, b) => a - b);
  const fcAvgs   = allMnums.map(mn => fcSeaMap[mn]?.avg).filter(Boolean) as number[];
  const fcMean   = fcAvgs.length ? fcAvgs.reduce((a, b) => a + b, 0) / fcAvgs.length : 1;
  const peakMn   = allMnums.reduce((best, mn) => (fcSeaMap[mn]?.avg || 0) > (fcSeaMap[best]?.avg || 0) ? mn : best, allMnums[0]);
  const troughMn = allMnums.reduce((best, mn) => (fcSeaMap[mn]?.avg ?? 999) < (fcSeaMap[best]?.avg ?? 999) ? mn : best, allMnums[0]);

  const scenArr   = Array.isArray(scen) ? scen : Array.isArray(scen?.scenarios) ? scen.scenarios : [];
  const baselineM = scen?.baseline_M || 0;
  const modRow    = scenArr.find((s: any) => s.scenario === "moderate");
  const shockFc   = fc.find((d: any) => d.oil_shock);

  const maxFcPct  = Math.max(...fc.map((d: any) => d.predicted / peak * 100), 1);
  const maxYoy    = Math.max(...yData.filter(y => y.yoy != null).map(y => Math.abs(y.yoy!)), 1);
  const maxSeaPct = Math.max(...allMnums.map(mn => { const h = histMap[mn]?.avg, f = fcSeaMap[mn]?.avg; return h && f ? Math.abs((f - h) / h * 100) : 0; }), 1);

  const TABS = [
    { key: "monthly",   label: "Monthly"   },
    { key: "yearly",    label: "Yearly"    },
    { key: "seasonal",  label: "Seasonal"  },
    { key: "scenarios", label: "Scenarios" },
  ] as const;

  return (
    <div style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif", padding: "1.5rem 0", maxWidth: 680, color: "#111827" }}>

      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>MARINA · Ferry Intelligence System v5</div>
        <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Ferry passenger forecast</div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>XGBoost · 597 trees · 33 features · national coverage</div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: "1.5rem" }}>
        <KPI label="Mean MAPE"     value={mape}                                      sub="avg prediction error" />
        <KPI label="2026 forecast" value={y26?.yoy != null ? fmt(y26.yoy) : "—"}    sub="YoY vs 2025" />
        <KPI label="2027 forecast" value={y27?.yoy != null ? fmt(y27.yoy) : "—"}    sub="YoY vs 2026" />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: "1.25rem", borderBottom: "0.5px solid #e5e7eb", paddingBottom: 12 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              fontSize: 12, fontWeight: 500, padding: "7px 16px",
              borderRadius: 8, border: "0.5px solid #d1d5db",
              background: tab === t.key ? "#111827" : "transparent",
              color: tab === t.key ? "#fff" : "#6b7280",
              cursor: "pointer", transition: "all .15s",
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Monthly */}
      {tab === "monthly" && (
        <>
          {shockFc && (
            <Alert warn text={`Oil shock flag: ${shockFc.month} ${shockFc.year} — Iran/Hormuz event modelled as +36% Brent crude spike. MARINA approved 20% fare hike Mar 16 2026.`} />
          )}
          <Card label="Forecast months — % of series peak">
            {fc.map((d: any) => {
              const pct = d.predicted / peak * 100;
              return (
                <Row
                  key={`${d.month}-${d.year}`}
                  label={`${d.month} ${d.year}${d.oil_shock ? " ⚠" : ""}`}
                  value={`${pct.toFixed(1)}%`}
                  pct={null}
                  barPct={pct / maxFcPct * 100}
                  barColor="#378ADD"
                />
              );
            })}
          </Card>
        </>
      )}

      {/* Yearly */}
      {tab === "yearly" && (
        <Card label="Year-over-year passenger growth">
          {yData.filter(y => y.yoy != null).map(y => (
            <Row
              key={y.year}
              label={y.isFc ? `${y.year} (forecast)` : String(y.year)}
              value={fmt(y.yoy)}
              pct={y.yoy}
              barPct={Math.abs(y.yoy!) / maxYoy * 100}
              barColor={y.yoy! >= 0 ? "#639922" : "#E24B4A"}
            />
          ))}
        </Card>
      )}

      {/* Seasonal */}
      {tab === "seasonal" && (
        <>
          <Alert text={`Peak: ${fcSeaMap[peakMn]?.month || "—"} · Trough: ${fcSeaMap[troughMn]?.month || "—"} — seasonal shape based on forecast monthly average`} />

          <Card label="Monthly shape — forecast vs annual average">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
              {allMnums.map(mn => {
                const fc_a  = fcSeaMap[mn]?.avg;
                const shape = fc_a != null ? (fc_a - fcMean) / fcMean * 100 : null;
                return (
                  <div key={mn} style={{ border: "0.5px solid #e5e7eb", borderRadius: 8, padding: "10px 4px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 5 }}>{fcSeaMap[mn]?.month || histMap[mn]?.month}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: pctColor(shape) }}>
                      {shape != null ? `${shape >= 0 ? "+" : ""}${shape.toFixed(1)}%` : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card label="Month detail — historical → forecast change">
            {allMnums.map(mn => {
              const h = histMap[mn]?.avg, f = fcSeaMap[mn]?.avg;
              const pct = h && f ? (f - h) / h * 100 : null;
              const name = fcSeaMap[mn]?.month || histMap[mn]?.month || String(mn);
              return (
                <Row
                  key={mn}
                  label={name}
                  value={fmt(pct)}
                  pct={pct}
                  barPct={pct != null ? Math.abs(pct) / maxSeaPct * 100 : 0}
                  barColor={pct != null && pct >= 0 ? "#639922" : "#E24B4A"}
                />
              );
            })}
          </Card>
        </>
      )}

      {/* Scenarios */}
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
              const diffPct = baselineM && key !== "baseline" ? (+s.adjusted_M - baselineM) / baselineM * 100 : null;
              const col     = COLOR_MAP[key] || "#888";
              return (
                <div key={key} style={{ border: "0.5px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                    {LABEL_MAP[key] || key}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 500, color: col, marginBottom: 4 }}>
                    {dPct >= 0 ? "+" : ""}{dPct.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {key === "baseline" ? "reference level" : fmt(diffPct) + " vs baseline"}
                  </div>
                  {diesel > 0 && (
                    <div style={{ marginTop: 10, display: "inline-block", padding: "5px 10px", background: "#f9fafb", borderRadius: 6, fontSize: 12, color: "#6b7280" }}>
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
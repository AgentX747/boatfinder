// controllers/predictionController.ts
// FIX: seasonal now derived from /forecast/national (same dataset, same scale)
// instead of /forecast/seasonal which mixes national-aggregate historical
// with per-PMO-level forecast, causing a ~3x gap.

import { Request, Response } from "express";
import * as predictionService from "../services/predictionservice.js";

// ── National ──────────────────────────────────────────────────────────────

export async function getNationalForecast(req: Request, res: Response) {
  try {
    const data = await predictionService.getNationalForecast();

    const allPoints = [
      ...data.historical.map((h: any) => ({
        date: `${h.month} ${h.year}`,
        actual: h.total, predicted: null, lower: null, upper: null, oil_shock: false,
      })),
      ...data.forecast.map((f: any) => ({
        date: `${f.month} ${f.year}`,
        actual: null, predicted: f.predicted, lower: f.lower, upper: f.upper, oil_shock: f.oil_shock,
      })),
    ];

    const chartData = allPoints.map((row, i) => {
      const curr = row.actual ?? row.predicted;
      if (i === 0 || curr == null) return { ...row, pct_change: null };
      const prev = allPoints[i - 1].actual ?? allPoints[i - 1].predicted;
      const pct_change = prev != null && prev !== 0
        ? +((curr - prev) / prev * 100).toFixed(1) : null;
      return { ...row, pct_change };
    });

    res.json({ chartData, accuracy: data.accuracy, mean_mape: data.mean_mape });
  } catch (err: any) {
    console.error("[predictionController] getNationalForecast:", err.message);
    res.status(502).json({ error: "Failed to fetch forecast from model server." });
  }
}

// ── PMO ───────────────────────────────────────────────────────────────────

export async function getPMOForecast(req: Request, res: Response) {
  const pmo = String(req.params.pmo);
  
  const n_months = parseInt(req.query.months as string) || 12;
  try {
    const data = await predictionService.getPMOForecast(pmo, n_months);
    const chartData = data.forecast.map((f: any) => ({
      date: `${f.month} ${f.year}`,
      predicted: f.predicted, lower: f.lower, upper: f.upper, oil_shock: f.oil_shock,
    }));
    res.json({ pmo: data.pmo, region: data.region, chartData, meta: data.meta });
  } catch (err: any) {
    console.error("[predictionController] getPMOForecast:", err.message);
    res.status(502).json({ error: `Failed to fetch forecast for PMO: ${pmo}` });
  }
}

// ── Seasonal ──────────────────────────────────────────────────────────────
//
// FIX: We derive seasonal averages from /forecast/national which returns
// historical[] and forecast[] at the SAME national scale.
// /forecast/seasonal mixes national historical vs per-PMO forecast → huge gap.

export async function getSeasonalForecast(req: Request, res: Response) {
  try {
    // Use national endpoint — both arrays are at national aggregate scale
    const data = await predictionService.getNationalForecast();

    // Group historical by month_num → average
    const histByMonth = new Map<number, { total: number; count: number; month: string }>();
    for (const h of data.historical) {
      const m = h.month_num;
      if (!histByMonth.has(m)) histByMonth.set(m, { total: 0, count: 0, month: h.month });
      const entry = histByMonth.get(m)!;
      entry.total += h.total;
      entry.count += 1;
    }

    // Group forecast by month_num → average
    const fcByMonth = new Map<number, { total: number; count: number; month: string }>();
    for (const f of data.forecast) {
      const m = f.month_num;
      if (!fcByMonth.has(m)) fcByMonth.set(m, { total: 0, count: 0, month: f.month });
      const entry = fcByMonth.get(m)!;
      entry.total += f.predicted;
      entry.count += 1;
    }

    // Build merged seasonal rows for months 1–12
    const seasonal = Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
      const h = histByMonth.get(m);
      const f = fcByMonth.get(m);

      const hist_avg = h ? Math.round(h.total / h.count) : null;
      const fc_avg   = f ? Math.round(f.total / f.count) : null;

      // % change: forecast monthly avg vs historical monthly avg — same scale, apples to apples
      const pct_change =
        hist_avg != null && fc_avg != null && hist_avg !== 0
          ? +((fc_avg - hist_avg) / hist_avg * 100).toFixed(1)
          : null;

      return {
        month: h?.month ?? f?.month ?? `Month ${m}`,
        month_num: m,
        hist_avg,
        fc_avg,
        pct_change,
        insufficient: fc_avg == null, // no forecast coverage for this month
      };
    });

    // Peak / trough from forecast avgs only
    const withFc = seasonal.filter(s => s.fc_avg != null) as Array<typeof seasonal[0] & { fc_avg: number }>;
    const sorted  = [...withFc].sort((a, b) => b.fc_avg - a.fc_avg);
    const annualAvg = withFc.reduce((s, r) => s + r.fc_avg, 0) / withFc.length;

    res.json({
      seasonal,
      peakMonth:   sorted[0]?.month ?? "N/A",
      troughMonth: sorted[sorted.length - 1]?.month ?? "N/A",
      peakPct:     sorted[0]   ? +((sorted[0].fc_avg   - annualAvg) / annualAvg * 100).toFixed(1) : 0,
      troughPct:   sorted[sorted.length - 1]
        ? +((sorted[sorted.length - 1].fc_avg - annualAvg) / annualAvg * 100).toFixed(1)
        : 0,
      note: "Averages derived from /forecast/national — historical and forecast at identical national scale.",
    });
  } catch (err: any) {
    console.error("[predictionController] getSeasonalForecast:", err.message);
    res.status(502).json({ error: "Failed to compute seasonal data." });
  }
}

// ── Scenarios ─────────────────────────────────────────────────────────────

export async function getAllScenarios(req: Request, res: Response) {
  try {
    const [optionsData, allData] = await Promise.all([
      predictionService.getScenarioOptions(),
      predictionService.getAllScenarios(),
    ]);

    const optionMap: Record<string, { label: string; color: string }> = Object.fromEntries(
      optionsData.scenarios.map((o: any) => [o.key, { label: o.label, color: o.color }])
    );

    const scenarios = allData.scenarios.map((s: any) => ({
      ...s,
      label: optionMap[s.scenario]?.label ?? s.scenario,
      color: optionMap[s.scenario]?.color ?? "#64748b",
    }));

    res.json({ scenarios, baseline_M: allData.baseline_M });
  } catch (err: any) {
    console.error("[predictionController] getAllScenarios:", err.message);
    res.status(502).json({ error: "Failed to fetch scenario data." });
  }
}
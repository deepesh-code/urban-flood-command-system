"use client";

import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { api } from "@/lib/api";
import type { ScenarioResponse } from "@/lib/types";

const LEVEL_STYLES: Record<string, string> = {
  Low: "text-green-400",
  Medium: "text-yellow-400",
  High: "text-orange-400",
  Severe: "text-red-400",
};

export default function SimulatorPage() {
  const [rainfall, setRainfall] = useState(60);
  const [hours, setHours] = useState(3);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScenarioResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const scenario = await api<ScenarioResponse>("/api/v1/scenarios/run", {
        method: "POST",
        body: JSON.stringify({ rainfall_mm: rainfall, hours }),
      });
      setResult(scenario);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scenario failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Scenario Simulator</h1>
        <p className="text-sm text-slate-400">
          What-if tool: change the rainfall input and watch every hotspot risk
          score recalculate with the same explainable engine. Results are
          always labelled as simulated.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-command-700 bg-command-900 p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-white">
            <FlaskConical className="h-5 w-5 text-purple-400" />
            Simulation inputs
          </h3>

          <label className="mb-1 block text-xs text-slate-400">
            Accumulated rainfall: <span className="font-semibold text-sky-300">{rainfall} mm</span> over {hours} h
          </label>
          <input
            type="range"
            min={0}
            max={200}
            value={rainfall}
            onChange={(e) => setRainfall(Number(e.target.value))}
            className="w-full accent-sky-500"
          />
          <div className="mb-5 flex justify-between text-[10px] text-slate-500">
            <span>0 mm (dry)</span>
            <span>60 mm → rain input 100</span>
            <span>200 mm</span>
          </div>

          <label className="mb-1 block text-xs text-slate-400">
            Rainfall window: <span className="font-semibold text-sky-300">{hours} hours</span>
          </label>
          <input
            type="range"
            min={1}
            max={12}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="w-full accent-sky-500"
          />

          <button
            onClick={run}
            disabled={busy}
            className="mt-6 w-full rounded-xl bg-purple-500/90 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50"
          >
            {busy ? "Running simulation…" : "Run scenario"}
          </button>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
            Normalization: rain input = min(100, mm / 60 × 100). Terrain and
            drainage use the documented zone configuration; current open
            incidents count as evidence. Formula: R = 0.35P + 0.25T + 0.20D + 0.20I.
          </p>
        </div>

        <div className="lg:col-span-2">
          {result ? (
            <div className="overflow-hidden rounded-2xl border border-purple-500/30 bg-command-900">
              <div className="flex items-center justify-between border-b border-command-700 px-5 py-3">
                <h3 className="font-semibold text-white">Scenario results</h3>
                <span className="rounded bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-300">
                  Simulated · not a forecast
                </span>
              </div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-command-700 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-2.5">Rank</th>
                    <th className="px-5 py-2.5">Zone</th>
                    <th className="px-5 py-2.5 w-1/2">Risk score</th>
                    <th className="px-5 py-2.5">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {result.ranking.map((r, idx) => (
                    <tr key={r.zone_id} className="border-b border-command-800 last:border-0">
                      <td className="px-5 py-3 text-slate-400">#{idx + 1}</td>
                      <td className="px-5 py-3 font-medium text-slate-100">{r.zone}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-command-800">
                            <div
                              className="h-full rounded-full bg-purple-500"
                              style={{ width: `${Math.min(100, r.risk_score)}%` }}
                            />
                          </div>
                          <span className="w-14 text-right font-bold text-white">
                            {r.risk_score.toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className={`px-5 py-3 font-semibold ${LEVEL_STYLES[r.risk_level] || ""}`}>
                        {r.risk_level}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-5 py-3 text-[11px] text-slate-500">
                Scenario ID {result.id.slice(0, 8)} · Rainfall {result.inputs.rainfall_mm} mm /
                {result.inputs.hours} h. The same slider input always reproduces the same ranking.
              </p>
            </div>
          ) : (
            <div className="flex h-full min-h-64 items-center justify-center rounded-2xl border border-dashed border-command-700 bg-command-900/50 p-8 text-center text-sm text-slate-500">
              Set the rainfall input and press “Run scenario” to see hotspot
              risk recalculate across Greater Noida.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

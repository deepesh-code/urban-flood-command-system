
"use client";

import { useState } from "react";
import {
  FlaskConical,
  CloudRain,
  Clock3,
  MapPinned,
  AlertTriangle,
  ShieldAlert,
  Trophy,
} from "lucide-react";
import { api } from "@/lib/api";
import type { ScenarioResponse } from "@/lib/types";

const LEVEL_STYLES: Record<string, string> = {
  Low: "text-green-400 bg-green-500/10 border-green-500/20",
  Medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  High: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  Severe: "text-red-400 bg-red-500/10 border-red-500/20",
};

const PRESETS = [
  { name: "Dry", rainfall: 0, hours: 3, description: "No rainfall" },
  { name: "Moderate", rainfall: 30, hours: 3, description: "30 mm rainfall" },
  { name: "Heavy", rainfall: 100, hours: 6, description: "100 mm rainfall" },
  { name: "Extreme", rainfall: 200, hours: 12, description: "200 mm rainfall" },
];

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
      const scenario = await api<ScenarioResponse>(
        "/api/v1/scenarios/run",
        {
          method: "POST",
          body: JSON.stringify({ rainfall_mm: rainfall, hours }),
        }
      );
      setResult(scenario);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scenario failed");
    } finally {
      setBusy(false);
    }
  };

  const highRiskCount =
    result?.ranking.filter(
      (zone) => zone.risk_level === "High" || zone.risk_level === "Severe"
    ).length ?? 0;

  const highestRisk = result?.ranking[0];

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
            <FlaskConical className="h-5 w-5" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-widest text-purple-300">
            Decision Support System
          </span>
        </div>

        <h1 className="text-2xl font-bold text-white">
          Flood Scenario Simulator
        </h1>

        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-400">
          Simulate different rainfall conditions and compare flood-risk
          scores across Greater Noida zones using the existing explainable
          risk engine. All scenario results are simulated, not forecasts.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Simulation controls */}
        <div className="rounded-2xl border border-command-700 bg-command-900 p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-white">
            <FlaskConical className="h-5 w-5 text-purple-400" />
            Simulation inputs
          </h3>

          <p className="mb-3 text-xs font-medium text-slate-400">
            Select a scenario preset
          </p>

          <div className="mb-5 grid grid-cols-2 gap-2">
            {PRESETS.map((preset) => {
              const active =
                rainfall === preset.rainfall && hours === preset.hours;

              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setRainfall(preset.rainfall);
                    setHours(preset.hours);
                  }}
                  className={`rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-purple-400 bg-purple-500/15"
                      : "border-command-700 bg-command-800/50 hover:border-purple-500/50"
                  }`}
                >
                  <span
                    className={`block text-sm font-semibold ${
                      active ? "text-purple-300" : "text-slate-200"
                    }`}
                  >
                    {preset.name}
                  </span>
                  <span className="mt-1 block text-[10px] text-slate-500">
                    {preset.description}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mb-5 border-t border-command-700 pt-4">
            <label className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-2">
                <CloudRain className="h-4 w-4 text-sky-400" />
                Accumulated rainfall
              </span>
              <span className="font-semibold text-sky-300">
                {rainfall} mm
              </span>
            </label>

            <input
              type="range"
              min={0}
              max={200}
              value={rainfall}
              onChange={(e) => setRainfall(Number(e.target.value))}
              className="w-full accent-sky-500"
            />

            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0 mm</span>
              <span>100 mm</span>
              <span>200 mm</span>
            </div>
          </div>

          <div className="mb-5">
            <label className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-sky-400" />
                Rainfall window
              </span>
              <span className="font-semibold text-sky-300">
                {hours} hours
              </span>
            </label>

            <input
              type="range"
              min={1}
              max={12}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="w-full accent-sky-500"
            />

            <div className="flex justify-between text-[10px] text-slate-500">
              <span>1 hour</span>
              <span>12 hours</span>
            </div>
          </div>

          <button
            onClick={run}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-500/90 py-3 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FlaskConical className="h-4 w-4" />
            {busy ? "Running simulation..." : "Run scenario"}
          </button>

          {error && (
            <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="mt-5 rounded-xl border border-command-700 bg-command-800/40 p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Risk calculation
            </p>
            <p className="text-center text-sm font-bold text-purple-300">
              R = 0.35P + 0.25T + 0.20D + 0.20I
            </p>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
              P = rainfall, T = terrain, D = drainage, I = incident
              evidence. Rainfall input is normalized as
              min(100, rainfall in mm / 60 × 100).
            </p>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4 lg:col-span-2">
          {result ? (
            <>
              {/* Result heading */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-white">
                    Scenario analysis
                  </h3>
                  <p className="text-xs text-slate-500">
                    Greater Noida zone risk ranking
                  </p>
                </div>

                <span className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-purple-300">
                  Simulated · Not a forecast
                </span>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-command-700 bg-command-900 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Zones assessed
                    </span>
                    <MapPinned className="h-4 w-4 text-sky-400" />
                  </div>
                  <p className="mt-3 text-2xl font-bold text-white">
                    {result.ranking.length}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    In this scenario
                  </p>
                </div>

                <div className="rounded-xl border border-command-700 bg-command-900 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      High / Severe
                    </span>
                    <ShieldAlert className="h-4 w-4 text-orange-400" />
                  </div>
                  <p className="mt-3 text-2xl font-bold text-orange-400">
                    {highRiskCount}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Zones in elevated categories
                  </p>
                </div>

                <div className="rounded-xl border border-command-700 bg-command-900 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Highest risk
                    </span>
                    <Trophy className="h-4 w-4 text-purple-400" />
                  </div>
                  <p className="mt-3 truncate text-lg font-bold text-white">
                    {highestRisk?.zone ?? "N/A"}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {highestRisk
                      ? `Score: ${highestRisk.risk_score.toFixed(2)} / 100`
                      : "No zone data"}
                  </p>
                </div>
              </div>

              {/* Ranking table */}
              <div className="overflow-hidden rounded-2xl border border-purple-500/30 bg-command-900">
                <div className="flex items-center justify-between border-b border-command-700 px-5 py-4">
                  <div>
                    <h3 className="font-semibold text-white">
                      Zone risk ranking
                    </h3>
                    <p className="mt-1 text-[10px] text-slate-500">
                      Highest score appears first
                    </p>
                  </div>
                  <AlertTriangle className="h-5 w-5 text-purple-400" />
                </div>

                {result.ranking.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-command-700 text-[10px] uppercase tracking-wider text-slate-500">
                          <th className="px-5 py-3">Rank</th>
                          <th className="px-5 py-3">Zone</th>
                          <th className="w-1/2 px-5 py-3">Risk score</th>
                          <th className="px-5 py-3">Level</th>
                        </tr>
                      </thead>

                      <tbody>
                        {result.ranking.map((r, idx) => (
                          <tr
                            key={r.zone_id}
                            className={`border-b border-command-800 last:border-0 ${
                              idx === 0 ? "bg-purple-500/[0.07]" : ""
                            }`}
                          >
                            <td className="px-5 py-3 text-slate-400">
                              {idx === 0 ? (
                                <span className="font-bold text-purple-300">
                                  #1
                                </span>
                              ) : (
                                `#${idx + 1}`
                              )}
                            </td>

                            <td className="px-5 py-3 font-medium text-slate-100">
                              {r.zone}
                              {idx === 0 && (
                                <span className="ml-2 text-[9px] font-semibold uppercase text-purple-300">
                                  Top risk
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-command-800">
                                  <div
                                    className={`h-full rounded-full ${
                                      idx === 0
                                        ? "bg-purple-400"
                                        : "bg-sky-500"
                                    }`}
                                    style={{
                                      width: `${Math.max(
                                        0,
                                        Math.min(100, r.risk_score)
                                      )}%`,
                                    }}
                                  />
                                </div>
                                <span className="w-14 text-right font-bold text-white">
                                  {r.risk_score.toFixed(2)}
                                </span>
                              </div>
                            </td>

                            <td className="px-5 py-3">
                              <span
                                className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold ${
                                  LEVEL_STYLES[r.risk_level] ??
                                  "border-command-700 text-slate-300"
                                }`}
                              >
                                {r.risk_level}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="p-6 text-center text-sm text-slate-500">
                    No zone rankings were returned for this scenario.
                  </p>
                )}

                <div className="border-t border-command-700 px-5 py-3 text-[10px] leading-relaxed text-slate-500">
                  Scenario ID: {result.id.slice(0, 8)} · Rainfall:{" "}
                  {result.inputs.rainfall_mm} mm · Window:{" "}
                  {result.inputs.hours} hours
                </div>
              </div>

              {/* Methodology note */}
              <div className="rounded-xl border border-command-700 bg-command-900/60 p-4">
                <p className="text-xs font-semibold text-slate-300">
                  How to interpret these results
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Rankings use the selected rainfall total, configured
                  terrain and drainage scores, and current unresolved
                  incident evidence. The rainfall window is recorded as
                  scenario context; it does not independently change the
                  risk score. These results are simulated decision-support
                  outputs, not official flood warnings or predictions.
                </p>
              </div>
            </>
          ) : (
            <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-command-700 bg-command-900/50 p-8 text-center">
              <span className="mb-4 rounded-2xl bg-purple-500/10 p-4 text-purple-400">
                <FlaskConical className="h-8 w-8" />
              </span>
              <h3 className="font-semibold text-white">
                Ready to simulate
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                Select a rainfall preset or adjust the sliders, then run
                your scenario to compare risk levels across Greater Noida.
              </p>
              <span className="mt-4 text-[10px] uppercase tracking-wider text-purple-300">
                Waiting for simulation input
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

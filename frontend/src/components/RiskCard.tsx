"use client";

import type { Zone } from "@/lib/types";

const LEVEL_STYLES: Record<string, string> = {
  Low: "bg-green-500/10 text-green-400 border-green-500/30",
  Medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  High: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  Severe: "bg-red-500/10 text-red-400 border-red-500/30",
};

function contribution(score: number | undefined, weight: number) {
  return ((score ?? 0) * weight).toFixed(1);
}

export default function RiskCard({ zone, rank }: { zone: Zone; rank: number }) {
  const risk = zone.latest_risk;
  const level = risk?.risk_level || "Low";
  const score = risk?.risk_score ?? 0;

  let explanation: Record<string, number> = {};
  if (risk?.explanation) {
    try {
      explanation = JSON.parse(risk.explanation as unknown as string);
    } catch {
      explanation = {};
    }
  } else if (risk) {
    explanation = {
      rainfall_contribution: (risk.rainfall_score ?? 0) * 0.35,
      terrain_contribution: (risk.terrain_score ?? 0) * 0.25,
      drainage_contribution: (risk.drainage_score ?? 0) * 0.2,
      incident_contribution: (risk.incident_score ?? 0) * 0.2,
    };
  }

  return (
    <div className="rounded-2xl border border-command-700 bg-command-900 p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            #{rank} Hotspot
          </div>
          <h4 className="mt-0.5 font-semibold text-white">{zone.name}</h4>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${LEVEL_STYLES[level]}`}
        >
          {level}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="text-3xl font-extrabold text-white">{score.toFixed(2)}</div>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-command-800">
          <div
            className={`h-full rounded-full ${
              score >= 85
                ? "bg-red-500"
                : score >= 60
                  ? "bg-orange-500"
                  : score >= 30
                    ? "bg-yellow-500"
                    : "bg-green-500"
            }`}
            style={{ width: `${Math.min(100, score)}%` }}
          />
        </div>
      </div>

      <dl className="mt-3 space-y-1 text-xs text-slate-400">
        <div className="flex justify-between">
          <dt>Rainfall (0.35)</dt>
          <dd className="text-slate-200">{contribution(risk?.rainfall_score, 0.35)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Terrain (0.25)</dt>
          <dd className="text-slate-200">{contribution(risk?.terrain_score, 0.25)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Drainage (0.20)</dt>
          <dd className="text-slate-200">{contribution(risk?.drainage_score, 0.2)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Incidents (0.20)</dt>
          <dd className="text-slate-200">{contribution(risk?.incident_score, 0.2)}</dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
        <span>{zone.open_incidents} open incident(s)</span>
        <span className="flex items-center gap-1.5">
          {risk?.is_simulated && (
            <span className="rounded bg-purple-500/15 px-1.5 py-0.5 font-medium uppercase text-purple-300">
              Simulated
            </span>
          )}
          <span>Confidence: {risk?.confidence ?? "—"}</span>
        </span>
      </div>
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldAlert, Siren, Thermometer } from "lucide-react";
import WeatherPanel from "@/components/WeatherPanel";
import RiskCard from "@/components/RiskCard";
import IncidentTable from "@/components/IncidentTable";
import { api, getRole } from "@/lib/api";
import { useLiveRefetch } from "@/lib/useLiveIncidents";
import type { Incident, Team, WeatherResponse, Zone } from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[480px] items-center justify-center rounded-xl bg-command-800 text-sm text-slate-500">
      Loading map…
    </div>
  ),
});

export default function DashboardPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [backend, setBackend] = useState<string>("");
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [z, i, t, w] = await Promise.all([
        api<{ zones: Zone[]; backend: string }>("/api/v1/zones"),
        api<{ incidents: Incident[] }>("/api/v1/incidents"),
        api<{ teams: Team[] }>("/api/v1/teams"),
        api<WeatherResponse>("/api/v1/weather"),
      ]);
      setZones(z.zones);
      setBackend(z.backend);
      setIncidents(i.incidents);
      setTeams(t.teams);
      setWeather(w);
    } catch {
      setNotice("Cannot reach the backend API. Start it with: uvicorn app.main:app --reload --port 8000");
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useLiveRefetch(load);

  const refreshRisk = async () => {
    await api("/api/v1/risk/refresh", { method: "POST" });
    await load();
  };

  const openIncidents = incidents.filter((i) => i.status !== "resolved");
  const ranked = [...zones].sort(
    (a, b) => (b.latest_risk?.risk_score ?? 0) - (a.latest_risk?.risk_score ?? 0)
  );
  const top = ranked[0];
  const role = typeof window !== "undefined" ? getRole() : "viewer";
  const isOperator = role === "operator" || role === "admin";

  const onStatusChange = async (incident: Incident, status: string) => {
    await api(`/api/v1/incidents/${incident.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await load();
  };

  const onAssign = async (incident: Incident) => {
    const available = teams.find((t) => t.availability === "available") || teams[0];
    if (!available) return;
    await api<{ id: string }>("/api/v1/assignments", {
      method: "POST",
      body: JSON.stringify({
        incident_id: incident.id,
        team_id: available.id,
        assigned_by: role,
        notes: "Assigned from command dashboard",
      }),
    }).catch((e) => setNotice(e.message));
    await api(`/api/v1/teams/${available.id}`, {
      method: "PATCH",
      body: JSON.stringify({ availability: "busy" }),
    }).catch(() => undefined);
    await load();
  };

  const stats = [
    { icon: ShieldAlert, label: "Zones monitored", value: zones.length },
    { icon: Siren, label: "Open incidents", value: openIncidents.length },
    { icon: RefreshCw, label: "Highest-risk zone", value: top ? `${top.name} (${top.latest_risk?.risk_score?.toFixed(1) ?? "—"})` : "—" },
    { icon: Thermometer, label: "Temp / rain now", value: `${weather?.current?.temperature_2m ?? "—"}°C / ${weather?.current?.precipitation ?? "—"} mm` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Command Dashboard</h1>
          <p className="text-sm text-slate-400">
            Greater Noida pilot · Backend: {backend || "…"} · Auto-refresh every 5 s
            {notice && <span className="ml-2 text-amber-400">{notice}</span>}
          </p>
        </div>
        <button
          onClick={refreshRisk}
          className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
        >
          <RefreshCw className="h-4 w-4" />
          Recompute risk from live weather
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-2xl border border-command-700 bg-command-900 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Icon className="h-4 w-4 text-sky-400" /> {label}
            </div>
            <div className="mt-1.5 text-xl font-bold text-white">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-command-700 bg-command-900 p-2 lg:col-span-2">
          <MapView zones={zones} incidents={incidents} />
          <p className="px-3 py-2 text-[11px] text-slate-500">
            Circles = monitoring zones (colour = risk level) · Dots = open incidents (colour = severity)
          </p>
        </div>
        <WeatherPanel weather={weather} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-white">Hotspot ranking — explainable risk</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ranked.map((z, idx) => (
            <RiskCard key={z.id} zone={z} rank={idx + 1} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-white">Incident queue</h2>
        <IncidentTable
          incidents={incidents.slice(0, 8)}
          teams={teams}
          role={role}
          onStatusChange={onStatusChange}
          onAssign={onAssign}
        />
      </div>
    </div>
  );
}

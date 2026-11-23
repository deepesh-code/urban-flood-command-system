
"use client";

import { useCallback, useEffect, useState } from "react";
import IncidentForm from "@/components/IncidentForm";
import IncidentTable from "@/components/IncidentTable";
import { api, getRole } from "@/lib/api";
import { useLiveRefetch } from "@/lib/useLiveIncidents";
import type { Incident, Team, Zone } from "@/lib/types";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [filter, setFilter] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [assigningIncidentId, setAssigningIncidentId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const query = filter ? `?status=${filter}` : "";

    const [i, z, t] = await Promise.all([
      api<{ incidents: Incident[] }>(`/api/v1/incidents${query}`),
      api<{ zones: Zone[] }>("/api/v1/zones"),
      api<{ teams: Team[] }>("/api/v1/teams"),
    ]);

    setIncidents(i.incidents);
    setZones(z.zones);
    setTeams(t.teams);
  }, [filter]);

  useEffect(() => {
    load().catch(() => setNotice("Cannot reach backend API."));
  }, [load]);

  useLiveRefetch(() => load().catch(() => undefined));

  const role = typeof window !== "undefined" ? getRole() : "viewer";

  const onStatusChange = async (incident: Incident, status: string) => {
    try {
      await api(`/api/v1/incidents/${incident.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setNotice(null);
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Status change failed");
    }
  };

  const onAssign = async (incident: Incident) => {
    if (incident.status !== "new" || assigningIncidentId !== null) {
      return;
    }

    const team = teams.find((t) => t.availability === "available");

    if (!team) {
      setNotice("No available response team. Update team availability first.");
      return;
    }

    setAssigningIncidentId(incident.id);

    try {
      await api("/api/v1/assignments", {
        method: "POST",
        body: JSON.stringify({
          incident_id: incident.id,
          team_id: team.id,
          assigned_by: role,
        }),
      });

      setNotice(null);
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Assignment failed");
    } finally {
      setAssigningIncidentId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Incident Reporting &amp; Queue
          </h1>

          <p className="text-sm text-slate-400">
            Reports are stored in the database and appear on the map.{" "}
            {notice && (
              <span className="text-amber-400">{notice}</span>
            )}
          </p>
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-command-700 bg-command-800 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="assigned">Assigned</option>
          <option value="on_site">On site</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <IncidentForm zones={zones} onCreated={() => load()} />

        <div className="lg:col-span-2">
          <IncidentTable
            incidents={incidents}
            teams={teams}
            role={role}
            onStatusChange={onStatusChange}
            onAssign={onAssign}
            assigningIncidentId={assigningIncidentId}
          />
        </div>
      </div>
    </div>
  );
}

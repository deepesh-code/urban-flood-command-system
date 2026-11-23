"use client";

import { useCallback, useEffect, useState } from "react";
import { Phone, User } from "lucide-react";
import { api, getRole } from "@/lib/api";
import { useLiveRefetch } from "@/lib/useLiveIncidents";
import type { Assignment, Incident, Team } from "@/lib/types";

const AVAILABILITY_STYLES: Record<string, string> = {
  available: "text-green-400 border-green-500/30 bg-green-500/10",
  busy: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  offline: "text-slate-400 border-slate-500/30 bg-slate-500/10",
};

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [t, a, i] = await Promise.all([
      api<{ teams: Team[] }>("/api/v1/teams"),
      api<{ assignments: Assignment[] }>("/api/v1/assignments"),
      api<{ incidents: Incident[] }>("/api/v1/incidents"),
    ]);
    setTeams(t.teams);
    setAssignments(a.assignments);
    setIncidents(i.incidents);
  }, []);

  useEffect(() => { load().catch(() => setNotice("Cannot reach backend API.")); }, [load]);
  useLiveRefetch(() => load().catch(() => undefined));

  const role = typeof window !== "undefined" ? getRole() : "viewer";
  const isOperator = role === "operator" || role === "admin";

  const setAvailability = async (team: Team, availability: string) => {
    try {
      await api(`/api/v1/teams/${team.id}`, {
        method: "PATCH",
        body: JSON.stringify({ availability }),
      });
      setNotice(null);
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Update failed");
    }
  };

  const incidentTitle = (id: string) =>
    incidents.find((i) => i.id === id)?.title || id.slice(0, 8);

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name || id.slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Response Management</h1>
        <p className="text-sm text-slate-400">
          Teams, assignments and the operator audit trail. {notice && <span className="text-amber-400">{notice}</span>}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {teams.map((t) => (
          <div key={t.id} className="rounded-2xl border border-command-700 bg-command-900 p-4">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-white">{t.name}</h3>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${AVAILABILITY_STYLES[t.availability]}`}
              >
                {t.availability}
              </span>
            </div>
            <div className="mt-2 space-y-1 text-xs text-slate-400">
              <p className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {t.contact_name}</p>
              <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {t.contact_phone}</p>
            </div>
            {isOperator && (
              <select
                value={t.availability}
                onChange={(e) => setAvailability(t, e.target.value)}
                className="mt-3 w-full rounded-lg border border-command-700 bg-command-800 px-2 py-1.5 text-xs"
              >
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="offline">Offline</option>
              </select>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-command-700 bg-command-900">
        <div className="border-b border-command-700 px-5 py-3">
          <h3 className="font-semibold text-white">Assignment log (audit trail)</h3>
        </div>
        {assignments.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            No assignments yet. Go to Incidents and assign a team as Operator.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-command-700 text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-5 py-2.5">Incident</th>
                <th className="px-5 py-2.5">Assigned team</th>
                <th className="px-5 py-2.5">Assigned by</th>
                <th className="px-5 py-2.5">Time</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id} className="border-b border-command-800 last:border-0">
                  <td className="px-5 py-3 text-slate-200">{incidentTitle(a.incident_id)}</td>
                  <td className="px-5 py-3 text-slate-200">{teamName(a.team_id)}</td>
                  <td className="px-5 py-3 text-slate-400">{a.assigned_by || "system"}</td>
                  <td className="px-5 py-3 text-xs text-slate-400">
                    {new Date(a.assigned_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

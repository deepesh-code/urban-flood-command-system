"use client";

import type { Incident, Team } from "@/lib/types";
import { SeverityBadge, StatusBadge } from "./StatusBadge";

const NEXT_STATUS: Record<string, { label: string; value: string } | null> = {
  new: { label: "Mark on site", value: "on_site" },
  assigned: { label: "Mark on site", value: "on_site" },
  on_site: { label: "Resolve", value: "resolved" },
  resolved: null,
};

interface Props {
  incidents: Incident[];
  teams: Team[];
  role: string;
  onStatusChange: (incident: Incident, status: string) => void;
  onAssign: (incident: Incident) => void;
}

export default function IncidentTable({ incidents, teams, role, onStatusChange, onAssign }: Props) {
  if (incidents.length === 0) {
    return (
      <div className="rounded-2xl border border-command-700 bg-command-900 p-8 text-center text-sm text-slate-500">
        No incidents yet. Submit the first waterlogging report above.
      </div>
    );
  }

  const isOperator = role === "operator" || role === "admin";

  return (
    <div className="overflow-x-auto rounded-2xl border border-command-700 bg-command-900">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-command-700 text-[11px] uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3">Incident</th>
            <th className="px-4 py-3">Severity</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Reported</th>
            {isOperator && <th className="px-4 py-3 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {incidents.map((i) => {
            const next = NEXT_STATUS[i.status];
            return (
              <tr key={i.id} className="border-b border-command-800 last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-100">{i.title}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                    <span className="line-clamp-1">{i.description}</span>
                    {i.is_simulated && (
                      <span className="shrink-0 rounded bg-purple-500/15 px-1.5 py-0.5 text-[9px] font-medium uppercase text-purple-300">
                        Simulated
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3"><SeverityBadge severity={i.severity} /></td>
                <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {i.latitude.toFixed(4)}, {i.longitude.toFixed(4)}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {new Date(i.created_at).toLocaleString()}
                </td>
                {isOperator && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {(i.status === "new" || i.status === "assigned") && (
                        <button
                          onClick={() => onAssign(i)}
                          className="rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-300 hover:bg-indigo-500/20"
                        >
                          Assign team
                        </button>
                      )}
                      {next && (
                        <button
                          onClick={() => onStatusChange(i, next.value)}
                          className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-xs text-sky-300 hover:bg-sky-500/20"
                        >
                          {next.label}
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {!isOperator && (
        <p className="border-t border-command-700 px-4 py-2 text-[11px] text-slate-500">
          Signed in as Viewer — read-only. Switch to Operator to assign teams and change status.
        </p>
      )}
    </div>
  );
}

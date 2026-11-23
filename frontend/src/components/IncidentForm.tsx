"use client";

import { useState } from "react";
import { Siren } from "lucide-react";
import type { Zone } from "@/lib/types";
import { api } from "@/lib/api";

interface Props {
  zones: Zone[];
  onCreated: () => void;
}

export default function IncidentForm({ zones, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [zoneId, setZoneId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const zone = zones.find((z) => z.id === zoneId);
      const lat = zone?.center_lat ?? 28.4744;
      const lng = zone?.center_lng ?? 77.504;
      await api("/api/v1/incidents", {
        method: "POST",
        body: JSON.stringify({
          title,
          description: description || undefined,
          severity,
          zone_id: zoneId || undefined,
          latitude: lat + (Math.random() - 0.5) * 0.01,
          longitude: lng + (Math.random() - 0.5) * 0.01,
          reported_by: "dashboard-user",
        }),
      });
      setTitle("");
      setDescription("");
      setMessage("Incident submitted — it now appears on the map and in the queue.");
      onCreated();
    } catch (err) {
      setMessage(`Failed: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-command-700 bg-command-900 p-5"
    >
      <h3 className="mb-4 flex items-center gap-2 font-semibold text-white">
        <Siren className="h-5 w-5 text-red-400" />
        Report a waterlogging incident
      </h3>

      <div className="space-y-3">
        <input
          required
          minLength={3}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title, e.g. Waterlogging near Pari Chowk underpass"
          className="w-full rounded-xl border border-command-700 bg-command-800 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="w-full rounded-xl border border-command-700 bg-command-800 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            className="rounded-xl border border-command-700 bg-command-800 px-3 py-2.5 text-sm"
          >
            <option value="">Pick zone (optional)</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="rounded-xl border border-command-700 bg-command-800 px-3 py-2.5 text-sm"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-red-500/90 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
        >
          {busy ? "Submitting…" : "Submit incident"}
        </button>

        {message && <p className="text-xs text-slate-400">{message}</p>}
      </div>
    </form>
  );
}

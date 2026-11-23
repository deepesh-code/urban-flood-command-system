import Link from "next/link";
import { CloudRain, Map, ShieldCheck, SlidersHorizontal } from "lucide-react";

const FEATURES = [
  {
    icon: Map,
    title: "Command Dashboard",
    body: "Live Greater Noida map, zone risk ranking, real Open-Meteo weather and the incident queue in one view.",
  },
  {
    icon: SlidersHorizontal,
    title: "Scenario Simulator",
    body: "Slide rainfall up and watch hotspot risk scores recalculate instantly — every simulated result is clearly labelled.",
  },
  {
    icon: ShieldCheck,
    title: "Response Management",
    body: "Assign response teams, transition incident status and keep a full audit trail. Viewers are read-only.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/10">
        <CloudRain className="h-9 w-9 text-sky-400" />
      </div>
      <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight text-white">
        Urban Flood Command System
      </h1>
      <p className="mt-3 max-w-xl text-slate-400">
        AI flood risk &amp; emergency coordination for the Greater Noida
        pilot. Explainable hotspot ranking, real weather data, incident
        reporting and operator-approved response — in one command view.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 rounded-xl bg-sky-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-sky-400"
      >
        Open Command Dashboard
      </Link>

      <div className="mt-16 grid w-full gap-4 text-left md:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-2xl border border-command-700 bg-command-900 p-6"
          >
            <Icon className="mb-3 h-6 w-6 text-sky-400" />
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="mt-1 text-sm text-slate-400">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

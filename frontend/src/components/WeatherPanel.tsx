
"use client";

import { CloudRain, Thermometer, Clock, Info } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeatherResponse } from "@/lib/types";

export default function WeatherPanel({
  weather,
}: {
  weather: WeatherResponse | null;
}) {
  if (!weather) {
    return (
      <div className="rounded-2xl border border-command-700 bg-command-900 p-5 text-sm text-slate-400">
        Weather data unavailable — check the backend connection.
      </div>
    );
  }

  const chartData =
    weather.hourly?.time.slice(0, 24).map((t, idx) => ({
      time: t.slice(11, 16),
      precipitation: weather.hourly!.precipitation[idx] ?? 0,
      probability: weather.hourly!.precipitation_probability?.[idx] ?? 0,
    })) ?? [];

  const hasRain = chartData.some((item) => item.precipitation > 0);
  const isSimulated = weather.data_type === "simulated_fallback";

  return (
    <div className="rounded-2xl border border-command-700 bg-command-900 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold text-white">
          <CloudRain className="h-5 w-5 text-sky-400" />
          Weather — {weather.zone_name || "Greater Noida"}
        </h3>

        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
            isSimulated
              ? "border-purple-500/30 bg-purple-500/10 text-purple-300"
              : "border-sky-500/30 bg-sky-500/10 text-sky-300"
          }`}
        >
          {isSimulated ? "Synthetic demo data" : "Weather model forecast"}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-command-800 p-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Thermometer className="h-3.5 w-3.5" />
            Temperature
          </div>
          <div className="mt-1 text-2xl font-bold text-white">
            {weather.current?.temperature_2m ?? "—"}°C
          </div>
        </div>

        <div className="rounded-xl bg-command-800 p-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <CloudRain className="h-3.5 w-3.5" />
            Precipitation now
          </div>
          <div className="mt-1 text-2xl font-bold text-white">
            {weather.current?.precipitation ?? "—"} mm
          </div>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-slate-300">
          Next 24 hours — precipitation
        </p>
        <span className="text-[10px] text-slate-500">Rainfall (mm)</span>
      </div>

      <div className="relative h-36">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 4, right: 4, left: -22, bottom: 0 }}
            >
              <defs>
                <linearGradient id="rain" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                interval={5}
              />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: 8,
                }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Area
                type="monotone"
                dataKey="precipitation"
                name="Rain (mm)"
                stroke="#38bdf8"
                fill="url(#rain)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-command-700 text-xs text-slate-500">
            No hourly precipitation data available.
          </div>
        )}
      </div>

      {chartData.length > 0 && !hasRain && (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
          <p className="text-[11px] leading-relaxed text-slate-400">
            No precipitation is indicated in the available 24-hour model
            data. This does not guarantee that local rainfall will not occur.
          </p>
        </div>
      )}

      <div className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-500">
        <Clock className="mt-0.5 h-3 w-3 shrink-0" />
        <span>
          Source: {weather.source} · Retrieved {weather.retrieved_at}
          {weather.cached && " (cached)"} ·{" "}
          {isSimulated
            ? "Synthetic demonstration data — not live weather."
            : "Weather model forecast — not a rain-gauge observation."}
        </span>
      </div>
    </div>
  );
}

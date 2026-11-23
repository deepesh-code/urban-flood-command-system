"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import type { Incident, Zone } from "@/lib/types";

const LEVEL_COLORS: Record<string, string> = {
  Low: "#22c55e",
  Medium: "#eab308",
  High: "#f97316",
  Severe: "#ef4444",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#f97316",
  critical: "#ef4444",
};

const incidentIcon = (severity: string) =>
  L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${SEVERITY_COLORS[severity] || "#eab308"};border:2px solid #fff;box-shadow:0 0 6px rgba(0,0,0,.6)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

interface Props {
  zones: Zone[];
  incidents: Incident[];
  height?: string;
}

export default function MapView({ zones, incidents, height = "480px" }: Props) {
  const openIncidents = incidents.filter((i) => i.status !== "resolved");

  return (
    <div style={{ height }} className="w-full">
      <MapContainer
        center={[28.4744, 77.504]}
        zoom={12}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {zones.map((z) => {
          const level = z.latest_risk?.risk_level || "Low";
          return (
            <CircleMarker
              key={z.id}
              center={[z.center_lat, z.center_lng]}
              radius={16}
              pathOptions={{
                color: LEVEL_COLORS[level],
                fillColor: LEVEL_COLORS[level],
                fillOpacity: 0.35,
                weight: 2,
              }}
            >
              <Popup>
                <strong>{z.name}</strong>
                <br />
                Risk: {z.latest_risk?.risk_score ?? "—"} ({level})
                <br />
                Open incidents: {z.open_incidents}
                <br />
                <em>
                  Terrain {z.terrain_score} · Drainage {z.drainage_score}
                </em>
              </Popup>
            </CircleMarker>
          );
        })}

        {openIncidents.map((i) => (
          <Marker
            key={i.id}
            position={[i.latitude, i.longitude]}
            icon={incidentIcon(i.severity)}
          >
            <Popup>
              <strong>{i.title}</strong>
              <br />
              Severity: {i.severity} · Status: {i.status}
              {i.is_simulated && (
                <>
                  <br />
                  <em>Simulated report</em>
                </>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

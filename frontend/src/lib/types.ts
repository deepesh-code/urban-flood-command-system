export type Role = "viewer" | "operator" | "admin";

export interface Zone {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  terrain_score: number;
  drainage_score: number;
  open_incidents: number;
  incident_score: number;
  latest_risk: RiskAssessment | null;
}

export interface RiskAssessment {
  id: string;
  zone_id: string;
  risk_score: number;
  risk_level: "Low" | "Medium" | "High" | "Severe";
  confidence: "High" | "Medium" | "Low";
  is_simulated: boolean;
  rainfall_score: number;
  terrain_score: number;
  drainage_score: number;
  incident_score: number;
  explanation?: string;
  created_at: string;
}

export interface Incident {
  id: string;
  zone_id: string | null;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  severity: "low" | "medium" | "high" | "critical";
  status: "new" | "assigned" | "on_site" | "resolved";
  verified: boolean;
  is_simulated: boolean;
  source: string;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  availability: "available" | "busy" | "offline";
}

export interface Assignment {
  id: string;
  incident_id: string;
  team_id: string;
  assigned_by: string | null;
  notes: string | null;
  assigned_at: string;
}

export interface WeatherResponse {
  source: string;
  data_type: string;
  retrieved_at: string;
  cached: boolean;
  zone_name?: string | null;
  current: {
    time: string;
    temperature_2m: number;
    precipitation: number;
    rain: number;
  } | null;
  hourly: {
    time: string[];
    precipitation: number[];
    precipitation_probability: number[];
  } | null;
}

export interface ScenarioResult {
  zone: string;
  zone_id: string;
  risk_score: number;
  risk_level: string;
  confidence: string;
  is_simulated: boolean;
  inputs: Record<string, number>;
}

export interface ScenarioResponse {
  id: string;
  is_simulated: boolean;
  inputs: { rainfall_mm: number; hours: number };
  ranking: ScenarioResult[];
}

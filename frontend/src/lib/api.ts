import type { Role } from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getRole(): Role {
  if (typeof window === "undefined") return "viewer";
  return (localStorage.getItem("ufcs_role") as Role) || "viewer";
}

export function setRole(role: Role) {
  localStorage.setItem("ufcs_role", role);
  window.dispatchEvent(new Event("ufcs-role-changed"));
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Role": getRole(),
      ...options.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* keep default message */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

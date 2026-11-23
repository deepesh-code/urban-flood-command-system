"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CloudRain, Map, Siren, SlidersHorizontal, Users } from "lucide-react";
import { getRole, setRole } from "@/lib/api";
import type { Role } from "@/lib/types";

const LINKS = [
  { href: "/dashboard", label: "Command Dashboard", icon: Map },
  { href: "/incidents", label: "Incidents", icon: Siren },
  { href: "/simulator", label: "Scenario Simulator", icon: SlidersHorizontal },
  { href: "/teams", label: "Response Teams", icon: Users },
];

export default function Navbar() {
  const pathname = usePathname();
  const [role, setRoleState] = useState<Role>("viewer");

  useEffect(() => {
    setRoleState(getRole());
    const onChange = () => setRoleState(getRole());
    window.addEventListener("ufcs-role-changed", onChange);
    return () => window.removeEventListener("ufcs-role-changed", onChange);
  }, []);

  return (
    <header className="border-b border-command-700 bg-command-900/80 backdrop-blur sticky top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <CloudRain className="h-6 w-6 text-sky-400" />
          <div>
            <div className="text-sm font-bold leading-tight">
              Urban Flood Command System
            </div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400">
              Greater Noida pilot
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition ${
                pathname.startsWith(href)
                  ? "bg-sky-500/15 text-sky-300"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400" htmlFor="role">
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="rounded-lg border border-command-700 bg-command-800 px-2 py-1.5 text-sm capitalize"
          >
            <option value="viewer">Viewer</option>
            <option value="operator">Operator</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
    </header>
  );
}

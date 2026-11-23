const STATUS_STYLES: Record<string, string> = {
  new: "bg-sky-500/10 text-sky-300 border-sky-500/30",
  assigned: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
  on_site: "bg-orange-500/10 text-orange-300 border-orange-500/30",
  resolved: "bg-green-500/10 text-green-300 border-green-500/30",
};

const SEVERITY_STYLES: Record<string, string> = {
  low: "text-green-400",
  medium: "text-yellow-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLES[status] || STATUS_STYLES.new}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={`text-xs font-semibold uppercase tracking-wide ${SEVERITY_STYLES[severity] || ""}`}>
      {severity}
    </span>
  );
}

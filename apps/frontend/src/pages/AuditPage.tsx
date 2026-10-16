import { useQuery } from "@tanstack/react-query";
import { getAuditLogs } from "../api/audit";

const ACTION_STYLES: Record<string, string> = {
  CREATE: "bg-green-50 border-green-200 text-green-800",
  UPDATE: "bg-yellow-50 border-yellow-200 text-yellow-800",
  DELETE: "bg-red-50 border-red-200 text-red-800",
  LOGIN:  "bg-blue-50 border-blue-200 text-blue-800",
  LOGOUT: "bg-slate-50 border-slate-200 text-slate-600",
  EXPORT: "bg-purple-50 border-purple-200 text-purple-800",
  IMPORT: "bg-sky-50 border-sky-200 text-sky-800",
};

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
];

function getActionStyle(action: string) {
  const upper = action?.toUpperCase() ?? "";
  for (const key of Object.keys(ACTION_STYLES)) {
    if (upper.includes(key)) return ACTION_STYLES[key];
  }
  return "bg-slate-50 border-slate-200 text-slate-600";
}

function getActionLabel(action: string) {
  const upper = action?.toUpperCase() ?? "";
  for (const key of Object.keys(ACTION_STYLES)) {
    if (upper.includes(key)) return key;
  }
  return action?.slice(0, 8).toUpperCase() ?? "ACTION";
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch {
    return iso;
  }
}

export function AuditPage() {
  const query = useQuery({ queryKey: ["audit"], queryFn: () => getAuditLogs(200) });
  const logs  = query.data ?? [];

  // Quick stats
  const createCount = logs.filter((r) => r.action?.toUpperCase().includes("CREATE")).length;
  const updateCount = logs.filter((r) => r.action?.toUpperCase().includes("UPDATE")).length;
  const deleteCount = logs.filter((r) => r.action?.toUpperCase().includes("DELETE")).length;

  return (
    <section className="space-y-4">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Audit Trail</h2>
          <p className="mt-0.5 text-sm text-slate-500">Complete log of all admin actions in the system.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <svg className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
          </svg>
          <span className="text-xs font-semibold text-slate-400">Search logs...</span>
        </div>
      </div>

      {/* ── Quick stat strip ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Events", value: logs.length, bg: "bg-blue-50 border-blue-100",    text: "text-blue-800"   },
          { label: "Creates",      value: createCount, bg: "bg-green-50 border-green-100",  text: "text-green-800"  },
          { label: "Updates",      value: updateCount, bg: "bg-yellow-50 border-yellow-100", text: "text-yellow-800" },
          { label: "Deletes",      value: deleteCount, bg: "bg-red-50 border-red-100",       text: "text-red-800"    },
        ].map(({ label, value, bg, text }) => (
          <div key={label} className={`rounded-2xl border p-3.5 ${bg}`}>
            <p className={`text-[9px] font-bold uppercase tracking-widest ${text} opacity-70`}>{label}</p>
            <p className={`mt-1 text-2xl font-extrabold ${text}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
          <h3 className="text-sm font-bold text-slate-800">System Events</h3>
          <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            {logs.length} entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/60">
                {["Time", "Actor", "Action", "Resource", "Details"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((row, i) => (
                <tr key={row.id} className="border-t border-slate-50 transition hover:bg-slate-50/70">
                  {/* Time */}
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {formatTime(row.created_at)}
                  </td>

                  {/* Actor */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                        {(row.actor_username?.[0] ?? "?").toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{row.actor_username}</p>
                        <p className="text-[9px] text-slate-400">{row.actor_role}</p>
                      </div>
                    </div>
                  </td>

                  {/* Action badge */}
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-md border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${getActionStyle(row.action)}`}>
                      {getActionLabel(row.action)}
                    </span>
                  </td>

                  {/* Resource */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-[11px] text-slate-500">
                      {row.resource_type}:{row.resource_id}
                    </span>
                  </td>

                  {/* Details */}
                  <td className="px-4 py-3 max-w-xs truncate text-xs text-slate-500" title={row.details}>
                    {row.details}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-slate-400">
                    No audit events recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
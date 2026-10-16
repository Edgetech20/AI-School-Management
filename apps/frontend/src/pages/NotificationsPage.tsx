import { useQuery } from "@tanstack/react-query";
import { getNotifications } from "../api/notifications";

const CHANNEL_STYLES: Record<string, { badge: string; icon: JSX.Element }> = {
  sms: {
    badge: "bg-blue-50 border-blue-200 text-blue-800",
    icon: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  email: {
    badge: "bg-purple-50 border-purple-200 text-purple-800",
    icon: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
  push: {
    badge: "bg-amber-50 border-amber-200 text-amber-800",
    icon: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path strokeLinecap="round" d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  system: {
    badge: "bg-slate-50 border-slate-200 text-slate-700",
    icon: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path strokeLinecap="round" d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
      </svg>
    ),
  },
};

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
  "bg-pink-100 text-pink-700",
];

function getChannelConfig(type: string) {
  return CHANNEL_STYLES[type?.toLowerCase()] ?? CHANNEL_STYLES.system;
}

function formatTime(iso: string) {
  try {
    const [datePart, timePart = ""] = iso.split("T");
    const [year, month, day] = datePart.split("-").map((x) => Number(x));
    const [hRaw = "0", mRaw = "0"] = timePart.split(":");
    const hour24 = Number(hRaw);
    const minute = Number(mRaw);
    const hour12 = hour24 % 12 || 12;
    const suffix = hour24 >= 12 ? "PM" : "AM";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${String(day).padStart(2, "0")} ${months[Math.max(0, month - 1)]}, ${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${suffix}`;
  } catch {
    return iso;
  }
}

export function NotificationsPage() {
  const query = useQuery({ queryKey: ["notifications"], queryFn: getNotifications });
  const logs  = query.data ?? [];

  // Quick stats
  const smsCount    = logs.filter((r) => r.type?.toLowerCase() === "sms").length;
  const emailCount  = logs.filter((r) => r.type?.toLowerCase() === "email").length;
  const systemCount = logs.filter((r) => !r.student_id).length;

  return (
    <section className="space-y-4">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Notification Logs</h2>
          <p className="mt-0.5 text-sm text-slate-500">All outbound notifications sent to students and parents.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <svg className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
          </svg>
          <span className="text-xs font-semibold text-slate-400">Search logs...</span>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total Sent",  value: logs.length,   bg: "bg-blue-50 border-blue-100",    text: "text-blue-800",   icon: <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path strokeLinecap="round" d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
          { label: "SMS",         value: smsCount,       bg: "bg-sky-50 border-sky-100",      text: "text-sky-800",    icon: <svg className="h-4 w-4 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
          { label: "Email",       value: emailCount,     bg: "bg-purple-50 border-purple-100",text: "text-purple-800", icon: <svg className="h-4 w-4 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> },
          { label: "System",      value: systemCount,    bg: "bg-slate-50 border-slate-200",  text: "text-slate-700",  icon: <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path strokeLinecap="round" d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg> },
        ].map(({ label, value, bg, text, icon }) => (
          <div key={label} className={`flex items-center gap-3 rounded-2xl border p-4 ${bg}`}>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${bg}`}>
              {icon}
            </div>
            <div>
              <p className={`text-[9px] font-bold uppercase tracking-widest ${text} opacity-70`}>{label}</p>
              <p className={`text-2xl font-extrabold ${text}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
          <h3 className="text-sm font-bold text-slate-800">Notification History</h3>
          <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            {logs.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/60">
                {["ID", "Recipient", "Channel", "Message", "Sent At"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((row, i) => {
                const { badge, icon } = getChannelConfig(row.type);
                const isSystem = !row.student_id;
                return (
                  <tr key={row.id} className="border-t border-slate-50 transition hover:bg-slate-50/70">

                    {/* ID */}
                    <td className="px-4 py-3 text-[11px] font-medium text-slate-400">
                      #{String(row.id).padStart(4, "0")}
                    </td>

                    {/* Recipient */}
                    <td className="px-4 py-3">
                      {isSystem ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-500">
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="3"/><path strokeLinecap="round" d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
                            </svg>
                          </div>
                          <span className="text-xs font-semibold text-slate-500">System</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                            {String(row.student_id).slice(-2)}
                          </div>
                          <span className="text-xs font-semibold text-slate-800">STU-{row.student_id}</span>
                        </div>
                      )}
                    </td>

                    {/* Channel badge */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold capitalize ${badge}`}>
                        {icon}
                        {row.type}
                      </span>
                    </td>

                    {/* Message */}
                    <td className="px-4 py-3 max-w-xs">
                      <p className="truncate text-xs text-slate-600" title={row.message}>
                        {row.message}
                      </p>
                    </td>

                    {/* Sent at */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                      {formatTime(row.sent_at)}
                    </td>
                  </tr>
                );
              })}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                        <svg className="h-6 w-6 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                          <path strokeLinecap="round" d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-slate-400">No notifications sent yet.</p>
                      <p className="text-xs text-slate-300">Notifications will appear here once triggered.</p>
                    </div>
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
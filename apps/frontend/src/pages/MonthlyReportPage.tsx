import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMonthlyAnalytics } from "../api/analytics";

const STATUS_CONFIG = [
  { key: "Present",  label: "Present",  bar: "bg-emerald-500", track: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200", bg: "bg-emerald-50" },
  { key: "Late",     label: "Late",     bar: "bg-amber-400",   track: "bg-amber-100",   text: "text-amber-800",  border: "border-amber-200",  bg: "bg-amber-50"   },
  { key: "Half-day", label: "Half-day", bar: "bg-sky-400",     track: "bg-sky-100",     text: "text-sky-800",    border: "border-sky-200",    bg: "bg-sky-50"     },
  { key: "Absent",   label: "Absent",   bar: "bg-red-400",     track: "bg-red-100",     text: "text-red-800",    border: "border-red-200",    bg: "bg-red-50"     },
];

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const DAY_INITIALS = ["S","M","T","W","T","F","S"];

export function MonthlyReportPage() {
  const now = useMemo(() => new Date(), []);
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;

  const query = useQuery({
    queryKey: ["analytics-monthly", year, month],
    queryFn: () => getMonthlyAnalytics(year, month),
    refetchInterval: 20000,
  });

  const trend      = query.data?.trend ?? [];
  const summary    = query.data?.summary ?? {};
  const maxPresent = Math.max(1, ...trend.map((row: any) => row.present ?? 0));
  const totalAll   = STATUS_CONFIG.reduce((s, c) => s + (summary[c.key] ?? 0), 0);

  // Calendar helpers
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth     = new Date(year, month, 0).getDate();

  // Build date → value map
  const dateMap: Record<string, number> = {};
  trend.forEach((row: any) => { dateMap[row.date] = row.present ?? 0; });

  // Heatmap colour
  function heatColor(value: number): string {
    const pct = value / maxPresent;
    if (pct === 0) return "#f1f5f9";
    if (pct < 0.25) return "#dcfce7";
    if (pct < 0.5)  return "#86efac";
    if (pct < 0.75) return "#22c55e";
    return "#15803d";
  }

  // Derived insights
  const bestRow  = trend.reduce((a: any, b: any) => ((b.present ?? 0) > (a.present ?? 0) ? b : a), trend[0] ?? {});
  const worstRow = trend.reduce((a: any, b: any) => ((b.present ?? 0) < (a.present ?? 0) ? b : a), trend[0] ?? {});
  const avgPresent = trend.length > 0
    ? Math.round(trend.reduce((s: number, r: any) => s + (r.present ?? 0), 0) / trend.length)
    : 0;

  return (
    <section className="space-y-4">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Monthly Report</h2>
          <p className="mt-0.5 text-sm text-slate-500">Class-wide attendance trend for {MONTH_NAMES[month - 1]} {year}.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <svg className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          <span className="text-xs font-semibold text-slate-500">{MONTH_NAMES[month - 1]} {year}</span>
          {query.isFetching && (
            <svg className="h-3 w-3 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          )}
        </div>
      </div>

      {/* ── Summary stat cards ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {STATUS_CONFIG.map(({ key, label, text, bg, border, bar, track }) => {
          const val = summary[key] ?? 0;
          const pct = totalAll > 0 ? Math.round((val / totalAll) * 100) : 0;
          return (
            <div key={key} className={`relative overflow-hidden rounded-2xl border p-4 ${bg} ${border}`}>
              <p className={`text-[9px] font-bold uppercase tracking-widest ${text} opacity-70`}>{label}</p>
              <p className={`mt-1 text-3xl font-extrabold ${text}`}>{val.toLocaleString()}</p>
              <p className={`mt-0.5 text-[11px] font-semibold ${text} opacity-60`}>{pct}% of total</p>
              <div className={`mt-3 h-1.5 w-full overflow-hidden rounded-full ${track}`}>
                <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Calendar heatmap ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
          <h3 className="text-sm font-bold text-slate-800">Attendance Heatmap</h3>
          {/* Legend */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400">Low</span>
            {["#dcfce7","#86efac","#22c55e","#15803d"].map((c) => (
              <span key={c} className="h-3 w-5 rounded-sm" style={{ background: c }} />
            ))}
            <span className="text-[10px] font-semibold text-slate-400">High</span>
          </div>
        </div>

        <div className="p-5">
          {/* Day-of-week headers */}
          <div className="mb-2 grid grid-cols-7 gap-1.5">
            {DAY_INITIALS.map((d, i) => (
              <div key={i} className="text-center text-[9px] font-bold uppercase tracking-wider text-slate-400">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`e-${i}`} />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day      = i + 1;
              const dateStr  = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const value    = dateMap[dateStr] ?? 0;
              const isToday  = day === now.getDate();
              const color    = heatColor(value);
              const isWeekend = ((firstDayOfMonth + i) % 7 === 0 || (firstDayOfMonth + i) % 7 === 6);

              return (
                <div
                  key={dateStr}
                  title={`${dateStr}: ${value} present`}
                  className={`group relative flex aspect-square items-center justify-center rounded-lg text-[10px] font-bold transition-transform hover:scale-110 ${
                    isToday ? "ring-2 ring-blue-500 ring-offset-1" : ""
                  } ${isWeekend ? "opacity-60" : ""}`}
                  style={{ background: color }}
                >
                  <span style={{ color: value / maxPresent > 0.5 ? "#fff" : "#475569" }}>{day}</span>
                  {/* Tooltip */}
                  <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2 py-1 text-[9px] font-bold text-slate-700 shadow-lg group-hover:block">
                    {value} present
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Insights row ── */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-green-200 bg-green-100">
              <svg className="h-3.5 w-3.5 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-green-700">Best Day</p>
          </div>
          <p className="text-xl font-extrabold text-green-900">{bestRow?.date ?? "—"}</p>
          <p className="mt-0.5 text-xs text-green-700">{bestRow?.present ?? 0} students present</p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-100">
              <svg className="h-3.5 w-3.5 text-red-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M11 17l-5-5m0 0l5-5m-5 5h12"/>
              </svg>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-700">Lowest Day</p>
          </div>
          <p className="text-xl font-extrabold text-red-900">{worstRow?.date ?? "—"}</p>
          <p className="mt-0.5 text-xs text-red-700">{worstRow?.present ?? 0} students present</p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-200 bg-blue-100">
              <svg className="h-3.5 w-3.5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"/>
              </svg>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700">Daily Average</p>
          </div>
          <p className="text-xl font-extrabold text-blue-900">{avgPresent}</p>
          <p className="mt-0.5 text-xs text-blue-700">students / day this month</p>
        </div>
      </div>

    </section>
  );
}
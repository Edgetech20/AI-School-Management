import { useQuery } from "@tanstack/react-query";
import { getWeeklyAnalytics } from "../api/analytics";

const DAY_LABELS: Record<string, string> = {
  "0": "Sun", "1": "Mon", "2": "Tue", "3": "Wed",
  "4": "Thu", "5": "Fri", "6": "Sat",
};

const STATUS_CONFIG = [
  { key: "Present",  label: "Present",  bar: "bg-emerald-500", track: "bg-emerald-100", text: "text-emerald-800", bg: "bg-emerald-50 border-emerald-200" },
  { key: "Late",     label: "Late",     bar: "bg-amber-400",   track: "bg-amber-100",   text: "text-amber-800",  bg: "bg-amber-50 border-amber-200"   },
  { key: "Half-day", label: "Half-day", bar: "bg-sky-400",     track: "bg-sky-100",     text: "text-sky-800",    bg: "bg-sky-50 border-sky-200"       },
  { key: "Absent",   label: "Absent",   bar: "bg-red-400",     track: "bg-red-100",     text: "text-red-800",    bg: "bg-red-50 border-red-200"       },
];

export function WeeklyReportPage() {
  const query = useQuery({
    queryKey: ["analytics-weekly"],
    queryFn: () => getWeeklyAnalytics(),
    refetchInterval: 15000,
  });

  const trend    = query.data?.trend ?? [];
  const summary  = query.data?.summary ?? {};
  const maxTotal = Math.max(1, ...trend.map((row: any) => row.total ?? 0));
  const totalAll = STATUS_CONFIG.reduce((s, c) => s + (summary[c.key] ?? 0), 0);

  // Best & worst day
  const bestDay  = trend.reduce((a: any, b: any) => ((b.total ?? 0) > (a.total ?? 0) ? b : a), trend[0] ?? {});
  const worstDay = trend.reduce((a: any, b: any) => ((b.total ?? 0) < (a.total ?? 0) ? b : a), trend[0] ?? {});

  return (
    <section className="space-y-4">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Weekly Report</h2>
          <p className="mt-0.5 text-sm text-slate-500">Attendance trend for the last 7 days.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <svg className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          <span className="text-xs font-semibold text-slate-500">Last 7 days</span>
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
        {STATUS_CONFIG.map(({ key, label, text, bg, bar, track }) => {
          const val = summary[key] ?? 0;
          const pct = totalAll > 0 ? Math.round((val / totalAll) * 100) : 0;
          return (
            <div key={key} className={`relative overflow-hidden rounded-2xl border p-4 ${bg}`}>
              <p className={`text-[9px] font-bold uppercase tracking-widest ${text} opacity-70`}>{label}</p>
              <p className={`mt-1 text-3xl font-extrabold ${text}`}>{val}</p>
              <p className={`mt-0.5 text-[11px] font-semibold ${text} opacity-60`}>{pct}% of total</p>
              <div className={`mt-3 h-1.5 w-full overflow-hidden rounded-full ${track}`}>
                <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Bar chart ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
          <h3 className="text-sm font-bold text-slate-800">Daily Attendance Trend</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-700" />
              <span className="text-[10px] font-semibold text-slate-500">This week</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-200" />
              <span className="text-[10px] font-semibold text-slate-500">Previous</span>
            </div>
          </div>
        </div>

        <div className="px-6 pb-4 pt-5">
          {/* Y-axis grid lines */}
          <div className="relative">
            <div className="absolute inset-x-0 top-0 flex flex-col justify-between" style={{ height: "180px" }}>
              {[100, 75, 50, 25, 0].map((pct) => (
                <div key={pct} className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-right text-[9px] text-slate-300">
                    {Math.round((pct / 100) * maxTotal)}
                  </span>
                  <div className="flex-1 border-t border-dashed border-slate-100" />
                </div>
              ))}
            </div>

            {/* Bars */}
            <div className="relative ml-8 flex h-[180px] items-end gap-2 pb-0">
              {trend.length > 0 ? trend.map((row: any, i: number) => {
                const value   = row.total ?? 0;
                const barH    = Math.max(4, Math.round((value / maxTotal) * 156));
                const isToday = i === trend.length - 1;
                const dayKey  = new Date(row.date).getDay().toString();
                const label   = DAY_LABELS[dayKey] ?? row.date.slice(5);
                return (
                  <div key={row.date} className="group flex flex-1 flex-col items-center gap-1">
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute -top-7 hidden rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 shadow-lg group-hover:block">
                      {value} students
                    </div>
                    <div
                      className={`relative w-full rounded-t-lg transition-all duration-300 ${
                        isToday
                          ? "bg-gradient-to-t from-blue-900 to-blue-600 ring-2 ring-blue-400 ring-offset-1"
                          : "bg-gradient-to-t from-blue-800 to-blue-400 opacity-60 group-hover:opacity-100"
                      }`}
                      style={{ height: barH }}
                      title={`${row.date}: ${value}`}
                    />
                  </div>
                );
              }) : (
                <div className="flex w-full items-center justify-center text-sm text-slate-400">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* X-axis labels */}
          <div className="ml-8 mt-2 flex gap-2">
            {trend.map((row: any, i: number) => {
              const dayKey  = new Date(row.date).getDay().toString();
              const label   = DAY_LABELS[dayKey] ?? row.date.slice(5);
              const isToday = i === trend.length - 1;
              return (
                <div key={row.date} className="flex flex-1 flex-col items-center gap-0.5">
                  <span className={`text-[10px] font-bold ${isToday ? "text-blue-700" : "text-slate-400"}`}>
                    {label}
                  </span>
                  <span className="text-[9px] text-slate-300">{row.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Insights row ── */}
      <div className="grid gap-3 md:grid-cols-3">

        {/* Best day */}
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-green-200 bg-green-100">
              <svg className="h-3.5 w-3.5 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-green-700">Best Day</p>
          </div>
          <p className="text-xl font-extrabold text-green-900">{bestDay?.date?.slice(5) ?? "—"}</p>
          <p className="mt-0.5 text-xs text-green-700">{bestDay?.total ?? 0} students present</p>
        </div>

        {/* Lowest day */}
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-100">
              <svg className="h-3.5 w-3.5 text-red-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M11 17l-5-5m0 0l5-5m-5 5h12"/>
              </svg>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-700">Lowest Day</p>
          </div>
          <p className="text-xl font-extrabold text-red-900">{worstDay?.date?.slice(5) ?? "—"}</p>
          <p className="mt-0.5 text-xs text-red-700">{worstDay?.total ?? 0} students present</p>
        </div>

        {/* Weekly average */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-200 bg-blue-100">
              <svg className="h-3.5 w-3.5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"/>
              </svg>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700">Daily Average</p>
          </div>
          <p className="text-xl font-extrabold text-blue-900">
            {trend.length > 0 ? Math.round(trend.reduce((s: number, r: any) => s + (r.total ?? 0), 0) / trend.length) : 0}
          </p>
          <p className="mt-0.5 text-xs text-blue-700">students / day this week</p>
        </div>

      </div>
    </section>
  );
}
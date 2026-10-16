import { useQuery } from "@tanstack/react-query";

import { getAttendanceLogs, getRecognitionMetrics } from "../api/attendance";
import { getMonthlyAnalytics, getWeeklyAnalytics } from "../api/analytics";
import { getStudents } from "../api/students";
import { getPublicSettings } from "../api/settings";
import { formatToIST } from "../utils/time";

export function DashboardPage() {
  const studentsQuery = useQuery({ queryKey: ["students"], queryFn: getStudents });
  const attendanceQuery = useQuery({ queryKey: ["attendance"], queryFn: getAttendanceLogs, refetchInterval: 10000 });
  const recognitionMetricsQuery = useQuery({ queryKey: ["recognition-metrics"], queryFn: getRecognitionMetrics, refetchInterval: 10000 });
  const weeklyAnalyticsQuery = useQuery({ queryKey: ["analytics-weekly"], queryFn: () => getWeeklyAnalytics(), refetchInterval: 10000 });
  const monthlyAnalyticsQuery = useQuery({ queryKey: ["analytics-monthly"], queryFn: () => getMonthlyAnalytics(), refetchInterval: 15000 });
  const settingsQuery = useQuery({ queryKey: ["public-settings"], queryFn: getPublicSettings, staleTime: 5 * 60 * 1000 });

  const hybridLearningEnabled = settingsQuery.data?.hybrid_learning_enabled ?? false;
  const presentCount = (attendanceQuery.data ?? []).filter((x) => x.status === "Present").length;
  const lateCount    = (attendanceQuery.data ?? []).filter((x) => x.status === "Late").length;
  const weeklyTrend  = weeklyAnalyticsQuery.data?.trend ?? [];
  const weeklyMax    = Math.max(1, ...weeklyTrend.map((row: any) => row.total ?? 0));

  const statusStyles: Record<string, string> = {
    Present:    "bg-green-50 text-green-800 border border-green-200",
    Late:       "bg-yellow-50 text-yellow-800 border border-yellow-200",
    Absent:     "bg-red-50 text-red-800 border border-red-200",
    "Half-day": "bg-sky-50 text-sky-800 border border-sky-200",
  };

  return (
    <section className="space-y-4 p-6">

      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Operations Dashboard</h2>
          <p className="mt-0.5 text-sm text-slate-500">Live overview of today's attendance performance.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-xs font-semibold text-slate-500">Live · Auto refresh</span>
        </div>
      </header>

      {/* Stat Cards */}
      <div className={`grid gap-3 ${hybridLearningEnabled ? "md:grid-cols-5" : "md:grid-cols-4"}`}>

        <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-blue-900 to-blue-500" />
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 bg-blue-50">
            <svg className="h-4 w-4 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path strokeLinecap="round" d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Registered</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{studentsQuery.data?.length ?? 0}</p>
          <p className="mt-1 text-[11px] text-slate-400">Total students</p>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-emerald-700 to-emerald-400" />
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50">
            <svg className="h-4 w-4 text-emerald-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Accuracy</p>
          <p className="mt-1 text-3xl font-extrabold text-emerald-700">{recognitionMetricsQuery.data?.accuracy_percent?.toFixed(2) ?? "0.00"}%</p>
          <p className="mt-1 text-[11px] text-slate-400">{recognitionMetricsQuery.data?.total_samples ?? 0} samples &middot; {recognitionMetricsQuery.data?.total_students ?? 0} students</p>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-sky-700 to-sky-400" />
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg border border-sky-100 bg-sky-50">
            <svg className="h-4 w-4 text-sky-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path strokeLinecap="round" d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Present</p>
          <p className="mt-1 text-3xl font-extrabold text-sky-700">{presentCount}</p>
          <p className="mt-1 text-[11px] text-slate-400">Today's check-ins</p>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-amber-700 to-amber-400" />
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg border border-amber-100 bg-amber-50">
            <svg className="h-4 w-4 text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Late</p>
          <p className="mt-1 text-3xl font-extrabold text-amber-700">{lateCount}</p>
          <p className="mt-1 text-[11px] text-slate-400">Late arrivals today</p>
        </article>

        {hybridLearningEnabled && (
          <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-violet-700 to-violet-400" />
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg border border-violet-100 bg-violet-50">
              <svg className="h-4 w-4 text-violet-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M12 2a10 10 0 1 0 10 10"/><path strokeLinecap="round" d="M12 6v6l4 2"/><path strokeLinecap="round" d="M18 2l4 4-4 4"/></svg>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Adaptive</p>
            <p className="mt-1 text-3xl font-extrabold text-violet-700">{recognitionMetricsQuery.data?.adaptive_samples_count ?? 0}</p>
            <p className="mt-1 text-[11px] text-slate-400">Adaptive samples</p>
          </article>
        )}

      </div>

      {/* Table + Weekly Trend */}
      <div className="grid gap-3 md:grid-cols-5">

        <div className="md:col-span-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
            <h3 className="text-sm font-bold text-slate-800">Recent Attendance</h3>
            <span className="rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">Today</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/60">
                  {["Student ID", "Date", "Check-In", "Check-Out", "Status"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(attendanceQuery.data ?? []).slice(0, 10).map((row) => (
                  <tr key={row.id} className="border-t border-slate-50 transition-colors hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 text-xs font-semibold text-slate-700">{row.student_id}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{row.date}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{formatToIST(row.check_in_time)}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{formatToIST(row.check_out_time)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusStyles[row.status] ?? "bg-slate-100 text-slate-600"}`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
                {(attendanceQuery.data ?? []).length === 0 && (
                  <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-400">No attendance records yet today.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Weekly Trend</h3>
            <span className="text-[11px] text-slate-400">This week</span>
          </div>
          <div className="flex h-36 items-end gap-1.5">
            {weeklyTrend.map((row: any, i: number) => {
              const value = row.total ?? 0;
              const height = Math.max(8, Math.round((value / weeklyMax) * 112));
              const isToday = i === weeklyTrend.length - 1;
              return (
                <div key={row.date} className="flex flex-1 flex-col items-center gap-1">
                  <div className={`w-full rounded-t-md transition-all ${isToday ? "bg-blue-700 ring-2 ring-blue-300 ring-offset-1" : "bg-blue-200 hover:bg-blue-400"}`} style={{ height }} title={`${row.date}: ${value}`} />
                  <span className={`text-[9px] font-semibold ${isToday ? "text-blue-700" : "text-slate-400"}`}>{row.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Monthly Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Monthly Summary</h3>
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{new Date().toLocaleString("default", { month: "long", year: "numeric" })}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Present",  value: monthlyAnalyticsQuery.data?.summary?.Present        ?? 0, total: 2860, color: "text-green-800", bg: "bg-green-50 border-green-200", bar: "bg-green-500", track: "bg-green-100" },
            { label: "Late",     value: monthlyAnalyticsQuery.data?.summary?.Late           ?? 0, total: 2860, color: "text-amber-800", bg: "bg-amber-50 border-amber-200", bar: "bg-amber-400", track: "bg-amber-100" },
            { label: "Half-day", value: monthlyAnalyticsQuery.data?.summary?.["Half-day"]  ?? 0, total: 2860, color: "text-sky-800",   bg: "bg-sky-50 border-sky-200",     bar: "bg-sky-500",  track: "bg-sky-100"   },
            { label: "Absent",   value: monthlyAnalyticsQuery.data?.summary?.Absent        ?? 0, total: 2860, color: "text-red-800",   bg: "bg-red-50 border-red-200",     bar: "bg-red-500",  track: "bg-red-100"   },
          ].map(({ label, value, total, color, bg, bar, track }) => (
            <div key={label} className={`rounded-xl border p-4 ${bg}`}>
              <p className={`text-[9px] font-bold uppercase tracking-widest ${color} opacity-70`}>{label}</p>
              <p className={`mt-1 text-2xl font-extrabold ${color}`}>{value.toLocaleString()}</p>
              <div className={`mt-2.5 h-1.5 w-full overflow-hidden rounded-full ${track}`}>
                <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, Math.round((value / total) * 100))}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
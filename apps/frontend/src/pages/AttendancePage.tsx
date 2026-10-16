import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";

import { createAttendanceEvent, exportAttendance, getAttendanceLogs, overrideAttendance } from "../api/attendance";
import { formatToIST } from "../utils/time";

const STATUS_STYLES: Record<string, string> = {
  Present:  "bg-green-50 border-green-200 text-green-800",
  Late:     "bg-yellow-50 border-yellow-200 text-yellow-800",
  "Half-day": "bg-sky-50 border-sky-200 text-sky-800",
  Absent:   "bg-red-50 border-red-200 text-red-800",
};

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-700",
];

export function AttendancePage() {
  const [studentId, setStudentId]   = useState("");
  const [eventType, setEventType]   = useState<"check_in" | "check_out">("check_in");
  const [overrideForm, setOverrideForm] = useState({
    attendance_id: "",
    check_in_time: "",
    check_out_time: "",
    status: "",
  });
  const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const queryClient = useQueryClient();

  const attendanceQuery = useQuery({ queryKey: ["attendance"], queryFn: getAttendanceLogs });

  const mutation = useMutation({
    mutationFn: createAttendanceEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setStudentId("");
    },
  });

  const overrideMutation = useMutation({
    mutationFn: ({ attendanceId, payload }: { attendanceId: number; payload: any }) =>
      overrideAttendance(attendanceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setStatusMsg({ ok: true, text: "Attendance record overridden successfully." });
      setTimeout(() => setStatusMsg(null), 3000);
    },
    onError: (err: any) => {
      setStatusMsg({ ok: false, text: err.response?.data?.detail || "Override failed." });
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate({ student_id: Number(studentId), timestamp: new Date().toISOString(), event_type: eventType });
  }

  function submitOverride(e: FormEvent) {
    e.preventDefault();
    const id = Number(overrideForm.attendance_id);
    if (!id) return;
    overrideMutation.mutate({
      attendanceId: id,
      payload: {
        check_in_time:  overrideForm.check_in_time  || null,
        check_out_time: overrideForm.check_out_time || null,
        status:         overrideForm.status         || null,
      },
    });
  }

  async function onExport(format: "csv" | "xlsx") {
    const blob = await exportAttendance(format);
    const url  = window.URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `attendance_export.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  const rows = attendanceQuery.data ?? [];

  return (
    <section className="space-y-4">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Attendance</h2>
          <p className="mt-0.5 text-sm text-slate-500">Manage, override and export attendance records.</p>
        </div>
        <div className="flex gap-2">
          {(["csv", "xlsx"] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => onExport(fmt)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Export {fmt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Status toast ── */}
      {statusMsg && (
        <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${
          statusMsg.ok
            ? "border-green-200 bg-green-50 text-green-800"
            : "border-red-200 bg-red-50 text-red-700"
        }`}>
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {statusMsg.ok
              ? <path strokeLinecap="round" d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3" />
              : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
            }
          </svg>
          {statusMsg.text}
        </div>
      )}

      {/* ── Two panels ── */}
      <div className="grid gap-3 md:grid-cols-2">

        {/* Panel 1 — Log Event */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 bg-gradient-to-r from-blue-950 to-blue-800 px-5 py-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10">
              <svg className="h-4 w-4 text-blue-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white">Log Attendance Event</p>
              <p className="text-[10px] text-blue-300">Manual check-in / check-out</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-3 p-5">
            <div>
              <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-slate-500">Student ID</label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 hover:border-slate-300"
                placeholder="Enter student ID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-slate-500">Event Type</label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                value={eventType}
                onChange={(e) => setEventType(e.target.value as "check_in" | "check_out")}
              >
                <option value="check_in">Check In</option>
                <option value="check_out">Check Out</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-900/25 transition hover:from-blue-800 hover:to-blue-600 disabled:opacity-50"
            >
              {mutation.isPending ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              )}
              {mutation.isPending ? "Submitting..." : "Submit Event"}
            </button>
          </form>
        </div>

        {/* Panel 2 — Override */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 bg-gradient-to-r from-amber-900 to-amber-700 px-5 py-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10">
              <svg className="h-4 w-4 text-amber-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path strokeLinecap="round" d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-amber-50">Manual Override</p>
              <p className="text-[10px] text-amber-300">Correct an existing attendance record</p>
            </div>
          </div>

          <form onSubmit={submitOverride} className="space-y-3 p-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-slate-500">Attendance ID</label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-300"
                  placeholder="Record ID"
                  value={overrideForm.attendance_id}
                  onChange={(e) => setOverrideForm({ ...overrideForm, attendance_id: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-slate-500">Override Status</label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15"
                  value={overrideForm.status}
                  onChange={(e) => setOverrideForm({ ...overrideForm, status: e.target.value })}
                >
                  <option value="">Auto Recalculate</option>
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Half-day">Half-day</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-slate-500">Check-In Time</label>
                <input
                  type="datetime-local"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-300"
                  value={overrideForm.check_in_time}
                  onChange={(e) => setOverrideForm({ ...overrideForm, check_in_time: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-slate-500">Check-Out Time</label>
                <input
                  type="datetime-local"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-300"
                  value={overrideForm.check_out_time}
                  onChange={(e) => setOverrideForm({ ...overrideForm, check_out_time: e.target.value })}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={overrideMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-800 to-amber-600 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-900/20 transition hover:from-amber-700 hover:to-amber-500 disabled:opacity-50"
            >
              {overrideMutation.isPending ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path strokeLinecap="round" d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              )}
              {overrideMutation.isPending ? "Applying..." : "Apply Override"}
            </button>
          </form>
        </div>
      </div>

      {/* ── Attendance Log Table ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
          <h3 className="text-sm font-bold text-slate-800">Attendance Log</h3>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-400">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
            </svg>
            Search records...
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/60">
                {["Student", "Date", "Check-In", "Check-Out", "Status", "Match %"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((item, i) => (
                <tr key={item.id} className="border-t border-slate-50 transition hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                        {String(item.student_id).slice(-2).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-slate-800">{item.student_id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{item.date}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatToIST(item.check_in_time) || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatToIST(item.check_out_time) || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${STATUS_STYLES[item.status] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {item.last_match_confidence ? `${(item.last_match_confidence * 100).toFixed(1)}%` : "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-slate-400">
                    No attendance records found.
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
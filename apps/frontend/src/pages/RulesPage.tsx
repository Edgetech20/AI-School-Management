import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useState } from "react";
import { getRules, updateRules } from "../api/rules";

export function RulesPage() {
  const queryClient = useQueryClient();
  const rulesQuery  = useQuery({ queryKey: ["rules"], queryFn: getRules });
  const [form, setForm] = useState({
    school_start_time:  "09:00",
    late_threshold_time: "09:15",
    minimum_hours: 6,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (rulesQuery.data) {
      setForm({
        school_start_time:  rulesQuery.data.school_start_time,
        late_threshold_time: rulesQuery.data.late_threshold_time,
        minimum_hours: rulesQuery.data.minimum_hours,
      });
    }
  }, [rulesQuery.data]);

  const mutation = useMutation({
    mutationFn: updateRules,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate(form);
  }

  const rules = [
    {
      key:         "school_start_time",
      label:       "School Start Time",
      description: "Official start time. Check-ins before this are marked Present.",
      type:        "time",
      step:        undefined,
      icon: (
        <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      accent: "border-blue-200 bg-blue-50",
      iconBg: "bg-blue-100 border-blue-200",
    },
    {
      key:         "late_threshold_time",
      label:       "Late Threshold",
      description: "Check-ins after this time are marked as Late.",
      type:        "time",
      step:        undefined,
      icon: (
        <svg className="h-5 w-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          <line x1="12" y1="2" x2="12" y2="4" strokeWidth="2.5"/>
        </svg>
      ),
      accent: "border-amber-200 bg-amber-50",
      iconBg: "bg-amber-100 border-amber-200",
    },
    {
      key:         "minimum_hours",
      label:       "Minimum Hours",
      description: "Minimum hours required to be counted as Full-day attendance.",
      type:        "number",
      step:        "0.5",
      icon: (
        <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="4" width="18" height="18" rx="2"/><path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18"/>
          <path strokeLinecap="round" d="M8 14h8M8 18h5"/>
        </svg>
      ),
      accent: "border-emerald-200 bg-emerald-50",
      iconBg: "bg-emerald-100 border-emerald-200",
    },
  ] as const;

  return (
    <section className="space-y-4">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Attendance Rules</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Configure the timing and threshold rules that govern how attendance is calculated.
          </p>
        </div>
        {rulesQuery.isFetching && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <svg className="h-3 w-3 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span className="text-xs font-semibold text-slate-400">Loading...</span>
          </div>
        )}
      </div>

      {/* ── Success toast ── */}
      {saved && (
        <div className="flex items-center gap-2.5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <svg className="h-4 w-4 shrink-0 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3"/>
          </svg>
          Rules saved successfully.
        </div>
      )}

      {/* ── How rules work info card ── */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-100">
            <svg className="h-3.5 w-3.5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-blue-800">How rules are applied</p>
            <p className="mt-1 text-[11px] leading-relaxed text-blue-700">
              Check-in <span className="font-semibold">before Start Time</span> → <span className="font-semibold text-green-700">Present</span> ·
              Check-in <span className="font-semibold">after Late Threshold</span> → <span className="font-semibold text-amber-700">Late</span> ·
              Total hours <span className="font-semibold">below Minimum</span> → <span className="font-semibold text-sky-700">Half-day</span> ·
              No check-in → <span className="font-semibold text-red-700">Absent</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Rule cards + form ── */}
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-4 md:grid-cols-3">
          {rules.map(({ key, label, description, type, step, icon, accent, iconBg }) => (
            <div key={key} className={`rounded-2xl border p-5 ${accent}`}>
              <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl border ${iconBg}`}>
                {icon}
              </div>
              <label className="block">
                <span className="block text-xs font-bold text-slate-700">{label}</span>
                <span className="mt-0.5 block text-[11px] text-slate-500">{description}</span>
                <input
                  type={type}
                  min={type === "number" ? 0 : undefined}
                  step={step}
                  value={(form as any)[key]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [key]: type === "number" ? Number(e.target.value) : e.target.value,
                    })
                  }
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 hover:border-slate-300"
                />
              </label>
            </div>
          ))}
        </div>

        {/* ── Current values preview ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Current Configuration Preview</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5">
              <svg className="h-3.5 w-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span className="text-[11px] text-blue-600">Start</span>
              <span className="text-sm font-bold text-blue-900">{form.school_start_time}</span>
            </div>
            <svg className="h-4 w-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M9 18l6-6-6-6"/>
            </svg>
            <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5">
              <svg className="h-3.5 w-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span className="text-[11px] text-amber-600">Late after</span>
              <span className="text-sm font-bold text-amber-900">{form.late_threshold_time}</span>
            </div>
            <svg className="h-4 w-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M9 18l6-6-6-6"/>
            </svg>
            <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5">
              <svg className="h-3.5 w-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/><path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              <span className="text-[11px] text-emerald-600">Min hours</span>
              <span className="text-sm font-bold text-emerald-900">{form.minimum_hours}h</span>
            </div>
          </div>
        </div>

        {/* ── Save button ── */}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-900 to-blue-700 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/25 transition hover:from-blue-800 hover:to-blue-600 active:scale-[0.99] disabled:opacity-50"
        >
          {mutation.isPending ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Saving Rules...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              Save Rules
            </>
          )}
        </button>
      </form>
    </section>
  );
}